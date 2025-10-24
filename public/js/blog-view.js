// Get blog slug from URL
const pathSegments = window.location.pathname.split("/");
const blogSlug = pathSegments[pathSegments.length - 1];
const API_BASE_URL = "https://focus-flow-lopn.onrender.com/api";

const FRONTEND_URL = "https://focus-flow-lopn.onrender.com";

document.getElementById("back-to-blogs").href = `${FRONTEND_URL}/blogs`;
document.getElementById("tracker-link").href = `${FRONTEND_URL}/`;

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

    // Process mermaid code blocks
    const processedText = text.replace(
      /```mermaid\s*([\s\S]*?)```/g,
      (match, diagram) => {
        diagramCount++;
        const id = "mermaid-" + Date.now() + "-" + diagramCount;
        const cleanDiagram = diagram.trim();

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
    if (!this.isMermaidInitialized) {
      console.error("Mermaid not initialized!");
      this.showGlobalError(container, "Mermaid library failed to initialize");
      return;
    }

    const mermaidContainers = container.querySelectorAll(".mermaid-container");

    if (mermaidContainers.length === 0) {
      return;
    }

    for (const containerEl of mermaidContainers) {
      try {
        const mermaidId = containerEl.getAttribute("data-mermaid-id");

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
      } catch (error) {
        console.error(`❌ Mermaid rendering error for ${mermaidId}:`, error);
        this.handleMermaidError(containerEl, error);
      }
    }
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

// Enhanced blog content loader with user detection
async function loadBlogWithMarkdown() {
  try {
    const token = localStorage.getItem("authToken");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    // Ensure user data is loaded
    await ensureUserDataLoaded();

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

// Helper function to ensure user data is loaded
async function ensureUserDataLoaded() {
  const token = localStorage.getItem("authToken");
  if (!token) return;

  // If username is not in localStorage, verify token and get user info
  if (!localStorage.getItem("username")) {
    try {
      const response = await fetch(`${API_BASE_URL}/verify-token`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.user) {
          localStorage.setItem("username", result.user);
          console.log("User data loaded:", result.user);
        }
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  }
}

// Fixed blog display with enhanced Markdown rendering including Mermaid
async function displayBlogWithMarkdown(blog) {
  document.getElementById("blogArticle").style.display = "block";

  // Set basic info
  document.getElementById("blogTitle").textContent = blog.title;

  // UPDATE: Blog author with profile link and uppercase
  const blogAuthorElement = document.getElementById("blogAuthor");
  const currentUser = localStorage.getItem("username");
  const isCurrentUserBlogAuthor = currentUser === blog.author;

  if (isCurrentUserBlogAuthor) {
    // Link to own profile
    blogAuthorElement.innerHTML = `By <a href="/profile" class="profile-link username-link">${blog.author.toUpperCase()}</a>`;
  } else {
    // Link to other user's profile
    blogAuthorElement.innerHTML = `By <a href="/user-profile?user=${
      blog.author
    }" class="profile-link username-link">${blog.author.toUpperCase()}</a>`;
  }

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
  const currentUser = localStorage.getItem("username");

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
                <span>By ${
                  blog.author === currentUser
                    ? `<a href="/profile" class="profile-link username-link">${blog.author.toUpperCase()}</a>`
                    : `<a href="/user-profile?user=${
                        blog.author
                      }" class="profile-link username-link">${blog.author.toUpperCase()}</a>`
                }</span>
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
        window.location.href = "https://focus-flow-lopn.onrender.com/blogs";
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
// Open edit blog modal - FIXED VERSION
async function openEditModal() {
  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch(`${API_BASE_URL}/blogs/${blogSlug}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      const blog = result.blog;

      document.getElementById("editBlogTitle").value = blog.title;

      // CRITICAL FIX: Use the original Markdown content directly from the database
      document.getElementById("editBlogContent").value = blog.content;

      document.getElementById("editBlogTags").value = blog.tags
        ? blog.tags.join(", ")
        : "";
      document.getElementById("editBlogIsPublic").checked = blog.isPublic;
      document.getElementById("editBlogModal").style.display = "flex";
    } else {
      toastManager.error(result.error, "Error Loading Blog");
    }
  } catch (error) {
    console.error("Error loading blog for edit:", error);
    toastManager.error("Failed to load blog for editing", "Network Error");
  }
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

// ===== CORRECTED REAL-TIME COMMENTS MANAGER =====

class CommentsManager {
  constructor() {
    this.commentsContainer = document.getElementById("commentsContainer");
    this.commentsCount = document.querySelector(".comments-count");
    this.sortTabs = document.querySelectorAll(".sort-tab");
    this.commentInput = document.querySelector(".comment-input");
    this.submitButton = document.querySelector(".submit-comment");
    this.currentSort = "newest";
    this.comments = [];
    this.socket = null;
    this.blogSlug = window.blogSlug;
    
    // FIX: Get current user directly from localStorage
    this.currentUser = localStorage.getItem("username");
    this.isBlogAuthor = false;

    console.log("CommentsManager created with user:", this.currentUser);
    
    this.init();
  }

  async init() {
    if (!this.currentUser) {
      console.warn("No user found, retrying in 1 second...");
      setTimeout(() => {
        this.currentUser = localStorage.getItem("username");
        if (this.currentUser) {
          this.continueInit();
        }
      }, 1000);
      return;
    }
    
    await this.continueInit();
  }

 // FIXED: Enhanced CommentsManager initialization
async continueInit() {
  console.log("🚀 Continuing CommentsManager init...");
  
  // FIX: Ensure currentUser is always set from localStorage
  this.currentUser = localStorage.getItem("username");
  
  if (!this.currentUser) {
    console.warn("⚠️ No user found in localStorage, attempting to verify token...");
    await this.verifyAndSetUser();
  }
  
  console.log("✅ CommentsManager initialized with user:", this.currentUser);
  
  await this.setupSocketConnection();
  this.setupEventListeners();
  await this.loadComments();
  this.updateCommentsCount();
  await this.checkBlogStats();
  await this.checkRestrictionStatus();
}

// NEW: Method to verify token and set user
async verifyAndSetUser() {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      console.warn("No auth token found");
      return;
    }

    const response = await fetch(`${API_BASE_URL}/verify-token`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.user) {
        this.currentUser = result.user;
        localStorage.setItem("username", result.user);
        console.log("✅ User verified and set:", result.user);
      }
    }
  } catch (error) {
    console.error("Error verifying user:", error);
  }
}

async refreshUserData() {
  const token = localStorage.getItem("authToken");
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE_URL}/verify-token`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.user) {
        this.currentUser = result.user;
        localStorage.setItem("username", result.user);
        console.log("🔄 User data refreshed:", result.user);
        return true;
      }
    }
  } catch (error) {
    console.error("Error refreshing user data:", error);
  }
  return false;
}

  setupSocketConnection() {
    this.socket = io("https://focus-flow-lopn.onrender.com");
    this.socket.emit("join-blog", this.blogSlug);

    // Real-time event listeners
    this.socket.on("new-comment", (comment) => {
      this.handleNewComment(comment);
    });

    this.socket.on("comment-updated", (comment) => {
      this.handleCommentUpdated(comment);
    });

    this.socket.on("comment-deleted", (commentId) => {
      this.handleCommentDeleted(commentId);
    });

    this.socket.on("comment-vote-updated", (data) => {
      this.handleVoteUpdated(data);
    });

    this.socket.on("comment-reported", (data) => {
      this.handleReportUpdated(data);
    });

    this.socket.on("comment-pin-updated", (comment) => {
      this.handlePinUpdated(comment);
    });

    this.socket.on("user-restricted", (data) => {
      if (data.username === this.currentUser) {
        this.handleUserRestricted();
      }
    });
  }

// Update the loadComments method to ensure blog author check completes
async loadComments() {
  try {
    const token = localStorage.getItem("authToken");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const response = await fetch(
      `${API_BASE_URL}/blogs/${this.blogSlug}/comments?sort=${this.currentSort}`,
      {
        headers,
      }
    );

    if (!response.ok) {
      throw new Error("Failed to load comments");
    }

    const result = await response.json();

    if (result.success) {
      this.comments = result.comments;
      // Ensure blog author check is complete before rendering
      await this.checkBlogAuthor();
      this.renderComments();
    }
  } catch (error) {
    console.error("Error loading comments:", error);
    toastManager.error("Failed to load comments", "Error");
  }
}

async checkBlogAuthor() {
  try {
    const token = localStorage.getItem("authToken");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    console.log("Checking blog author for slug:", this.blogSlug);
    console.log("Current user from localStorage:", this.currentUser);

    const response = await fetch(`${API_BASE_URL}/blogs/${this.blogSlug}`, {
      headers,
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        this.isBlogAuthor = result.blog.author === this.currentUser;
        console.log(`Blog author check: ${this.isBlogAuthor} (current user: ${this.currentUser}, blog author: ${result.blog.author})`);
        
        // If user is blog author, log which comments they can pin
        if (this.isBlogAuthor) {
          console.log("User is blog author, pin buttons should be visible on parent comments");
        }
      }
    } else {
      console.error("Failed to fetch blog data:", response.status);
    }
  } catch (error) {
    console.error("Error checking blog author:", error);
  }
}


  setupEventListeners() {
    this.sortTabs.forEach((tab) => {
      tab.addEventListener("click", () => this.handleSortChange(tab));
    });

    this.submitButton.addEventListener("click", () => this.submitComment());
    this.commentInput.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "Enter") {
        this.submitComment();
      }
    });

    // UPDATE: Set current user's avatar in comment input
    this.updateCommentInputAvatar();
  }

  updateCommentInputAvatar() {
    const avatarPlaceholder = document.querySelector(".avatar-placeholder");
    if (avatarPlaceholder && this.currentUser) {
      avatarPlaceholder.textContent = this.currentUser.charAt(0).toUpperCase();
    }
  }

  async handleSortChange(clickedTab) {
    this.sortTabs.forEach((tab) => tab.classList.remove("active"));
    clickedTab.classList.add("active");

    this.currentSort = clickedTab.dataset.sort;
    await this.loadComments();
  }

  async submitComment() {
    const content = this.commentInput.value.trim();
    if (!content) return;

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toastManager.error(
          "Please log in to comment",
          "Authentication Required"
        );
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/blogs/${this.blogSlug}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to post comment");
      }

      this.commentInput.value = "";
      this.showSubmissionSuccess();
    } catch (error) {
      console.error("Error submitting comment:", error);
      toastManager.error(error.message, "Comment Failed");
    }
  }

  showSubmissionSuccess() {
    const submitBtn = this.submitButton;
    const originalText = submitBtn.textContent;

    submitBtn.textContent = "Posted!";
    submitBtn.style.background = "var(--codeleaf-success)";

    setTimeout(() => {
      submitBtn.textContent = originalText;
      submitBtn.style.background = "";
    }, 2000);
  }

 // ✏️ ENHANCED EDIT COMMENT FUNCTIONALITY
async editComment(commentId) {
  const commentElement = document.querySelector(
    `[data-comment-id="${commentId}"]`
  );
  const commentContent = commentElement.querySelector(".comment-content");
  const currentContent = commentContent.textContent;

  // Create edit interface
  const editContainer = document.createElement("div");
  editContainer.className = "edit-comment-container";
  editContainer.innerHTML = `
    <textarea class="edit-comment-input" rows="3">${currentContent}</textarea>
    <div class="edit-actions">
      <button class="btn btn-secondary cancel-edit">Cancel</button>
      <button class="btn btn-primary save-edit">Save Changes</button>
    </div>
  `;

  // Replace content with edit interface
  commentContent.style.display = "none";
  commentContent.parentNode.insertBefore(editContainer, commentContent);

  // Focus and select the textarea
  const textarea = editContainer.querySelector(".edit-comment-input");
  textarea.focus();
  textarea.select();

  // Event listeners
  const cancelBtn = editContainer.querySelector(".cancel-edit");
  const saveBtn = editContainer.querySelector(".save-edit");

  const cancelEdit = () => {
    editContainer.remove();
    commentContent.style.display = "block";
  };

  const saveEdit = async () => {
    const newContent = textarea.value.trim();
    if (!newContent) {
      toastManager.error(
        "Comment content cannot be empty",
        "Validation Error"
      );
      return;
    }

    if (newContent === currentContent) {
      cancelEdit();
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `${API_BASE_URL}/comments/${commentId}/edit`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: newContent }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update comment");
      }

      // Show success message - real-time update will handle the UI change
      toastManager.success("Comment updated successfully", "Edit Successful");
    } catch (error) {
      console.error("Error editing comment:", error);
      toastManager.error(error.message, "Edit Failed");
    }
  };

  cancelBtn.addEventListener("click", cancelEdit);
  saveBtn.addEventListener("click", saveEdit);

  // Handle Enter key to save, Escape to cancel
  textarea.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "Enter") {
      saveBtn.click();
    } else if (e.key === "Escape") {
      cancelBtn.click();
    }
  });

  // Close edit on outside click
  const handleOutsideClick = (e) => {
    if (!editContainer.contains(e.target)) {
      cancelEdit();
      document.removeEventListener("click", handleOutsideClick);
    }
  };

  setTimeout(() => {
    document.addEventListener("click", handleOutsideClick);
  }, 100);
}

  // Delete comment
  async deleteComment(commentId) {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toastManager.error(
          "Please log in to delete comments",
          "Authentication Required"
        );
        return;
      }

      // Show confirmation dialog
      const confirmed = await confirmationManager.show(
        "Are you sure you want to delete this comment? This action cannot be undone."
      );

      if (!confirmed) {
        return; // User cancelled the deletion
      }

      // Show loading state
      const commentElement = document.querySelector(
        `[data-comment-id="${commentId}"]`
      );
      if (commentElement) {
        commentElement.style.opacity = "0.5";
        commentElement.style.pointerEvents = "none";
      }

      const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete comment");
      }

      // Show success message - real-time update will handle the UI change
      toastManager.success("Comment deleted successfully", "Delete Successful");
    } catch (error) {
      console.error("Error deleting comment:", error);

      // Reset loading state
      const commentElement = document.querySelector(
        `[data-comment-id="${commentId}"]`
      );
      if (commentElement) {
        commentElement.style.opacity = "1";
        commentElement.style.pointerEvents = "auto";
      }

      toastManager.error(error.message, "Delete Failed");
    }
  }

// 📌 ENHANCED PIN COMMENT FUNCTIONALITY
async pinComment(commentId) {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      toastManager.error(
        "Please log in to pin comments",
        "Authentication Required"
      );
      return;
    }

    // Show loading state
    const pinBtn = document.querySelector(
      `[data-comment-id="${commentId}"] .comment-pin`
    );
    const originalHTML = pinBtn.innerHTML;
    pinBtn.innerHTML = "⏳";
    pinBtn.disabled = true;

    const response = await fetch(
      `${API_BASE_URL}/comments/${commentId}/pin`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to pin comment");
    }

    const result = await response.json();
    
    // Show success message
    toastManager.success(
      result.message || "Comment pin status updated",
      "Success"
    );

  } catch (error) {
    console.error("Error pinning comment:", error);
    
    if (error.message.includes("only pin up to 2 comments")) {
      toastManager.error(
        "You can only pin up to 2 comments at a time",
        "Pin Limit Reached"
      );
    } else {
      toastManager.error(error.message, "Pin Failed");
    }
  } finally {
    // Reset button state (real-time update will handle the actual state change)
    const pinBtn = document.querySelector(
      `[data-comment-id="${commentId}"] .comment-pin`
    );
    if (pinBtn) {
      pinBtn.disabled = false;
    }
  }
}

  // Existing functionality (keep these as they are)
  async handleVote(commentId, voteType) {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toastManager.error("Please log in to vote", "Authentication Required");
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/comments/${commentId}/vote`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ voteType }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to vote");
      }
    } catch (error) {
      console.error("Error voting:", error);
      toastManager.error(error.message, "Vote Failed");
    }
  }

  async toggleReply(commentId) {
    const replyInput = document.querySelector(
      `[data-comment-id="${commentId}"] .reply-input-container`
    );
    if (replyInput) {
      replyInput.style.display =
        replyInput.style.display === "none" ? "block" : "none";
    } else {
      this.createReplyInput(commentId);
    }
  }

  createReplyInput(commentId) {
    const commentElement = document.querySelector(
      `[data-comment-id="${commentId}"]`
    );
    const replyInput = document.createElement("div");
    replyInput.className = "reply-input-container";
    replyInput.innerHTML = `
      <textarea class="reply-input" placeholder="Write a reply..." rows="2"></textarea>
      <div class="reply-actions">
        <button class="btn btn-secondary cancel-reply">Cancel</button>
        <button class="btn btn-primary submit-reply">Reply</button>
      </div>
    `;

    commentElement.appendChild(replyInput);

    const cancelBtn = replyInput.querySelector(".cancel-reply");
    const submitBtn = replyInput.querySelector(".submit-reply");
    const textarea = replyInput.querySelector(".reply-input");

    cancelBtn.addEventListener("click", () => {
      replyInput.remove();
    });

    submitBtn.addEventListener("click", () => {
      this.submitReply(commentId, textarea.value);
    });

    textarea.focus();
  }

  async submitReply(commentId, content) {
    if (!content.trim()) return;

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toastManager.error("Please log in to reply", "Authentication Required");
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/blogs/${this.blogSlug}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            content: content.trim(),
            parentId: commentId,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to post reply");
      }

      const replyInput = document.querySelector(
        `[data-comment-id="${commentId}"] .reply-input-container`
      );
      if (replyInput) {
        replyInput.remove();
      }
    } catch (error) {
      console.error("Error submitting reply:", error);
      toastManager.error(error.message, "Reply Failed");
    }
  }

  async toggleReplies(commentId) {
    const repliesContainer = document.querySelector(
      `[data-comment-id="${commentId}"] .comment-replies`
    );
    const toggleBtn = document.querySelector(
      `[data-comment-id="${commentId}"] .reply-toggle`
    );

    if (repliesContainer && toggleBtn) {
      repliesContainer.classList.toggle("collapsed");
      toggleBtn.classList.toggle("collapsed");

      const isCollapsed = repliesContainer.classList.contains("collapsed");
      toggleBtn.querySelector(".text").textContent = isCollapsed
        ? "Show replies"
        : "Hide replies";
    }
  }

  async reportComment(commentId) {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toastManager.error(
          "Please log in to report comments",
          "Authentication Required"
        );
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/comments/${commentId}/report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to report comment");
      }

      const result = await response.json();
      toastManager.info(result.message, "Report Submitted");
    } catch (error) {
      console.error("Error reporting comment:", error);
      toastManager.error(error.message, "Report Failed");
    }
  }

  // 🧩 FIXED NESTED COMMENT DISPLAY - Real-time event handlers
  handleNewComment(comment) {
    if (comment.parentId) {
      const parentComment = this.findCommentById(
        comment.parentId,
        this.comments
      );
      if (parentComment) {
        if (!parentComment.replies) parentComment.replies = [];
        parentComment.replies.unshift(comment);
        this.renderComments();
      }
    } else {
      this.comments.unshift(comment);
      this.renderComments();
    }

    this.updateCommentsCount();
    this.checkBlogStats();
  }

  handleCommentUpdated(updatedComment) {
    const comment = this.findCommentById(updatedComment._id, this.comments);
    if (comment) {
      Object.assign(comment, updatedComment);
      this.renderComments();
    }
  }

  handleCommentDeleted(commentId) {
    this.removeCommentById(commentId, this.comments);
    this.renderComments();
    this.updateCommentsCount();
    this.checkBlogStats();
  }

  handleVoteUpdated(data) {
    const comment = this.findCommentById(data.commentId, this.comments);
    if (comment) {
      comment.likes = data.likes;
      comment.dislikes = data.dislikes;
      this.updateCommentVotes(data.commentId);
    }
    this.checkBlogStats();
  }

  handleReportUpdated(data) {
    const comment = this.findCommentById(data.commentId, this.comments);
    if (comment) {
      comment.reports = data.reports;
      this.updateReportWarning(comment);
    }
  }

  handlePinUpdated(updatedComment) {
    const comment = this.findCommentById(updatedComment._id, this.comments);
    if (comment) {
      comment.isPinned = updatedComment.isPinned;
      this.renderComments();
    }
  }

  // 🧩 FIXED: Recursive comment rendering for all nested levels
  renderComments() {
    if (this.comments.length === 0) {
      this.commentsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">💬</div>
          <h3>No comments yet</h3>
          <p>Be the first to share your thoughts!</p>
        </div>
      `;
      return;
    }

    let html = "";

    // 📌 Pinned comments always at top regardless of sorting
    const pinnedComments = this.comments.filter((comment) => comment.isPinned);
    const normalComments = this.comments.filter((comment) => !comment.isPinned);

    pinnedComments.forEach((comment) => {
      html += this.renderComment(comment, 0);
    });

    normalComments.forEach((comment) => {
      html += this.renderComment(comment, 0);
    });

    this.commentsContainer.innerHTML = html;
    this.attachCommentEventListeners();
  }

// FIXED: Enhanced renderComment method with reliable user detection
renderComment(comment, depth = 0) {
  const timeAgo = this.getTimeAgo(comment.createdAt);
  const hasReplies = comment.replies && comment.replies.length > 0;
  const isRestricted = comment.reports >= 3;
  
  // FIX: Get current user directly from localStorage with fallback
  const currentUser = localStorage.getItem("username") || this.currentUser;
  
  // FIX: Proper null/undefined check for isAuthor
  const isAuthor = !!currentUser && comment.author === currentUser;
  const isParentComment = depth === 0;

  console.log(`🔍 Rendering comment - Author: ${comment.author}, CurrentUser: ${currentUser}, IsAuthor: ${isAuthor}, IsBlogAuthor: ${this.isBlogAuthor}`);

  return `
    <div class="comment-item ${comment.isPinned ? "pinned" : ""} ${
    isRestricted ? "reported" : ""
  }" data-comment-id="${comment._id}">
      <div class="comment-header">
        <div class="comment-user">
          <div class="comment-avatar">${comment.author
            .charAt(0)
            .toUpperCase()}</div>
          <div class="comment-user-info">
            <div class="comment-author">${comment.author}</div>
            <div class="comment-meta">
              <span class="comment-time">⏱️ ${timeAgo}</span>
              ${
                comment.isEdited
                  ? '<span class="comment-edited">Edited</span>'
                  : ""
              }
              ${
                comment.isPinned
                  ? '<span class="comment-pinned-tag">📌 Pinned</span>'
                  : ""
              }
            </div>
          </div>
        </div>
        <div class="comment-actions">
          ${
            isParentComment && this.isBlogAuthor
              ? `
            <button class="comment-pin ${
              comment.isPinned ? "pinned" : ""
            }" title="${comment.isPinned ? "Unpin" : "Pin comment"}">
              ${comment.isPinned ? "📌" : "📍"}
            </button>
          `
              : ""
          }
        </div>
      </div>
      
      <div class="comment-content">${this.escapeHtml(comment.content)}</div>
      
      ${
        isRestricted
          ? `
        <div class="report-warning">
          ⚠️ This comment may not be helpful.
        </div>
      `
          : ""
      }
      
      <div class="comment-footer">
        <div class="comment-votes">
          <button class="vote-btn like-btn ${
            comment.likedBy && currentUser && comment.likedBy.includes(currentUser)
              ? "liked"
              : ""
          }" title="Like" ${!currentUser ? 'disabled' : ''}>
            👍 <span class="vote-count like-count">${comment.likes}</span>
          </button>
          <button class="vote-btn dislike-btn ${
            comment.dislikedBy && currentUser && comment.dislikedBy.includes(currentUser)
              ? "disliked"
              : ""
          }" title="Dislike" ${!currentUser ? 'disabled' : ''}>
            👎 <span class="vote-count dislike-count">${
              comment.dislikes
            }</span>
          </button>
        </div>
        
        <div class="comment-actions-right">
          ${
            // FIX: Consistent Edit button visibility check
            isAuthor
              ? `
            <button class="action-btn edit-btn" title="Edit comment">
              ✏️ Edit
            </button>
          `
              : ""
          }
          <button class="action-btn reply-btn" title="Reply" ${!currentUser ? 'disabled' : ''}>
            💬 Reply
          </button>
          ${
            !isAuthor && currentUser
              ? `
            <button class="action-btn report-btn" title="Report">
              🚩 Report
            </button>
          `
              : ""
          }
          ${
            hasReplies
              ? `
            <button class="reply-toggle ${depth > 2 ? "collapsed" : ""}">
              <span class="icon">▼</span>
              <span class="text">${
                depth > 2 ? "Show replies" : "Hide replies"
              }</span>
              <span class="reply-count">(${comment.replies.length})</span>
            </button>
          `
              : ""
          }
        </div>
      </div>
      
      ${
        hasReplies
          ? `
        <div class="comment-replies ${depth > 2 ? "collapsed" : ""}">
          ${comment.replies
            .map((reply) => this.renderComment(reply, depth + 1))
            .join("")}
        </div>
      `
          : ""
      }
    </div>
  `;
}
  attachCommentEventListeners() {
    // Vote buttons
    document.querySelectorAll(".like-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const commentId = this.getCommentIdFromElement(btn);
        this.handleVote(commentId, "like");
      });
    });

    document.querySelectorAll(".dislike-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const commentId = this.getCommentIdFromElement(btn);
        this.handleVote(commentId, "dislike");
      });
    });

    // ✏️ Edit buttons (for both parent and nested comments)
    document.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const commentId = this.getCommentIdFromElement(btn);
        this.editComment(commentId);
      });
    });

    // 📌 Pin buttons (only for blog author on parent comments)
    document.querySelectorAll(".comment-pin").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const commentId = this.getCommentIdFromElement(btn);
        this.pinComment(commentId);
      });
    });

    // Reply buttons
    document.querySelectorAll(".reply-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const commentId = this.getCommentIdFromElement(btn);
        this.toggleReply(commentId);
      });
    });

    // Reply toggle buttons
    document.querySelectorAll(".reply-toggle").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const commentId = this.getCommentIdFromElement(btn);
        this.toggleReplies(commentId);
      });
    });

    // Report buttons
    document.querySelectorAll(".report-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const commentId = this.getCommentIdFromElement(btn);
        this.reportComment(commentId);
      });
    });
  }

  // Helper methods
  getCommentIdFromElement(element) {
    return element.closest(".comment-item").dataset.commentId;
  }

  findCommentById(commentId, comments = this.comments) {
    for (const comment of comments) {
      if (comment._id === commentId) return comment;
      if (comment.replies) {
        const foundInReplies = this.findCommentById(commentId, comment.replies);
        if (foundInReplies) return foundInReplies;
      }
    }
    return null;
  }

  removeCommentById(commentId, comments) {
    const index = comments.findIndex((comment) => comment._id === commentId);
    if (index !== -1) {
      comments.splice(index, 1);
      return true;
    }

    for (const comment of comments) {
      if (comment.replies) {
        const removed = this.removeCommentById(commentId, comment.replies);
        if (removed) return true;
      }
    }

    return false;
  }

  getTimeAgo(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
  }

  updateCommentsCount() {
    const totalComments = this.countTotalComments(this.comments);
    this.commentsCount.textContent = `${totalComments} Comment${
      totalComments !== 1 ? "s" : ""
    }`;
  }

  countTotalComments(comments) {
    return comments.reduce((total, comment) => {
      return (
        total +
        1 +
        (comment.replies ? this.countTotalComments(comment.replies) : 0)
      );
    }, 0);
  }

  escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async checkBlogStats() {
    try {
      const response = await fetch(
        `${API_BASE_URL}/blogs/${this.blogSlug}/stats`
      );
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          this.updateHelpfulLabel(result.stats);
        }
      }
    } catch (error) {
      console.error("Error checking blog stats:", error);
    }
  }

  updateHelpfulLabel(stats) {
    const blogTitle = document.getElementById("blogTitle");
    const existingLabel = blogTitle.querySelector(".helpful-label");

    if (existingLabel) {
      existingLabel.remove();
    }

    if (stats.totalLikes + stats.totalDislikes === 0) return;

    const label = document.createElement("span");
    label.className = "helpful-label";

    // Set data attribute for styling
    label.setAttribute("data-helpful", stats.isHelpful.toString());

    // Add new class for animation
    label.classList.add("new");

    // FORCE WHITE TEXT via inline styles as backup
    label.style.color = "#ffffff";
    label.style.setProperty("color", "#ffffff", "important");

    if (stats.isHelpful) {
      label.textContent = "Helpful";
      label.style.background = "linear-gradient(135deg, #10b981, #059669)";
    } else {
      label.textContent = "Not Helpful";
      label.style.background = "linear-gradient(135deg, #ef4444, #dc2626)";
    }

    // Add tooltip for more context
    label.title = `Based on ${stats.totalLikes} likes and ${stats.totalDislikes} dislikes from comments`;

    // Remove animation class after animation completes
    setTimeout(() => {
      label.classList.remove("new");
    }, 2000);

    blogTitle.appendChild(label);

    // Double-check text color after appending
    setTimeout(() => {
      label.style.color = "#ffffff";
      label.style.setProperty("color", "#ffffff", "important");
    }, 100);
  }

  async checkRestrictionStatus() {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch(
        `${API_BASE_URL}/blogs/${this.blogSlug}/restriction-check`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.isRestricted) {
          this.handleUserRestricted();
        }
      }
    } catch (error) {
      console.error("Error checking restriction status:", error);
    }
  }

  handleUserRestricted() {
    this.commentInput.disabled = true;
    this.commentInput.placeholder =
      "You are restricted from commenting on this blog due to multiple reports";
    this.submitButton.disabled = true;

    toastManager.warning(
      "You are restricted from commenting on this blog due to multiple reports",
      "Commenting Restricted"
    );
  }

  updateCommentVotes(commentId) {
    const comment = this.findCommentById(commentId, this.comments);
    const likeCount = document.querySelector(
      `[data-comment-id="${commentId}"] .like-count`
    );
    const dislikeCount = document.querySelector(
      `[data-comment-id="${commentId}"] .dislike-count`
    );

    if (likeCount && comment) likeCount.textContent = comment.likes;
    if (dislikeCount && comment) dislikeCount.textContent = comment.dislikes;
  }

  updateReportWarning(comment) {
    const commentElement = document.querySelector(
      `[data-comment-id="${comment._id}"]`
    );
    if (!commentElement) return;

    let warning = commentElement.querySelector(".report-warning");
    if (comment.reports >= 3 && !warning) {
      warning = document.createElement("div");
      warning.className = "report-warning";
      warning.innerHTML = "⚠️ This comment may not be helpful.";
      commentElement.querySelector(".comment-content").appendChild(warning);
    }
  }
}

// FIXED: Enhanced initialization with retry mechanism
document.addEventListener("DOMContentLoaded", () => {
  // Store blog slug globally
  window.blogSlug = blogSlug;

  // Initialize comments manager with retry logic
  const initializeCommentsManager = (retryCount = 0) => {
    const currentUser = localStorage.getItem("username");
    
    if (!currentUser && retryCount < 5) {
      console.log(`🔄 Waiting for user data... (attempt ${retryCount + 1}/5)`);
      setTimeout(() => initializeCommentsManager(retryCount + 1), 500);
      return;
    }
    
    console.log("🎯 Initializing CommentsManager with user:", currentUser);
    window.commentsManager = new CommentsManager();
  };

  // Start initialization
  initializeCommentsManager();
});

// Replace the original loadBlog function
async function loadBlog() {
  await loadBlogWithMarkdown();
}

// Initialize when page loads
document.addEventListener("DOMContentLoaded", () => {
  initScrollToTop();
  loadBlog(); // This now uses the enhanced version
});
