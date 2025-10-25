let currentPage = 1;
let totalPages = 1;
let editingBlog = null;
let currentTab = "all"; // 'all', 'my-blogs', 'popular'
const API_BASE_URL = "http://localhost:3000/api";
const BASE_URL = "http://localhost:3000";

// URL Redirect
const FRONTEND_URL = "http://localhost:3000";

document.getElementById("back-link").href = `${FRONTEND_URL}/`;
document.getElementById("blog-link").href = `${FRONTEND_URL}/blogs`;

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

    // Animate in
    setTimeout(() => toast.classList.add("show"), 10);

    // Auto-hide if duration is set
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

  // Convenience methods
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

// Check authentication and load blogs - UPDATED
async function initBlogs() {
  const token = localStorage.getItem("authToken");
  const userId = localStorage.getItem("userId");

  if (!token || !userId) {
    document.getElementById("authSection").style.display = "block";
    return;
  }

  document.getElementById("blogsContent").style.display = "block";

  // Initialize search FIRST
  initializeBlogsPageSearch();

  // Then load blogs
  await loadBlogs();
  await updateTabCounts();
}

// Switch between tabs with smooth animation - UPDATED
async function switchTab(tabName) {
  currentTab = tabName;
  currentPage = 1;

  // Update active tab UI
  document.querySelectorAll(".tab-compact").forEach((tab) => {
    tab.classList.remove("active");
  });
  document.getElementById(`tab-${tabName}`).classList.add("active");

  // Clear any active search when switching tabs
  if (blogsPageSearch) {
    blogsPageSearch.clearSearch();
  }

  // Add fade animation
  const blogsGrid = document.getElementById("blogsGrid");
  blogsGrid.classList.add("fade-out");

  // Load appropriate blogs after fade out
  setTimeout(async () => {
    await loadBlogs();
    blogsGrid.classList.remove("fade-out");
    blogsGrid.classList.add("fade-in");

    // Remove fade-in class after animation completes
    setTimeout(() => {
      blogsGrid.classList.remove("fade-in");
    }, 300);
  }, 200);
}

// Load blogs based on current tab - UPDATED to fix popular tab
async function loadBlogs(page = 1) {
  try {
    const token = localStorage.getItem("authToken");
    let url = "";

    // Determine which API endpoint to call based on current tab
    switch (currentTab) {
      case "all":
        url = `${API_BASE_URL}/blogs/all?page=${page}&limit=9`;
        break;
      case "my-blogs":
        url = `${API_BASE_URL}/blogs/my?page=${page}&limit=9`;
        break;
      case "popular":
        url = `${API_BASE_URL}/blogs/popular?limit=9`;
        break;
      default:
        url = `${API_BASE_URL}/blogs?page=${page}&limit=9`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // Handle 404 for popular route specifically
      if (response.status === 404 && currentTab === "popular") {
        throw new Error(
          "Popular blogs endpoint not found. Please check server configuration."
        );
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      displayBlogs(result.blogs);

      // Setup pagination only for tabs that support it
      if (currentTab !== "popular") {
        setupPagination(result.currentPage, result.totalPages, result.total);
      } else {
        document.getElementById("pagination").innerHTML = "";
      }
    } else {
      toastManager.error(result.error || "Failed to load blogs", "Blog Error");
    }
  } catch (error) {
    console.error("Error loading blogs:", error);

    // More specific error message for popular tab
    if (currentTab === "popular") {
      toastManager.error(
        "Failed to load popular blogs. The feature might be temporarily unavailable.",
        "Popular Blogs Error"
      );
    } else {
      toastManager.error(
        "Failed to load blogs. Please try again.",
        "Network Error"
      );
    }
  }
}

// Update tab counts - FIXED for popular tab
async function updateTabCounts() {
  try {
    const token = localStorage.getItem("authToken");

    // Get counts for all tabs
    const [allBlogsRes, myBlogsRes, popularBlogsRes] = await Promise.all([
      fetch(`${API_BASE_URL}/blogs/all?limit=1`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`${API_BASE_URL}/blogs/my?limit=1`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`${API_BASE_URL}/blogs/popular?limit=100`, {
        // Increased limit to get accurate count
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    const [allBlogs, myBlogs, popularBlogs] = await Promise.all([
      allBlogsRes.ok ? allBlogsRes.json() : { success: false },
      myBlogsRes.ok ? myBlogsRes.json() : { success: false },
      popularBlogsRes.ok ? popularBlogsRes.json() : { success: false },
    ]);

    // Update badge counts with fallbacks
    if (allBlogs.success) {
      document.getElementById("all-blogs-count").textContent =
        allBlogs.total || 0;
    } else {
      document.getElementById("all-blogs-count").textContent = "0";
    }

    if (myBlogs.success) {
      document.getElementById("my-blogs-count").textContent =
        myBlogs.total || 0;
    } else {
      document.getElementById("my-blogs-count").textContent = "0";
    }

    if (popularBlogs.success) {
      document.getElementById("popular-blogs-count").textContent =
        popularBlogs.blogs?.length || 0;
    } else {
      document.getElementById("popular-blogs-count").textContent = "0";
    }
  } catch (error) {
    console.error("Error updating tab counts:", error);
    // Set fallback values
    document.getElementById("all-blogs-count").textContent = "0";
    document.getElementById("my-blogs-count").textContent = "0";
    document.getElementById("popular-blogs-count").textContent = "0";
  }
}

// Smart card layout algorithm to fill each page completely
function getCardLayoutForPage(blogs, pageIndex) {
  const cardsPerPage = 9; // 3x3 grid
  const startIndex = pageIndex * cardsPerPage;
  const pageBlogs = blogs.slice(startIndex, startIndex + cardsPerPage);

  if (pageBlogs.length === 0) return [];

  // Define layout patterns that fill the 3x3 grid completely
  const layoutPatterns = [
    // Pattern 1: 2 big + 5 small (fills 9 slots: 2*2 + 5*1 = 9)
    ["big", "small", "small", "big", "small", "small", "small"],
    // Pattern 2: 1 big + 7 small (fills 9 slots: 1*2 + 7*1 = 9)
    ["big", "small", "small", "small", "small", "small", "small", "small"],
    // Pattern 3: 3 big + 3 small (fills 9 slots: 3*2 + 3*1 = 9)
    ["big", "small", "big", "small", "big", "small"],
    // Pattern 4: 4 small only (when less content)
    [
      "small",
      "small",
      "small",
      "small",
      "small",
      "small",
      "small",
      "small",
      "small",
    ],
  ];

  // Choose pattern based on number of blogs and content richness
  let pattern;
  if (pageBlogs.length >= 7) {
    pattern = layoutPatterns[0]; // Use pattern with 2 big cards
  } else if (pageBlogs.length >= 5) {
    pattern = layoutPatterns[1]; // Use pattern with 1 big card
  } else if (pageBlogs.length >= 3) {
    pattern = layoutPatterns[2]; // Use pattern with alternating big/small
  } else {
    pattern = layoutPatterns[3].slice(0, pageBlogs.length); // All small
  }

  // Apply the pattern to the current page blogs
  const layout = [];
  let patternIndex = 0;

  for (let i = 0; i < pageBlogs.length; i++) {
    if (patternIndex >= pattern.length) {
      patternIndex = 0; // Loop pattern if needed
    }
    layout.push({
      blog: pageBlogs[i],
      type: pattern[patternIndex],
    });
    patternIndex++;
  }

  return layout;
}

// Helper function to format blog dates
function formatBlogDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Helper function to escape HTML
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Blog Search System for Blogs Page
class BlogsPageSearch {
  constructor() {
    this.searchInput = document.getElementById("blogsPageSearch");
    this.searchLoader = document.getElementById("blogsPageSearchLoader");
    this.searchClear = document.getElementById("blogsPageSearchClear");
    this.searchResultsInfo = document.getElementById(
      "blogsPageSearchResultsInfo"
    );
    this.searchResultsCount = document.getElementById(
      "blogsPageSearchResultsCount"
    );
    this.clearSearchBtn = document.getElementById("blogsPageClearSearchBtn");
    this.blogsGrid = document.getElementById("blogsGrid");

    this.debounceTimer = null;
    this.searchDelay = 300; // ms
    this.isSearching = false;
    this.originalBlogsData = [];
    this.filteredBlogsData = [];
    this.currentSearchTerm = "";
    this.currentTab = "all";

    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    // Input event with debounce
    this.searchInput.addEventListener("input", (e) => {
      this.handleSearchInput(e.target.value);
    });

    // Clear search button
    this.searchClear.addEventListener("click", () => {
      this.clearSearch();
    });

    // Clear search from results info
    this.clearSearchBtn.addEventListener("click", () => {
      this.clearSearch();
    });

    // Keyboard shortcuts
    this.searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.clearSearch();
      }
    });

    // Focus management
    this.searchInput.addEventListener("focus", () => {
      this.searchInput.parentElement.classList.add("focused");
    });

    this.searchInput.addEventListener("blur", () => {
      this.searchInput.parentElement.classList.remove("focused");
    });
  }

  // Set blog data based on current tab
  setBlogData(blogData, tab = "all") {
    console.log("BlogsPageSearch: Setting blog data for tab", tab, blogData);
    this.originalBlogsData = Array.isArray(blogData) ? blogData : [];
    this.currentTab = tab;
    console.log(
      "BlogsPageSearch: Now has",
      this.originalBlogsData.length,
      "blogs in",
      tab,
      "tab"
    );
  }

  handleSearchInput(searchTerm) {
    // Clear previous timer
    clearTimeout(this.debounceTimer);

    // Show/hide clear button based on input
    this.toggleClearButton(searchTerm.length > 0);

    if (searchTerm.length === 0) {
      this.clearSearch();
      return;
    }

    // Show loading state for better UX
    this.setSearchingState(true);

    // Debounce the search
    this.debounceTimer = setTimeout(() => {
      this.performSearch(searchTerm);
    }, this.searchDelay);
  }

  performSearch(searchTerm) {
    console.log("BlogsPageSearch: Performing search for:", searchTerm);
    console.log("BlogsPageSearch: Available data:", this.originalBlogsData);

    if (!this.originalBlogsData || this.originalBlogsData.length === 0) {
      console.warn("BlogsPageSearch: No blog data available for search");
      this.setSearchingState(false);
      return;
    }

    this.currentSearchTerm = searchTerm.toLowerCase().trim();

    // Search through current tab's blogs
    this.filteredBlogsData = this.originalBlogsData.filter((blog) => {
      // Search by title
      const titleMatch = blog.title
        .toLowerCase()
        .includes(this.currentSearchTerm);

      // Search by content (if available)
      const contentMatch = blog.content
        ? blog.content.toLowerCase().includes(this.currentSearchTerm)
        : false;

      // Search by tags (if available)
      const tagsMatch = blog.tags
        ? blog.tags.some((tag) =>
            tag.toLowerCase().includes(this.currentSearchTerm)
          )
        : false;

      // Search by author (if available)
      const authorMatch = blog.author
        ? blog.author.toLowerCase().includes(this.currentSearchTerm)
        : false;

      console.log(
        `Blog "${blog.title}": titleMatch=${titleMatch}, contentMatch=${contentMatch}, tagsMatch=${tagsMatch}, authorMatch=${authorMatch}`
      );
      return titleMatch || contentMatch || tagsMatch || authorMatch;
    });

    console.log(
      "BlogsPageSearch: Found",
      this.filteredBlogsData.length,
      "results in",
      this.currentTab,
      "tab"
    );

    // Update UI with search results
    this.displaySearchResults(this.filteredBlogsData, searchTerm);
    this.setSearchingState(false);
  }

  displaySearchResults(filteredBlogs, searchTerm) {
    const hasResults = filteredBlogs.length > 0;

    // Update results count with tab info
    const tabDisplayName = this.getTabDisplayName(this.currentTab);
    this.searchResultsCount.textContent = `${filteredBlogs.length} ${
      filteredBlogs.length === 1 ? "result" : "results"
    } in ${tabDisplayName} for "${searchTerm}"`;

    // Show/hide results info
    if (hasResults) {
      this.searchResultsInfo.style.display = "block";
    } else {
      this.searchResultsInfo.style.display = "block";
      this.searchResultsCount.textContent = `No results found in ${tabDisplayName} for "${searchTerm}"`;
    }

    // Render filtered blogs with highlight animation
    this.renderFilteredBlogs(filteredBlogs, searchTerm);

    // Add premium animation for search results
    this.triggerSearchAnimation(hasResults);
  }

  getTabDisplayName(tab) {
    const tabNames = {
      all: "All Blogs",
      "my-blogs": "My Blogs",
      popular: "Popular Blogs",
    };
    return tabNames[tab] || tab;
  }

  renderFilteredBlogs(filteredBlogs, searchTerm) {
    if (filteredBlogs.length === 0) {
      this.blogsGrid.innerHTML = `
      <div class="empty-state blog-search-empty-state">
        <div style="font-size: 3rem; margin-bottom: var(--codeleaf-space-2);">🔍</div>
        <div>No ${this.getTabDisplayName(
          this.currentTab
        ).toLowerCase()} found matching "${searchTerm}"</div>
        <small>Try searching by title, content, tags, or author</small>
      </div>
    `;
      return;
    }

    // Use the existing displayBlogs function but with highlighted content
    const currentUser = localStorage.getItem("userId");
    const pageLayout = getCardLayoutForPage(filteredBlogs, 0); // Show all results on one page

    this.blogsGrid.innerHTML = pageLayout
      .map((item, index) => {
        const blog = item.blog;
        const cardType = item.type;
        const animationDelay = `${0.1 * index}s`;

        // Highlight search terms in title and content
        const highlightedTitle = this.highlightSearchTerm(
          blog.title,
          searchTerm
        );

        // Create excerpt with highlighted content if available
        let excerpt = blog.content
          ? blog.content.substring(0, 120) + "..."
          : "No content available";
        if (
          blog.content &&
          blog.content.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          excerpt = this.highlightSearchTermInContent(excerpt, searchTerm);
        } else {
          excerpt = escapeHtml(excerpt);
        }

        // Highlight author if it matches search
        const authorDisplay = blog.author
          ? this.highlightSearchTerm(blog.author, searchTerm)
          : escapeHtml(blog.author || "Unknown");

        return `
        <div class="blog-card ${cardType} blog-search-result-item" onclick="viewBlog('${
          blog.slug
        }')" style="animation-delay: ${animationDelay}">
          <div class="blog-card-header">
            <div class="blog-card-image">
              <div class="blog-card-overlay"></div>
              <div class="blog-card-category">${
                blog.tags && blog.tags.length > 0
                  ? this.highlightSearchTerm(blog.tags[0], searchTerm)
                  : "General"
              }</div>
            </div>
          </div>
          
          <div class="blog-card-body">
            <div class="blog-card-meta">
              <div class="blog-author-avatar">
                <span class="avatar-icon">👤</span>
              </div>
              <div class="blog-meta-info">
                <span class="blog-author">${authorDisplay}</span>
                <span class="blog-date">${formatBlogDate(blog.createdAt)}</span>
              </div>
              <div class="blog-visibility-tag">
                <span class="visibility-icon">${
                  blog.isPublic ? "🌍" : "🔒"
                }</span>
                <span class="visibility-text">${
                  blog.isPublic ? "Public" : "Private"
                }</span>
              </div>
            </div>
            
            <h3 class="blog-card-title">${highlightedTitle}</h3>
            
            <div class="blog-card-excerpt">
              ${excerpt}
            </div>
            
            <div class="blog-card-footer">
              <div class="blog-stats">
                <div class="blog-stat">
                  <span class="stat-icon">❤️</span>
                  <span class="stat-count">${blog.likes || 0}</span>
                </div>
                <div class="blog-stat">
                  <span class="stat-icon">👁️</span>
                  <span class="stat-count">${blog.views || 0}</span>
                </div>
              </div>
              
              <div class="blog-actions">
                ${
                  blog.author === currentUser
                    ? `
                  <button class="blog-action-btn edit-btn" onclick="event.stopPropagation(); editBlog('${blog.slug}')" title="Edit blog">
                    <span class="action-icon">✏️</span>
                  </button>
                `
                    : ""
                }
                <button class="blog-action-btn like-btn ${
                  blog.likedBy &&
                  blog.likedBy.includes(currentUser) &&
                  blog.author !== currentUser
                    ? "liked"
                    : ""
                } 
                           ${blog.author === currentUser ? "disabled" : ""}" 
                        onclick="event.stopPropagation(); ${
                          blog.author !== currentUser
                            ? `toggleLike('${blog.slug}', event)`
                            : ""
                        }"
                        ${blog.author === currentUser ? "disabled" : ""}
                        title="${
                          blog.author === currentUser
                            ? "Cannot like your own blog"
                            : blog.likedBy && blog.likedBy.includes(currentUser)
                            ? "Unlike blog"
                            : "Like blog"
                        }">
                  <span class="action-icon">${
                    blog.likedBy && blog.likedBy.includes(currentUser)
                      ? "❤️"
                      : "🤍"
                  }</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
      })
      .join("");

    // Hide pagination during search
    document.getElementById("pagination").style.display = "none";
  }

  highlightSearchTerm(text, searchTerm) {
    if (!text) return "";

    const searchLower = searchTerm.toLowerCase();
    const textLower = text.toLowerCase();

    // Escape HTML first
    const escapedText = escapeHtml(text);

    // Highlight matching parts
    if (searchLower && textLower.includes(searchLower)) {
      const matchIndex = textLower.indexOf(searchLower);
      const beforeMatch = escapedText.substring(0, matchIndex);
      const match = escapedText.substring(
        matchIndex,
        matchIndex + searchTerm.length
      );
      const afterMatch = escapedText.substring(matchIndex + searchTerm.length);

      return `${beforeMatch}<span class="blog-search-highlight">${match}</span>${afterMatch}`;
    }

    return escapedText;
  }

  highlightSearchTermInContent(content, searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    const contentLower = content.toLowerCase();
    const escapedContent = escapeHtml(content);

    if (searchLower && contentLower.includes(searchLower)) {
      const matchIndex = contentLower.indexOf(searchLower);
      const beforeMatch = escapedContent.substring(
        0,
        Math.max(0, matchIndex - 20)
      );
      const contextStart = Math.max(0, matchIndex - 20) > 0 ? "..." : "";
      const match = escapedContent.substring(
        matchIndex,
        matchIndex + searchTerm.length
      );
      const afterMatch = escapedContent.substring(
        matchIndex + searchTerm.length,
        matchIndex + searchTerm.length + 100
      );
      const contextEnd = afterMatch.length === 100 ? "..." : "";

      return `${contextStart}${beforeMatch}<span class="blog-search-highlight">${match}</span>${afterMatch}${contextEnd}`;
    }

    return escapedContent;
  }

  triggerSearchAnimation(hasResults) {
    // Add shimmer effect to search container
    const searchWrapper = this.searchInput.parentElement;
    searchWrapper.classList.add("searching");

    // Remove searching class after animation
    setTimeout(() => {
      searchWrapper.classList.remove("searching");
    }, 1000);

    // Trigger celebration for successful search
    if (hasResults) {
      this.triggerSearchCelebration();
    }
  }

  triggerSearchCelebration() {
    // Create floating particles effect
    this.createFloatingParticles();

    // Add success animation to the container
    this.blogsGrid.classList.add("blog-search-success-animation");
    setTimeout(() => {
      this.blogsGrid.classList.remove("blog-search-success-animation");
    }, 1000);
  }

  createFloatingParticles() {
    const container = this.blogsGrid;
    const particles = ["📝", "✨", "🔍", "💡", "📚"];

    // Get container position for relative positioning
    const containerRect = container.getBoundingClientRect();

    for (let i = 0; i < 3; i++) {
      const particle = document.createElement("div");
      particle.className = "blog-search-particle";
      particle.textContent =
        particles[Math.floor(Math.random() * particles.length)];

      // Calculate positions relative to viewport
      const left = containerRect.left + Math.random() * containerRect.width;
      const top = containerRect.top + Math.random() * containerRect.height;

      particle.style.cssText = `
        position: fixed;
        font-size: 1.2rem;
        pointer-events: none;
        z-index: 9999;
        opacity: 0;
        animation: blogSearchFloatParticle 1.2s ease-out forwards;
        left: ${left}px;
        top: ${top}px;
        will-change: transform, opacity;
      `;

      document.body.appendChild(particle);

      // Remove particle after animation
      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      }, 1200);
    }
  }

  setSearchingState(searching) {
    this.isSearching = searching;

    if (searching) {
      this.searchLoader.classList.add("show");
      this.searchInput.parentElement.classList.add("searching");
    } else {
      this.searchLoader.classList.remove("show");
      this.searchInput.parentElement.classList.remove("searching");
    }
  }

  toggleClearButton(show) {
    if (show) {
      this.searchClear.classList.add("show");
    } else {
      this.searchClear.classList.remove("show");
    }
  }

  clearSearch() {
    // Clear input
    this.searchInput.value = "";
    this.currentSearchTerm = "";

    // Hide clear button and results info
    this.toggleClearButton(false);
    this.searchResultsInfo.style.display = "none";

    // Reset to original blog content
    if (this.originalBlogsData.length > 0) {
      this.renderOriginalBlogs();
    }

    // Show pagination again
    document.getElementById("pagination").style.display = "flex";

    // Focus back on input for better UX
    this.searchInput.focus();
  }

  // Render original blogs for current tab
  renderOriginalBlogs() {
    // Reload blogs for current tab to reset to normal view
    loadBlogs(currentPage);
  }
}

// Initialize blog search functionality
let blogsPageSearch;

function initializeBlogsPageSearch() {
  blogsPageSearch = new BlogsPageSearch();
}

// Display blogs in Instagram-style grid with proper layout and animations - FIXED
function displayBlogs(blogs) {
  const blogsGrid = document.getElementById("blogsGrid");
  const currentUser = localStorage.getItem("userId");

  // Store data in search system
  if (blogsPageSearch) {
    console.log(
      "Setting blog data for search:",
      blogs.length,
      "blogs in",
      currentTab,
      "tab"
    );
    blogsPageSearch.setBlogData(blogs, currentTab);
  }

  // If there's an active search, let the search system handle rendering
  if (blogsPageSearch && blogsPageSearch.currentSearchTerm) {
    console.log("Active search term:", blogsPageSearch.currentSearchTerm);
    return; // Search system will handle rendering
  }

  if (blogs.length === 0) {
    let emptyMessage = "";
    switch (currentTab) {
      case "all":
        emptyMessage = "No public blogs available yet.";
        break;
      case "my-blogs":
        emptyMessage = "You haven't created any blogs yet.";
        break;
      case "popular":
        emptyMessage = "No popular blogs yet.";
        break;
      default:
        emptyMessage = "No blogs available.";
    }

    blogsGrid.innerHTML = `
      <div class="empty-state">
        <h3>No blogs found</h3>
        <p>${emptyMessage}</p>
        ${
          currentTab === "my-blogs"
            ? '<button class="create-blog-btn-compact" onclick="openCreateModal()" style="margin-top: 15px;">Create Your First Blog</button>'
            : ""
        }
      </div>
    `;
    return;
  }

  // Show pagination (might be hidden from search)
  document.getElementById("pagination").style.display = "flex";

  // Get the layout for current page
  const pageLayout = getCardLayoutForPage(blogs, currentPage - 1);

  blogsGrid.innerHTML = pageLayout
    .map((item, index) => {
      const blog = item.blog;
      const cardType = item.type;

      // Calculate animation delay for staggered effect
      const animationDelay = `${0.1 * index}s`;

      return `
        <div class="blog-card ${cardType}" onclick="viewBlog('${
        blog.slug
      }')" style="animation-delay: ${animationDelay}">
          <div class="blog-card-header">
            <div class="blog-card-image">
              <div class="blog-card-overlay"></div>
              <div class="blog-card-category">${
                blog.tags && blog.tags.length > 0 ? blog.tags[0] : "General"
              }</div>
            </div>
          </div>
          
          <div class="blog-card-body">
            <div class="blog-card-meta">
              <div class="blog-author-avatar">
                <span class="avatar-icon">👤</span>
              </div>
              <div class="blog-meta-info">
                <span class="blog-author">${escapeHtml(
                  blog.author || "Unknown"
                )}</span>
                <span class="blog-date">${formatBlogDate(blog.createdAt)}</span>
              </div>
              <div class="blog-visibility-tag">
                <span class="visibility-icon">${
                  blog.isPublic ? "🌍" : "🔒"
                }</span>
                <span class="visibility-text">${
                  blog.isPublic ? "Public" : "Private"
                }</span>
              </div>
            </div>
            
            <h3 class="blog-card-title">${escapeHtml(blog.title)}</h3>
            
            <div class="blog-card-excerpt">
              ${escapeHtml(
                blog.content
                  ? blog.content.substring(0, 120)
                  : "No content available"
              )}${blog.content && blog.content.length > 120 ? "..." : ""}
            </div>
            
            <div class="blog-card-footer">
              <div class="blog-stats">
                <div class="blog-stat">
                  <span class="stat-icon">❤️</span>
                  <span class="stat-count">${blog.likes || 0}</span>
                </div>
                <div class="blog-stat">
                  <span class="stat-icon">👁️</span>
                  <span class="stat-count">${blog.views || 0}</span>
                </div>
              </div>
              
              <div class="blog-actions">
                ${
                  blog.author === currentUser
                    ? `
                  <button class="blog-action-btn edit-btn" onclick="event.stopPropagation(); editBlog('${blog.slug}')" title="Edit blog">
                    <span class="action-icon">✏️</span>
                  </button>
                `
                    : ""
                }
                <button class="blog-action-btn like-btn ${
                  blog.likedBy &&
                  blog.likedBy.includes(currentUser) &&
                  blog.author !== currentUser
                    ? "liked"
                    : ""
                } 
                           ${blog.author === currentUser ? "disabled" : ""}" 
                        onclick="event.stopPropagation(); ${
                          blog.author !== currentUser
                            ? `toggleLike('${blog.slug}', event)`
                            : ""
                        }"
                        ${blog.author === currentUser ? "disabled" : ""}
                        title="${
                          blog.author === currentUser
                            ? "Cannot like your own blog"
                            : blog.likedBy && blog.likedBy.includes(currentUser)
                            ? "Unlike blog"
                            : "Like blog"
                        }">
                  <span class="action-icon">${
                    blog.likedBy && blog.likedBy.includes(currentUser)
                      ? "❤️"
                      : "🤍"
                  }</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

// Setup pagination
function setupPagination(currentPage, totalPages, total) {
  const pagination = document.getElementById("pagination");

  if (totalPages <= 1) {
    pagination.innerHTML = "";
    return;
  }

  pagination.innerHTML = `
            <button class="pagination-btn" ${
              currentPage === 1 ? "disabled" : ""
            } 
                onclick="loadBlogs(${currentPage - 1})">Previous</button>
            
            <div class="pagination-info">
                Page ${currentPage} of ${totalPages}
            </div>
            
            <button class="pagination-btn" ${
              currentPage === totalPages ? "disabled" : ""
            } 
                onclick="loadBlogs(${currentPage + 1})">Next</button>
        `;
}

// Toggle like on a blog - FIXED VERSION with proper pagination preservation
async function toggleLike(slug, event) {
  // Ensure event is properly passed and prevent default behavior
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  try {
    const token = localStorage.getItem("authToken");
    const currentUser = localStorage.getItem("userId");

    // Get blog card and author information safely
    let blogCard;
    let blogAuthor;

    if (event && event.target) {
      blogCard = event.target.closest(".blog-card");
    } else {
      // Fallback: find blog card by slug or other means
      blogCard =
        document.querySelector(`[onclick*="${slug}"]`)?.closest(".blog-card") ||
        document.querySelector(".blog-card");
    }

    if (blogCard) {
      const authorElement = blogCard.querySelector(".blog-meta span");
      if (authorElement) {
        blogAuthor = authorElement.textContent.replace("By ", "").trim();
      }
    }

    // Prevent self-like on frontend
    if (blogAuthor === currentUser) {
      toastManager.warning(
        "You cannot like your own blog",
        "Self-like Restricted"
      );
      return;
    }

    const response = await fetch(`${API_BASE_URL}/blogs/${slug}/like`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`
      );
    }

    const result = await response.json();

    if (result.success) {
      // Update the UI immediately for better UX
      let likeBtn;
      if (event && event.target) {
        likeBtn = event.target.closest(".like-btn");
      } else if (blogCard) {
        likeBtn = blogCard.querySelector(".like-btn");
      }

      if (likeBtn) {
        const likesCount = likeBtn.nextElementSibling;

        if (likeBtn.classList.contains("liked")) {
          likeBtn.classList.remove("liked");
          likeBtn.innerHTML = "🤍";
          if (likesCount) {
            likesCount.textContent = parseInt(likesCount.textContent) - 1;
          }
        } else {
          likeBtn.classList.add("liked");
          likeBtn.innerHTML = "❤️";
          if (likesCount) {
            likesCount.textContent = parseInt(likesCount.textContent) + 1;
          }
        }
      }

      // FIX: Only update tab counts, DO NOT reload blogs
      await updateTabCounts();

      // Show success message but don't reload the page
      toastManager.success(
        result.hasLiked ? "Blog liked!" : "Blog unliked!",
        "Success"
      );
    } else {
      toastManager.error(result.error, "Like Failed");
    }
  } catch (error) {
    console.error("Error toggling like:", error);
    if (error.message.includes("Cannot like your own blog")) {
      toastManager.warning(
        "You cannot like your own blog",
        "Self-like Restricted"
      );
    } else {
      toastManager.error(
        "Failed to like blog. Please try again.",
        "Network Error"
      );
    }
  }
}
// Open create blog modal
function openCreateModal() {
  editingBlog = null;
  document.getElementById("modalTitle").textContent = "Create New Blog";
  document.getElementById("modalSubmit").textContent = "Create Blog";
  document.getElementById("blogForm").reset();
  document.getElementById("blogModal").style.display = "flex";
}

// Open edit blog modal
async function editBlog(slug) {
  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch(`${API_BASE_URL}/blogs/${slug}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      editingBlog = result.blog;
      document.getElementById("modalTitle").textContent = "Edit Blog";
      document.getElementById("modalSubmit").textContent = "Update Blog";
      document.getElementById("blogTitle").value = editingBlog.title;
      document.getElementById("blogContent").value = editingBlog.content;
      document.getElementById("blogTags").value = editingBlog.tags
        ? editingBlog.tags.join(", ")
        : "";
      document.getElementById("blogIsPublic").checked = editingBlog.isPublic;
      document.getElementById("blogModal").style.display = "flex";
    } else {
      toastManager.error(result.error, "Error Loading Blog");
    }
  } catch (error) {
    console.error("Error loading blog for edit:", error);
    toastManager.error("Failed to load blog for editing", "Network Error");
  }
}

// Close modal
function closeModal() {
  document.getElementById("blogModal").style.display = "none";
  editingBlog = null;
}

// Handle form submission
document.getElementById("blogForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("blogTitle").value;
  const content = document.getElementById("blogContent").value;
  const tags = document
    .getElementById("blogTags")
    .value.split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag);
  const isPublic = document.getElementById("blogIsPublic").checked;

  if (!title.trim() || !content.trim()) {
    toastManager.warning("Title and content are required", "Validation Error");
    return;
  }

  try {
    const token = localStorage.getItem("authToken");
    const url = editingBlog
      ? `${API_BASE_URL}/blogs/${editingBlog.slug}`
      : `${API_BASE_URL}/blogs`;
    const method = editingBlog ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title, content, tags, isPublic }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `HTTP error! status: ${response.status}, response: ${errorText}`
      );
    }

    const result = await response.json();

    if (result.success) {
      closeModal();
      await loadBlogs();
      await updateTabCounts();
      toastManager.success(
        editingBlog
          ? "Blog updated successfully!"
          : "Blog created successfully!",
        editingBlog ? "Blog Updated" : "Blog Created"
      );
    } else {
      toastManager.error(result.error, "Save Failed");
    }
  } catch (error) {
    console.error("Error saving blog:", error);
    toastManager.error(
      "Failed to save blog. Please try again.",
      "Network Error"
    );
  }
});

// Add this function to track views when blog is opened
async function trackBlogView(slug) {
  try {
    await fetch(`${API_BASE_URL}/blogs/${slug}/view`, {
      method: "POST",
    });
    // We don't need to handle the response, just fire and forget
  } catch (error) {
    console.error("Error tracking view:", error);
    // Silent fail - don't disrupt user experience
  }
}

// Update the viewBlog function to track views
function viewBlog(slug) {
  trackBlogView(slug); // Track view before navigation
  window.location.href = `${BASE_URL}/blogs/${slug}`;
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

// Scroll to Top Functionality
function initScrollToTop() {
  const scrollToTopBtn = document.getElementById("scrollToTop");

  if (!scrollToTopBtn) return;

  // Show/hide button based on scroll position
  function toggleScrollToTop() {
    if (window.pageYOffset > 300) {
      scrollToTopBtn.classList.add("visible");
    } else {
      scrollToTopBtn.classList.remove("visible");
    }
  }

  // Smooth scroll to top
  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // Event listeners
  window.addEventListener("scroll", toggleScrollToTop);
  scrollToTopBtn.addEventListener("click", scrollToTop);

  // Keyboard accessibility
  scrollToTopBtn.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      scrollToTop();
    }
  });

  // Initialize
  toggleScrollToTop();
}

// Initialize scroll to top when DOM is loaded
document.addEventListener("DOMContentLoaded", initScrollToTop);

// Initialize blogs when page loads
document.addEventListener("DOMContentLoaded", initBlogs);
