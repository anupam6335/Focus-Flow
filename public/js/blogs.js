/**
 * FocusFlow — Blog Page Controller
 */

class FocusFlowBlogs {
  constructor() {
    this.state = {
      currentTab: "all-blogs",
      searchTerm: "",
      sortBy: "newest",
      category: "all",
      currentPage: 1,
      totalPages: 1,
      totalBlogs: 0,
      tags: [],
      tagSuggestions: [],
      allTags: new Set(),
      selectedSuggestionIndex: 0,
      blogs: [],
      popularBlogs: [],
      userBlogs: [],
      isLoading: false,
      isAuthenticated: false,
      currentUsername: null,
      // My Blogs state
      myBlogsPage: 1,
      myBlogsTotalPages: 1,
      myBlogsTotal: 0,
      myBlogs: [],
      // Dynamic categories
      dynamicCategories: new Set([
        "all",
        "dsa",
        "algorithms",
        "productivity",
        "journey",
        "tips",
      ]),
    };

    this.elements = {};
    this.baseURL = window.location.origin;
    this.apiURL = `${this.baseURL}/api`;

    this.init();
  }

  /**
   * Initialize the blog page with backend integration
   */
  async init() {
    this.initializeElements();
    this.setupEventListeners();
    this.setupTabNavigation();
    this.setupSearch();
    this.setupFilters();
    this.setupCreateBlogModal();
    this.setupTagSystem();
    this.setupPagination();

    // Check authentication
    await this.checkAuthentication();

    // Load initial data
    await this.loadAllBlogs();
    await this.loadPopularBlogs();
    await this.loadExistingTags();
    await this.loadAndUpdateCategories();

    // Force update auth UI
    this.updateAuthUI();

    // Final check for create blog button
    this.forceUpdateCreateBlogButton();
  }

  /**
   * Check user authentication
   */
  async checkAuthentication() {
    // Method 1: Try to get user profile directly
    try {
      const response = await fetch(`${this.apiURL}/users/me`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success && data.user && data.user.username) {
          this.state.isAuthenticated = true;
          this.state.currentUsername = data.user.username;

          return;
        }
      }
    } catch (error) {}

    // Method 2: Try to fetch user's blogs (protected endpoint)
    try {
      const response = await fetch(`${this.apiURL}/blogs/my?page=1&limit=1`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success) {
          this.state.isAuthenticated = true;

          // If we have blogs, we can get username from the first blog's author
          if (data.blogs && data.blogs.length > 0 && data.blogs[0].author) {
            this.state.currentUsername = data.blogs[0].author;
          } else {
            // Try to decode token from cookies
            this.extractUsernameFromCookies();
          }
          return;
        }
      }
    } catch (error) {}

    // Method 3: Check for token cookie and decode
    try {
      const cookies = document.cookie.split(";").reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split("=");
        acc[key] = value;
        return acc;
      }, {});

      if (cookies.ff_token) {
        this.state.isAuthenticated = true;

        // Try to decode JWT token
        this.extractUsernameFromCookies();

        // If still no username, use a default
        if (!this.state.currentUsername) {
          this.state.currentUsername = "User";
        }
        return;
      }
    } catch (error) {}

    // Not authenticated

    this.state.isAuthenticated = false;
    this.state.currentUsername = null;
  }

  /**
   * Extract username from cookies
   */
  extractUsernameFromCookies() {
    try {
      const cookies = document.cookie.split(";").reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split("=");
        acc[key] = value;
        return acc;
      }, {});

      if (cookies.ff_token) {
        const token = cookies.ff_token;

        // Try to decode JWT token (simplified - assumes standard JWT format)
        try {
          const tokenParts = token.split(".");
          if (tokenParts.length === 3) {
            // Decode base64 payload
            const payload = JSON.parse(atob(tokenParts[1]));

            // Try different possible username fields
            if (payload.username) {
              this.state.currentUsername = payload.username;
            } else if (payload.user && payload.user.username) {
              this.state.currentUsername = payload.user.username;
            } else if (payload.sub) {
              this.state.currentUsername = payload.sub;
            } else if (payload.name) {
              this.state.currentUsername = payload.name;
            } else if (payload.email) {
              this.state.currentUsername = payload.email.split("@")[0];
            }
          }
        } catch (decodeError) {
          // Alternative: Try URL-safe base64 decode
          try {
            const tokenParts = token.split(".");
            if (tokenParts.length === 3) {
              // URL-safe base64 decode
              const base64 = tokenParts[1]
                .replace(/-/g, "+")
                .replace(/_/g, "/");
              const payload = JSON.parse(atob(base64));

              if (payload.username) {
                this.state.currentUsername = payload.username;
              }
            }
          } catch (urlSafeError) {}
        }
      }
    } catch (error) {}

    // Fallback to default if still no username
    if (!this.state.currentUsername && this.state.isAuthenticated) {
      this.state.currentUsername = "User";
    }
  }

  /**
   * Update UI based on authentication status
   */
  updateAuthUI() {
    const loginLink = document.getElementById("login-link");
    const profileLink = document.getElementById("profile-link");
    const logoutBtn = document.getElementById("logout-btn");
    const createBlogBtn = document.getElementById("create-blog");

    if (this.state.isAuthenticated) {
      // Hide login, show profile and logout
      if (loginLink) {
        loginLink.style.display = "none";
      }

      if (profileLink) {
        profileLink.style.display = "flex";
        const username = this.state.currentUsername || "Profile";
        profileLink.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          ${username}
        `;
      }

      if (logoutBtn) {
        logoutBtn.style.display = "flex";
      }

      // Enable create blog button
      if (createBlogBtn) {
        this.enableCreateBlogButton(createBlogBtn);
      } else {
      }
    } else {
      // Show login, hide profile and logout
      if (loginLink) loginLink.style.display = "flex";
      if (profileLink) profileLink.style.display = "none";
      if (logoutBtn) logoutBtn.style.display = "none";

      // Disable create blog button
      if (createBlogBtn) {
        this.disableCreateBlogButton(createBlogBtn);
      }

      // If switching to My Blogs tab but not authenticated, switch to All Blogs
      if (this.state.currentTab === "my-blogs") {
        this.switchTab("all-blogs");

        // Show toast message
        setTimeout(() => {
          this.showToast("Please login to view your blogs");
        }, 300);
      }
    }
  }

  /**
   * Enable create blog button with multiple methods
   */
  enableCreateBlogButton(button) {
    if (!button) return;

    // Remove disabled attribute
    button.removeAttribute("disabled");

    // Set disabled property to false
    button.disabled = false;

    // Update styles
    button.style.opacity = "1";
    button.style.cursor = "pointer";
    button.style.pointerEvents = "auto";

    // Remove any disabled classes
    button.classList.remove("disabled");

    // Update accessibility
    button.setAttribute("aria-disabled", "false");
    button.title = "Create a new blog post";
  }

  /**
   * Disable create blog button
   */
  disableCreateBlogButton(button) {
    if (!button) return;

    button.disabled = true;
    button.style.opacity = "0.5";
    button.style.cursor = "not-allowed";
    button.title = "Login to create blogs";
  }

  /**
   * Force update create blog button state
   */
  forceUpdateCreateBlogButton() {
    const createBlogBtn = document.getElementById("create-blog");
    if (!createBlogBtn) {
      console.error("Create blog button not found!");
      return;
    }

    if (this.state.isAuthenticated) {
      this.enableCreateBlogButton(createBlogBtn);
    } else {
      this.disableCreateBlogButton(createBlogBtn);
    }
  }

  /**
   * Cache DOM elements
   */
  initializeElements() {
    const elementIds = [
      "all-blogs-content",
      "popular-blogs-content",
      "my-blogs-content",
      "blog-search",
      "blog-sort",
      "blog-category",
      "create-blog",
      "create-blog-modal",
      "close-create-blog-modal",
      "cancel-create-blog",
      "publish-blog",
      "create-blog-form",
      "blog-title",
      "blog-content",
      "blog-category-select",
      "blog-is-public",
      "privacy-toggle",
      "private-info",
      "public-toggle-section",
      "tags-input-wrapper",
      "blog-tags-input",
      "tags-suggestions",
      "title-count",
      "title-progress",
    ];

    elementIds.forEach((id) => {
      this.elements[id] = document.getElementById(id);
    });

    // Tab elements
    this.tabButtons = document.querySelectorAll(".blog-tab");
    this.tabContents = document.querySelectorAll(".blog-tab-content");
    this.paginationButtons = document.querySelectorAll(".page-btn");
    this.prevButton = document.querySelector(".pagination-btn.prev");
    this.nextButton = document.querySelector(".pagination-btn.next");
    this.blogsGrid = document.querySelector("#all-blogs-content .blogs-grid");
    this.popularBlogsGrid = document.querySelector(
      "#popular-blogs-content .blogs-grid"
    );
    this.myBlogsGrid = document.querySelector("#my-blogs-content .blogs-grid");
  }

  /**
   * Setup event listeners with backend integration
   */
  setupEventListeners() {
    // Tab switching
    this.tabButtons.forEach((tab) => {
      tab.addEventListener("click", () => this.switchTab(tab.dataset.tab));
    });

    // Character counter for blog title
    if (this.elements["blog-title"]) {
      this.elements["blog-title"].addEventListener("input", (e) => {
        this.updateTitleCounter(e.target.value);
      });
      this.updateTitleCounter("");
    }

    // Privacy toggle
    if (this.elements["blog-is-public"]) {
      this.elements["blog-is-public"].addEventListener("change", (e) => {
        this.togglePrivacy(e.target.checked);
      });
      this.togglePrivacy(true);
    }

    // Privacy section click
    if (this.elements["privacy-toggle"]) {
      this.elements["privacy-toggle"].addEventListener("click", (e) => {
        if (!e.target.closest(".custom-toggle")) {
          const checkbox = this.elements["blog-is-public"];
          checkbox.checked = !checkbox.checked;
          checkbox.dispatchEvent(new Event("change"));
        }
      });
    }

    // Logout button
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        await this.handleLogout();
      });
    }

    // Login button
    const loginLink = document.getElementById("login-link");
    if (loginLink) {
      loginLink.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "/auth";
      });
    }

    // Profile link
    const profileLink = document.getElementById("profile-link");
    if (profileLink) {
      profileLink.addEventListener("click", (e) => {
        e.preventDefault();
        if (this.state.currentUsername) {
          window.location.href = `/user/${this.state.currentUsername}`;
        } else {
          window.location.href = "/profile";
        }
      });
    }

    // Update auth UI after all event listeners are set
    setTimeout(() => this.updateAuthUI(), 100);
  }

  /**
   * Setup dynamic tag system
   */
  setupTagSystem() {
    const tagsInput = this.elements["blog-tags-input"];
    const tagsWrapper = this.elements["tags-input-wrapper"];
    const suggestions = this.elements["tags-suggestions"];

    if (!tagsInput || !tagsWrapper || !suggestions) return;

    tagsInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === "," || e.key === " ") {
        e.preventDefault();
        const tag = tagsInput.value.trim().toLowerCase();
        if (tag) this.addTagFromInput();
      }

      if (e.key === "Backspace" && tagsInput.value === "") {
        this.removeLastTag();
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        this.navigateSuggestions(1);
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        this.navigateSuggestions(-1);
      }

      if (e.key === "Enter" && suggestions.style.display === "block") {
        e.preventDefault();
        const selectedSuggestion = suggestions.querySelector(
          ".suggestion-item.selected"
        );
        if (selectedSuggestion) {
          const tag = selectedSuggestion.dataset.tag;
          this.addTag(tag);
          tagsInput.value = "";
          tagsInput.focus();
          suggestions.style.display = "none";
        }
      }
    });

    tagsInput.addEventListener("input", (e) => {
      this.showTagSuggestions(e.target.value);
    });

    document.addEventListener("click", (e) => {
      if (!tagsWrapper.contains(e.target)) {
        suggestions.style.display = "none";
      }
    });

    suggestions.addEventListener("click", (e) => {
      const suggestionItem = e.target.closest(".suggestion-item");
      if (suggestionItem) {
        const tag = suggestionItem.dataset.tag;
        this.addTag(tag);
        tagsInput.value = "";
        tagsInput.focus();
        suggestions.style.display = "none";
      }
    });
  }

  /**
   * Load existing tags from backend
   */
  async loadExistingTags() {
    try {
      const response = await fetch(`${this.apiURL}/blogs/all?limit=50`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.blogs)) {
          data.blogs.forEach((blog) => {
            if (blog.tags && Array.isArray(blog.tags)) {
              blog.tags.forEach((tag) => {
                if (tag && typeof tag === "string") {
                  this.state.allTags.add(tag.toLowerCase());
                }
              });
            }
          });
        }
      }
    } catch (error) {
      console.error("Failed to load tags:", error);
    }

    // Add default tags as fallback
    const defaultTags = [
      "dsa",
      "algorithms",
      "programming",
      "webdev",
      "javascript",
      "react",
      "nodejs",
      "python",
      "java",
      "cpp",
      "productivity",
      "learning",
      "tutorial",
      "beginners",
      "advanced",
      "system-design",
      "database",
      "api",
      "frontend",
      "backend",
    ];

    defaultTags.forEach((tag) => this.state.allTags.add(tag));
  }

  /**
   * Load and update dynamic categories
   */
  async loadAndUpdateCategories() {
    try {
      // Load blogs to extract unique tags
      const response = await fetch(`${this.apiURL}/blogs/all?limit=100`);

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.blogs)) {
          // Extract unique tags from all blogs
          const allTags = new Set();
          data.blogs.forEach((blog) => {
            if (blog.tags && Array.isArray(blog.tags)) {
              blog.tags.forEach((tag) => {
                if (tag && typeof tag === "string") {
                  // Add tag to categories (convert to lowercase, remove special chars)
                  const cleanTag = tag.toLowerCase().trim();
                  if (cleanTag.length > 0 && cleanTag.length <= 20) {
                    allTags.add(cleanTag);
                    this.state.allTags.add(cleanTag);
                  }
                }
              });
            }
          });

          // Update the category dropdown
          this.updateCategoryDropdown(Array.from(allTags));
        }
      }
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  }

  /**
   * Update category dropdown with dynamic categories
   */
  updateCategoryDropdown(tags) {
    const categorySelect = this.elements["blog-category"];
    if (!categorySelect) return;

    // Store current value
    const currentValue = categorySelect.value;

    // Clear existing options (keep first "All Categories" option)
    while (categorySelect.options.length > 1) {
      categorySelect.remove(1);
    }

    // Convert tags to array and sort alphabetically
    const sortedTags = Array.from(
      new Set([...Array.from(this.state.dynamicCategories), ...tags])
    ).sort();

    // Add sorted categories
    sortedTags.forEach((tag) => {
      if (tag !== "all") {
        // Skip 'all' since it's already there
        const option = document.createElement("option");
        option.value = tag;
        option.textContent = this.capitalizeFirstLetter(tag);
        categorySelect.appendChild(option);
      }
    });

    // Restore current value if it exists in new options
    if (
      currentValue &&
      Array.from(categorySelect.options).some(
        (opt) => opt.value === currentValue
      )
    ) {
      categorySelect.value = currentValue;
    }
  }

  /**
   * Capitalize first letter of a string
   */
  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  /**
   * Add tag from input field
   */
  addTagFromInput() {
    const tagsInput = this.elements["blog-tags-input"];
    let tag = tagsInput.value.trim().toLowerCase();

    tag = tag.replace(/[,\s]+$/, "");

    if (tag && tag.length > 0 && tag.length <= 20) {
      if (!this.state.tags.includes(tag)) {
        this.addTag(tag);
        tagsInput.value = "";
        this.showTagSuggestions("");
      } else {
        this.showToast(`Tag "${tag}" already added`);
        tagsInput.value = "";
      }
    }
  }

  /**
   * Add a tag to the UI and state
   */
  addTag(tag) {
    if (this.state.tags.includes(tag) || tag.length === 0) return;

    if (tag.length > 20) {
      this.showToast("Tag must be 20 characters or less");
      return;
    }

    this.state.tags.push(tag);
    this.state.allTags.add(tag);

    const tagElement = document.createElement("div");
    tagElement.className = "tag-item";
    tagElement.innerHTML = `
      <span>${tag}</span>
      <button class="remove-tag" data-tag="${tag}" aria-label="Remove tag ${tag}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;

    const tagsWrapper = this.elements["tags-input-wrapper"];
    const tagsInput = this.elements["blog-tags-input"];
    tagsWrapper.insertBefore(tagElement, tagsInput);

    const removeBtn = tagElement.querySelector(".remove-tag");
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.removeTag(tag);
    });

    tagsInput.focus();
  }

  /**
   * Remove a tag
   */
  removeTag(tag) {
    this.state.tags = this.state.tags.filter((t) => t !== tag);

    const tagElement = document
      .querySelector(`.remove-tag[data-tag="${tag}"]`)
      ?.closest(".tag-item");
    if (tagElement) {
      tagElement.style.animation = "tagSlideIn 200ms var(--ease) reverse";
      setTimeout(() => {
        tagElement.remove();
      }, 200);
    }
  }

  /**
   * Remove last tag
   */
  removeLastTag() {
    if (this.state.tags.length > 0) {
      const lastTag = this.state.tags[this.state.tags.length - 1];
      this.removeTag(lastTag);
    }
  }

  /**
   * Show tag suggestions
   */
  showTagSuggestions(input) {
    const suggestions = this.elements["tags-suggestions"];

    if (!input || input.length === 0) {
      suggestions.style.display = "none";
      return;
    }

    const filtered = Array.from(this.state.allTags)
      .filter(
        (tag) =>
          tag.includes(input.toLowerCase()) && !this.state.tags.includes(tag)
      )
      .slice(0, 5);

    if (filtered.length === 0) {
      if (input.length >= 2 && input.length <= 20) {
        suggestions.innerHTML = `
          <div class="suggestion-item selected" data-tag="${input}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="margin-right: 8px;">
              <path d="M12 5v14"></path>
              <path d="M5 12h14"></path>
            </svg>
            Create new tag: "${input}"
          </div>
        `;
        suggestions.style.display = "block";
        this.state.tagSuggestions = [input];
        this.state.selectedSuggestionIndex = 0;
      } else {
        suggestions.style.display = "none";
      }
      return;
    }

    suggestions.innerHTML = filtered
      .map(
        (tag, index) => `
      <div class="suggestion-item ${
        index === 0 ? "selected" : ""
      }" data-tag="${tag}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="margin-right: 8px;">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
        </svg>
        ${tag}
      </div>
    `
      )
      .join("");

    suggestions.style.display = "block";
    this.state.tagSuggestions = filtered;
    this.state.selectedSuggestionIndex = 0;
  }

  /**
   * Navigate suggestions with arrow keys
   */
  navigateSuggestions(direction) {
    const suggestions = this.elements["tags-suggestions"];
    if (!suggestions || suggestions.style.display === "none") return;

    const items = suggestions.querySelectorAll(".suggestion-item");
    if (items.length === 0) return;

    this.state.selectedSuggestionIndex =
      (this.state.selectedSuggestionIndex + direction + items.length) %
      items.length;

    items.forEach((item, index) => {
      item.classList.toggle(
        "selected",
        index === this.state.selectedSuggestionIndex
      );
    });

    items[this.state.selectedSuggestionIndex]?.scrollIntoView({
      block: "nearest",
    });
  }

  /**
   * Update title counter with progress bar
   */
  updateTitleCounter(text) {
    const count = text.length;
    const max = 200;
    const progress = (count / max) * 100;

    if (this.elements["title-count"]) {
      this.elements["title-count"].textContent = `${count}/${max}`;
    }

    if (this.elements["title-progress"]) {
      this.elements["title-progress"].style.width = `${progress}%`;

      if (progress > 90) {
        this.elements["title-progress"].style.background = "#e74c3c";
      } else if (progress > 75) {
        this.elements["title-progress"].style.background = "#f39c12";
      } else {
        this.elements["title-progress"].style.background = "var(--accent)";
      }
    }
  }

  /**
   * Toggle privacy state
   */
  togglePrivacy(isPublic) {
    const toggleSwitch = this.elements["privacy-toggle"];
    const privateInfo = this.elements["private-info"];
    const publicSection = this.elements["public-toggle-section"];

    if (toggleSwitch) {
      toggleSwitch.classList.toggle("active", isPublic);
      const toggleIcon = toggleSwitch.querySelector(".toggle-icon");
      if (toggleIcon) {
        toggleIcon.style.color = isPublic ? "var(--accent)" : "var(--muted)";
      }
    }

    if (privateInfo) {
      privateInfo.style.display = isPublic ? "none" : "block";
    }

    if (publicSection) {
      publicSection.style.borderColor = isPublic
        ? "var(--line)"
        : "var(--accent)";
      publicSection.style.backgroundColor = isPublic
        ? "var(--bg)"
        : "rgba(163, 177, 138, 0.03)";
    }
  }

  /**
   * Load all blogs from backend
   */
  async loadAllBlogs() {
    try {
      this.state.isLoading = true;
      const params = new URLSearchParams({
        page: this.state.currentPage,
        limit: 6,
        sort: this.state.sortBy,
        ...(this.state.category !== "all" && { category: this.state.category }),
        ...(this.state.searchTerm && { search: this.state.searchTerm }),
      });

      const response = await fetch(`${this.apiURL}/blogs/all?${params}`);

      if (response.ok) {
        const data = await response.json();

        if (data.success && Array.isArray(data.blogs)) {
          this.state.blogs = data.blogs;
          this.state.totalPages = data.totalPages || 1;
          this.state.totalBlogs = data.total || 0;
          this.renderBlogs();
          this.updatePaginationUI();
        } else {
          this.state.blogs = [];
          this.renderBlogs();
        }
      } else {
        throw new Error(`Failed to load blogs: ${response.status}`);
      }
    } catch (error) {
      console.error("Error loading blogs:", error);
      this.showToast("Failed to load blogs. Please try again.");
      this.state.blogs = [];
      this.renderBlogs();
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * Load popular blogs from backend
   */
  async loadPopularBlogs() {
    try {
      const response = await fetch(
        `${this.apiURL}/blogs/popular?limit=6&factor=overall`
      );

      if (response.ok) {
        const data = await response.json();

        if (data.success && Array.isArray(data.blogs)) {
          this.state.popularBlogs = data.blogs;
          this.renderPopularBlogs();
        } else {
          this.state.popularBlogs = [];
          this.renderPopularBlogs();
        }
      } else {
        throw new Error(`Failed to load popular blogs: ${response.status}`);
      }
    } catch (error) {
      console.error("Error loading popular blogs:", error);
      this.state.popularBlogs = [];
      this.renderPopularBlogs();
    }
  }

  /**
   * Load My Blogs from backend
   */
  async loadMyBlogs() {
    if (!this.state.isAuthenticated) {
      this.showMyBlogsLoginMessage();
      return;
    }

    try {
      this.state.isLoading = true;
      const params = new URLSearchParams({
        page: this.state.myBlogsPage,
        limit: 6,
      });

      const response = await fetch(`${this.apiURL}/blogs/my?${params}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success && Array.isArray(data.blogs)) {
          this.state.myBlogs = data.blogs;
          this.state.myBlogsTotalPages = data.totalPages || 1;
          this.state.myBlogsTotal = data.total || 0;
          this.renderMyBlogs();
          this.updateMyBlogsPaginationUI();
        } else {
          this.state.myBlogs = [];
          this.renderMyBlogs();
        }
      } else {
        throw new Error(`Failed to load my blogs: ${response.status}`);
      }
    } catch (error) {
      console.error("Error loading my blogs:", error);
      this.showToast("Failed to load your blogs. Please try again.");
      this.state.myBlogs = [];
      this.renderMyBlogs();
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * Show login message for My Blogs
   */
  showMyBlogsLoginMessage() {
    const myBlogsGrid = this.myBlogsGrid;
    const myBlogsPagination = document.querySelector(".my-blogs-pagination");

    if (myBlogsPagination) {
      myBlogsPagination.style.display = "none";
    }

    if (myBlogsGrid) {
      myBlogsGrid.innerHTML = `
        <div class="no-blogs-message" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="64" height="64" style="color: var(--muted); margin-bottom: 20px; opacity: 0.5;">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <h3 style="color: var(--ink); margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">
            Login to view your blogs
          </h3>
          <p style="color: var(--muted); margin: 0 0 24px 0; font-size: 14px;">
            Sign in to see all your blogs, including private ones.
          </p>
          <a href="/auth" class="btn-primary" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            Login to Continue
          </a>
        </div>
      `;
    }
  }

  /**
   * Render blogs to the grid
   */
  renderBlogs() {
    if (!this.blogsGrid) return;

    if (!this.state.blogs || this.state.blogs.length === 0) {
      this.blogsGrid.innerHTML = `
        <div class="no-blogs-message" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="64" height="64" style="color: var(--muted); margin-bottom: 20px; opacity: 0.5;">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <h3 style="color: var(--ink); margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">
            No blogs found
          </h3>
          <p style="color: var(--muted); margin: 0 0 24px 0; font-size: 14px; max-width: 400px; margin: 0 auto;">
            ${
              this.state.searchTerm || this.state.category !== "all"
                ? "Try adjusting your search or filters"
                : "Be the first to create a blog!"
            }
          </p>
          ${
            !this.state.isAuthenticated
              ? `
            <a href="/auth" class="btn-primary" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Login to Create Blog
            </a>
          `
              : ""
          }
        </div>
      `;
      return;
    }

    this.blogsGrid.innerHTML = this.state.blogs
      .map((blog) => this.createBlogCard(blog))
      .join("");
    this.setupBlogCardInteractions();
  }

  /**
   * Render My Blogs
   */
  renderMyBlogs() {
    const myBlogsGrid = this.myBlogsGrid;
    const myBlogsPagination = document.querySelector(".my-blogs-pagination");

    if (!myBlogsGrid) return;

    if (!this.state.myBlogs || this.state.myBlogs.length === 0) {
      if (myBlogsPagination) {
        myBlogsPagination.style.display = "none";
      }

      myBlogsGrid.innerHTML = `
      <div class="no-blogs-message" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="64" height="64" style="color: var(--muted); margin-bottom: 20px; opacity: 0.5;">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        <h3 style="color: var(--ink); margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">
          No blogs yet
        </h3>
        <p style="color: var(--muted); margin: 0 0 24px 0; font-size: 14px;">
          You haven't created any blogs yet. Start writing your first blog post!
        </p>
        <button id="create-blog-from-empty" class="btn-primary" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Create Your First Blog
        </button>
      </div>
    `;

      // Add event listener to create blog button in empty state
      setTimeout(() => {
        const createBtn = document.getElementById("create-blog-from-empty");
        if (createBtn) {
          createBtn.addEventListener("click", () => {
            this.showCreateBlogModal();
          });
        }
      }, 100);

      return;
    }

    if (myBlogsPagination) {
      myBlogsPagination.style.display = "flex";
    }

    // Render my blogs with privacy tags (showPrivacyTag = true)
    myBlogsGrid.innerHTML = this.state.myBlogs
      .map((blog) => this.createBlogCard(blog, false, true))
      .join("");
    this.setupBlogCardInteractions();
  }

  /**
   * Render popular blogs with featured styling
   */
  renderPopularBlogs() {
    if (!this.popularBlogsGrid) return;

    if (!this.state.popularBlogs || this.state.popularBlogs.length === 0) {
      this.popularBlogsGrid.innerHTML = `
        <div class="no-blogs-message" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="64" height="64" style="color: var(--muted); margin-bottom: 20px; opacity: 0.5;">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <h3 style="color: var(--ink); margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">
            No popular blogs yet
          </h3>
          <p style="color: var(--muted); margin: 0; font-size: 14px;">
            Be the first to create an engaging blog!
          </p>
        </div>
      `;
      return;
    }

    // Sort popular blogs by popularity score (likes + views + comments)
    const sortedPopularBlogs = [...this.state.popularBlogs].sort((a, b) => {
      const scoreA = (a.likes || 0) + (a.views || 0) + (a.commentCount || 0);
      const scoreB = (b.likes || 0) + (b.views || 0) + (b.commentCount || 0);
      return scoreB - scoreA;
    });

    // Create blog cards - mark first 2 as featured
    this.popularBlogsGrid.innerHTML = sortedPopularBlogs
      .map((blog, index) => {
        // Mark first 2 blogs as featured, or any blog with featured flag from backend
        const isFeatured = index < 2 || blog.featured === true;
        return this.createBlogCard(blog, isFeatured);
      })
      .join("");

    this.setupBlogCardInteractions();
  }

  /**
   * Create blog card HTML with safe data handling
   */

  createBlogCard(blog, isFeatured = false, showPrivacyTag = false) {
    // Safe data extraction with fallbacks
    const title = blog.title || "Untitled Blog";
    const author = blog.author || "Unknown";
    const date = blog.createdAt
      ? new Date(blog.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "Date unknown";

    // Safe excerpt handling
    let excerpt = "No content available";
    if (blog.excerpt && blog.excerpt.trim()) {
      excerpt =
        blog.excerpt.length > 150
          ? blog.excerpt.substring(0, 150) + "..."
          : blog.excerpt;
    } else if (blog.content && blog.content.trim()) {
      const cleanContent = blog.content.replace(/[#*`]/g, "");
      excerpt =
        cleanContent.length > 150
          ? cleanContent.substring(0, 150) + "..."
          : cleanContent;
    }

    const views = blog.views || 0;
    const likes = blog.likes || 0;
    const commentCount = blog.commentCount || 0;
    const tags =
      blog.tags && Array.isArray(blog.tags) ? blog.tags : ["general"];
    const slug = blog.slug || "";
    const isPublic = blog.isPublic !== false; // Default to public if not specified

    // Check if blog is featured
    const shouldBeFeatured = isFeatured || blog.featured === true;

    // Determine privacy badge - star style like featured badge
    const privacyBadge = showPrivacyTag
      ? `
      <div class="privacy-badge ${isPublic ? "public-badge" : "private-badge"}">
        <svg viewBox="0 0 24 24" fill="currentColor">
          ${
            isPublic
              ? `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
             <circle cx="12" cy="12" r="3"></circle>`
              : `<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
             <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>`
          }
        </svg>
        ${isPublic ? "Public" : "Private"}
      </div>
    `
      : "";

    return `
      <article class="blog-card ${
        shouldBeFeatured ? "featured" : ""
      }" data-slug="${slug}">
        ${
          shouldBeFeatured
            ? `
          <div class="featured-badge">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
            </svg>
            Featured
          </div>
        `
            : ""
        }
        
        ${privacyBadge}
        
        <div class="blog-card-header">
          <div class="blog-author">
            <div class="author-avatar">${author.charAt(0).toUpperCase()}</div>
            <div class="author-info">
              <span class="author-name">${author}</span>
              <span class="blog-date">${date}</span>
            </div>
          </div>
          <div class="blog-meta">
            <span class="blog-views">${views} views</span>
          </div>
        </div>
        <h3 class="blog-title">${title}</h3>
        <p class="blog-excerpt">${excerpt}</p>
        <div class="blog-footer">
          <div class="blog-tags">
            ${tags
              .slice(0, 3)
              .map((tag) => `<span class="blog-tag">${tag}</span>`)
              .join("")}
          </div>
          <div class="blog-stats">
            <span class="blog-stat like-stat" data-blog-slug="${slug}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
              ${likes}
            </span>
            <span class="blog-stat comment-stat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              ${commentCount}
            </span>
          </div>
        </div>
      </article>
    `;
  }
  /**
   * Setup tab navigation
   */
  setupTabNavigation() {
    this.switchTab("all-blogs");
  }

  /**
   * Switch between tabs
   */
  switchTab(tabName) {
    this.tabButtons.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.tab === tabName);
    });

    this.tabContents.forEach((content) => {
      content.classList.toggle("active", content.id === `${tabName}-content`);
    });

    this.state.currentTab = tabName;

    // Load data based on tab
    if (tabName === "popular-blogs" && this.state.popularBlogs.length === 0) {
      this.loadPopularBlogs();
    } else if (tabName === "my-blogs") {
      this.loadMyBlogs();
    }
  }

  /**
   * Setup search functionality
   */
  setupSearch() {
    if (this.elements["blog-search"]) {
      const searchInput = this.elements["blog-search"];
      let searchTimeout;

      searchInput.addEventListener("focus", () => {
        searchInput.parentElement.classList.add("focused");
      });

      searchInput.addEventListener("blur", () => {
        searchInput.parentElement.classList.remove("focused");
      });

      searchInput.addEventListener("input", (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.state.searchTerm = e.target.value.trim();
          this.state.currentPage = 1;
          this.loadAllBlogs();
        }, 500);
      });
    }
  }

  /**
   * Setup filter functionality
   */
  setupFilters() {
    if (this.elements["blog-sort"]) {
      this.elements["blog-sort"].addEventListener("change", (e) => {
        this.state.sortBy = e.target.value;
        this.state.currentPage = 1;
        this.loadAllBlogs();
      });
    }

    if (this.elements["blog-category"]) {
      this.elements["blog-category"].addEventListener("change", (e) => {
        this.state.category = e.target.value;
        this.state.currentPage = 1;
        this.loadAllBlogs();
      });
    }
  }

  /**
   * Setup blog card interactions
   */
  setupBlogCardInteractions() {
    document.querySelectorAll(".blog-card").forEach((card) => {
      // Click to view blog
      card.addEventListener("click", (e) => {
        if (
          e.target.closest(".blog-stat") ||
          e.target.closest(".blog-tag") ||
          e.target.closest(".author-avatar")
        ) {
          return;
        }

        const slug = card.dataset.slug;
        if (slug) {
          window.location.href = `/blogs/${slug}`;
        }
      });

      // Like button
      const likeStat = card.querySelector(".like-stat");
      if (likeStat && this.state.isAuthenticated) {
        likeStat.addEventListener("click", async (e) => {
          e.stopPropagation();
          const blogSlug = likeStat.dataset.blogSlug;
          await this.handleLikeBlog(blogSlug, likeStat);
        });
      }

      // Hover effects
      card.addEventListener("mouseenter", () => {
        card.style.transform = "translateY(-2px)";
      });

      card.addEventListener("mouseleave", () => {
        card.style.transform = "translateY(0)";
      });
    });
  }

  /**
   * Handle like/unlike blog
   */
  async handleLikeBlog(blogSlug, likeElement) {
    if (!this.state.isAuthenticated) {
      this.showToast("Please login to like blogs");
      return;
    }

    try {
      const response = await fetch(`${this.apiURL}/blogs/${blogSlug}/like`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          likeElement.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            ${data.likes}
          `;

          if (data.hasLiked) {
            this.showToast("Blog liked!");
            likeElement.classList.add("liked");
          } else {
            this.showToast("Blog unliked");
            likeElement.classList.remove("liked");
          }

          // Update the blog in state
          const blogIndex = this.state.blogs.findIndex(
            (b) => b.slug === blogSlug
          );
          if (blogIndex !== -1) {
            this.state.blogs[blogIndex].likes = data.likes;
          }

          // Also update in my blogs if exists
          const myBlogIndex = this.state.myBlogs.findIndex(
            (b) => b.slug === blogSlug
          );
          if (myBlogIndex !== -1) {
            this.state.myBlogs[myBlogIndex].likes = data.likes;
          }
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to like blog");
      }
    } catch (error) {
      console.error("Error liking blog:", error);
      this.showToast(error.message || "Failed to like blog");
    }
  }

  /**
   * Setup pagination
   */
  setupPagination() {
    // Prev/Next buttons for All Blogs
    if (this.prevButton) {
      this.prevButton.addEventListener("click", () => {
        if (this.state.currentPage > 1) {
          this.state.currentPage--;
          this.loadAllBlogs();
        }
      });
    }

    if (this.nextButton) {
      this.nextButton.addEventListener("click", () => {
        if (this.state.currentPage < this.state.totalPages) {
          this.state.currentPage++;
          this.loadAllBlogs();
        }
      });
    }
  }

  /**
   * Update pagination UI for All Blogs
   */
  updatePaginationUI() {
    const pagesContainer = document.querySelector(".pagination-pages");
    if (!pagesContainer) return;

    // Clear existing page buttons
    pagesContainer.innerHTML = "";

    // Create page buttons
    const maxPagesToShow = 5;
    let startPage = Math.max(
      1,
      this.state.currentPage - Math.floor(maxPagesToShow / 2)
    );
    let endPage = Math.min(
      this.state.totalPages,
      startPage + maxPagesToShow - 1
    );

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    // Add page buttons
    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement("button");
      pageBtn.className = `page-btn ${
        i === this.state.currentPage ? "active" : ""
      }`;
      pageBtn.textContent = i;
      pageBtn.addEventListener("click", () => {
        this.state.currentPage = i;
        this.loadAllBlogs();
      });
      pagesContainer.appendChild(pageBtn);
    }

    // Add dots if needed
    if (startPage > 1) {
      const dots = document.createElement("span");
      dots.className = "page-dots";
      dots.textContent = "...";
      pagesContainer.insertBefore(dots, pagesContainer.firstChild);
    }

    if (endPage < this.state.totalPages) {
      const dots = document.createElement("span");
      dots.className = "page-dots";
      dots.textContent = "...";
      pagesContainer.appendChild(dots);
    }

    // Update prev/next buttons
    if (this.prevButton) {
      this.prevButton.disabled = this.state.currentPage === 1;
      this.prevButton.style.opacity =
        this.state.currentPage === 1 ? "0.5" : "1";
      this.prevButton.style.cursor =
        this.state.currentPage === 1 ? "not-allowed" : "pointer";
    }
    if (this.nextButton) {
      this.nextButton.disabled =
        this.state.currentPage === this.state.totalPages;
      this.nextButton.style.opacity =
        this.state.currentPage === this.state.totalPages ? "0.5" : "1";
      this.nextButton.style.cursor =
        this.state.currentPage === this.state.totalPages
          ? "not-allowed"
          : "pointer";
    }
  }

  /**
   * Update pagination UI for My Blogs
   */
  updateMyBlogsPaginationUI() {
    const pagesContainer = document.querySelector(".my-blogs-pages");
    if (!pagesContainer) return;

    pagesContainer.innerHTML = "";

    const maxPagesToShow = 5;
    let startPage = Math.max(
      1,
      this.state.myBlogsPage - Math.floor(maxPagesToShow / 2)
    );
    let endPage = Math.min(
      this.state.myBlogsTotalPages,
      startPage + maxPagesToShow - 1
    );

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement("button");
      pageBtn.className = `page-btn ${
        i === this.state.myBlogsPage ? "active" : ""
      }`;
      pageBtn.textContent = i;
      pageBtn.addEventListener("click", () => {
        this.state.myBlogsPage = i;
        this.loadMyBlogs();
      });
      pagesContainer.appendChild(pageBtn);
    }

    if (startPage > 1) {
      const dots = document.createElement("span");
      dots.className = "page-dots";
      dots.textContent = "...";
      pagesContainer.insertBefore(dots, pagesContainer.firstChild);
    }

    if (endPage < this.state.myBlogsTotalPages) {
      const dots = document.createElement("span");
      dots.className = "page-dots";
      dots.textContent = "...";
      pagesContainer.appendChild(dots);
    }

    const prevBtn = document.querySelector(".my-blogs-prev");
    const nextBtn = document.querySelector(".my-blogs-next");

    if (prevBtn) {
      prevBtn.disabled = this.state.myBlogsPage === 1;
      prevBtn.style.opacity = this.state.myBlogsPage === 1 ? "0.5" : "1";
      prevBtn.style.cursor =
        this.state.myBlogsPage === 1 ? "not-allowed" : "pointer";

      // Update event listener
      prevBtn.onclick = () => {
        if (this.state.myBlogsPage > 1) {
          this.state.myBlogsPage--;
          this.loadMyBlogs();
        }
      };
    }

    if (nextBtn) {
      nextBtn.disabled =
        this.state.myBlogsPage === this.state.myBlogsTotalPages;
      nextBtn.style.opacity =
        this.state.myBlogsPage === this.state.myBlogsTotalPages ? "0.5" : "1";
      nextBtn.style.cursor =
        this.state.myBlogsPage === this.state.myBlogsTotalPages
          ? "not-allowed"
          : "pointer";

      // Update event listener
      nextBtn.onclick = () => {
        if (this.state.myBlogsPage < this.state.myBlogsTotalPages) {
          this.state.myBlogsPage++;
          this.loadMyBlogs();
        }
      };
    }
  }

  /**
   * Setup create blog modal
   */
  setupCreateBlogModal() {
    // Open modal
    if (this.elements["create-blog"]) {
      this.elements["create-blog"].addEventListener("click", () => {
        if (!this.state.isAuthenticated) {
          this.showToast("Please login to create blogs");
          window.location.href = "/auth";
          return;
        }
        this.showCreateBlogModal();
      });
    }

    // Close modal
    const closeModal = () => {
      if (this.elements["create-blog-modal"]) {
        this.elements["create-blog-modal"].style.display = "none";
      }
      if (this.elements["create-blog-form"]) {
        this.elements["create-blog-form"].reset();
      }

      this.state.tags.forEach((tag) => this.removeTag(tag));
      this.state.tags = [];
      this.updateTitleCounter("");

      if (this.elements["blog-category-select"]) {
        this.elements["blog-category-select"].value = "";
      }
    };

    if (this.elements["close-create-blog-modal"]) {
      this.elements["close-create-blog-modal"].addEventListener(
        "click",
        closeModal
      );
    }

    if (this.elements["cancel-create-blog"]) {
      this.elements["cancel-create-blog"].addEventListener("click", closeModal);
    }

    // Publish blog
    if (this.elements["publish-blog"]) {
      this.elements["publish-blog"].addEventListener("click", () => {
        this.handleCreateBlog();
      });
    }

    // Form submission
    if (this.elements["create-blog-form"]) {
      this.elements["create-blog-form"].addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleCreateBlog();
      });
    }

    // Close modal when clicking outside
    if (this.elements["create-blog-modal"]) {
      this.elements["create-blog-modal"].addEventListener("click", (e) => {
        if (e.target === this.elements["create-blog-modal"]) {
          closeModal();
        }
      });
    }

    // Escape key to close modal
    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        this.elements["create-blog-modal"]?.style.display === "flex"
      ) {
        closeModal();
      }
    });
  }

  /**
   * Show create blog modal
   */
  showCreateBlogModal() {
    if (this.elements["create-blog-modal"]) {
      this.elements["create-blog-modal"].style.display = "flex";

      this.togglePrivacy(true);
      this.updateTitleCounter("");

      this.state.tags.forEach((tag) => this.removeTag(tag));
      this.state.tags = [];

      const suggestions = this.elements["tags-suggestions"];
      if (suggestions) {
        suggestions.style.display = "none";
      }

      setTimeout(() => {
        if (this.elements["blog-title"]) {
          this.elements["blog-title"].focus();
        }
      }, 100);
    }
  }

  /**
   * Handle create blog
   */
  async handleCreateBlog() {
    const title = this.elements["blog-title"]?.value.trim();
    const content = this.elements["blog-content"]?.value.trim();
    const category = this.elements["blog-category-select"]?.value;
    const isPublic = this.elements["blog-is-public"]?.checked;

    // Validation
    const errors = [];

    if (!title || title.length === 0) {
      errors.push("Title is required");
    } else if (title.length > 200) {
      errors.push("Title must be less than 200 characters");
    }

    if (!content || content.length === 0) {
      errors.push("Content is required");
    }

    if (!category) {
      errors.push("Please select a category");
    }

    if (errors.length > 0) {
      this.showToast(errors.join(", "));
      return;
    }

    try {
      const response = await fetch(`${this.apiURL}/blogs`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          content,
          isPublic: isPublic !== false,
          tags: this.state.tags,
          category: category || "general",
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        this.showToast(
          `Blog "${title.substring(0, 30)}${
            title.length > 30 ? "..." : ""
          }" published successfully!`
        );

        // Close modal
        if (this.elements["create-blog-modal"]) {
          this.elements["create-blog-modal"].style.display = "none";
        }
        if (this.elements["create-blog-form"]) {
          this.elements["create-blog-form"].reset();
        }

        // Reset tags
        this.state.tags.forEach((tag) => this.removeTag(tag));
        this.state.tags = [];
        this.updateTitleCounter("");

        // Reload blogs
        await Promise.all([this.loadAllBlogs(), this.loadPopularBlogs()]);

        // Add new tags to suggestions and update categories
        this.state.tags.forEach((tag) => this.state.allTags.add(tag));

        // Update categories with new tags
        if (this.state.tags.length > 0) {
          this.updateCategoryDropdown([
            ...Array.from(this.state.dynamicCategories),
            ...this.state.tags,
          ]);
        }

        // If on My Blogs tab, reload My Blogs
        if (this.state.currentTab === "my-blogs") {
          this.loadMyBlogs();
        }
      } else {
        throw new Error(data.error || "Failed to create blog");
      }
    } catch (error) {
      console.error("Error creating blog:", error);
      this.showToast(error.message || "Failed to create blog");
    }
  }

  /**
   * Handle logout
   */
  async handleLogout() {
    try {
      const response = await fetch(`${this.apiURL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        // Clear local state
        this.state.isAuthenticated = false;
        this.state.currentUsername = null;
        this.state.myBlogsPage = 1;
        this.state.myBlogs = [];
        this.updateAuthUI();
        this.showToast("Logged out successfully");

        // Clear cookies
        document.cookie =
          "ff_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

        // If on My Blogs tab, switch to All Blogs
        if (this.state.currentTab === "my-blogs") {
          this.switchTab("all-blogs");
        }

        // Reload blogs to reflect auth state
        await Promise.all([this.loadAllBlogs(), this.loadPopularBlogs()]);
      } else {
        throw new Error("Logout failed");
      }
    } catch (error) {
      console.error("Logout failed:", error);
      this.showToast("Logout failed");
    }
  }

  /**
   * Show toast message
   */
  showToast(message) {
    let toastContainer = document.getElementById("toast");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "toast";
      toastContainer.className = "toast-container";
      document.body.appendChild(toastContainer);
    }

    const toastElement = document.createElement("div");
    toastElement.className = "toast";
    toastElement.innerHTML = message;

    toastContainer.appendChild(toastElement);

    setTimeout(() => toastElement.classList.add("show"), 10);

    const dismissTime = message.length > 100 ? 4000 : 3000;
    setTimeout(() => {
      toastElement.classList.remove("show");
      toastElement.classList.add("hide");
      setTimeout(() => {
        if (toastElement.parentNode) {
          toastElement.parentNode.removeChild(toastElement);
        }
      }, 400);
    }, dismissTime);
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  try {
    window.blogApp = new FocusFlowBlogs();
  } catch (error) {
    console.error("Failed to initialize FocusFlow Blogs:", error);

    // Show user-friendly error message
    const mainContent = document.querySelector(".blogs-main-content");
    if (mainContent) {
      mainContent.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; min-height: 400px; padding: 40px; text-align: center;">
          <div>
            <h2 style="color: var(--ink); margin-bottom: 16px; font-size: 20px;">Something went wrong</h2>
            <p style="color: var(--muted); margin-bottom: 24px; font-size: 14px; max-width: 400px;">
              We couldn't load the blogs. This might be a temporary issue.
            </p>
            <div style="display: flex; gap: 12px; justify-content: center;">
              <button onclick="window.location.reload()" style="padding: 10px 20px; background: var(--accent); color: #1b1b1b; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
                Refresh Page
              </button>
              <button onclick="window.location.href='/" style="padding: 10px 20px; background: var(--paper); color: var(--ink); border: 1px solid var(--line); border-radius: 8px; cursor: pointer; font-weight: 500;">
                Go to Home
              </button>
            </div>
          </div>
        </div>
      `;
    }
  }
});
