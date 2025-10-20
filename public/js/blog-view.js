// Get blog slug from URL
const pathSegments = window.location.pathname.split("/");
const blogSlug = pathSegments[pathSegments.length - 1];
const API_BASE_URL = "https://focus-flow-lopn.onrender.com/api";

const FRONTEND_URL = "https://focus-flow-lopn.onrender.com";

document.getElementById("back-to-blogs").href = `${FRONTEND_URL}/blogs.html`;
document.getElementById("tracker-link").href = `${FRONTEND_URL}/index.html`;

// Toast Notification System
class ToastManager {
  constructor() {
    this.container = document.getElementById("toastContainer");
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.className = "toast-container";
      this.container.id = "toastContainer";
      this.container.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 10000;
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-width: 400px;
        `;
      document.body.appendChild(this.container);
    }
    this.toastId = 0;
  }

  showToast(message, type = "info", title = "", duration = 5000) {
    const toastId = this.toastId++;
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.id = `toast-${toastId}`;

    const icon = this.getIcon(type);
    const progressBar =
      duration > 0 ? '<div class="toast-progress"></div>' : "";

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">
          ${title ? `<div class="toast-title">${title}</div>` : ""}
          <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="toastManager.hideToast(${toastId})">×</button>
        ${progressBar}
      `;

    this.container.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 10);

    if (duration > 0) {
      const progress = toast.querySelector(".toast-progress");
      if (progress) {
        setTimeout(() => progress.classList.add("hide"), 10);
      }
      setTimeout(() => this.hideToast(toastId), duration);
    }

    return toastId;
  }

  hideToast(toastId) {
    const toast = document.getElementById(`toast-${toastId}`);
    if (toast) {
      toast.classList.remove("show");
      toast.classList.add("hide");
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }
  }

  getIcon(type) {
    const icons = {
      success: "✓",
      error: "⚠",
      warning: "⚠",
      info: "ℹ",
    };
    return icons[type] || icons.info;
  }

  success(message, title = "Success", duration = 5000) {
    return this.showToast(message, "success", title, duration);
  }

  error(message, title = "Error", duration = 7000) {
    return this.showToast(message, "error", title, duration);
  }

  warning(message, title = "Warning", duration = 6000) {
    return this.showToast(message, "warning", title, duration);
  }

  info(message, title = "Info", duration = 4000) {
    return this.showToast(message, "info", title, duration);
  }
}

// Initialize toast manager
const toastManager = new ToastManager();

// Enhanced Markdown Renderer with Comprehensive Link Support
class MarkdownRenderer {
  constructor() {
    this.isMermaidInitialized = false;
    this.mermaidDiagrams = new Map();
    this.init();
  }

  init() {
    // Configure marked options with custom renderer for enhanced link support
    const renderer = new marked.Renderer();

    // Override link rendering to add target="_blank" and rel="noopener noreferrer"
    renderer.link = (href, title, text) => {
      // Default link rendering with added target="_blank"
      return `<a href="${href}"${
        title ? ` title="${title}"` : ""
      } target="_blank" rel="noopener noreferrer">${text}</a>`;
    };

    marked.setOptions({
      highlight: function (code, lang) {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value;
          } catch (err) {
            console.warn(`Highlight.js error for language ${lang}:`, err);
          }
        }
        return hljs.highlightAuto(code).value;
      },
      breaks: true,
      gfm: true,
      tables: true,
      sanitize: false,
      // Use the custom renderer with link target modification
      renderer: renderer,
    });

    // Initialize Mermaid with proper configuration
    if (typeof mermaid !== "undefined") {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: document.body.classList.contains("light-theme")
            ? "default"
            : "dark",
          securityLevel: "loose",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
          flowchart: {
            htmlLabels: true,
            curve: "basis",
          },
          sequence: {
            diagramMarginX: 50,
            diagramMarginY: 10,
            actorMargin: 50,
          },
        });
        this.isMermaidInitialized = true;
        console.log("Mermaid initialized successfully");
      } catch (error) {
        console.error("Mermaid initialization failed:", error);
      }
    }

    // Initialize Highlight.js
    if (typeof hljs !== "undefined") {
      hljs.configure({
        cssSelector: "pre code",
        ignoreUnescapedHTML: true,
      });
    }
  }

  // Enhanced render method with comprehensive link parsing
  async render(markdownText) {
    if (!markdownText) return "";

    try {
      // Pre-process mermaid diagrams to prevent markdown parsing
      const processedMarkdown = this.preprocessMermaid(markdownText);

      // Enhanced: Parse plain URLs and Markdown links before markdown processing
      const linkEnhancedMarkdown = this.parseAllLinkTypes(processedMarkdown);

      // Render markdown to HTML
      const rawHtml = marked.parse(linkEnhancedMarkdown);

      // Sanitize HTML while preserving mermaid containers
      const cleanHtml = DOMPurify.sanitize(rawHtml, {
        ADD_TAGS: ["pre", "code", "span", "button", "div"],
        ADD_ATTR: [
          "class",
          "data-lang",
          "data-code",
          "onclick",
          "data-mermaid-id",
          "data-processed",
        ],
        ALLOW_DATA_ATTR: true,
      });

      return cleanHtml;
    } catch (error) {
      console.error("Markdown rendering error:", error);
      return `<div class="error-message">Error rendering content: ${error.message}</div>`;
    }
  }

  // NEW: Comprehensive link parsing for all types of links
  parseAllLinkTypes(text) {
    if (!text) return text;

    // Step 1: First, convert Markdown-style links [text](url) to HTML anchors
    // This ensures they don't get processed again in later steps
    let processedText = text.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (match, linkText, url) => {
        // Validate URL format
        const cleanUrl = this.validateAndCleanUrl(url.trim());
        if (!cleanUrl) return match; // Return original if invalid

        return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
      }
    );

    // Step 2: Convert plain URLs to clickable links
    // Enhanced URL regex that handles various URL formats
    const urlRegex =
      /(?:https?:\/\/|www\.)[^\s<>{}\[\]()|^`\\"']+[^\s<>{}\[\]()|^`\\"'.,;:!?]/gi;

    processedText = processedText.replace(urlRegex, (url) => {
      // Skip if already inside an anchor tag
      if (this.isInsideAnchorTag(processedText, url)) {
        return url;
      }

      let cleanUrl = url.trim();

      // Add http:// prefix if it's a www URL
      if (cleanUrl.startsWith("www.")) {
        cleanUrl = "https://" + cleanUrl;
      }

      // Validate and clean the URL
      cleanUrl = this.validateAndCleanUrl(cleanUrl);
      if (!cleanUrl) return url;

      const displayUrl = url.length > 50 ? url.substring(0, 47) + "..." : url;

      return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${displayUrl}</a>`;
    });

    // Step 3: Ensure existing anchor tags are preserved and properly formatted
    processedText = this.ensureAnchorTags(processedText);

    return processedText;
  }

  // NEW: Check if text is already inside an anchor tag
  isInsideAnchorTag(text, url) {
    const urlIndex = text.indexOf(url);
    if (urlIndex === -1) return false;

    // Look backwards for opening <a tag
    const textBefore = text.substring(0, urlIndex);
    const lastAnchorOpen = textBefore.lastIndexOf("<a ");
    const lastAnchorClose = textBefore.lastIndexOf("</a>");

    // If we found an opening <a tag and no closing tag after it, we're inside an anchor
    if (lastAnchorOpen !== -1 && lastAnchorOpen > lastAnchorClose) {
      return true;
    }

    return false;
  }

  // NEW: Ensure existing anchor tags have proper attributes
  ensureAnchorTags(text) {
    return text.replace(
      /<a\s+([^>]*)href=(["'])([^"']+)\2([^>]*)>/gi,
      (match, before, quote, href, after) => {
        // Check if target and rel attributes already exist
        const hasTarget = /target=(["'])([^"']+)\1/i.test(match);
        const hasRel = /rel=(["'])([^"']+)\1/i.test(match);

        let newAttributes = "";

        if (!hasTarget) {
          newAttributes += ' target="_blank"';
        }

        if (!hasRel) {
          newAttributes += ' rel="noopener noreferrer"';
        }

        return `<a ${before}href=${quote}${href}${quote}${after}${newAttributes}>`;
      }
    );
  }

  // NEW: Validate and clean URLs
  validateAndCleanUrl(url) {
    if (!url) return null;

    try {
      // Basic URL validation
      let cleanUrl = url.trim();

      // Remove any trailing punctuation that might have been caught by regex
      cleanUrl = cleanUrl.replace(/[.,;:!?]+$/, "");

      // Ensure URL has a protocol
      if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
        cleanUrl = "https://" + cleanUrl;
      }

      // Basic URL format check using URL constructor
      new URL(cleanUrl);

      return cleanUrl;
    } catch (error) {
      console.warn("Invalid URL detected:", url, error);
      return null;
    }
  }

  // Rest of the existing methods remain unchanged...
  preprocessMermaid(text) {
    let diagramCount = 0;

    console.log("Preprocessing markdown for Mermaid diagrams...");

    // Process mermaid code blocks
    const processedText = text.replace(
      /```mermaid\s*([\s\S]*?)```/g,
      (match, diagram) => {
        diagramCount++;
        const id = "mermaid-" + Date.now() + "-" + diagramCount;
        const cleanDiagram = diagram.trim();

        console.log(
          `Found Mermaid diagram ${id}:`,
          cleanDiagram.substring(0, 100) + "..."
        );

        // Store the diagram for later rendering
        this.mermaidDiagrams.set(id, cleanDiagram);

        return `<div class="mermaid-container" data-mermaid-id="${id}" data-diagram="${this.escapeHtml(
          cleanDiagram.substring(0, 50)
        )}...">
        <div class="mermaid-loading">🔄 Rendering diagram...</div>
        <div class="mermaid-error" style="display: none;"></div>
        <div class="mermaid-content"></div>
        <div class="mermaid-debug" style="font-size: 10px; color: #666; margin-top: 5px;">
            Diagram ID: ${id}
        </div>
    </div>`;
      }
    );

    console.log(`Processed ${diagramCount} Mermaid diagrams`);
    return processedText;
  }

  // Escape HTML for safe display
  escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async processFinalContent(container) {
    // Add copy buttons to code blocks
    this.addCopyButtons(container);

    // Setup copy button event delegation
    this.setupCopyButtonEvents(container);

    // Render mermaid diagrams
    await this.renderMermaidDiagrams(container);

    // Enhance tables
    this.enhanceTables(container);

    // Add heading anchors
    this.addHeadingAnchors(container);

    // Enhance checkboxes
    this.enhanceCheckboxes(container);

    // Add progress tracking
    this.addChecklistProgress(container);
  }

  // Enhanced: Interactive checkboxes with persistence
  enhanceCheckboxes(container) {
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');

    checkboxes.forEach((checkbox) => {
      // Ensure checkboxes have proper styling
      checkbox.style.width = "18px";
      checkbox.style.height = "18px";
      checkbox.style.marginRight = "10px";
      checkbox.style.cursor = "pointer";
      checkbox.style.accentColor = "var(--codeleaf-accent-primary)";

      // Wrap checkbox in proper task list item structure
      const listItem = checkbox.closest("li");
      if (listItem && !listItem.classList.contains("task-list-item")) {
        listItem.classList.add("task-list-item");

        // Ensure proper flex layout
        listItem.style.display = "flex";
        listItem.style.alignItems = "flex-start";
        listItem.style.marginBottom = "8px";
        listItem.style.paddingLeft = "0";

        // Create unique ID for this checklist item
        const checklistId = `checklist-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        checkbox.id = checklistId;

        // Wrap content in label for better accessibility
        const content = Array.from(listItem.childNodes).filter(
          (node) =>
            node !== checkbox &&
            (node.nodeType === Node.TEXT_NODE ||
              (node.nodeType === Node.ELEMENT_NODE && node.tagName !== "INPUT"))
        );

        if (content.length > 0) {
          const label = document.createElement("label");
          label.htmlFor = checklistId;
          label.style.flex = "1";
          label.style.cursor = "pointer";
          label.style.marginBottom = "0";
          label.style.lineHeight = "1.5";
          label.style.padding = "2px 0";

          content.forEach((node) => label.appendChild(node.cloneNode(true)));

          listItem.innerHTML = "";
          listItem.appendChild(checkbox);
          listItem.appendChild(label);
        }

        // Add checked state styling
        if (checkbox.checked) {
          listItem.classList.add("checked");
        }

        // Add click handler for interactive features
        checkbox.addEventListener("change", (e) => {
          if (e.target.checked) {
            listItem.classList.add("checked");
            this.animateCheck(listItem);
          } else {
            listItem.classList.remove("checked");
          }

          // Save state to localStorage
          this.saveChecklistState(container);
        });
      }
    });

    // Load saved checklist states
    this.loadChecklistState(container);
  }

  // NEW: Add progress tracking to checklists
  addChecklistProgress(container) {
    const checklists = container.querySelectorAll(".contains-task-list");

    checklists.forEach((checklist, index) => {
      const checkboxes = checklist.querySelectorAll('input[type="checkbox"]');
      const totalItems = checkboxes.length;

      if (totalItems > 0) {
        // Create progress container
        const progressContainer = document.createElement("div");
        progressContainer.className = "checklist-progress";
        progressContainer.innerHTML = `
    <div class="checklist-progress-text">
      <span>Checklist Progress</span>
      <span class="checklist-progress-percentage">0%</span>
    </div>
    <div class="checklist-progress-bar">
      <div class="checklist-progress-fill" style="width: 0%"></div>
    </div>
  `;

        // Insert before checklist
        checklist.parentNode.insertBefore(progressContainer, checklist);

        // Update progress function
        const updateProgress = () => {
          const checkedItems = checklist.querySelectorAll(
            'input[type="checkbox"]:checked'
          ).length;
          const percentage =
            totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

          const progressFill = progressContainer.querySelector(
            ".checklist-progress-fill"
          );
          const progressPercentage = progressContainer.querySelector(
            ".checklist-progress-percentage"
          );

          progressFill.style.width = `${percentage}%`;
          progressPercentage.textContent = `${percentage}%`;

          // Color coding based on progress
          if (percentage === 100) {
            progressContainer.style.borderLeftColor = "var(--codeleaf-success)";
            progressFill.style.background =
              "linear-gradient(90deg, var(--codeleaf-success), #4CAF50)";
          } else if (percentage >= 50) {
            progressContainer.style.borderLeftColor =
              "var(--codeleaf-accent-primary)";
          } else {
            progressContainer.style.borderLeftColor = "var(--codeleaf-warning)";
            progressFill.style.background =
              "linear-gradient(90deg, var(--codeleaf-warning), #FFA726)";
          }
        };

        // Add event listeners to all checkboxes in this checklist
        checkboxes.forEach((checkbox) => {
          checkbox.addEventListener("change", updateProgress);
        });

        // Initial progress calculation
        updateProgress();
      }
    });
  }

  // NEW: Animation for checking items
  animateCheck(listItem) {
    listItem.style.transform = "scale(1.02)";
    listItem.style.background = "var(--codeleaf-accent-muted)";

    setTimeout(() => {
      listItem.style.transform = "scale(1)";
      listItem.style.background = "var(--codeleaf-bg-primary)";
    }, 300);
  }

  // NEW: Save checklist state to localStorage
  saveChecklistState(container) {
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    const state = {};

    checkboxes.forEach((checkbox, index) => {
      const listItem = checkbox.closest("li");
      const text =
        listItem?.querySelector("label")?.textContent?.trim() ||
        `item-${index}`;
      state[text] = checkbox.checked;
    });

    const blogSlug = window.blogSlug || "current-blog";
    localStorage.setItem(`checklist-${blogSlug}`, JSON.stringify(state));
  }

  // NEW: Load checklist state from localStorage
  loadChecklistState(container) {
    const blogSlug = window.blogSlug || "current-blog";
    const savedState = localStorage.getItem(`checklist-${blogSlug}`);

    if (savedState) {
      const state = JSON.parse(savedState);
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');

      checkboxes.forEach((checkbox, index) => {
        const listItem = checkbox.closest("li");
        const text =
          listItem?.querySelector("label")?.textContent?.trim() ||
          `item-${index}`;

        if (state[text] !== undefined) {
          checkbox.checked = state[text];
          if (state[text]) {
            listItem.classList.add("checked");
          }
        }
      });
    }
  }

  // Enhanced Mermaid diagram rendering with detailed logging
  async renderMermaidDiagrams(container) {
    console.log("Starting Mermaid diagram rendering...");

    if (!this.isMermaidInitialized) {
      console.error("Mermaid not initialized!");
      this.showGlobalError(container, "Mermaid library failed to initialize");
      return;
    }

    const mermaidContainers = container.querySelectorAll(".mermaid-container");

    console.log(`Found ${mermaidContainers.length} Mermaid containers`);

    if (mermaidContainers.length === 0) {
      console.log("No Mermaid containers found");
      return;
    }

    for (const containerEl of mermaidContainers) {
      try {
        const mermaidId = containerEl.getAttribute("data-mermaid-id");
        console.log(`Rendering diagram: ${mermaidId}`);

        let diagram = this.mermaidDiagrams.get(mermaidId);

        if (!diagram) {
          console.warn(`No diagram content found for ${mermaidId}`);
          continue;
        }

        // Show loading state
        const loadingEl = containerEl.querySelector(".mermaid-loading");
        const errorEl = containerEl.querySelector(".mermaid-error");
        const contentEl = containerEl.querySelector(".mermaid-content");

        if (loadingEl) loadingEl.style.display = "block";
        if (errorEl) errorEl.style.display = "none";
        if (contentEl) contentEl.innerHTML = "";

        // Validate Mermaid syntax
        if (!diagram || diagram.trim().length === 0) {
          throw new Error("Empty diagram content");
        }

        console.log(
          `Rendering diagram content: ${diagram.substring(0, 100)}...`
        );

        // Render the diagram with timeout
        const renderPromise = mermaid.render(mermaidId, diagram);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error("Rendering timeout after 10s")),
            10000
          );
        });

        const { svg, bindFunctions } = await Promise.race([
          renderPromise,
          timeoutPromise,
        ]);

        if (contentEl) {
          contentEl.innerHTML = svg;
          if (bindFunctions) {
            bindFunctions(contentEl);
          }
        }

        // Hide loading, show content
        if (loadingEl) loadingEl.style.display = "none";
        if (contentEl) contentEl.style.display = "block";

        // Mark as processed
        containerEl.setAttribute("data-processed", "true");

        console.log(`✅ Successfully rendered Mermaid diagram: ${mermaidId}`);
      } catch (error) {
        console.error(`❌ Mermaid rendering error for ${mermaidId}:`, error);
        this.handleMermaidError(containerEl, error);
      }
    }

    console.log("Mermaid diagram rendering completed");
  }

  // Validate basic Mermaid syntax
  isValidMermaidSyntax(diagram) {
    const diagramTypes = [
      "graph",
      "flowchart",
      "sequenceDiagram",
      "classDiagram",
      "stateDiagram",
      "erDiagram",
      "journey",
      "gantt",
      "pie",
      "quadrantChart",
      "gitGraph",
    ];

    const firstLine = diagram.trim().split("\n")[0].toLowerCase();
    return diagramTypes.some((type) => firstLine.includes(type));
  }

  // Handle Mermaid rendering errors gracefully
  handleMermaidError(container, error) {
    const loadingEl = container.querySelector(".mermaid-loading");
    const errorEl = container.querySelector(".mermaid-error");
    const contentEl = container.querySelector(".mermaid-content");

    if (loadingEl) loadingEl.style.display = "none";
    if (errorEl) {
      errorEl.style.display = "block";
      errorEl.innerHTML = `
    <div style="padding: 10px; background: #fee; border: 1px solid #fcc; border-radius: 4px;">
      <strong>Diagram Error:</strong> ${this.escapeHtml(error.message)}
      <br><small>Check your Mermaid syntax and try again.</small>
    </div>
  `;
    }
    if (contentEl) contentEl.style.display = "none";

    container.setAttribute("data-error", "true");
  }

  // FIXED: Add copy buttons directly to the final DOM
  addCopyButtons(container) {
    const codeBlocks = container.querySelectorAll(
      "pre:not(.mermaid-container pre)"
    );

    codeBlocks.forEach((pre) => {
      // Skip if already has copy button
      if (pre.querySelector(".copy-code-btn")) return;

      const copyBtn = document.createElement("button");
      copyBtn.className = "copy-code-btn";
      copyBtn.textContent = "Copy";
      copyBtn.title = "Copy code to clipboard";
      copyBtn.type = "button";

      // Store the code content in a data attribute
      const codeElement = pre.querySelector("code");
      if (codeElement) {
        copyBtn.setAttribute("data-code", codeElement.textContent || "");
      }

      pre.style.position = "relative";
      pre.appendChild(copyBtn);
    });
  }

  // FIXED: Setup event delegation on the actual document
  setupCopyButtonEvents(container) {
    // Remove any existing listeners to prevent duplicates
    container.removeEventListener("click", this.handleContainerClick);

    // Add new event listener
    this.handleContainerClick = (e) => {
      if (e.target.classList.contains("copy-code-btn")) {
        this.handleCopyButtonClick(e.target);
      }
    };

    container.addEventListener("click", this.handleContainerClick);
  }

  // FIXED: Handle copy button click
  async handleCopyButtonClick(button) {
    let codeToCopy = "";

    // Get code from data attribute
    if (button.hasAttribute("data-code")) {
      codeToCopy = button.getAttribute("data-code");
    }
    // Fallback: get code from the pre element
    else {
      const pre = button.closest("pre");
      const codeElement = pre?.querySelector("code");
      codeToCopy = codeElement?.textContent || "";
    }

    if (!codeToCopy.trim()) {
      console.warn("No code found to copy");
      return;
    }

    try {
      // Use modern Clipboard API if available
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(codeToCopy);
        this.showCopySuccess(button);
      }
      // Fallback for older browsers
      else {
        const textArea = document.createElement("textarea");
        textArea.value = codeToCopy;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          const successful = document.execCommand("copy");
          document.body.removeChild(textArea);

          if (successful) {
            this.showCopySuccess(button);
          } else {
            throw new Error("execCommand copy failed");
          }
        } catch (execError) {
          document.body.removeChild(textArea);
          throw execError;
        }
      }
    } catch (error) {
      console.error("Failed to copy text: ", error);
      this.showCopyError(button);
    }
  }

  // Show copy success state
  showCopySuccess(button) {
    const originalText = button.textContent;
    button.textContent = "Copied!";
    button.classList.add("copied");

    setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove("copied");
    }, 2000);
  }

  // Show copy error state
  showCopyError(button) {
    const originalText = button.textContent;
    button.textContent = "Failed";
    button.style.background = "var(--codeleaf-error)";

    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = "";
    }, 2000);
  }

  // Enhance tables with responsive features
  enhanceTables(container) {
    const tables = container.querySelectorAll("table");

    tables.forEach((table) => {
      // Wrap tables for responsive scrolling
      const wrapper = document.createElement("div");
      wrapper.style.overflowX = "auto";
      wrapper.style.margin = "var(--codeleaf-space-4) 0";

      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  }

  // Add anchor links to headings
  addHeadingAnchors(container) {
    const headings = container.querySelectorAll("h1, h2, h3, h4, h5, h6");

    headings.forEach((heading) => {
      if (heading.id) return;

      const id = heading.textContent
        .toLowerCase()
        .replace(/[^\w]+/g, "-")
        .replace(/^-+|-+$/g, "");

      heading.id = id;

      const anchor = document.createElement("a");
      anchor.href = `#${id}`;
      anchor.className = "heading-anchor";
      anchor.innerHTML = "🔗";
      anchor.style.marginLeft = "var(--codeleaf-space-2)";
      anchor.style.opacity = "0";
      anchor.style.transition = "opacity 0.2s ease";
      anchor.style.textDecoration = "none";

      heading.style.position = "relative";
      heading.appendChild(anchor);

      // Show anchor on hover
      heading.addEventListener("mouseenter", () => {
        anchor.style.opacity = "1";
      });

      heading.addEventListener("mouseleave", () => {
        anchor.style.opacity = "0";
      });
    });
  }
}

// Initialize Markdown Renderer
const markdownRenderer = new MarkdownRenderer();

// ENHANCED: Mini-map functionality with DRAGGABLE support
class MiniMap {
  constructor() {
    this.container = document.getElementById("miniMap");
    this.content = document.getElementById("miniMapContent");
    this.progress = document.getElementById("miniMapProgress");
    this.toggleBtn = document.getElementById("miniMapToggle");
    this.headings = [];
    this.isCollapsed = false;

    // NEW: Dragging state variables
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.initialLeft = 0;
    this.initialTop = 0;

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadPosition(); // Load saved position if exists
  }

  setupEventListeners() {
    // Toggle mini-map
    this.toggleBtn.addEventListener("click", () => {
      this.toggle();
    });

    // Scroll event for progress tracking
    window.addEventListener("scroll", () => {
      this.updateProgress();
      this.highlightActiveSection();
    });

    // Click event for mini-map items
    this.content.addEventListener("click", (e) => {
      if (e.target.classList.contains("mini-map-item")) {
        this.scrollToSection(e.target.dataset.id);
      }
    });

    // NEW: Dragging event listeners
    this.container.addEventListener("mousedown", this.startDrag.bind(this));
    document.addEventListener("mousemove", this.drag.bind(this));
    document.addEventListener("mouseup", this.stopDrag.bind(this));

    // NEW: Touch events for mobile dragging
    this.container.addEventListener(
      "touchstart",
      this.startDragTouch.bind(this)
    );
    document.addEventListener("touchmove", this.dragTouch.bind(this));
    document.addEventListener("touchend", this.stopDrag.bind(this));
  }

  // NEW: Mouse dragging methods
  startDrag(e) {
    if (
      e.target.classList.contains("mini-map-toggle") ||
      e.target.classList.contains("mini-map-item") ||
      e.target.closest(".mini-map-content")
    ) {
      return; // Don't start drag on interactive elements
    }

    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;

    const rect = this.container.getBoundingClientRect();
    this.initialLeft = rect.left;
    this.initialTop = rect.top;

    this.container.style.cursor = "grabbing";
    e.preventDefault();
  }

  startDragTouch(e) {
    if (
      e.target.classList.contains("mini-map-toggle") ||
      e.target.classList.contains("mini-map-item") ||
      e.target.closest(".mini-map-content")
    ) {
      return;
    }

    this.isDragging = true;
    const touch = e.touches[0];
    this.dragStartX = touch.clientX;
    this.dragStartY = touch.clientY;

    const rect = this.container.getBoundingClientRect();
    this.initialLeft = rect.left;
    this.initialTop = rect.top;

    this.container.style.cursor = "grabbing";
    e.preventDefault();
  }

  drag(e) {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.dragStartX;
    const deltaY = e.clientY - this.dragStartY;

    const newLeft = this.initialLeft + deltaX;
    const newTop = this.initialTop + deltaY;

    this.container.style.left = `${newLeft}px`;
    this.container.style.top = `${newTop}px`;
    this.container.style.right = "auto"; // Remove right positioning
    this.container.style.transform = "none"; // Remove transform
  }

  dragTouch(e) {
    if (!this.isDragging) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - this.dragStartX;
    const deltaY = touch.clientY - this.dragStartY;

    const newLeft = this.initialLeft + deltaX;
    const newTop = this.initialTop + deltaY;

    this.container.style.left = `${newLeft}px`;
    this.container.style.top = `${newTop}px`;
    this.container.style.right = "auto";
    this.container.style.transform = "none";
  }

  stopDrag() {
    if (this.isDragging) {
      this.isDragging = false;
      this.container.style.cursor = "move";
      this.savePosition(); // Save position when dragging stops
    }
  }

  // NEW: Save position to localStorage
  savePosition() {
    const rect = this.container.getBoundingClientRect();
    const position = {
      left: rect.left,
      top: rect.top,
      collapsed: this.isCollapsed,
    };
    localStorage.setItem("miniMapPosition", JSON.stringify(position));
  }

  // NEW: Load position from localStorage
  loadPosition() {
    try {
      const saved = localStorage.getItem("miniMapPosition");
      if (saved) {
        const position = JSON.parse(saved);
        this.container.style.left = `${position.left}px`;
        this.container.style.top = `${position.top}px`;
        this.container.style.right = "auto";
        this.container.style.transform = "none";

        // Restore collapsed state if needed
        if (position.collapsed && !this.isCollapsed) {
          this.toggle();
        }
      }
    } catch (e) {
      console.warn("Failed to load mini-map position:", e);
    }
  }

  generateMiniMap(headings) {
    this.headings = headings;
    this.content.innerHTML = "";

    headings.forEach((heading) => {
      const item = document.createElement("div");
      item.className = `mini-map-item mini-map-${heading.tagName.toLowerCase()}`;
      item.textContent = this.truncateText(heading.textContent, 30);
      item.dataset.id = heading.id;

      this.content.appendChild(item);
    });

    // Add progress indicator
    this.progress.style.display = "block";
    this.updateProgress();
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }

  updateProgress() {
    const scrollTop = window.pageYOffset;
    const scrollHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercentage = (scrollTop / scrollHeight) * 100;

    this.progress.style.height = `${scrollPercentage}%`;
  }

  highlightActiveSection() {
    const scrollPosition = window.pageYOffset + 100;

    let activeSection = null;
    this.headings.forEach((heading) => {
      const element = document.getElementById(heading.id);
      if (element && element.offsetTop <= scrollPosition) {
        activeSection = heading.id;
      }
    });

    // Update active class
    document.querySelectorAll(".mini-map-item").forEach((item) => {
      item.classList.remove("active");
      if (item.dataset.id === activeSection) {
        item.classList.add("active");
      }
    });
  }

  scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }

  toggle() {
    this.isCollapsed = !this.isCollapsed;
    this.container.classList.toggle("collapsed", this.isCollapsed);
    this.toggleBtn.textContent = this.isCollapsed ? "+" : "−";
    this.savePosition(); // Save state when toggled
  }
}

// Initialize mini-map
const miniMap = new MiniMap();

// BLOG SHARE FUNCTIONALITY - MAKE IT GLOBAL
window.shareBlog = async function () {
  try {
    const currentUrl = window.location.href;
    console.log("Sharing URL:", currentUrl); // Debug log

    // Use modern Clipboard API if available
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(currentUrl);
      toastManager.success("Blog URL copied to clipboard!", "Share Successful");
    }
    // Fallback for older browsers
    else {
      const textArea = document.createElement("textarea");
      textArea.value = currentUrl;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);

      if (successful) {
        toastManager.success(
          "Blog URL copied to clipboard!",
          "Share Successful"
        );
      } else {
        throw new Error("Fallback copy method failed");
      }
    }
  } catch (error) {
    console.error("Share failed:", error);

    // Ultimate fallback - show URL for manual copy
    const currentUrl = window.location.href;
    toastManager.info(
      `Copy this URL to share: ${currentUrl}`,
      "Manual Share Required",
      10000
    );
  }
};

// Enhanced blog content loader with Markdown support
async function loadBlogWithMarkdown() {
  try {
    const token = localStorage.getItem("authToken");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    // Track view first
    await fetch(`${API_BASE_URL}/blogs/${blogSlug}/view`, {
      method: "POST",
      headers: headers,
    }).catch((err) => console.error("View tracking failed:", err));

    const response = await fetch(`${API_BASE_URL}/blogs/${blogSlug}`, {
      headers,
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Blog not found");
      } else if (response.status === 403) {
        throw new Error("Access denied");
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }

    const result = await response.json();

    document.getElementById("loading").style.display = "none";

    if (result.success) {
      await displayBlogWithMarkdown(result.blog);
      loadPopularBlogs(result.blog.tags);
    } else {
      showError(result.error || "Failed to load blog");
    }
  } catch (error) {
    console.error("Error loading blog:", error);
    document.getElementById("loading").style.display = "none";
    showError(error.message);
  }
}

// Fixed blog display with enhanced Markdown rendering including Mermaid
async function displayBlogWithMarkdown(blog) {
  document.getElementById("blogArticle").style.display = "block";

  // Set basic info
  document.getElementById("blogTitle").textContent = blog.title;
  document.getElementById("blogAuthor").textContent = `By ${blog.author}`;
  document.getElementById("blogDate").textContent = new Date(
    blog.createdAt
  ).toLocaleDateString();
  document.getElementById("blogViews").textContent = `${blog.views || 0} views`;
  document.getElementById("blogVisibility").textContent = blog.isPublic
    ? "🌍 Public"
    : "🔒 Private";

  // Set tags
  const tagsContainer = document.getElementById("blogTags");
  if (blog.tags && blog.tags.length > 0) {
    tagsContainer.innerHTML = blog.tags
      .map((tag) => `<span class="blog-tag">${escapeHtml(tag)}</span>`)
      .join("");
  } else {
    tagsContainer.innerHTML = "";
  }

  // Render markdown content with enhanced features
  const contentContainer = document.getElementById("blogContentText");
  if (blog.content && blog.content.trim()) {
    try {
      // Show loading state for markdown processing
      contentContainer.innerHTML =
        '<div class="loading">Rendering content with diagrams...</div>';

      // Render markdown with all enhancements including Mermaid
      const htmlContent = await markdownRenderer.render(blog.content);
      contentContainer.innerHTML = htmlContent;

      // CRITICAL FIX: Process the final content AFTER it's inserted into the DOM
      await markdownRenderer.processFinalContent(contentContainer);

      // Generate IDs for headings and create mini-map
      setTimeout(() => {
        const headings = Array.from(
          contentContainer.querySelectorAll("h1, h2, h3, h4, h5, h6")
        );
        headings.forEach((heading, index) => {
          if (!heading.id) {
            heading.id = `section-${index}`;
          }
        });

        if (typeof miniMap !== "undefined") {
          miniMap.generateMiniMap(headings);
        }
      }, 100);
    } catch (error) {
      console.error("Error rendering markdown:", error);
      // Fallback to basic markdown rendering
      contentContainer.innerHTML = `<p>${escapeHtml(blog.content)}</p>`;
    }
  } else {
    contentContainer.innerHTML = "<p>No content available.</p>";
  }

  // Set up header actions
  setupBlogHeaderActions(blog);
}
// Setup blog header actions
function setupBlogHeaderActions(blog) {
  const headerActionsContainer = document.getElementById("blogHeaderActions");
  const currentUser = localStorage.getItem("userId");

  // Clear existing actions
  headerActionsContainer.innerHTML = "";

  // Add share button for ALL public blogs
  if (blog.isPublic) {
    const shareButton = document.createElement("button");
    shareButton.className = "btn btn-primary";
    shareButton.innerHTML = "📤 Share Blog";
    shareButton.onclick = window.shareBlog; // Use global function
    shareButton.title = "Copy blog URL to clipboard";
    headerActionsContainer.appendChild(shareButton);
  }

  // Add edit/delete buttons only for blog author
  if (currentUser === blog.author) {
    const editButton = document.createElement("button");
    editButton.className = "btn btn-primary";
    editButton.textContent = "✏️ Edit Blog";
    editButton.onclick = openEditModal;
    headerActionsContainer.appendChild(editButton);

    const deleteButton = document.createElement("button");
    deleteButton.className = "btn btn-danger";
    deleteButton.textContent = "🗑️ Delete Blog";
    deleteButton.onclick = () => deleteBlog(blog.slug);
    headerActionsContainer.appendChild(deleteButton);
  }

  // Ensure buttons are visible
  headerActionsContainer.style.display = "flex";
  headerActionsContainer.style.gap = "10px";
  headerActionsContainer.style.flexWrap = "wrap";
}

// Load popular blogs based on current blog's tags
async function loadPopularBlogs(currentBlogTags) {
  try {
    const token = localStorage.getItem("authToken");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    // Get popular blogs
    const response = await fetch(`${API_BASE_URL}/blogs/popular?limit=5`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      displayPopularBlogs(result.blogs);
    } else {
      console.error("Failed to load popular blogs:", result.error);
      displayPopularBlogs([]);
    }
  } catch (error) {
    console.error("Error loading popular blogs:", error);
    displayPopularBlogs([]);
  }
}

function displayPopularBlogs(blogs) {
  const popularBlogsList = document.getElementById("popularBlogsList");

  if (!blogs || blogs.length === 0) {
    popularBlogsList.innerHTML = `
            <div class="popular-blog-item">
              <div class="popular-blog-title">No popular blogs available</div>
              <div class="popular-blog-meta">
                <span>Check back later</span>
              </div>
            </div>
          `;
    return;
  }

  popularBlogsList.innerHTML = blogs
    .map(
      (blog) => `
            <div class="popular-blog-item" onclick="window.location.href='/blogs/${
              blog.slug
            }'">
              <div class="popular-blog-title">${escapeHtml(blog.title)}</div>
              <div class="popular-blog-meta">
                <span>By ${escapeHtml(blog.author)}</span>
                <span>👁️ ${blog.views || 0} views</span>
              </div>
            </div>
          `
    )
    .join("");
}

function showError(message) {
  const errorDiv = document.getElementById("errorMessage");
  errorDiv.style.display = "block";
  if (message) {
    errorDiv.querySelector("p").textContent = message;
  }
}

// Custom Confirmation System
class ConfirmationManager {
  constructor() {
    this.overlay = document.getElementById("confirmationOverlay");
    this.message = document.getElementById("confirmationMessage");
    this.cancelBtn = document.getElementById("confirmationCancel");
    this.confirmBtn = document.getElementById("confirmationConfirm");

    this.resolvePromise = null;
    this.rejectPromise = null;

    this.init();
  }

  init() {
    // Event listeners for buttons
    this.cancelBtn.addEventListener("click", () => this.hide(false));
    this.confirmBtn.addEventListener("click", () => this.hide(true));

    // Close when clicking outside the popup
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) {
        this.hide(false);
      }
    });

    // Close with Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.overlay.style.display === "flex") {
        this.hide(false);
      }
    });
  }

  show(
    message = "Are you sure you want to delete this blog? This action cannot be undone."
  ) {
    this.message.textContent = message;
    this.overlay.style.display = "flex";

    // Focus the cancel button for accessibility
    setTimeout(() => this.cancelBtn.focus(), 100);

    return new Promise((resolve, reject) => {
      this.resolvePromise = resolve;
      this.rejectPromise = reject;
    });
  }

  hide(confirmed) {
    this.overlay.style.display = "none";
    if (this.resolvePromise) {
      this.resolvePromise(confirmed);
      this.resolvePromise = null;
      this.rejectPromise = null;
    }
  }
}

// Initialize confirmation manager
const confirmationManager = new ConfirmationManager();

async function deleteBlog(slug) {
  try {
    const confirmed = await confirmationManager.show(
      "Are you sure you want to delete this blog? This action cannot be undone."
    );

    if (!confirmed) {
      return; // User cancelled the deletion
    }

    const token = localStorage.getItem("authToken");
    const response = await fetch(`${API_BASE_URL}/blogs/${slug}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (result.success) {
      toastManager.success("Blog deleted successfully!", "Blog Deleted");
      setTimeout(() => {
        window.location.href = "https://focus-flow-lopn.onrender.com/blogs.html";
      }, 1500);
    } else {
      toastManager.error(result.error, "Delete Failed");
    }
  } catch (error) {
    console.error("Error deleting blog:", error);
    toastManager.error(
      "Failed to delete blog. Please try again.",
      "Network Error"
    );
  }
}

// Utility function to escape HTML
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Edit Blog Modal Functions
function openEditModal() {
  const blogTitle = document.getElementById("blogTitle").textContent;
  const blogContentElement = document.getElementById("blogContentText");

  let markdownContent = "";
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = blogContentElement.innerHTML;

  markdownContent = tempDiv.innerHTML
    .replace(/<h1[^>]*>(.*?)<\/h1>/g, "# $1\n\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/g, "## $1\n\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/g, "### $1\n\n")
    .replace(/<strong[^>]*>(.*?)<\/strong>/g, "**$1**")
    .replace(/<em[^>]*>(.*?)<\/em>/g, "*$1*")
    .replace(/<code[^>]*>(.*?)<\/code>/g, "`$1`")
    .replace(/<pre[^>]*>(.*?)<\/pre>/gs, "```\n$1\n```")
    .replace(/<p[^>]*>(.*?)<\/p>/g, "$1\n\n")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .trim();

  const blogTags = Array.from(document.querySelectorAll(".blog-tag"))
    .map((tag) => tag.textContent)
    .join(", ");

  const isPublic = document
    .querySelector(".blog-visibility")
    .textContent.includes("Public");

  document.getElementById("editBlogTitle").value = blogTitle;
  document.getElementById("editBlogContent").value = markdownContent;
  document.getElementById("editBlogTags").value = blogTags;
  document.getElementById("editBlogIsPublic").checked = isPublic;

  document.getElementById("editBlogModal").style.display = "flex";
}

function closeEditModal() {
  document.getElementById("editBlogModal").style.display = "none";
}

// Handle edit form submission
document
  .getElementById("editBlogForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("editBlogTitle").value;
    const content = document.getElementById("editBlogContent").value;
    const tags = document
      .getElementById("editBlogTags")
      .value.split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag);
    const isPublic = document.getElementById("editBlogIsPublic").checked;

    if (!title.trim() || !content.trim()) {
      toastManager.warning(
        "Title and content are required",
        "Validation Error"
      );
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toastManager.error(
          "Please log in to update blog",
          "Authentication Error"
        );
        return;
      }

      const submitBtn = e.target.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = "Updating...";
      submitBtn.disabled = true;

      const response = await fetch(`${API_BASE_URL}/blogs/${blogSlug}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, content, tags, isPublic }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      let result;
      try {
        const responseText = await response.text();
        result = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        throw new Error("Invalid server response format");
      }

      if (result && result.success) {
        closeEditModal();
        toastManager.success("Blog updated successfully!", "Blog Updated");
        setTimeout(() => {
          if (
            result.blog &&
            result.blog.slug &&
            result.blog.slug !== blogSlug
          ) {
            window.location.href = `/blogs/${result.blog.slug}`;
          } else {
            window.location.reload();
          }
        }, 1500);
      } else {
        throw new Error(result.error || result.message || "Update failed");
      }
    } catch (error) {
      console.error("Error updating blog:", error);
      if (
        error.message.includes("HTTP 401") ||
        error.message.includes("HTTP 403")
      ) {
        toastManager.error(
          "Authentication failed. Please log in again.",
          "Auth Error"
        );
      } else if (error.message.includes("HTTP 404")) {
        toastManager.error(
          "Blog not found. It may have been deleted.",
          "Not Found"
        );
      } else if (error.message.includes("HTTP 409")) {
        toastManager.error(
          "A blog with this title already exists.",
          "Conflict"
        );
      } else {
        toastManager.error(
          `Failed to update blog: ${error.message}`,
          "Update Error"
        );
      }
    } finally {
      const submitBtn = document.querySelector(
        '#editBlogForm button[type="submit"]'
      );
      if (submitBtn) {
        submitBtn.textContent = "Update Blog";
        submitBtn.disabled = false;
      }
    }
  });

// Modal event listeners
document.getElementById("editBlogModal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("editBlogModal")) {
    closeEditModal();
  }
});

document.addEventListener("keydown", (e) => {
  if (
    e.key === "Escape" &&
    document.getElementById("editBlogModal").style.display === "flex"
  ) {
    closeEditModal();
  }
});

// Scroll to Top Functionality
function initScrollToTop() {
  const scrollToTopBtn = document.getElementById("scrollToTop");
  if (!scrollToTopBtn) return;

  function toggleScrollToTop() {
    if (window.pageYOffset > 300) {
      scrollToTopBtn.classList.add("visible");
    } else {
      scrollToTopBtn.classList.remove("visible");
    }
  }

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  window.addEventListener("scroll", toggleScrollToTop);
  scrollToTopBtn.addEventListener("click", scrollToTop);

  scrollToTopBtn.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      scrollToTop();
    }
  });

  toggleScrollToTop();
}

// Replace the original loadBlog function
async function loadBlog() {
  await loadBlogWithMarkdown();
}

// Initialize when page loads
document.addEventListener("DOMContentLoaded", () => {
  initScrollToTop();
  loadBlog(); // This now uses the enhanced version
});
