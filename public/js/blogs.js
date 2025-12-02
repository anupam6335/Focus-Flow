/**
 * FocusFlow — Blog Page Controller
 * Dynamic implementation with backend API integration
 */
class BlogPageController {
  constructor() {
    this.state = {
      activeTab: "all",
      currentFilter: "newest",
      searchTerm: "",
      currentPage: 1,
      blogsPerPage: 9,
      isLoading: false,
      isLoggedIn: false,
      totalPages: 1,
      user: null,
    };
    this.elements = {};
    this.init();
  }

  /**
   * Initialize the blog page
   */
  async init() {
    this.initializeElements();
    this.setupEventListeners();
    await this.checkAuthStatus();
    this.initHeaderButton();
    this.loadActiveTab();
  }

  /**
   * Cache DOM elements
   */
  initializeElements() {
    const elementIds = [
      "all-blogs-tab",
      "popular-blogs-tab",
      "my-blogs-tab",
      "sort-filter",
      "blog-search",
      "create-blog-btn",
      "create-blog-modal",
      "close-create-blog-modal",
      "cancel-create-blog",
      "publish-blog",
      "create-blog-form",
      "toast",
      "notification-count",
      "login-link",
      "profile-link",
      "logout-btn",
    ];

    elementIds.forEach((id) => {
      this.elements[id] = document.getElementById(id);
    });

    // Get all tab buttons
    this.elements.tabButtons = document.querySelectorAll(".blogs-tab");
    this.elements.visibilityButtons =
      document.querySelectorAll(".visibility-btn");

    // Initialize UI based on auth
    this.updateAuthUI();
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Tab switching
    this.elements.tabButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const tab = e.currentTarget.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Filter changes
    if (this.elements["sort-filter"]) {
      this.elements["sort-filter"].addEventListener("change", (e) => {
        this.state.currentFilter = e.target.value;
        this.state.currentPage = 1; // Reset to first page
        this.loadActiveTab();
      });
    }

    // Search input with debounce
    if (this.elements["blog-search"]) {
      let searchTimeout;
      this.elements["blog-search"].addEventListener("input", (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.state.searchTerm = e.target.value;
          this.state.currentPage = 1; // Reset to first page
          this.loadActiveTab();
        }, 500);
      });
    }

    // Create blog modal
    if (this.elements["create-blog-btn"]) {
      this.elements["create-blog-btn"].addEventListener("click", () =>
        this.showCreateModal()
      );
    }

    if (this.elements["close-create-blog-modal"]) {
      this.elements["close-create-blog-modal"].addEventListener("click", () =>
        this.hideCreateModal()
      );
    }

    if (this.elements["cancel-create-blog"]) {
      this.elements["cancel-create-blog"].addEventListener("click", () =>
        this.hideCreateModal()
      );
    }

    if (this.elements["publish-blog"]) {
      this.elements["publish-blog"].addEventListener("click", (e) => {
        e.preventDefault();
        this.handleBlogCreation();
      });
    }

    // Visibility buttons
    this.elements.visibilityButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const target = e.currentTarget;
        this.setVisibility(target.dataset.visibility);
      });
    });

    // Modal close on escape and click outside
    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        this.elements["create-blog-modal"].style.display === "flex"
      ) {
        this.hideCreateModal();
      }
    });

    if (this.elements["create-blog-modal"]) {
      this.elements["create-blog-modal"].addEventListener("click", (e) => {
        if (e.target === this.elements["create-blog-modal"]) {
          this.hideCreateModal();
        }
      });
    }

    // Form submit
    if (this.elements["create-blog-form"]) {
      this.elements["create-blog-form"].addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleBlogCreation();
      });
    }

    // Logout
    if (this.elements["logout-btn"]) {
      this.elements["logout-btn"].addEventListener("click", () =>
        this.handleLogout()
      );
    }
  }

  /**
   * Check authentication status and get user info - FIXED VERSION
   */
  async checkAuthStatus() {
    try {
      // First, try to get the current user by making a simple authenticated request
      const response = await fetch("/api/users/me", {
        credentials: "include",
      });

      if (response.ok) {
        try {
          const data = await response.json();

          if (data.success && data.user) {
            this.state.isLoggedIn = true;
            this.state.user = data.user;
            this.updateAuthUI();
            return true;
          }
        } catch (jsonError) {}
      }

      // Fallback: Try to access a protected endpoint
      const blogResponse = await fetch("/api/blogs/my?page=1&limit=1", {
        credentials: "include",
      });

      if (blogResponse.ok) {
        try {
          const blogData = await blogResponse.json();
          if (blogData.success) {
            // We're authenticated if we can access this endpoint
            this.state.isLoggedIn = true;

            // Try to get username from response or cookies
            if (blogData.blogs && blogData.blogs.length > 0) {
              this.state.user = { username: blogData.blogs[0].author };
            } else {
              // Try to extract username from JWT token in cookies
              const token = this.getTokenFromCookies();
              if (token) {
                try {
                  const payload = JSON.parse(atob(token.split(".")[1]));
                  this.state.user = { username: payload.username || "User" };
                } catch {
                  this.state.user = { username: "User" };
                }
              }
            }

            this.updateAuthUI();
            return true;
          }
        } catch (error) {}
      }

      // Check if we have a token cookie as last resort
      if (this.getTokenFromCookies()) {
        this.state.isLoggedIn = true;
        this.state.user = { username: "User" };
        this.updateAuthUI();
        return true;
      }
    } catch (error) {}

    // Not authenticated
    this.state.isLoggedIn = false;
    this.state.user = null;
    this.updateAuthUI();
    return false;
  }

  /**
   * Get JWT token from cookies
   */
  getTokenFromCookies() {
    const cookies = document.cookie.split(";");
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split("=");
      if (name === "ff_token" || name === "token") {
        return value;
      }
    }
    return null;
  }

  /**
   * Update UI based on authentication status - IMPROVED VERSION
   */
  updateAuthUI() {
    // Get the profile dropdown content
    const profileDropdown = document.querySelector(
      ".profile-dropdown .dropdown-content"
    );
    if (!profileDropdown) {
      return;
    }

    // Clear existing items
    profileDropdown.innerHTML = "";

    if (this.state.isLoggedIn) {
      // User is logged in - show profile and logout
      const profileItem = document.createElement("a");
      profileItem.href =
        this.state.user && this.state.user.username
          ? `/user/${this.state.user.username}`
          : "/profile";
      profileItem.className = "dropdown-item";
      profileItem.id = "profile-link";
      profileItem.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
      <span>${
        this.state.user && this.state.user.username
          ? `@${this.state.user.username}`
          : "Profile"
      }</span>
    `;

      const logoutItem = document.createElement("button");
      logoutItem.className = "dropdown-item";
      logoutItem.id = "logout-btn";
      logoutItem.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
      <span>Logout</span>
    `;

      profileDropdown.appendChild(profileItem);
      profileDropdown.appendChild(logoutItem);

      // Add logout event listener
      logoutItem.addEventListener("click", (e) => {
        e.preventDefault();
        this.handleLogout();
      });
    } else {
      // User is not logged in - show login only
      const loginItem = document.createElement("a");
      loginItem.href = "/auth";
      loginItem.className = "dropdown-item";
      loginItem.id = "login-link";
      loginItem.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <polyline points="10 17 15 12 10 7" />
        <line x1="15" y1="12" x2="3" y2="12" />
      </svg>
      <span>Login</span>
    `;

      profileDropdown.appendChild(loginItem);
    }

    // Ensure consistent styling
    const dropdownItems = profileDropdown.querySelectorAll(".dropdown-item");
    dropdownItems.forEach((item) => {
      item.style.display = "flex";
      item.style.alignItems = "center";
      item.style.gap = "10px";
      item.style.padding = "10px 16px";
      item.style.width = "100%";
      item.style.textAlign = "left";
      item.style.color = "inherit";
      item.style.textDecoration = "none";
      item.style.background = "none";
      item.style.border = "none";
      item.style.fontSize = "14px";
      item.style.cursor = "pointer";
      item.style.transition = "all 200ms var(--ease)";

      item.addEventListener("mouseenter", () => {
        item.style.background = "rgba(163, 177, 138, 0.1)";
      });

      item.addEventListener("mouseleave", () => {
        item.style.background = "none";
      });
    });
  }

  /**
   * Switch between tabs
   */
  switchTab(tabName) {
    // Update tab buttons
    this.elements.tabButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll(".blogs-tab-content").forEach((content) => {
      content.classList.toggle("active", content.id === `${tabName}-blogs-tab`);
    });

    // Update state and load content
    this.state.activeTab = tabName;
    this.state.currentPage = 1;
    this.loadActiveTab();
  }

  /**
   * Load content for active tab
   */
  async loadActiveTab() {
    this.showLoadingState();

    try {
      switch (this.state.activeTab) {
        case "all":
          await this.loadAllBlogs();
          break;
        case "popular":
          await this.loadPopularBlogs();
          break;
        case "my":
          await this.loadMyBlogs();
          break;
      }
    } catch (error) {
      console.error("Error loading blogs:", error);
      this.showToast("Failed to load blogs. Please try again.", "error");
    } finally {
      this.hideLoadingState();
    }
  }

  /**
   * Load all blogs from API
   */
  async loadAllBlogs() {
    const grid = document.querySelector("#all-blogs-tab .blogs-grid");
    if (!grid) return;

    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: this.state.currentPage,
        limit: this.state.blogsPerPage,
        sort: this.state.currentFilter,
        search: this.state.searchTerm,
      });

      const response = await fetch(`/api/blogs/all?${params}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.blogs && data.blogs.length > 0) {
        this.renderBlogs(grid, data.blogs);
        this.state.totalPages = data.totalPages || 1;
        this.renderPagination("all-blogs-tab", data);
      } else {
        this.showEmptyState(grid, "No blogs found. Be the first to write one!");
      }
    } catch (error) {
      console.error("Error loading all blogs:", error);
      this.showEmptyState(
        grid,
        "Failed to load blogs. Please try again later."
      );
    }
  }

  /**
   * Load popular blogs from API
   */
  async loadPopularBlogs() {
    const grid = document.querySelector("#popular-blogs-tab .blogs-grid");
    if (!grid) return;

    try {
      const response = await fetch(
        `/api/blogs/popular?limit=${this.state.blogsPerPage}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.blogs && data.blogs.length > 0) {
        this.renderBlogs(grid, data.blogs);
      } else {
        this.showEmptyState(
          grid,
          "No popular blogs yet. Start writing to get featured!"
        );
      }
    } catch (error) {
      console.error("Error loading popular blogs:", error);
      this.showEmptyState(grid, "Failed to load popular blogs.");
    }
  }

  /**
   * Load user's blogs from API
   */
  async loadMyBlogs() {
    const container = document.querySelector(
      "#my-blogs-tab .my-blogs-container"
    );
    if (!container) return;

    if (!this.state.isLoggedIn) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <p>Please sign in to view and create your blogs</p>
          <button class="btn-primary" style="margin-top: 16px;" onclick="window.location.href='/auth'">
            Sign In
          </button>
        </div>
      `;
      return;
    }

    let myBlogsList = container.querySelector(".my-blogs-list");
    if (!myBlogsList) {
      // Create my blogs list if it doesn't exist
      myBlogsList = document.createElement("div");
      myBlogsList.className = "my-blogs-list";
      container.appendChild(myBlogsList);
    }

    try {
      const params = new URLSearchParams({
        page: this.state.currentPage,
        limit: this.state.blogsPerPage,
      });

      const response = await fetch(`/api/blogs/my?${params}`, {
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // User is not logged in properly, refresh auth
          await this.checkAuthStatus();
          if (!this.state.isLoggedIn) {
            this.showToast("Please login to view your blogs", "error");
            return;
          }
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.blogs && data.blogs.length > 0) {
        this.renderMyBlogs(myBlogsList, data.blogs);
        this.state.totalPages = data.totalPages || 1;
        this.renderPagination("my-blogs-tab", data);
      } else {
        myBlogsList.innerHTML = `
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <p>You haven't written any blogs yet. Create your first one!</p>
          </div>
        `;
      }
    } catch (error) {
      console.error("Error loading my blogs:", error);
      myBlogsList.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <p>Failed to load your blogs. Please try again.</p>
        </div>
      `;
    }
  }

  /**
   * Render blogs in grid
   */
  renderBlogs(container, blogs) {
    if (!blogs || !blogs.length) {
      this.showEmptyState(container, "No blogs found.");
      return;
    }

    const blogCards = blogs
      .map((blog) => {
        const excerpt =
          blog.excerpt ||
          (blog.content
            ? blog.content.substring(0, 150) +
              (blog.content.length > 150 ? "..." : "")
            : "No content available");

        return `
        <div class="blog-card" data-slug="${blog.slug || ""}">
          <div class="blog-card-header">
            <h3 class="blog-title">${this.escapeHtml(
              blog.title || "Untitled"
            )}</h3>
            <div class="blog-meta">
              <span class="blog-author">@${this.escapeHtml(
                blog.author || "anonymous"
              )}</span>
              <span class="blog-date">${
                blog.createdAt ? this.formatDate(blog.createdAt) : "Recently"
              }</span>
            </div>
          </div>
          <div class="blog-excerpt">
            ${this.escapeHtml(excerpt)}
          </div>
          <div class="blog-stats">
            <div class="stat-item" title="Likes">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
              <span class="stat-count">${blog.likes || 0}</span>
            </div>
            <div class="stat-item" title="Views">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <span class="stat-count">${blog.views || 0}</span>
            </div>
            <div class="stat-item" title="Comments">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span class="stat-count">${blog.commentCount || 0}</span>
            </div>
          </div>
        </div>
      `;
      })
      .join("");

    container.innerHTML = blogCards;

    // Add click event listeners to blog cards
    container.querySelectorAll(".blog-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (
          !e.target.closest(".blog-actions") &&
          !e.target.closest(".btn-small")
        ) {
          const slug = card.dataset.slug;
          if (slug) {
            window.location.href = `/blogs/${slug}`;
          }
        }
      });
    });
  }

  /**
   * Initialize header button that appears when scrolling
   */
  initHeaderButton() {
    // Get or create header button
    let headerBtn = document.getElementById("create-blog-header-btn");

    if (!headerBtn) {
      // Create button if it doesn't exist
      headerBtn = document.createElement("button");
      headerBtn.className = "create-blog-header-btn";
      headerBtn.id = "create-blog-header-btn";
      headerBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      Create Blog
    `;
      headerBtn.style.display = "none";

      // Insert before search container
      const searchContainer = document.querySelector(".search-container");
      if (searchContainer && searchContainer.parentNode) {
        searchContainer.parentNode.insertBefore(headerBtn, searchContainer);
      }
    }

    // Store reference
    this.elements["create-blog-header-btn"] = headerBtn;

    // Add click event
    headerBtn.addEventListener("click", () => this.showCreateModal());

    // Set up scroll listener
    this.setupScrollListener();
  }

  /**
   * Set up scroll listener for header button
   */
  setupScrollListener() {
    const mainBtn = this.elements["create-blog-btn"];
    const headerBtn = this.elements["create-blog-header-btn"];
    const controlsHeader = document.querySelector(".blogs-controls-header");

    if (!mainBtn || !headerBtn || !controlsHeader) return;

    let lastScrollTop = 0;
    let isScrolling = false;

    const checkButtonVisibility = () => {
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const mainBtnRect = mainBtn.getBoundingClientRect();

      // Only show header button on My Blogs tab when logged in
      if (this.state.activeTab === "my" && this.state.isLoggedIn) {
        // Check if main button is visible (80% of viewport)
        const isMainBtnVisible =
          mainBtnRect.top >= 0 &&
          mainBtnRect.bottom <= window.innerHeight * 0.8;

        // Show header button when main button is not visible and we've scrolled enough
        if (!isMainBtnVisible && scrollTop > 200) {
          headerBtn.style.display = "flex";
        } else {
          headerBtn.style.display = "none";
        }
      } else {
        headerBtn.style.display = "none";
      }

      lastScrollTop = scrollTop;
    };

    // Throttle scroll events
    const throttledCheck = () => {
      if (isScrolling) return;
      isScrolling = true;

      requestAnimationFrame(() => {
        checkButtonVisibility();
        isScrolling = false;
      });
    };

    window.addEventListener("scroll", throttledCheck, { passive: true });

    // Also check on tab switch
    this.elements.tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setTimeout(() => {
          if (this.state.activeTab !== "my" || !this.state.isLoggedIn) {
            headerBtn.style.display = "none";
          } else {
            throttledCheck();
          }
        }, 100);
      });
    });

    // Check on auth status change and window resize
    window.addEventListener("resize", throttledCheck);

    // Update on auth status change
    const originalUpdateAuthUI = this.updateAuthUI.bind(this);
    this.updateAuthUI = function () {
      originalUpdateAuthUI();
      setTimeout(() => {
        if (this.state.activeTab === "my" && this.state.isLoggedIn) {
          throttledCheck();
        } else {
          headerBtn.style.display = "none";
        }
      }, 100);
    };

    // Initial check
    setTimeout(throttledCheck, 500);
  }

  /**
   * Render user's blogs
   */
  renderMyBlogs(container, blogs) {
    if (!blogs || !blogs.length) {
      this.showEmptyState(
        container,
        "You haven't written any blogs yet. Create your first one!"
      );
      return;
    }

    const blogList = blogs
      .map((blog) => {
        const excerpt =
          blog.excerpt ||
          (blog.content
            ? blog.content.substring(0, 150) +
              (blog.content.length > 150 ? "..." : "")
            : "No content available");

        return `
        <div class="blog-card" data-slug="${blog.slug || ""}">
          <div class="blog-card-header">
            <h3 class="blog-title">${this.escapeHtml(
              blog.title || "Untitled"
            )}</h3>
            <div class="blog-meta">
              <span class="blog-status ${blog.isPublic ? "public" : "private"}">
                ${blog.isPublic ? "Public" : "Private"}
              </span>
              <span class="blog-date">${
                blog.createdAt ? this.formatDate(blog.createdAt) : "Recently"
              }</span>
            </div>
          </div>
          <div class="blog-excerpt">
            ${this.escapeHtml(excerpt)}
          </div>
          <div class="blog-actions">
            <button class="btn-small btn-edit" data-slug="${
              blog.slug
            }">Edit</button>
            <button class="btn-small btn-delete" data-slug="${
              blog.slug
            }">Delete</button>
          </div>
        </div>
      `;
      })
      .join("");

    container.innerHTML = blogList;

    // Add event listeners for edit/delete buttons
    container.querySelectorAll(".btn-edit").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const slug = btn.dataset.slug;
        if (slug) {
          this.handleEditBlog(slug);
        }
      });
    });

    container.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const slug = btn.dataset.slug;
        if (slug) {
          await this.handleDeleteBlog(slug);
        }
      });
    });
  }

  /**
   * Render pagination controls
   */
  renderPagination(tabId, data) {
    const tabContent = document.getElementById(tabId);
    if (!tabContent) return;

    let existingPagination = tabContent.querySelector(".blogs-pagination");

    if (existingPagination) {
      existingPagination.remove();
    }

    if (!data.totalPages || data.totalPages <= 1) return;

    const pagination = document.createElement("div");
    pagination.className = "blogs-pagination";

    pagination.innerHTML = `
      <button class="pagination-btn prev" ${
        this.state.currentPage === 1 ? "disabled" : ""
      }>
        Previous
      </button>
      <span class="pagination-info">
        Page ${this.state.currentPage} of ${data.totalPages}
      </span>
      <button class="pagination-btn next" ${
        this.state.currentPage === data.totalPages ? "disabled" : ""
      }>
        Next
      </button>
    `;

    tabContent.appendChild(pagination);

    // Add event listeners
    const prevBtn = pagination.querySelector(".prev");
    const nextBtn = pagination.querySelector(".next");

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        if (this.state.currentPage > 1) {
          this.state.currentPage--;
          this.loadActiveTab();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        if (this.state.currentPage < data.totalPages) {
          this.state.currentPage++;
          this.loadActiveTab();
        }
      });
    }
  }

  /**
   * Show create blog modal
   */
  showCreateModal() {
    if (!this.state.isLoggedIn) {
      this.showToast("Please sign in to create blogs", "error");
      window.location.href = "/auth";
      return;
    }

    if (this.elements["create-blog-modal"]) {
      this.elements["create-blog-modal"].style.display = "flex";
      // Reset form
      if (this.elements["create-blog-form"]) {
        this.elements["create-blog-form"].reset();
      }
      // Set default visibility
      this.setVisibility("public");
      // Focus on title input
      setTimeout(() => {
        const titleInput = document.getElementById("blog-title");
        if (titleInput) titleInput.focus();
      }, 100);
    }
  }

  /**
   * Hide create blog modal
   */
  hideCreateModal() {
    if (this.elements["create-blog-modal"]) {
      this.elements["create-blog-modal"].style.display = "none";
    }
  }

  /**
   * Set blog visibility
   */
  setVisibility(visibility) {
    this.elements.visibilityButtons.forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.visibility === visibility
      );
    });
  }

  /**
   * Handle blog creation
   */
  async handleBlogCreation() {
    const title = document.getElementById("blog-title")?.value.trim();
    const content = document.getElementById("blog-content")?.value.trim();
    const tags = document.getElementById("blog-tags")?.value.trim();
    const visibilityBtn = document.querySelector(".visibility-btn.active");
    const isPublic = visibilityBtn?.dataset.visibility === "public";

    // Validation
    if (!title) {
      this.showToast("Blog title is required", "error");
      document.getElementById("blog-title")?.focus();
      return;
    }

    if (!content) {
      this.showToast("Blog content is required", "error");
      document.getElementById("blog-content")?.focus();
      return;
    }

    if (title.length > 200) {
      this.showToast("Blog title must be less than 200 characters", "error");
      document.getElementById("blog-title")?.focus();
      return;
    }

    // Prepare tags array
    const tagsArray = tags
      ? tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag)
      : [];

    // Show loading state
    const publishBtn = this.elements["publish-blog"];
    const originalText = publishBtn.textContent;
    publishBtn.textContent = "Publishing...";
    publishBtn.disabled = true;

    try {
      const response = await fetch("/api/blogs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          title,
          content,
          isPublic,
          tags: tagsArray,
          category: "general",
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        this.showToast("✅ Blog created successfully!", "success");
        this.hideCreateModal();

        // If on My Blogs tab, refresh the list
        if (this.state.activeTab === "my") {
          await this.loadMyBlogs();
        } else {
          // Switch to My Blogs tab to see the new blog
          this.switchTab("my");
        }
      } else {
        this.showToast(data.error || "Failed to create blog", "error");
      }
    } catch (error) {
      console.error("Error creating blog:", error);
      this.showToast("Failed to create blog. Please try again.", "error");
    } finally {
      // Reset button state
      publishBtn.textContent = originalText;
      publishBtn.disabled = false;
    }
  }

  /**
   * Handle blog edit
   */
  handleEditBlog(slug) {
    // Navigate to edit page
    window.location.href = `/blogs/${slug}/edit`;
  }

  /**
   * Handle blog deletion - FIXED WITH CUSTOM TOAST
   */
  async handleDeleteBlog(slug) {
    // Use custom confirmation dialog instead of browser's confirm
    const confirmed = await this.showConfirmationDialog(
      "Delete Blog",
      "Are you sure you want to delete this blog? This action cannot be undone.",
      "Delete",
      "Cancel"
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/blogs/${slug}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Show custom success toast
        this.showToast("🗑️ Blog deleted successfully", "success");
        await this.loadMyBlogs(); // Refresh the list
      } else {
        this.showToast(data.error || "Failed to delete blog", "error");
      }
    } catch (error) {
      console.error("Error deleting blog:", error);
      this.showToast("Failed to delete blog", "error");
    }
  }

  /**
   * Show custom confirmation dialog
   */
  showConfirmationDialog(title, message, confirmText, cancelText) {
    return new Promise((resolve) => {
      // Create modal overlay
      const overlay = document.createElement("div");
      overlay.className = "confirmation-overlay";
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        backdrop-filter: blur(4px);
      `;

      // Create modal
      const modal = document.createElement("div");
      modal.className = "confirmation-modal";
      modal.style.cssText = `
        background: var(--paper);
        border-radius: 16px;
        padding: 24px;
        max-width: 400px;
        width: 90%;
        border: 1px solid var(--line);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      `;

      modal.innerHTML = `
        <h3 style="margin: 0 0 12px 0; color: var(--ink); font-size: 18px;">${title}</h3>
        <p style="margin: 0 0 24px 0; color: var(--muted); font-size: 14px; line-height: 1.5;">${message}</p>
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button class="confirmation-cancel" style="
            padding: 10px 20px;
            background: var(--bg);
            border: 1px solid var(--line);
            border-radius: 8px;
            color: var(--ink);
            cursor: pointer;
            font-size: 14px;
            transition: all 200ms var(--ease);
          ">${cancelText}</button>
          <button class="confirmation-confirm" style="
            padding: 10px 20px;
            background: #ff6464;
            border: none;
            border-radius: 8px;
            color: white;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 200ms var(--ease);
          ">${confirmText}</button>
        </div>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      // Add event listeners
      const confirmBtn = modal.querySelector(".confirmation-confirm");
      const cancelBtn = modal.querySelector(".confirmation-cancel");

      const cleanup = () => {
        document.body.removeChild(overlay);
        document.removeEventListener("keydown", handleKeydown);
      };

      const handleConfirm = () => {
        cleanup();
        resolve(true);
      };

      const handleCancel = () => {
        cleanup();
        resolve(false);
      };

      const handleKeydown = (e) => {
        if (e.key === "Escape") handleCancel();
        if (e.key === "Enter") handleConfirm();
      };

      confirmBtn.addEventListener("click", handleConfirm);
      cancelBtn.addEventListener("click", handleCancel);
      document.addEventListener("keydown", handleKeydown);

      // Focus on cancel button by default
      cancelBtn.focus();
    });
  }

  /**
   * Handle user logout
   */
  async handleLogout() {
    const confirmed = await this.showConfirmationDialog(
      "Logout",
      "Are you sure you want to logout?",
      "Logout",
      "Cancel"
    );

    if (!confirmed) return;

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        this.state.isLoggedIn = false;
        this.state.user = null;
        this.updateAuthUI();
        this.showToast("👋 Logged out successfully", "success");

        // Reload the page to reflect auth changes
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        this.showToast("Failed to logout", "error");
      }
    } catch (error) {
      console.error("Error logging out:", error);
      this.showToast("Failed to logout", "error");
    }
  }

  /**
   * Show loading state
   */
  showLoadingState() {
    this.state.isLoading = true;
    const activeTab = document.querySelector(
      `#${this.state.activeTab}-blogs-tab`
    );
    if (activeTab) {
      activeTab.style.opacity = "0.7";
      activeTab.style.pointerEvents = "none";

      // Show skeleton loading
      const grid = activeTab.querySelector(".blogs-grid");
      if (grid && !grid.querySelector(".blog-card")) {
        grid.innerHTML = `
          <div class="blog-card loading"></div>
          <div class="blog-card loading"></div>
          <div class="blog-card loading"></div>
        `;
      }
    }
  }

  /**
   * Hide loading state
   */
  hideLoadingState() {
    this.state.isLoading = false;
    const activeTab = document.querySelector(
      `#${this.state.activeTab}-blogs-tab`
    );
    if (activeTab) {
      activeTab.style.opacity = "1";
      activeTab.style.pointerEvents = "auto";
    }
  }

  /**
   * Show empty state
   */
  showEmptyState(container, message) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
        </svg>
        <p>${message}</p>
      </div>
    `;
  }

  /**
   * Show toast message - IMPROVED WITH EMOJI AND TYPES
   */
  showToast(message, type = "info") {
    if (!this.elements.toast) {
      // Create toast container if it doesn't exist
      const toastContainer = document.createElement("div");
      toastContainer.id = "toast";
      toastContainer.className = "toast-container";
      toastContainer.setAttribute("aria-live", "polite");
      document.body.appendChild(toastContainer);
      this.elements.toast = toastContainer;
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = message;
    this.elements.toast.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add("show"), 10);

    // Auto dismiss
    setTimeout(() => {
      toast.classList.remove("show");
      toast.classList.add("hide");
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  /**
   * Format date for display
   */
  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Recently";
      }
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch (error) {
      return "Recently";
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize blog page when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Check if we're on the blogs page
  if (
    window.location.pathname.includes("/blogs") ||
    window.location.pathname === "/blogs.html" ||
    document.querySelector(".blogs-main-content")
  ) {
    // Add CSS for custom elements
    const style = document.createElement("style");
    style.textContent = `
      /* Blog actions styles */
      .blog-actions {
        display: flex;
        gap: 8px;
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid var(--line);
      }
      
      .btn-small {
        padding: 6px 12px;
        border: 1px solid var(--line);
        border-radius: 6px;
        background: var(--paper);
        color: var(--ink);
        font-size: 13px;
        cursor: pointer;
        transition: all 200ms var(--ease);
      }
      
      .btn-small:hover {
        border-color: var(--ring);
        transform: translateY(-1px);
      }
      
      .btn-edit:hover {
        background: rgba(163, 177, 138, 0.1);
      }
      
      .btn-delete:hover {
        background: rgba(255, 100, 100, 0.1);
        border-color: #ff6464;
        color: #ff6464;
      }
      
      .blog-status {
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
        display: inline-block;
      }
      
      .blog-status.public {
        background: rgba(163, 177, 138, 0.2);
        color: var(--accent);
      }
      
      .blog-status.private {
        background: rgba(100, 100, 255, 0.2);
        color: #6464ff;
      }
      
      /* Toast styles */
      .toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      
      .toast {
        background: var(--paper);
        border: 1px solid var(--line);
        color: var(--ink);
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        max-width: 300px;
        opacity: 0;
        transform: translateX(100px);
        transition: all 300ms var(--ease);
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .toast-success {
        border-left: 4px solid #4CAF50;
        background: rgba(76, 175, 80, 0.1);
      }
      
      .toast-error {
        border-left: 4px solid #f44336;
        background: rgba(244, 67, 54, 0.1);
      }
      
      .toast-info {
        border-left: 4px solid var(--accent);
        background: rgba(163, 177, 138, 0.1);
      }
      
      .toast.show {
        opacity: 1;
        transform: translateX(0);
      }
      
      .toast.hide {
        opacity: 0;
        transform: translateX(100px);
      }
      
      /* Loading skeleton */
      .blog-card.loading {
        animation: shimmer 1.5s infinite linear;
        background: linear-gradient(
          90deg,
          var(--paper) 0%,
          rgba(255, 255, 255, 0.05) 50%,
          var(--paper) 100%
        );
        background-size: 200% 100%;
        min-height: 200px;
        border: 1px solid var(--line);
        border-radius: 16px;
      }
      
      @keyframes shimmer {
        0% {
          background-position: -200% 0;
        }
        100% {
          background-position: 200% 0;
        }
      }
      
      /* Pagination styles */
      .blogs-pagination {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 16px;
        margin-top: 40px;
        padding-top: 24px;
        border-top: 1px solid var(--line);
      }
      
      .pagination-btn {
        padding: 10px 16px;
        background: var(--paper);
        border: 1px solid var(--line);
        border-radius: 8px;
        color: var(--ink);
        font-size: 14px;
        cursor: pointer;
        transition: all 200ms var(--ease);
      }
      
      .pagination-btn:hover:not(:disabled) {
        border-color: var(--ring);
        transform: translateY(-1px);
      }
      
      .pagination-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .pagination-info {
        font-size: 14px;
        color: var(--muted);
      }
      
      /* Profile dropdown fixes */
      .profile-dropdown .dropdown-item {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        padding: 10px 16px !important;
        width: 100% !important;
        text-align: left !important;
      }
      
      .profile-dropdown .dropdown-item svg {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
      }
      
      /* Ensure blog cards are clickable */
      .blog-card {
        cursor: pointer;
        transition: all 300ms var(--ease);
      }
      
      .blog-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
      }
    `;
    document.head.appendChild(style);

    // Add a small delay to ensure all elements are loaded
    setTimeout(() => {
      try {
        window.blogPageController = new BlogPageController();
      } catch (error) {
        console.error("Failed to initialize Blog Page Controller:", error);
      }
    }, 100);
  }
});
