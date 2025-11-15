/**
 * FocusFlow - Main Application Controller
 *
 */

class FocusFlowApp {
  constructor() {
    this.state = {
      isLoggedIn: false,
      questions: [],
      todos: [],
      currentDay: 1,
      leavesAnimation: this.getStoredPreference("leavesAnimation", false),
      lampLight: this.getStoredPreference("lampLight", true),
      editingQuestionId: null,
      deletingQuestionId: null,
      editingTodoId: null,
      deletingTodoId: null,
      leavesInterval: null,
      originalQuestionValues: new Map(),
      originalTodoValues: new Map(),

      questionsFilter: "all",
      todosFilter: "all",
      searchTerm: "",
      originalQuestions: [], // Store original questions for search
      originalTodos: [], // Store original todos for filtering
    };

    this.elements = {};

    this.debouncedSearch = Helper.debounce((searchTerm) => {
      this.handleSearch(searchTerm);
    }, 300);

    this.init();
  }

  /**
   * Get stored preference from localStorage with fallback to default
   */
  getStoredPreference(key, defaultValue) {
    try {
      const stored = localStorage.getItem(`focusFlow-${key}`);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      console.warn(`Failed to load preference ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * Save preference to localStorage
   */
  savePreference(key, value) {
    try {
      localStorage.setItem(`focusFlow-${key}`, JSON.stringify(value));
    } catch (error) {
      console.warn(`Failed to save preference ${key}:`, error);
    }
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      this.initializeElements();
      this.setupEventListeners();
      this.updateDateDisplay();
      this.setupAnimationsWithStoredState();

      await this.checkAuthStatus();

      if (this.state.isLoggedIn) {
        await this.loadQuestions();
        await this.loadTodos();
      } else {
        this.showPublicLanding();
      }
      this.setupEnhancedFeatures();
    } catch (error) {
      console.error("Initialization failed:", error);
      this.showToast("Failed to initialize application");
    }
  }

  /**
   * Setup animations with stored user preferences
   */
  setupAnimationsWithStoredState() {
    if (this.state.leavesAnimation) {
      this.startLeavesAnimation();
    } else {
      this.stopLeavesAnimation();
    }

    if (this.state.lampLight) {
      this.enableLampLight();
    } else {
      this.disableLampLight();
    }

    this.updateAnimationUI();
  }

  /**
   * Cache DOM elements for better performance
   */
  initializeElements() {
    const elementIds = [
      "toggle-leaves",
      "toggle-lamp",
      "profile-btn",
      "profile-dropdown",
      "notifications-btn",
      "notifications-dropdown",
      "login-link",
      "logout-btn",
      "current-date",
      "current-day",
      "question-list",
      "add-question",
      "progress-count",
      "total-count",
      "add-modal",
      "delete-modal",
      "close-modal",
      "close-delete-modal",
      "cancel-add",
      "cancel-delete",
      "save-question",
      "confirm-delete",
      "add-question-form",
      "question-text",
      "question-link",
      "public-landing",
      "toast",
    ];

    elementIds.forEach((id) => {
      this.elements[id] = document.getElementById(id);
    });

    // Todo-specific elements
    this.elements.autoTodoBtn = document.getElementById("auto-todo");
    this.elements.createTodoBtn = document.getElementById("create-todo");
    this.elements.todoList = document.getElementById("todo-list");
  }

  /**
   * Setup enhanced features (filtering and search)
   */
  setupEnhancedFeatures() {
    this.setupFilterListeners();
    this.setupSearchListener();
  }

  /**
   * Setup filter button listeners
   */
  setupFilterListeners() {
    // Event delegation for filter buttons
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("filter-btn")) {
        const container = e.target.closest(
          ".questions-section, .todo-container"
        );
        const filterType = e.target.dataset.filter;

        if (container.classList.contains("questions-section")) {
          this.handleFilter("questions", filterType);
        } else if (container.classList.contains("todo-container")) {
          this.handleFilter("todos", filterType);
        }
      }
    });
  }

  /**
   * Setup search input listener
   */
  setupSearchListener() {
    const searchInput = document.getElementById("questions-search");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.debouncedSearch(e.target.value);
      });
    }
  }

  /**
   * Set up all event listeners
   */
  setupEventListeners() {
    this.setupToggleListeners();
    this.setupUserControlListeners();
    this.setupQuestionListeners();
    this.setupModalListeners();
    this.setupTodoListeners();
    this.setupGlobalListeners();
  }

  /**
   * Setup toggle button listeners
   */
  setupToggleListeners() {
    if (this.elements["toggle-leaves"]) {
      this.elements["toggle-leaves"].addEventListener("click", () =>
        this.toggleLeavesAnimation()
      );
    }

    if (this.elements["toggle-lamp"]) {
      this.elements["toggle-lamp"].addEventListener("click", () =>
        this.toggleLampLight()
      );
    }
  }

  /**
   * Setup user control listeners (profile, notifications)
   */
  setupUserControlListeners() {
    if (this.elements["profile-btn"]) {
      this.elements["profile-btn"].addEventListener("click", () =>
        this.toggleProfileDropdown()
      );
    }

    if (this.elements["notifications-btn"]) {
      this.elements["notifications-btn"].addEventListener("click", () =>
        this.toggleNotificationsDropdown()
      );
    }

    if (this.elements["logout-btn"]) {
      this.elements["logout-btn"].addEventListener("click", () =>
        this.handleLogout()
      );
    }
  }

  /**
   * Setup question-related listeners
   */
  setupQuestionListeners() {
    if (this.elements["add-question"]) {
      this.elements["add-question"].addEventListener("click", () =>
        this.showAddModal()
      );
    }

    // Use event delegation for dynamic question elements
    document.addEventListener("click", (e) => {
      // Difficulty selector
      if (
        e.target.classList.contains("difficulty-btn") &&
        !e.target.closest(".edit-difficulty")
      ) {
        this.handleDifficultySelection(e.target);
      }
    });
  }

  /**
   * Setup modal listeners
   */
  setupModalListeners() {
    const modalActions = [
      { element: "close-modal", handler: () => this.hideAddModal() },
      { element: "cancel-add", handler: () => this.hideAddModal() },
      { element: "save-question", handler: () => this.handleAddQuestion() },
      { element: "close-delete-modal", handler: () => this.hideDeleteModal() },
      { element: "cancel-delete", handler: () => this.hideDeleteModal() },
      { element: "confirm-delete", handler: () => this.handleDeleteQuestion() },
    ];

    modalActions.forEach(({ element, handler }) => {
      if (this.elements[element]) {
        this.elements[element].addEventListener("click", handler);
      }
    });

    // Form submission
    if (this.elements["add-question-form"]) {
      this.elements["add-question-form"].addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleAddQuestion();
      });
    }
  }

  /**
   * Setup todo-related listeners
   */
  setupTodoListeners() {
    if (this.elements.autoTodoBtn) {
      this.elements.autoTodoBtn.addEventListener("click", () =>
        this.autoGenerateTodo()
      );
    }

    if (this.elements.createTodoBtn) {
      this.elements.createTodoBtn.addEventListener("click", () =>
        this.createTodo()
      );
    }

    // Event delegation for dynamic todo elements
    document.addEventListener("click", (e) => {
      if (
        e.target.classList.contains("todo-text") &&
        !e.target.classList.contains("editing")
      ) {
        const todoItem = e.target.closest(".todo-item");
        if (todoItem) {
          const todoId = todoItem.dataset.id;
          this.startTodoEdit(todoId);
        }
      }
    });

    document.addEventListener("keydown", (e) => {
      // Enter key in todo editing
      if (
        e.key === "Enter" &&
        e.target.classList.contains("todo-text") &&
        e.target.classList.contains("editing")
      ) {
        e.preventDefault();
        const todoItem = e.target.closest(".todo-item");
        if (todoItem) {
          const todoId = todoItem.dataset.id;
          this.saveTodoEdit(todoId);
        }
      }

      // Escape key in todo editing
      if (e.key === "Escape" && this.state.editingTodoId) {
        this.cancelTodoEdit(this.state.editingTodoId);
      }
    });
  }

  /**
   * Setup global listeners (dropdowns, escape key)
   */
  setupGlobalListeners() {
    // Close dropdowns when clicking outside
    document.addEventListener("click", (e) => {
      if (
        this.elements["profile-dropdown"] &&
        !e.target.closest(".profile-wrapper")
      ) {
        this.elements["profile-dropdown"].classList.remove("show");
      }
      if (
        this.elements["notifications-dropdown"] &&
        !e.target.closest(".notification-wrapper")
      ) {
        this.elements["notifications-dropdown"].classList.remove("show");
      }
    });

    // Escape key to close modals
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.hideAddModal();
        this.hideDeleteModal();
      }
    });
  }

  /**
   * Handle difficulty selection in forms
   */
  handleDifficultySelection(target) {
    document.querySelectorAll(".difficulty-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    target.classList.add("active");
  }

  // ============================
  // AUTHENTICATION MANAGEMENT
  // ============================

  /**
   * Check user authentication status
   */
  async checkAuthStatus() {
    try {
      const response = await Helper.fx("/api/auth/verify-token");
      this.state.isLoggedIn = response.ok;

      if (this.state.isLoggedIn) {
        this.showAuthenticatedUI();
        return true;
      } else {
        this.showPublicLanding();
        return false;
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      this.showPublicLanding();
      return false;
    }
  }

  /**
   * Update UI for authenticated users
   */
  showAuthenticatedUI() {
    if (this.elements["public-landing"]) {
      this.elements["public-landing"].style.display = "none";
    }
    if (this.elements["logout-btn"]) {
      this.elements["logout-btn"].style.display = "flex";
    }
    if (this.elements["login-link"]) {
      this.elements["login-link"].style.display = "none";
    }
  }

  /**
   * Show public landing page for unauthenticated users
   */
  showPublicLanding() {
    if (this.elements["public-landing"]) {
      this.elements["public-landing"].style.display = "flex";
    }
    if (this.elements["logout-btn"]) {
      this.elements["logout-btn"].style.display = "none";
    }
    if (this.elements["login-link"]) {
      this.elements["login-link"].style.display = "flex";
    }
  }

  /**
   * Handle user logout
   */
  async handleLogout() {
    try {
      const response = await Helper.fx("/api/auth/logout", {
        method: "POST",
      });

      if (response.ok) {
        this.showToast("Signed out");
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        this.showToast("Error during logout");
      }
    } catch (error) {
      console.error("Logout failed:", error);
      this.showToast("Error during logout");
    }
  }

  // ============================
  // DATE & UI MANAGEMENT
  // ============================

  /**
   * Update date display with Kolkata timezone
   */
  updateDateDisplay() {
    const kolkataDate = this.getCurrentKolkataDate();
    const displayDate = new Date(kolkataDate + "T00:00:00+05:30");

    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Kolkata",
    };

    if (this.elements["current-date"]) {
      this.elements["current-date"].textContent = "Today";
    }
    if (this.elements["current-day"]) {
      this.elements["current-day"].textContent = displayDate.toLocaleDateString(
        "en-IN",
        options
      );
    }
  }

  /**
   * Get current date in Kolkata timezone
   */
  getCurrentKolkataDate() {
    const now = new Date();
    const kolkataOffset = 5.5 * 60 * 60 * 1000;
    const kolkataTime = new Date(now.getTime() + kolkataOffset);
    return kolkataTime.toISOString().split("T")[0];
  }

  // ============================
  // ANIMATION CONTROLS
  // ============================

  /**
   * Update animation toggle UI state
   */
  updateAnimationUI() {
    const updateToggle = (element, enabled, text) => {
      if (element) {
        element.setAttribute("aria-pressed", enabled);
        const toggleText = element.querySelector(".toggle-text");
        if (toggleText) toggleText.textContent = text;
      }
    };

    updateToggle(
      this.elements["toggle-leaves"],
      this.state.leavesAnimation,
      `Leaves: ${this.state.leavesAnimation ? "On" : "Off"}`
    );
    updateToggle(
      this.elements["toggle-lamp"],
      this.state.lampLight,
      `Lamp: ${this.state.lampLight ? "Light" : "Dim"}`
    );
  }

  /**
   * Toggle leaves animation
   */
  toggleLeavesAnimation() {
    this.state.leavesAnimation = !this.state.leavesAnimation;
    this.savePreference("leavesAnimation", this.state.leavesAnimation);

    const toggleText = this.state.leavesAnimation ? "On" : "Off";
    this.updateToggleUI(
      "toggle-leaves",
      this.state.leavesAnimation,
      `Leaves: ${toggleText}`
    );

    if (this.state.leavesAnimation) {
      this.startLeavesAnimation();
    } else {
      this.stopLeavesAnimation();
    }
  }

  /**
   * Toggle lamp light
   */
  toggleLampLight() {
    this.state.lampLight = !this.state.lampLight;
    this.savePreference("lampLight", this.state.lampLight);

    const toggleText = this.state.lampLight ? "Light" : "Dim";
    this.updateToggleUI(
      "toggle-lamp",
      this.state.lampLight,
      `Lamp: ${toggleText}`
    );

    if (this.state.lampLight) {
      this.enableLampLight();
    } else {
      this.disableLampLight();
    }
  }

  /**
   * Update toggle button UI
   */
  updateToggleUI(elementId, isActive, text) {
    const element = this.elements[elementId];
    if (element) {
      element.setAttribute("aria-pressed", isActive);
      const toggleText = element.querySelector(".toggle-text");
      if (toggleText) toggleText.textContent = text;
    }
  }

  /**
   * Start leaves animation with petals
   */
  startLeavesAnimation() {
    const petalsContainer = document.getElementById("petals");
    if (!petalsContainer) return;

    petalsContainer.innerHTML = "";

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    // Create initial petals
    for (let i = 0; i < 25; i++) {
      this.createPetal(true);
    }

    // Continuous petal creation
    this.state.leavesInterval = setInterval(() => {
      const currentPetals = document.querySelectorAll(".petal").length;
      if (currentPetals < 35) {
        this.createPetal();
      }
    }, 1200);
  }

  /**
   * Create individual petal with random properties
   */
  createPetal(initial = false) {
    const petalsContainer = document.getElementById("petals");
    if (!petalsContainer) return;

    const petal = document.createElement("div");
    petal.className = "petal";

    const isMobile = window.innerWidth < 768;
    const left = isMobile ? 10 + Math.random() * 80 : 5 + Math.random() * 90;
    const delay = initial ? Math.random() * 8 : 0;
    const duration = isMobile ? 10 + Math.random() * 6 : 8 + Math.random() * 8;
    const size = 0.6 + Math.random() * 0.8;
    const horizontalDrift = (Math.random() - 0.5) * (isMobile ? 40 : 60);

    const leafType = Math.floor(Math.random() * 3) + 1;
    const leafColor = Math.floor(Math.random() * 4) + 1;

    petal.innerHTML = this.getLeafSVG(leafType, leafColor);

    petal.style.cssText = `
            left: ${left}%;
            animation: petal-fall ${duration}s linear ${delay}s forwards;
            transform: translateX(${horizontalDrift}px) scale(${size});
            opacity: 0;
        `;

    petalsContainer.appendChild(petal);

    // Fade in quickly
    setTimeout(() => {
      petal.style.opacity = "0.8";
    }, 50);

    // Remove after animation
    setTimeout(() => {
      if (petal.parentNode) {
        petal.parentNode.removeChild(petal);
      }
    }, (duration + delay) * 1000);
  }

  /**
   * Get SVG for different leaf types
   */
  getLeafSVG(type, colorClass) {
    const leafSVGs = {
      1: `<svg class="leaf-svg leaf-${colorClass}" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <g transform="scale(1.25)">
                    <path d="M12.295,14.201 C12.43,14.088 12.557,13.969 12.676,13.847 C10.687,12.944 9.178,11.848 7.818,10.739 C6.194,10.735 4.52,10.321 3.663,9.262 C4.94,9.905 6.284,9.908 6.737,9.847 C2.898,6.381 1.835,2.992 1.835,2.992 C3.149,5.052 4.536,6.644 5.894,7.908 C5.325,6.82 5.658,4.808 5.658,4.808 C6.765,8.706 6.895,8.768 6.822,8.802 C7.722,9.531 8.697,10.216 9.509,10.739 C9.217,10.059 9.01,9.068 9.037,7.37 C9.037,7.37 9.759,10.932 10.893,11.809 C11.796,12.33 12.591,12.734 13.207,13.041 C14.183,11.585 14.188,7.703 11.796,6.144 C9.218,4.462 4.871,4.398 0.474,0.096 C-0.841,-1.191 1.603,10.132 5.144,13.289 C7.32,15.234 10.152,15.99 12.295,14.201 Z"/>
                    <path d="M11.266,14.064 C11.266,14.064 12.446,14.677 13.8,15.275 C15.154,15.873 15.803,15.752 15.879,15.9 C15.957,16.05 15.918,14.258 15.918,14.258 C15.918,14.258 14.09,14.691 12.055,13.562 L11.266,14.064 Z"/>
                </g>
            </svg>`,
      2: `<svg class="leaf-svg leaf-${colorClass}" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <g transform="translate(20,0) scale(-1.25,1.25)">
                    <path d="M12.295,14.201 C12.43,14.088 12.557,13.969 12.676,13.847 C10.687,12.944 9.178,11.848 7.818,10.739 C6.194,10.735 4.52,10.321 3.663,9.262 C4.94,9.905 6.284,9.908 6.737,9.847 C2.898,6.381 1.835,2.992 1.835,2.992 C3.149,5.052 4.536,6.644 5.894,7.908 C5.325,6.82 5.658,4.808 5.658,4.808 C6.765,8.706 6.895,8.768 6.822,8.802 C7.722,9.531 8.697,10.216 9.509,10.739 C9.217,10.059 9.01,9.068 9.037,7.37 C9.037,7.37 9.759,10.932 10.893,11.809 C11.796,12.33 12.591,12.734 13.207,13.041 C14.183,11.585 14.188,7.703 11.796,6.144 C9.218,4.462 4.871,4.398 0.474,0.096 C-0.841,-1.191 1.603,10.132 5.144,13.289 C7.32,15.234 10.152,15.99 12.295,14.201 Z"/>
                    <path d="M11.266,14.064 C11.266,14.064 12.446,14.677 13.8,15.275 C15.154,15.873 15.803,15.752 15.879,15.9 C15.957,16.05 15.918,14.258 15.918,14.258 C15.918,14.258 14.09,14.691 12.055,13.562 L11.266,14.064 Z"/>
                </g>
            </svg>`,
      3: `<svg class="leaf-svg leaf-${colorClass}" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <g transform="translate(10,10) rotate(-18) translate(-10,-10) scale(1.25)">
                    <path d="M12.295,14.201 C12.43,14.088 12.557,13.969 12.676,13.847 C10.687,12.944 9.178,11.848 7.818,10.739 C6.194,10.735 4.52,10.321 3.663,9.262 C4.94,9.905 6.284,9.908 6.737,9.847 C2.898,6.381 1.835,2.992 1.835,2.992 C3.149,5.052 4.536,6.644 5.894,7.908 C5.325,6.82 5.658,4.808 5.658,4.808 C6.765,8.706 6.895,8.768 6.822,8.802 C7.722,9.531 8.697,10.216 9.509,10.739 C9.217,10.059 9.01,9.068 9.037,7.37 C9.037,7.37 9.759,10.932 10.893,11.809 C11.796,12.33 12.591,12.734 13.207,13.041 C14.183,11.585 14.188,7.703 11.796,6.144 C9.218,4.462 4.871,4.398 0.474,0.096 C-0.841,-1.191 1.603,10.132 5.144,13.289 C7.32,15.234 10.152,15.99 12.295,14.201 Z"/>
                    <path d="M11.266,14.064 C11.266,14.064 12.446,14.677 13.8,15.275 C15.154,15.873 15.803,15.752 15.879,15.9 C15.957,16.05 15.918,14.258 15.918,14.258 C15.918,14.258 14.09,14.691 12.055,13.562 L11.266,14.064 Z"/>
                </g>
            </svg>`,
    };

    return leafSVGs[type] || leafSVGs[1];
  }

  /**
   * Stop leaves animation
   */
  stopLeavesAnimation() {
    if (this.state.leavesInterval) {
      clearInterval(this.state.leavesInterval);
      this.state.leavesInterval = null;
    }

    // Gracefully fade out existing petals
    document.querySelectorAll(".petal").forEach((petal) => {
      petal.style.opacity = "0";
      setTimeout(() => {
        if (petal.parentNode) {
          petal.parentNode.removeChild(petal);
        }
      }, 1000);
    });
  }

  /**
   * Enable lamp light
   */
  enableLampLight() {
    const lampGlow = document.getElementById("lamp-glow");
    if (lampGlow) {
      document.body.classList.remove("dim-mode");
      document.body.classList.add("light-mode");
      lampGlow.style.opacity = "0.8";
    }
  }

  /**
   * Disable lamp light
   */
  disableLampLight() {
    const lampGlow = document.getElementById("lamp-glow");
    if (lampGlow) {
      document.body.classList.remove("light-mode");
      document.body.classList.add("dim-mode");
      lampGlow.style.opacity = "0.15";
    }
  }

  // ============================
  // QUESTION MANAGEMENT
  // ============================

  /**
   * Load questions from API
   */
  async loadQuestions() {
    if (!this.state.isLoggedIn) return;

    try {
      const today = this.getCurrentKolkataDate();
      const response = await Helper.fx(`/api/day?date=${today}`);

      // Store original questions for filtering
      if (response.ok) {
        const apiData = response.data;
        this.state.questions = this.transformQuestions(apiData);
        this.state.originalQuestions = [...this.state.questions]; // Store copy
      } else {
        this.state.questions = [];
      }
    } catch (error) {
      console.error("Failed to load questions:", error);
      this.state.questions = [];
    }

    this.renderQuestions();
  }

  /**
   * Transform API response to consistent question format
   */
  transformQuestions(apiData) {
    if (!apiData || apiData.success === false) {
      return [];
    }

    return (apiData.questions || []).map((question) => ({
      _id: question._id?.$oid || question._id,
      text: question.text || "",
      link: question.link || "",
      completed: question.completed || false,
      difficulty: question.difficulty || "Medium",
    }));
  }

  /**
   * SINGLE REUSABLE FILTER FUNCTION - Optimized for both containers
   */
  handleFilter(containerType, filterType) {
    // Update active button UI
    const container =
      containerType === "questions"
        ? document.querySelector(".questions-section")
        : document.querySelector(".todo-container");

    if (container) {
      container.querySelectorAll(".filter-btn").forEach((btn) => {
        btn.classList.remove("active");
      });
      container
        .querySelector(`[data-filter="${filterType}"]`)
        .classList.add("active");
    }

    // Update state
    if (containerType === "questions") {
      this.state.questionsFilter = filterType;
      this.applyFiltersAndSearch();
    } else {
      this.state.todosFilter = filterType;
      this.applyTodoFilter();
    }
  }

  /**
   * Apply combined filters and search for questions
   */
  applyFiltersAndSearch() {
    if (!this.state.questions || this.state.questions.length === 0) return;

    const { questionsFilter, searchTerm } = this.state;

    this.state.questions.forEach((question) => {
      const questionElement = document.querySelector(
        `[data-id="${question._id?.$oid || question._id}"]`
      );
      if (!questionElement) return;

      let shouldShow = true;

      // Apply completion filter
      if (questionsFilter === "complete") {
        shouldShow = question.completed === true;
      } else if (questionsFilter === "not-complete") {
        shouldShow = question.completed !== true;
      }

      // Apply search filter
      if (shouldShow && searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const questionText = question.text.toLowerCase();
        shouldShow = questionText.includes(searchLower);
      }

      // Update element visibility
      questionElement.classList.toggle("filtered", !shouldShow);
    });
  }

  /**
   * Apply filter for todos
   */
  applyTodoFilter() {
    if (!this.state.todos || this.state.todos.length === 0) return;

    const { todosFilter } = this.state;

    this.state.todos.forEach((todo) => {
      const todoElement = document.querySelector(`[data-id="${todo._id}"]`);
      if (!todoElement) return;

      let shouldShow = true;

      // Apply completion filter
      if (todosFilter === "complete") {
        shouldShow = todo.status === "done";
      } else if (todosFilter === "not-complete") {
        shouldShow = todo.status !== "done";
      }

      // Update element visibility
      todoElement.classList.toggle("filtered", !shouldShow);
    });
  }

  /**
   * Handle search with debounce
   */
  handleSearch(searchTerm) {
    this.state.searchTerm = searchTerm.trim().toLowerCase();
    this.applyFiltersAndSearch();
  }

  /**
   * Render questions list
   */
  renderQuestions() {
    if (!this.elements["question-list"]) return;

    if (!this.state.questions || this.state.questions.length === 0) {
      this.renderEmptyQuestionsState();
      return;
    }

    this.elements["question-list"].innerHTML = this.state.questions
      .map((question) => this.renderQuestionItem(question))
      .join("");

    setTimeout(() => {
      this.applyFiltersAndSearch();
    }, 0);
  }

  /**
   * Render empty questions state
   */
  renderEmptyQuestionsState() {
    this.elements["question-list"].innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="7.5 4.21 12 6.81 16.5 4.21" />
                    <polyline points="7.5 19.79 7.5 14.6 3 12" />
                    <polyline points="21 12 16.5 14.6 16.5 19.79" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
                <p>No questions yet. Add your first question to begin tracking.</p>
            </div>
        `;
  }

  /**
   * Render individual question item
   */
  renderQuestionItem(question) {
    const questionId = question._id || this.generateTempId();
    const isEditing = this.state.editingQuestionId === questionId;
    const isCompleted = question.completed || false;

    return `
            <div class="question-item ${
              isCompleted ? "completed" : ""
            }" data-id="${questionId}">
                <div class="question-checkbox ${isCompleted ? "checked" : ""}" 
                     onclick="app.toggleQuestionCompletion('${questionId}')">
                </div>
                <div class="question-content">
                    ${
                      isEditing
                        ? this.renderQuestionEditForm(question)
                        : this.renderQuestionView(question)
                    }
                </div>
                ${!isEditing ? this.renderQuestionActions(questionId) : ""}
            </div>
        `;
  }

  /**
   * Render question edit form
   */
  renderQuestionEditForm(question) {
    const questionId = question._id || this.generateTempId();
    return `
            <div class="question-edit-form">
                <div class="form-group">
                    <input type="text" class="question-text editing" 
                           value="${Helper.escapeHtml(question.text)}" 
                           placeholder="Question text"
                           id="edit-text-${questionId}">
                </div>
                <div class="form-group">
                    <label>Difficulty</label>
                    <div class="difficulty-selector edit-difficulty">
                        ${["Easy", "Medium", "Hard"]
                          .map(
                            (diff) => `
                            <button type="button" class="difficulty-btn ${
                              question.difficulty === diff ? "active" : ""
                            }" 
                                    data-difficulty="${diff}" onclick="app.setEditDifficulty('${questionId}', '${diff}')">
                                ${diff}
                            </button>
                        `
                          )
                          .join("")}
                    </div>
                </div>
                <div class="form-group">
                    <label>Problem Link</label>
                    <input type="url" class="question-link editing" 
                           value="${Helper.escapeHtml(question.link)}" 
                           placeholder="https://leetcode.com/problems/..."
                           id="edit-link-${questionId}">
                </div>
                <div class="edit-actions">
                    <button class="btn-secondary" onclick="app.cancelEdit('${questionId}')">Cancel</button>
                    <button class="btn-primary" onclick="app.saveQuestionEdit('${questionId}')">Save</button>
                </div>
            </div>
        `;
  }

  /**
   * Render question view (read-only)
   */
  renderQuestionView(question) {
    return `
            <p class="question-text">${Helper.escapeHtml(question.text)}</p>
            <div class="question-meta">
                <span class="difficulty-tag ${question.difficulty.toLowerCase()}">${
      question.difficulty
    }</span>
                ${
                  question.link
                    ? `<a href="${question.link}" target="_blank" class="question-link">Problem Link</a>`
                    : ""
                }
            </div>
        `;
  }

  /**
   * Render question action buttons
   */
  renderQuestionActions(questionId) {
    return `
            <div class="question-actions">
                <button class="action-btn action-btn-edit" onclick="app.startQuestionEdit('${questionId}')" title="Edit">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                </button>
                <button class="action-btn action-btn-delete" onclick="app.showDeleteModal('${questionId}')" title="Delete">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                </button>
            </div>
        `;
  }

  /**
   * Toggle question completion status
   */
  async toggleQuestionCompletion(questionId) {
    if (!this.state.isLoggedIn) {
      this.showToast("Please sign in to continue");
      return;
    }

    try {
      const questionIndex = this.state.questions.findIndex(
        (q) => (q._id?.$oid || q._id) === questionId
      );

      if (questionIndex === -1) return;

      const question = this.state.questions[questionIndex];
      const newCompletedStatus = !question.completed;

      // Only make API call if status actually changed
      if (question.completed === newCompletedStatus) {
        return; // No change needed
      }

      const response = await Helper.fx(
        `/api/data/checklist/question/${questionId}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            completed: newCompletedStatus,
            day: this.state.currentDay,
          }),
        }
      );

      if (response.ok) {
        question.completed = newCompletedStatus;
        this.state.questions[questionIndex] = question;

        this.renderQuestions();
        this.showToast(newCompletedStatus ? "Completed" : "Marked incomplete");
    if (window.notifyTaskCompletion && newCompletedStatus) {
    const questionId = question._id?.$oid || question._id;
    window.notifyTaskCompletion('question', question.text, questionId);
    // Also mark the question as completed to prevent future notifications
    if (window.markTaskAsCompleted) {
        window.markTaskAsCompleted(questionId);
    }
}
      } else {
        this.showToast("Something went wrong—try again");
      }
    } catch (error) {
      console.error("Toggle question completion failed:", error);
      this.showToast("Something went wrong—try again");
    }
  }

  // ============================
  // TODO MANAGEMENT
  // ============================

  /**
   * Load todos from API
   */
  async loadTodos() {
    if (!this.state.isLoggedIn) return;

    try {
      const response = await Helper.fx("/api/todos");

      // Store original todos for filtering
      if (response.ok && response.data && response.data.success) {
        this.state.todos = response.data.todos || [];
        this.state.originalTodos = [...this.state.todos]; // Store copy
      } else {
        this.state.todos = [];
      }
    } catch (error) {
      console.error("Failed to load todos:", error);
      this.state.todos = [];
    }

    this.renderTodos();
  }

  /**
   * Render todos list
   */
  renderTodos() {
    if (!this.elements.todoList) return;

    if (!this.state.todos || this.state.todos.length === 0) {
      this.renderEmptyTodosState();
      return;
    }

    this.elements.todoList.innerHTML = this.state.todos
      .map((todo) => this.renderTodoItem(todo))
      .join("");

    // After rendering, apply current filters
    setTimeout(() => {
      this.applyTodoFilter();
    }, 0);
  }

  /**
   * Render empty todos state
   */
  renderEmptyTodosState() {
    this.elements.todoList.innerHTML = `
            <div class="todo-empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"/>
                </svg>
                <p>No todos yet. Create one to get started.</p>
            </div>
        `;
  }

  /**
   * Render individual todo item
   */
  renderTodoItem(todo) {
    const isEditing = this.state.editingTodoId === todo._id;

    return `
            <li class="todo-item ${
              todo.autoGenerated ? "auto-generated" : ""
            } ${isEditing ? "editing" : ""}" data-id="${todo._id}">
                <div class="todo-checkbox ${
                  todo.status === "done" ? "checked" : ""
                }" 
                     onclick="app.toggleTodoCompletion('${todo._id}')">
                </div>
                <div class="todo-content">
                    ${
                      isEditing
                        ? `<textarea class="todo-text editing" placeholder="Enter todo...">${Helper.escapeHtml(
                            todo.title
                          )}</textarea>`
                        : `<p class="todo-text" onclick="app.startTodoEdit('${
                            todo._id
                          }')">${Helper.escapeHtml(todo.title)}</p>`
                    }
                </div>
                <div class="todo-actions">
                    ${
                      !isEditing
                        ? this.renderTodoViewActions(todo._id)
                        : this.renderTodoEditActions(todo._id)
                    }
                </div>
            </li>
        `;
  }

  /**
   * Render todo view mode actions
   */
  renderTodoViewActions(todoId) {
    return `
            <button class="todo-action-btn delete-btn" onclick="app.showTodoDeleteConfirmation('${todoId}')" title="Delete">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
            </button>
        `;
  }

  /**
   * Render todo edit mode actions
   */
  renderTodoEditActions(todoId) {
    return `
            <button class="todo-action-btn" onclick="app.saveTodoEdit('${todoId}')" title="Save" style="opacity: 1;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 6L9 17l-5-5"/>
                </svg>
            </button>
            <button class="todo-action-btn" onclick="app.cancelTodoEdit('${todoId}')" title="Cancel" style="opacity: 1;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
            </button>
        `;
  }

  /**
   * Create a new todo
   */
  async createTodo(title = "") {
    if (!this.state.isLoggedIn) {
      this.showToast("Please sign in to continue");
      return;
    }

    const todoTitle = title || "New todo";

    // Check for duplicate todo (case insensitive)
    const isDuplicate = this.state.todos.some(
      (t) => t.title.toLowerCase() === todoTitle.toLowerCase()
    );

    if (isDuplicate && title) {
      // Only check for duplicates if we have a specific title
      this.showToast("This todo already exists");
      return;
    }

    try {
      const response = await Helper.fx("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: todoTitle,
          notes: "",
          dueDate: new Date().toISOString().split("T")[0],
        }),
      });

      if (response.ok && response.data && response.data.success) {
        this.showToast("Todo created");
        await this.loadTodos();

        // Start editing if it's a blank todo
        if (!title) {
          const newTodo = response.data.todo;
          if (newTodo && newTodo._id) {
            setTimeout(() => {
              this.startTodoEdit(newTodo._id);
            }, 100);
          }
        }
      } else {
        this.showToast("Failed to create todo");
      }
    } catch (error) {
      console.error("Create todo failed:", error);
      this.showToast("Failed to create todo");
    }
  }

  /**
   * Auto-generate todo
   */
  async autoGenerateTodo() {
    if (!this.state.isLoggedIn) {
      this.showToast("Please sign in to continue");
      return;
    }

    try {
      const response = await Helper.fx("/api/todos/auto-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok && response.data && response.data.success) {
        this.showToast("Auto-generated todo created");
        await this.loadTodos();
      } else {
        const errorMessage = response.data?.error || "Failed to generate todo";
        this.showToast(errorMessage);
      }
    } catch (error) {
      console.error("Auto-generate todo failed:", error);
      this.showToast("Failed to generate todo");
    }
  }

  /**
   * Toggle todo completion status
   */
  async toggleTodoCompletion(todoId) {
    if (!this.state.isLoggedIn) {
      this.showToast("Please sign in to continue");
      return;
    }

    try {
      const todo = this.state.todos.find((t) => t._id === todoId);
      if (!todo) return;

      const newStatus = todo.status === "done" ? "pending" : "done";

      // Only make API call if status actually changed
      if (todo.status === newStatus) {
        return; // No change needed
      }

      const response = await Helper.fx(`/api/todos/${todoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (response.ok && response.data && response.data.success) {
        this.showToast(
          newStatus === "done" ? "Completed" : "Marked incomplete"
        );
      if (window.notifyTaskCompletion && newStatus === 'done') {
    window.notifyTaskCompletion('todo', todo.title, todo._id);
    // Also mark the task as completed to prevent future notifications
    if (window.markTaskAsCompleted) {
        window.markTaskAsCompleted(todo._id);
    }
}
        await this.loadTodos();
      } else {
        this.showToast("Failed to update todo");
      }
    } catch (error) {
      console.error("Toggle todo completion failed:", error);
      this.showToast("Failed to update todo");
    }
  }

  /**
   * Start editing a todo
   */
  startTodoEdit(todoId) {
    if (!this.state.isLoggedIn) {
      this.showToast("Please sign in to continue");
      return;
    }

    const todo = this.state.todos.find((t) => t._id === todoId);
    if (!todo) return;

    // Store original value for comparison
    this.state.originalTodoValues.set(todoId, todo.title);

    this.state.editingTodoId = todoId;
    this.renderTodos();

    // Focus the textarea
    setTimeout(() => {
      const textarea = document.querySelector(
        `[data-id="${todoId}"] .todo-text.editing`
      );
      if (textarea) {
        textarea.focus();
        textarea.select();
      }
    }, 100);
  }

  /**
   * Cancel todo editing
   */
  cancelTodoEdit(todoId) {
    // Clear stored original value
    this.state.originalTodoValues.delete(todoId);
    this.state.editingTodoId = null;
    this.renderTodos();
  }

  /**
   * Save todo edits
   */
  async saveTodoEdit(todoId) {
    const textarea = document.querySelector(
      `[data-id="${todoId}"] .todo-text.editing`
    );
    if (!textarea) return;

    const newTitle = textarea.value.trim();
    if (!newTitle) {
      this.showToast("Todo text is required");
      textarea.focus();
      return;
    }

    // Get original value
    const originalTitle = this.state.originalTodoValues.get(todoId);

    // Check if anything actually changed
    if (newTitle === originalTitle) {
      // No changes made, just cancel edit
      this.showToast("No changes to save");
      this.cancelTodoEdit(todoId);
      return;
    }

    try {
      const response = await Helper.fx(`/api/todos/${todoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
        }),
      });

      if (response.ok && response.data && response.data.success) {
        // Clear stored original value
        this.state.originalTodoValues.delete(todoId);
        this.state.editingTodoId = null;
        this.showToast("Todo updated");
        await this.loadTodos();
      } else {
        this.showToast("Failed to update todo");
      }
    } catch (error) {
      console.error("Save todo edit failed:", error);
      this.showToast("Failed to update todo");
    }
  }

  /**
   * Show todo delete confirmation
   */
  showTodoDeleteConfirmation(todoId) {
    if (!this.state.isLoggedIn) {
      this.showToast("Please sign in to continue");
      return;
    }

    this.state.deletingTodoId = todoId;

    const modal = document.createElement("div");
    modal.className = "delete-confirmation";
    modal.innerHTML = `
            <div class="delete-confirmation-modal">
                <p>Are you sure you want to delete this todo? This action cannot be undone.</p>
                <div class="delete-confirmation-actions">
                    <button class="delete-cancel" onclick="app.cancelTodoDelete()">Cancel</button>
                    <button class="delete-confirm" onclick="app.confirmTodoDelete()">Delete</button>
                </div>
            </div>
        `;

    document.body.appendChild(modal);
  }

  /**
   * Cancel todo delete
   */
  cancelTodoDelete() {
    const modal = document.querySelector(".delete-confirmation");
    if (modal) {
      modal.remove();
    }
    this.state.deletingTodoId = null;
  }

  /**
   * Confirm todo delete
   */
  async confirmTodoDelete() {
    if (!this.state.deletingTodoId) return;

    try {
      const response = await Helper.fx(
        `/api/todos/${this.state.deletingTodoId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok && response.data && response.data.success) {
        this.showToast("Todo deleted");
        await this.loadTodos();
      } else {
        this.showToast("Failed to delete todo");
      }
    } catch (error) {
      console.error("Confirm todo delete failed:", error);
      this.showToast("Failed to delete todo");
    } finally {
      this.cancelTodoDelete();
    }
  }

  // ============================
  // MODAL MANAGEMENT
  // ============================

  /**
   * Show add question modal
   */
  showAddModal() {
    if (!this.state.isLoggedIn) {
      this.showToast("Please sign in to continue");
      return;
    }

    if (this.elements["add-modal"]) {
      this.elements["add-modal"].style.display = "flex";

      // Reset form
      if (this.elements["add-question-form"]) {
        this.elements["add-question-form"].reset();
      }

      // Set default difficulty
      document.querySelectorAll(".difficulty-btn").forEach((btn) => {
        btn.classList.remove("active");
        if (btn.textContent === "Medium") {
          btn.classList.add("active");
        }
      });

      if (this.elements["question-text"]) {
        this.elements["question-text"].focus();
      }
    }
  }

  /**
   * Hide add question modal
   */
  hideAddModal() {
    if (this.elements["add-modal"]) {
      this.elements["add-modal"].style.display = "none";
    }
  }

  /**
   * Show delete confirmation modal
   */
  showDeleteModal(questionId) {
    if (!this.state.isLoggedIn) {
      this.showToast("Please sign in to continue");
      return;
    }

    this.state.deletingQuestionId = questionId;
    if (this.elements["delete-modal"]) {
      this.elements["delete-modal"].style.display = "flex";
    }
  }

  /**
   * Hide delete confirmation modal
   */
  hideDeleteModal() {
    if (this.elements["delete-modal"]) {
      this.elements["delete-modal"].style.display = "none";
    }
    this.state.deletingQuestionId = null;
  }

  /**
   * Add new question
   */
  async handleAddQuestion() {
    const text = this.elements["question-text"]
      ? this.elements["question-text"].value.trim()
      : "";
    const link = this.elements["question-link"]
      ? this.elements["question-link"].value.trim()
      : "";
    const activeDifficulty = document.querySelector(".difficulty-btn.active");
    const difficulty = activeDifficulty
      ? activeDifficulty.dataset.difficulty
      : "Medium";

    if (!text) {
      this.showToast("This field is required");
      if (this.elements["question-text"])
        this.elements["question-text"].focus();
      return;
    }

    // Check for duplicate question (case insensitive)
    const isDuplicate = this.state.questions.some(
      (q) => q.text.toLowerCase() === text.toLowerCase()
    );

    if (isDuplicate) {
      this.showToast("This question already exists");
      if (this.elements["question-text"]) {
        this.elements["question-text"].focus();
        this.elements["question-text"].select();
      }
      return;
    }

    try {
      const response = await Helper.fx("/api/data/checklist/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day: this.state.currentDay,
          questionText: text,
          link: link,
          difficulty: difficulty,
        }),
      });

      if (response.ok) {
        this.hideAddModal();
        this.showToast("Added");

        // Reload questions from server
        setTimeout(async () => {
          await this.loadQuestions();
        }, 500);
      } else {
        const errorMessage =
          response.data?.error || "Something went wrong—try again";
        this.showToast(errorMessage);
      }
    } catch (error) {
      console.error("Add question failed:", error);
      this.showToast("Something went wrong—try again");
    }
  }

  /**
   * Delete question
   */
  async handleDeleteQuestion() {
    if (!this.state.deletingQuestionId) return;

    try {
      const response = await Helper.fx(
        `/api/data/checklist/question/${this.state.deletingQuestionId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ day: this.state.currentDay }),
        }
      );

      if (response.ok) {
        this.hideDeleteModal();
        this.showToast("Removed");
        setTimeout(() => {
          this.loadQuestions();
        }, 300);
      } else {
        this.showToast("Something went wrong—try again");
      }
    } catch (error) {
      console.error("Delete question failed:", error);
      this.showToast("Something went wrong—try again");
    }
  }

  /**
   * Start question editing
   */
  startQuestionEdit(questionId) {
    if (!this.state.isLoggedIn) {
      this.showToast("Please sign in to continue");
      return;
    }

    const question = this.state.questions.find(
      (q) => (q._id?.$oid || q._id) === questionId
    );

    if (!question) return;

    // Store original values for comparison
    this.state.originalQuestionValues.set(questionId, {
      text: question.text,
      link: question.link || "",
      difficulty: question.difficulty,
    });

    this.state.editingQuestionId = questionId;
    this.renderQuestions();

    // Focus the text input
    setTimeout(() => {
      const input = document.getElementById(`edit-text-${questionId}`);
      if (input) {
        input.focus();
        input.select();
      }
    }, 100);
  }

  /**
   * Set edit difficulty
   */
  setEditDifficulty(questionId, difficulty) {
    const buttons = document.querySelectorAll(
      `[data-id="${questionId}"] .edit-difficulty .difficulty-btn`
    );
    buttons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.difficulty === difficulty);
    });

    const questionElement = document.querySelector(`[data-id="${questionId}"]`);
    if (questionElement) {
      questionElement.dataset.editDifficulty = difficulty;
    }
  }

  /**
   * Cancel question edit
   */
  cancelEdit(questionId) {
    // Clear stored original values
    this.state.originalQuestionValues.delete(questionId);
    this.state.editingQuestionId = null;
    this.renderQuestions();
  }

  /**
   * Save question edits
   */
  async saveQuestionEdit(questionId) {
    const questionElement = document.querySelector(`[data-id="${questionId}"]`);
    if (!questionElement) {
      this.showToast("Question not found");
      return;
    }

    const textInput = document.getElementById(`edit-text-${questionId}`);
    const linkInput = document.getElementById(`edit-link-${questionId}`);

    const newText = textInput ? textInput.value.trim() : "";
    const newLink = linkInput ? linkInput.value.trim() : "";
    const newDifficulty = questionElement.dataset.editDifficulty || "Medium";

    if (!newText) {
      this.showToast("Question text is required");
      if (textInput) textInput.focus();
      return;
    }

    // Get original values
    const originalValues = this.state.originalQuestionValues.get(questionId);

    // Check if anything actually changed
    const hasChanges =
      !originalValues ||
      newText !== originalValues.text ||
      newLink !== originalValues.link ||
      newDifficulty !== originalValues.difficulty;

    if (!hasChanges) {
      // No changes made, just cancel edit
      this.showToast("No changes to save");
      this.cancelEdit(questionId);
      return;
    }

    try {
      const response = await Helper.fx(
        `/api/data/checklist/question/${questionId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionText: newText,
            link: newLink,
            difficulty: newDifficulty,
            day: this.state.currentDay,
          }),
        }
      );

      if (response.ok) {
        // Clear original values
        this.state.originalQuestionValues.delete(questionId);
        this.state.editingQuestionId = null;
        this.showToast("Saved");
        setTimeout(() => {
          this.loadQuestions();
        }, 300);
      } else {
        this.showToast("Something went wrong—try again");
      }
    } catch (error) {
      console.error("Save question edit failed:", error);
      this.showToast("Something went wrong—try again");
    }
  }

  // ============================
  // DROPDOWN MANAGEMENT
  // ============================

  /**
   * Toggle profile dropdown
   */
  toggleProfileDropdown() {
    if (this.elements["profile-dropdown"]) {
      const isShowing =
        this.elements["profile-dropdown"].classList.toggle("show");
      if (isShowing && this.elements["notifications-dropdown"]) {
        this.elements["notifications-dropdown"].classList.remove("show");
      }
    }
  }

  /**
   * Toggle notifications dropdown
   */
  toggleNotificationsDropdown() {
    if (this.elements["notifications-dropdown"]) {
      const isShowing =
        this.elements["notifications-dropdown"].classList.toggle("show");
      if (isShowing && this.elements["profile-dropdown"]) {
        this.elements["profile-dropdown"].classList.remove("show");
      }
    }
  }

  // ============================
  // UTILITY FUNCTIONS
  // ============================

  /**
   * Show toast message
   */
  showToast(message) {
    if (!this.elements["toast"]) return;

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;

    this.elements["toast"].appendChild(toast);

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
      }, 400);
    }, 2000);
  }

  /**
   * Generate temporary ID
   */
  generateTempId() {
    return "temp_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Manual reload function
   */
  async reloadQuestions() {
    await this.loadQuestions();
  }
  /**
   * Cleanup method to prevent memory leaks
   */
  destroy() {
    // Clear intervals
    if (this.state.leavesInterval) {
      clearInterval(this.state.leavesInterval);
    }

    // Clear stored original values
    this.state.originalQuestionValues.clear();
    this.state.originalTodoValues.clear();

    // Remove event listeners
    if (this.globalClickHandler) {
      document.removeEventListener("click", this.globalClickHandler);
    }
    if (this.escapeHandler) {
      document.removeEventListener("keydown", this.escapeHandler);
    }
  }
}

// Initialize application when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Wait for Helper to be available
  function checkHelperLoaded() {
    if (typeof Helper !== "undefined") {
      window.app = new FocusFlowApp();
    } else {
      setTimeout(checkHelperLoaded, 100);
    }
  }

  checkHelperLoaded();
});
