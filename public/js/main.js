// Initialize app data
let appData = [];
const TOTAL_DAYS = 1;
let APP_START_DATE = new Date();

// NEW: Search functionality variables with debounce
let searchFilter = "";
let filteredData = [];
let searchTimeout = null;
const SEARCH_DEBOUNCE_TIME = 300; // 300ms debounce

const DEFAULT_QUESTIONS = [
  {
    text: "Two Sum",
    link: "https://leetcode.com/problems/two-sum/",
    difficulty: "Easy",
  },
  {
    text: "Reverse a Linked List",
    link: "https://leetcode.com/problems/reverse-linked-list/",
    difficulty: "Medium",
  },
  {
    text: "Binary Search",
    link: "https://leetcode.com/problems/binary-search/",
    difficulty: "Medium",
  },
];

// MongoDB configuration
const API_BASE_URL = "https://focus-flow-lopn.onrender.com/api";
let userId = "default-user";
let authToken = null;

// Add day number information to the header or somewhere visible
const header = document.querySelector("header h1");
if (header) {
  const dayInfo = document.createElement("div");
  dayInfo.style.fontSize = "0.8rem";
  dayInfo.style.opacity = "0.7";
  dayInfo.style.marginTop = "5px";
  dayInfo.style.marginLeft = "10px";

  // Format the date
  const d = new Date();
  const day = d.getDate();
  const suffix =
    day > 3 && day < 21 ? "th" : ["th", "st", "nd", "rd"][day % 10] || "th";
  const month = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sept",
    "Oct",
    "Nov",
    "Dec",
  ][d.getMonth()];
  const formattedDate = `${day}${suffix} ${month}, ${d.getFullYear()}`;

  dayInfo.textContent = formattedDate;

  header.parentElement.insertBefore(dayInfo, header.nextSibling);
}

// Sync state management
let currentVersion = 1;
let lastUpdated = new Date().toISOString();
let isSyncing = false;
let pendingChanges = false;

// DOM elements
const tableBody = document.getElementById("tableBody");
// const themeToggle = document.getElementById("themeToggle");
const linkModal = document.getElementById("linkModal");
const closeModal = document.getElementById("closeModal");
const cancelModal = document.getElementById("cancelModal");
const saveLink = document.getElementById("saveLink");
const questionTextInput = document.getElementById("questionTextInput");
const questionLinkInput = document.getElementById("questionLinkInput");
const syncButton = document.getElementById("syncButton");
const syncStatus = document.getElementById("syncStatus");

// NEW: Search bar elements
const searchBar = document.getElementById("searchBar");
const searchInfo = document.getElementById("searchInfo");

// Auth DOM elements
const authSection = document.getElementById("authSection");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const userInfo = document.getElementById("userInfo");
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const showRegisterBtn = document.getElementById("showRegisterBtn");
const regUsernameInput = document.getElementById("regUsernameInput");
const regPasswordInput = document.getElementById("regPasswordInput");
const regConfirmPasswordInput = document.getElementById(
  "regConfirmPasswordInput"
);
const registerBtn = document.getElementById("registerBtn");
const showLoginBtn = document.getElementById("showLoginBtn");
const currentUsername = document.getElementById("currentUsername");
const logoutBtn = document.getElementById("logoutBtn");

// Forgot Password DOM elements
const forgotPasswordForm = document.getElementById("forgotPasswordForm");
const showForgotPasswordBtn = document.getElementById("showForgotPasswordBtn");
const showLoginFromForgotBtn = document.getElementById(
  "showLoginFromForgotBtn"
);
const forgotUsernameInput = document.getElementById("forgotUsernameInput");
const sendResetCodeBtn = document.getElementById("sendResetCodeBtn");
const resetCodeSection = document.getElementById("resetCodeSection");
const resetCodeInput = document.getElementById("resetCodeInput");
const newPasswordInput = document.getElementById("newPasswordInput");
const confirmNewPasswordInput = document.getElementById(
  "confirmNewPasswordInput"
);
const resetPasswordBtn = document.getElementById("resetPasswordBtn");

// Current editing question info
let currentEditingQuestion = { dayIndex: -1, questionIndex: -1 };
// NEW: Search functionality with debounce
function setupSearchFunctionality() {
  searchBar.addEventListener("input", function (e) {
    const searchValue = e.target.value.trim();

    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout for debounce
    searchTimeout = setTimeout(() => {
      searchFilter = searchValue;
      filterTableData();
      renderTable();
      updateSearchInfo();
    }, SEARCH_DEBOUNCE_TIME);
  });

  // Clear search when Escape key is pressed
  searchBar.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      searchBar.value = "";
      searchFilter = "";

      // Clear any pending search timeout
      if (searchTimeout) {
        clearTimeout(searchTimeout);
        searchTimeout = null;
      }

      filterTableData();
      renderTable();
      updateSearchInfo();
    }
  });

  // Clear search when input is cleared manually (backspace, delete, etc.)
  searchBar.addEventListener("input", function (e) {
    if (
      e.inputType &&
      e.inputType.includes("delete") &&
      !searchBar.value.trim()
    ) {
      // Clear any pending search timeout
      if (searchTimeout) {
        clearTimeout(searchTimeout);
        searchTimeout = null;
      }

      searchFilter = "";
      filterTableData();
      renderTable();
      updateSearchInfo();
    }
  });
}

// NEW: Filter table data based on search input - IMPROVED VERSION
function filterTableData() {
  if (!searchFilter) {
    filteredData = [...appData].sort((a, b) => a.day - b.day); // Show all data when no filter
    return;
  }

  // Filter by day number - support exact and partial matches
  filteredData = appData
    .filter((dayData) => {
      const dayString = dayData.day.toString();
      // Return true if the search filter matches the day number
      return dayString.includes(searchFilter);
    }) // Sort the filtered results by day number
    .sort((a, b) => a.day - b.day);
}

// NEW: Update search info text
function updateSearchInfo() {
  if (!searchFilter) {
    searchInfo.textContent =
      "Type a day number to filter. Clear to show all days.";
    searchInfo.style.color = "";
  } else {
    const resultCount = filteredData.length;
    searchInfo.textContent = `Showing ${resultCount} day${
      resultCount !== 1 ? "s" : ""
    } matching "${searchFilter}"`;
    searchInfo.style.color =
      resultCount > 0 ? "var(--success-color)" : "var(--danger-color)";
  }
}

// Add this function to enhance question buttons with CodeLeaf styling
function enhanceQuestionButtonsWithCodeLeaf() {
  const questionItems = document.querySelectorAll(".question-item");

  questionItems.forEach((item) => {
    const questionText = item.querySelector(".question-text");
    const editBtn = item.querySelector('button[title="Edit link"]');
    const deleteBtn = item.querySelector('button[title="Delete question"]');

    if (questionText && (editBtn || deleteBtn)) {
      // Create actions container
      const actionsContainer = document.createElement("div");
      actionsContainer.className = "question-actions";

      // Move buttons into the container with proper styling
      if (editBtn) {
        editBtn.className = "edit-link-btn";
        editBtn.innerHTML = "🔗";
        editBtn.title = "Edit question link";
        actionsContainer.appendChild(editBtn);
      }

      if (deleteBtn) {
        deleteBtn.className = "delete-question-btn";
        deleteBtn.innerHTML = "🗑️";
        deleteBtn.title = "Delete question";
        actionsContainer.appendChild(deleteBtn);
      }

      // Add container to question text
      questionText.appendChild(actionsContainer);
    }
  });
}

// Enhanced renderTable function without status column
function enhanceTableWithCardLayout() {
  const tableBody = document.getElementById("tableBody");
  if (!tableBody) return;

  // Add CSS class to trigger card layout
  tableBody.classList.add("card-layout-enabled");

  // Add smooth transition effects
  const rows = tableBody.querySelectorAll("tr");
  rows.forEach((row, index) => {
    // Add data attributes for styling
    row.setAttribute(
      "data-day-type",
      row.classList.contains("current-day") ? "current" : "past"
    );

    // Enhanced hover effects
    row.addEventListener("mouseenter", function () {
      this.style.transform = "translateY(-2px)";
    });

    row.addEventListener("mouseleave", function () {
      this.style.transform = "translateY(0)";
    });

    // Remove any status cells if they exist
    const statusCell = row.querySelector(".status-cell");
    if (statusCell) {
      statusCell.remove();
    }
  });
}
// Initialize the enhanced layout when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Wait for table to be rendered
  setTimeout(() => {
    enhanceTableWithCardLayout();
  }, 100);
});

// Re-apply layout when table is re-rendered
const originalRenderTable = renderTable;
renderTable = function () {
  originalRenderTable();
  setTimeout(enhanceTableWithCardLayout, 50);
};

// Initialize the app
async function initApp() {
  await checkAutoLogin();
  setupAuthEventListeners();
  await loadData();

  // NEW: Set dynamic start date from user profile
  await setAppStartDateFromUser();

  // NEW: Initialize search functionality
  setupSearchFunctionality();
  filterTableData(); // Initialize filtered data

  renderTable();
  setupEventListeners();

  initializeActivityTracker();

  // Start periodic sync
  setInterval(() => {
    if (authToken && !isSyncing) {
      syncWithMongoDB();
    }
  }, 20000); // Sync every 20 seconds
}

// Update the isEditable function to use dynamic APP_START_DATE
function isEditable(dayNumber) {
  const startDate = new Date(APP_START_DATE);
  const dayDate = new Date(startDate);
  dayDate.setDate(startDate.getDate() + (dayNumber - 1));

  const today = new Date();

  // Compare dates without time components
  const isToday = dayDate.toDateString() === today.toDateString();

  return isToday;
}

// Replace the setAppStartDateFromUser function with this corrected version:
async function setAppStartDateFromUser() {
  if (authToken && userId !== "default-user") {
    try {
      // console.log("🔄 Fetching user info to set APP_START_DATE...");
      // console.log("📝 User ID:", userId);
      // console.log("🔑 Auth token exists:", !!authToken);

      const response = await fetch(`${API_BASE_URL}/user-info`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      // console.log("📡 API Response status:", response.status);

      if (response.ok) {
        const result = await response.json();
        // console.log("📦 API Response data:", result);

        if (result.success && result.user && result.user.accountCreated) {
          // Use the user's account creation date as APP_START_DATE
          const userCreatedAt = new Date(result.user.accountCreated);
          // Ensure we get the date in YYYY-MM-DD format
          const year = userCreatedAt.getFullYear();
          const month = String(userCreatedAt.getMonth() + 1).padStart(2, "0");
          const day = String(userCreatedAt.getDate()).padStart(2, "0");
          APP_START_DATE = `${year}-${month}-${day}`;

          // console.log("📅 Parsed dates:", {
          //     original: result.user.accountCreated,
          //     jsDate: userCreatedAt,
          //     formatted: APP_START_DATE
          // });

          // Update the activity tracker subtitle
          updateActivityTrackerSubtitle();

          // console.log(`✅ APP_START_DATE set to user creation date: ${APP_START_DATE}`);
          return true;
        } else {
          console.log("❌ User data missing in response:", result);
        }
      } else {
        const errorText = await response.text();
        // console.log("❌ API Error response:", errorText);
      }
    } catch (error) {
      console.log("❌ Error fetching user info:", error);
    }
  } else {
    console.log("ℹ️ User not authenticated, using default start date");
  }

  // Use fallback date
  // console.log(`🔄 Using default APP_START_DATE: ${APP_START_DATE}`);
  updateActivityTrackerSubtitle();
  return false;
}
// Function to update the activity tracker subtitle
function updateActivityTrackerSubtitle() {
  const subtitle = document.querySelector(".activity-tracker-subtitle");
  if (subtitle) {
    const formattedDate = formatDateForDisplay(APP_START_DATE);
    subtitle.textContent = `Your journey started on ${formattedDate} ( Day 1 )`;
    // console.log(
    //   `📝 Updated subtitle to: Starting from ${formattedDate} ( Day 1 )`
    // );
  } else {
    console.log("❌ Could not find activity tracker subtitle element");
  }
}

// Helper function to format date for display
function formatDateForDisplay(dateString) {
  try {
    const date = new Date(dateString);
    return date
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .replace(/,/g, "");
  } catch (error) {
    console.log("❌ Error formatting date:", error);
    return dateString; // Return original string if parsing fails
  }
}

// Add this function to verify the date change
function verifyDateChange() {
  // Test with a specific day
  const testDay = 1;
  console.log(`📊 Is day ${testDay} editable?`, isEditable(testDay));

  updateActivityTrackerSubtitle();
}

// Get current day number based on dynamic start date
function getCurrentDayNumber() {
  const startDate = new Date(APP_START_DATE);
  const today = new Date();

  // Reset times to compare only dates
  const start = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate()
  );
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const diffTime = now - start;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays); // Ensure at least day 1
}

// Guard function to prevent API calls for non-editable days
function shouldAllowMutation(dayIndex) {
  const dayNumber = appData[dayIndex]?.day;
  if (!dayNumber) return false;

  const editable = isEditable(dayNumber);

  if (!editable) {
    console.warn(
      `Attempted to mutate non-editable day ${dayNumber}. Action blocked.`
    );
    toastManager.warning(
      "Only today's items are editable.",
      "Editing Restricted"
    );
  }

  return editable;
}

// Check if user is auto-logged in - FIXED VERSION
async function checkAutoLogin() {
  const savedToken = localStorage.getItem("authToken");
  const savedUserId = localStorage.getItem("userId");

  if (savedToken && savedUserId) {
    try {
      // Verify token is still valid
      const response = await fetch(`${API_BASE_URL}/verify-token`, {
        headers: {
          Authorization: `Bearer ${savedToken}`,
        },
      });

      if (response.ok) {
        authToken = savedToken;
        userId = savedUserId;
        showUserInfo();
        return true;
      } else {
        // Token invalid, clear saved credentials BUT KEEP PROGRESS DATA
        localStorage.removeItem("authToken");
        localStorage.removeItem("userId");
        localStorage.removeItem("appVersion");
        localStorage.removeItem("lastUpdated");
        showLoginForm();
        // Progress data remains in localStorage
      }
    } catch (error) {
      // console.log("Auto-login check failed:", error);
      showLoginForm();
      // Progress data remains in localStorage
    }
  } else {
    showLoginForm();
  }
  return false;
}

// Show login form - UPDATED to handle forgot password form
function showLoginForm() {
  authSection.style.display = "block";
  loginForm.style.display = "block";
  registerForm.style.display = "none";
  forgotPasswordForm.style.display = "none"; // Add this line
  userInfo.style.display = "none";
  // Show table but disable interactions
  document.querySelector("table").style.opacity = "0.6";
  document.querySelector("table").style.pointerEvents = "none";

  // Clear any reset form state
  resetCodeSection.style.display = "none";
  forgotUsernameInput.value = "";
  resetCodeInput.value = "";
  newPasswordInput.value = "";
  confirmNewPasswordInput.value = "";
}

// Show user info when logged in
function showUserInfo() {
  authSection.style.display = "block";
  loginForm.style.display = "none";
  registerForm.style.display = "none";
  userInfo.style.display = "block";
  currentUsername.textContent = userId;
  // Enable table interactions
  document.querySelector("table").style.opacity = "1";
  document.querySelector("table").style.pointerEvents = "auto";
}

// Setup authentication event listeners
function setupAuthEventListeners() {
  loginBtn.addEventListener("click", handleLogin);
  showRegisterBtn.addEventListener("click", () => {
    loginForm.style.display = "none";
    registerForm.style.display = "block";
  });
  registerBtn.addEventListener("click", handleRegister);
  showLoginBtn.addEventListener("click", () => {
    registerForm.style.display = "none";
    loginForm.style.display = "block";
  });
  logoutBtn.addEventListener("click", handleLogout);

  // Enter key support
  passwordInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleLogin();
  });
  regPasswordInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleRegister();
  });
  regConfirmPasswordInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleRegister();
  });

  // Forgot password event listeners
  showForgotPasswordBtn.addEventListener("click", showForgotPasswordForm);
  showLoginFromForgotBtn.addEventListener("click", showLoginForm);
  sendResetCodeBtn.addEventListener("click", handleSendResetCode);
  resetPasswordBtn.addEventListener("click", handleResetPassword);

  // Enter key support for forgot password
  forgotUsernameInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleSendResetCode();
  });
  resetCodeInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleResetPassword();
  });
  newPasswordInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleResetPassword();
  });
  confirmNewPasswordInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleResetPassword();
  });
}

// Toast Notification System
class ToastManager {
  constructor() {
    this.container = document.getElementById("toastContainer");
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

// Confirmation Dialog System - FIXED VERSION
class ConfirmDialog {
  constructor() {
    this.dialog = document.getElementById("confirmDialog");
    this.title = document.getElementById("confirmTitle");
    this.message = document.getElementById("confirmMessage");
    this.okButton = document.getElementById("confirmOk");
    this.cancelButton = document.getElementById("confirmCancel");

    this.promiseResolver = null;
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.okButton.addEventListener("click", () => this.onConfirm(true));
    this.cancelButton.addEventListener("click", () => this.onConfirm(false));

    // Close when clicking outside
    this.dialog.addEventListener("click", (e) => {
      if (e.target === this.dialog) {
        this.onConfirm(false);
      }
    });

    // Escape key support
    document.addEventListener("keydown", (e) => {
      if (this.isVisible() && e.key === "Escape") {
        this.onConfirm(false);
      }
    });
  }

  show(title, message) {
    this.title.textContent = title;
    this.message.textContent = message;
    this.dialog.classList.add("show");

    // Focus the cancel button for accessibility
    setTimeout(() => this.cancelButton.focus(), 100);

    return new Promise((resolve) => {
      this.promiseResolver = resolve;
    });
  }

  onConfirm(result) {
    this.hide();
    if (this.promiseResolver) {
      this.promiseResolver(result);
      this.promiseResolver = null;
    }
  }

  hide() {
    this.dialog.classList.remove("show");
  }

  isVisible() {
    return this.dialog.classList.contains("show");
  }
}

// Initialize toast and confirmation systems
const toastManager = new ToastManager();
const confirmDialog = new ConfirmDialog();

// Handle user login - OPTIMIZED VERSION
async function handleLogin() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    toastManager.warning(
      "Please enter both username and password",
      "Login Required"
    );
    return;
  }

  try {
    // Show loading state
    loginBtn.textContent = "Logging in...";
    loginBtn.disabled = true;

    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const result = await response.json();

    // Inside handleLogin function, after successful login - ENHANCED VERSION
    if (result.success) {
      toastManager.success("Login successful!", "Welcome Back");
      authToken = result.token;
      userId = username;

      // Save for auto-login
      localStorage.setItem("authToken", authToken);
      localStorage.setItem("userId", userId);

      showUserInfo();

      // Load both main data and activity tracker data with proper sequencing
      await loadData();
      await setAppStartDateFromUser();
      await loadActivityTrackerData();

      // Render everything with the new data
      renderTable();
      renderEnhancedActivityTracker();

      // Show immediate sync status
      updateSyncStatus("synced", "Data loaded successfully");

      // NEW: Check if we have a return URL stored
      const returnUrl = localStorage.getItem("returnUrl");
      if (returnUrl && returnUrl !== window.location.href) {
        localStorage.removeItem("returnUrl");
        setTimeout(() => {
          window.location.href = returnUrl;
        }, 1000);
        return; // Stop further execution
      }
      // Force a sync to ensure we have the latest data
      setTimeout(() => {
        syncWithMongoDB();
      }, 1000);
    } else {
      toastManager.error(result.error || "Login failed", "Login Error");
    }
  } catch (error) {
    console.error("Login error:", error);
    toastManager.error("Login failed. Please try again.", "Network Error");
  } finally {
    // Reset login button state
    loginBtn.textContent = "Login";
    loginBtn.disabled = false;
  }
}

// the auth check to handle notifications
const originalHandleLogin = handleLogin;
handleLogin = async function () {
  await originalHandleLogin();

  // Initialize real-time notification manager after login
  if (authToken) {
    setTimeout(() => {
      if (!window.notificationManager) {
        window.notificationManager = new NotificationManager();
      }
    }, 1000);
  }
};

// Handle user registration
async function handleRegister() {
  const username = regUsernameInput.value.trim();
  const password = regPasswordInput.value.trim();
  const confirmPassword = regConfirmPasswordInput.value.trim();

  if (!username || !password) {
    toastManager.warning(
      "Please enter both username and password",
      "Registration"
    );

    return;
  }

  if (password !== confirmPassword) {
    toastManager.error("Passwords do not match", "Registration Error");
    return;
  }

  if (password.length < 4) {
    toastManager.warning(
      "Password must be at least 4 characters long",
      "Password Requirement"
    );

    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const result = await response.json();

    if (result.success) {
      toastManager.success(
        "Registration successful! Please login.",
        "Welcome!"
      );
      regUsernameInput.value = "";
      regPasswordInput.value = "";
      regConfirmPasswordInput.value = "";
      registerForm.style.display = "none";
      loginForm.style.display = "block";
    } else {
      toastManager.error(
        result.error || "Registration failed",
        "Registration Error"
      );
    }
  } catch (error) {
    console.error("Registration error:", error);
    toastManager.error(
      "Registration failed. Please try again.",
      "Network Error"
    );
  }
}

// Handle user logout - FIXED VERSION
function handleLogout() {
  // Save the current progress data BEFORE logging out
  const currentProgress = JSON.parse(
    localStorage.getItem("dsaChecklistData") || "[]"
  );

  // Save activity tracker data locally
  const currentActivityData = window.activityTrackerData;

  authToken = null;
  userId = "default-user";
  localStorage.removeItem("authToken");
  localStorage.removeItem("userId");
  localStorage.removeItem("appVersion");
  localStorage.removeItem("lastUpdated");

  // RESTORE the progress data after clearing auth items
  if (currentProgress && currentProgress.length > 0) {
    localStorage.setItem("dsaChecklistData", JSON.stringify(currentProgress));
  }

  // Preserve activity data locally
  window.activityTrackerData = currentActivityData;

  showLoginForm();
  renderTable();
  renderEnhancedActivityTracker();
}

// Update logout to clean up notifications
const originalHandleLogout = handleLogout;
handleLogout = function () {
  if (window.notificationManager) {
    window.notificationManager.destroy();
    window.notificationManager = null;
  }
  originalHandleLogout();
};

// Show forgot password form
function showForgotPasswordForm() {
  loginForm.style.display = "none";
  registerForm.style.display = "none";
  forgotPasswordForm.style.display = "block";
  userInfo.style.display = "none";
  resetCodeSection.style.display = "none";
  forgotUsernameInput.value = "";
  resetCodeInput.value = "";
  newPasswordInput.value = "";
  confirmNewPasswordInput.value = "";
}

// Handle send reset code
async function handleSendResetCode() {
  const username = forgotUsernameInput.value.trim();

  if (!username) {
    toastManager.warning("Please enter your username", "Username Required");
    return;
  }

  try {
    sendResetCodeBtn.textContent = "Sending...";
    sendResetCodeBtn.disabled = true;

    const response = await fetch(`${API_BASE_URL}/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username }),
    });

    const result = await response.json();

    if (result.success) {
      toastManager.success(result.message, "Reset Code Sent", 5000);

      // Show reset code section
      resetCodeSection.style.display = "block";

      // For demo purposes - show the code (remove this in production)
      if (result.demoCode) {
        toastManager.info(`OTP reset code: ${result.demoCode}`, "OTP", 10000);
      }
    } else {
      toastManager.error(result.error, "Error");
    }
  } catch (error) {
    console.error("Send reset code error:", error);
    toastManager.error(
      "Failed to send reset code. Please try again.",
      "Network Error"
    );
  } finally {
    sendResetCodeBtn.textContent = "Send Reset Code";
    sendResetCodeBtn.disabled = false;
  }
}

// Handle reset password - FIXED VERSION
async function handleResetPassword() {
  const username = forgotUsernameInput.value.trim();
  const resetCode = resetCodeInput.value.trim();
  const newPassword = newPasswordInput.value.trim();
  const confirmPassword = confirmNewPasswordInput.value.trim();

  if (!username || !resetCode || !newPassword || !confirmPassword) {
    toastManager.warning("Please fill in all fields", "All Fields Required");
    return;
  }

  if (newPassword !== confirmPassword) {
    toastManager.error("Passwords do not match", "Password Mismatch");
    return;
  }

  if (newPassword.length < 4) {
    toastManager.warning(
      "Password must be at least 4 characters long",
      "Password Requirement"
    );
    return;
  }

  try {
    resetPasswordBtn.textContent = "Resetting...";
    resetPasswordBtn.disabled = true;

    const response = await fetch(`${API_BASE_URL}/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        resetCode,
        newPassword,
      }),
    });

    const result = await response.json();

    if (result.success) {
      toastManager.success(
        "Password reset successfully! Please login with your new password.",
        "Password Reset"
      );

      // FIX: Automatically show login form and clear reset form
      showLoginForm(); // This will hide the forgot password form

      // Clear the reset form fields
      forgotUsernameInput.value = "";
      resetCodeInput.value = "";
      newPasswordInput.value = "";
      confirmNewPasswordInput.value = "";
      resetCodeSection.style.display = "none";
    } else {
      toastManager.error(result.error, "Reset Failed");
    }
  } catch (error) {
    console.error("Reset password error:", error);
    toastManager.error(
      "Failed to reset password. Please try again.",
      "Network Error"
    );
  } finally {
    resetPasswordBtn.textContent = "Reset Password";
    resetPasswordBtn.disabled = false;
  }
}

// Load data from localStorage and MongoDB - OPTIMIZED VERSION
async function loadData() {
  // Load sync state from localStorage
  const savedVersion = localStorage.getItem("appVersion");
  const savedLastUpdated = localStorage.getItem("lastUpdated");

  if (savedVersion) currentVersion = parseInt(savedVersion);
  if (savedLastUpdated) lastUpdated = savedLastUpdated;

  // First try to load from localStorage (existing logic)
  const savedData = localStorage.getItem("dsaChecklistData");
  if (savedData) {
    appData = JSON.parse(savedData);
    // Ensure linksArray exists for all days (migration for existing data)
    appData.forEach((dayData) => {
      if (!dayData.linksArray) {
        dayData.linksArray = [];
        // Migrate existing links text to linksArray if it exists
        if (dayData.links && dayData.links.trim() !== "") {
          const links = dayData.links
            .split("\n")
            .filter((link) => link.trim() !== "");
          links.forEach((link) => {
            dayData.linksArray.push({
              url: link.trim(),
              text: extractDisplayText(link.trim()),
            });
          });
        }
      }
    });

    // IMMEDIATELY sync with MongoDB if logged in (removed the 1-second delay)
    if (authToken) {
      await syncWithMongoDB(); // Changed from setTimeout to immediate await
    }
  } else {
    // If no localStorage data, try to load from MongoDB if logged in
    if (authToken) {
      try {
        const response = await fetch(`${API_BASE_URL}/data?userId=${userId}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        const result = await response.json();
        if (result.success) {
          appData = result.data;
          currentVersion = result.version || 1;
          lastUpdated = result.lastUpdated || new Date().toISOString();

          // Save to localStorage for offline use
          localStorage.setItem("dsaChecklistData", JSON.stringify(appData));
          localStorage.setItem("appVersion", currentVersion.toString());
          localStorage.setItem("lastUpdated", lastUpdated);

          updateSyncStatus("synced", "Data loaded from cloud");
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        // console.log(
        //   "Failed to load from MongoDB, using default data:",
        //   error
        // );
        // Initialize with default data for 100 days
        initializeDefaultData();
      }
    } else {
      // Not logged in, use default data
      initializeDefaultData();
    }
  }
}

// Initialize default data - FIXED VERSION
function initializeDefaultData() {
  // Check if we already have data in localStorage
  const savedData = localStorage.getItem("dsaChecklistData");
  if (savedData) {
    appData = JSON.parse(savedData);
    // Ensure data structure is correct
    ensureDataStructure();
    return; // Use existing data instead of resetting
  }

  // Only create default data if none exists
  appData = [];
  for (let day = 1; day <= TOTAL_DAYS; day++) {
    appData.push({
      day: day,
      questions: DEFAULT_QUESTIONS.map((q) => ({
        text: q.text,
        link: q.link,
        completed: false,
      })),
      tags: [],
      links: "",
      linksArray: [],
    });
  }
  saveData();
}

// Helper function to ensure data structure is correct
function ensureDataStructure() {
  appData.forEach((dayData) => {
    // Ensure questions have completed property
    if (dayData.questions) {
      dayData.questions.forEach((question) => {
        if (typeof question.completed === "undefined") {
          question.completed = false;
        }
      });
    }

    // Ensure linksArray exists
    if (!dayData.linksArray) {
      dayData.linksArray = [];
    }
  });
}

// Save data to both localStorage and MongoDB - FIXED VERSION
async function saveData() {
  // console.log("💾 saveData() called");

  // Mark that we have pending changes
  pendingChanges = true;

  try {
    // Save to localStorage (existing logic)
    localStorage.setItem("dsaChecklistData", JSON.stringify(appData));
    localStorage.setItem("appVersion", currentVersion.toString());
    localStorage.setItem("lastUpdated", lastUpdated);

    // console.log("💾 Local storage updated");

    // Update filtered data if search is active
    if (searchFilter) {
      filterTableData();
    }

    // Also save to MongoDB if logged in
    if (authToken) {
      // console.log("💾 Saving main data to MongoDB...");
      await saveToMongoDB();
      // console.log("💾 Main data saved to MongoDB");

      // Now save activity tracker data
      // console.log("💾 Now saving activity tracker data...");
      // await saveActivityTrackerData();
    } else {
      // console.log("💾 User not logged in, only saving locally");
      updateSyncStatus("offline", "Changes saved locally");
    }
  } catch (error) {
    console.error("💾 Error in saveData:", error);
  }

  // Always update the activity tracker display
  renderEnhancedActivityTracker();

  // console.log("💾 saveData() completed");
}

// Save data to MongoDB with conflict detection
async function saveToMongoDB() {
  if (isSyncing) {
    // console.log("Already syncing, skipping...");
    return;
  }

  isSyncing = true;

  try {
    updateSyncStatus("syncing", "Syncing...");

    const response = await fetch(`${API_BASE_URL}/data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        userId: userId,
        data: appData,
        clientVersion: currentVersion,
        lastUpdated: lastUpdated,
      }),
    });

    const result = await response.json();

    if (result.success) {
      // Update local version with server version
      currentVersion = result.version;
      lastUpdated = result.lastUpdated;

      // Save updated version info
      localStorage.setItem("appVersion", currentVersion.toString());
      localStorage.setItem("lastUpdated", lastUpdated);

      pendingChanges = false;
      updateSyncStatus("synced", "Data synced with cloud");
    } else if (result.error === "CONFLICT: Your local data is outdated") {
      // Handle conflict - server data is newer
      handleSyncConflict(result);
    } else {
      throw new Error(result.error || "Sync failed");
    }
  } catch (error) {
    // console.log("Failed to save to MongoDB:", error);
    updateSyncStatus("error", "Failed to sync with cloud");

    // Retry after 5 seconds
    setTimeout(() => {
      if (authToken && pendingChanges) {
        saveToMongoDB();
      }
    }, 5);
  } finally {
    isSyncing = false;
  }
}

// Update the initializeEnhancedActivityTracker function
function initializeEnhancedActivityTracker() {
  // console.log("Initializing enhanced activity tracker with auto-sync...");

  // Initialize activity tracker data
  if (!window.activityTrackerData) {
    window.activityTrackerData = {
      currentStreak: 0,
      totalSolved: 0,
      averageDaily: 0,
      maxStreak: 0,
      heatmapData: {},
      activityHistory: [],
    };
  }

  // Set up automatic syncing
  hookIntoSaveOperations();
  setupAutomaticSyncListeners();

  // Load existing data
  loadActivityTrackerData().then(() => {
    // console.log("Activity tracker data loaded with auto-sync enabled");
    renderEnhancedActivityTracker();
  });

  // Periodic sync as backup (every 1 minutes)
  setInterval(() => {
    if (authToken && !isSyncing) {
      // console.log("🕒 Periodic background sync...");
      saveActivityTrackerData();
    }
  }, 60000); // 1 minutes
}
// Hook into all operations that should trigger activity tracker save - FIXED VERSION
function hookIntoSaveOperations() {
  // console.log("🔗 Setting up automatic activity tracker sync...");

  // Store original functions
  const originalFunctions = {
    toggleQuestionCompletion: window.toggleQuestionCompletion,
    addNewQuestion: window.addNewQuestion,
    deleteQuestion: window.deleteQuestion,
    addNewDay: window.addNewDay,
    addNewTag: window.addNewTag,
    addNewLink: window.addNewLink,
    removeLink: window.removeLink,
    saveQuestionLink: window.saveQuestionLink,
    saveData: window.saveData,
  };

  // Debounce function to prevent too many sync requests
  let syncTimeout = null;
  function debouncedSync() {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
      if (authToken) {
        // console.log("🔄 Auto-saving activity tracker data...");
        saveActivityTrackerData();
      }
    }, 1000); // 1 second debounce
  }

  // Override toggleQuestionCompletion
  window.toggleQuestionCompletion = function (dayIndex, questionIndex) {
    const result = originalFunctions.toggleQuestionCompletion(
      dayIndex,
      questionIndex
    );
    debouncedSync();
    return result;
  };

  // Override addNewQuestion
  window.addNewQuestion = function (dayIndex) {
    originalFunctions.addNewQuestion(dayIndex);
    debouncedSync();
  };

  // Override deleteQuestion
  window.deleteQuestion = async function (dayIndex, questionIndex) {
    await originalFunctions.deleteQuestion(dayIndex, questionIndex);
    debouncedSync();
  };

  // Override addNewDay
  window.addNewDay = function () {
    originalFunctions.addNewDay();
    debouncedSync();
  };

  // Override addNewTag
  window.addNewTag = function (dayIndex, tagText) {
    originalFunctions.addNewTag(dayIndex, tagText);
    debouncedSync();
  };

  // Override addNewLink
  window.addNewLink = function (dayIndex, linkText) {
    originalFunctions.addNewLink(dayIndex, linkText);
    debouncedSync();
  };

  // Override removeLink
  window.removeLink = function (dayIndex, linkIndex) {
    originalFunctions.removeLink(dayIndex, linkIndex);
    debouncedSync();
  };

  // Override saveQuestionLink
  window.saveQuestionLink = function () {
    originalFunctions.saveQuestionLink();
    debouncedSync();
  };

  // Override saveData to include activity tracker save
  const originalSaveData = window.saveData;
  window.saveData = async function () {
    await originalSaveData();
    debouncedSync();
  };

  // console.log("✅ Automatic activity tracker sync enabled");
}

// This new function for direct event listening as backup
function setupAutomaticSyncListeners() {
  // console.log("🎯 Setting up automatic sync listeners...");

  let syncDebounceTimer = null;

  function triggerAutoSync() {
    if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
    syncDebounceTimer = setTimeout(() => {
      if (authToken && !isSyncing) {
        // console.log("🔄 Auto-sync triggered by user action");
        saveActivityTrackerData();
      }
    }, 800); // 800ms debounce
  }

  // Listen for all user interactions that modify data
  document.addEventListener("change", function (e) {
    if (
      e.target.classList.contains("question-checkbox") ||
      e.target.classList.contains("add-tag-input") ||
      e.target.classList.contains("add-link-input")
    ) {
      triggerAutoSync();
    }
  });

  document.addEventListener("click", function (e) {
    if (
      e.target.classList.contains("add-question-btn") ||
      e.target.classList.contains("tag-remove") ||
      e.target.classList.contains("personal-info-remove-btn") ||
      e.target.closest(".question-item")
    ) {
      triggerAutoSync();
    }
  });

  document.addEventListener("input", function (e) {
    if (
      e.target.classList.contains("question-text") ||
      e.target.classList.contains("links-textarea")
    ) {
      triggerAutoSync();
    }
  });

  // Keyboard events for tag/link input
  document.addEventListener("keypress", function (e) {
    if (
      e.key === "Enter" &&
      (e.target.classList.contains("add-tag-input") ||
        e.target.classList.contains("add-link-input"))
    ) {
      triggerAutoSync();
    }
  });

  // console.log("✅ Automatic sync listeners activated");
}

// Load activity tracker data from MongoDB - FIXED VERSION
async function loadActivityTrackerData() {
  if (!authToken) {
    // Initialize with local data if not logged in
    window.activityTrackerData = {
      currentStreak: 0,
      totalSolved: 0,
      averageDaily: 0,
      maxStreak: 0,
      heatmapData: getActivityData(), // Calculate from current appData
      activityHistory: getActivityHistory(),
    };
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/activity-tracker`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const result = await response.json();

    if (result.success && result.activityData) {
      // Merge with current activity data
      window.activityTrackerData = {
        ...window.activityTrackerData,
        ...result.activityData,
      };
    } else {
      // Initialize with calculated data if no server data
      window.activityTrackerData = {
        currentStreak: 0,
        totalSolved: 0,
        averageDaily: 0,
        maxStreak: 0,
        heatmapData: getActivityData(),
        activityHistory: getActivityHistory(),
      };
    }
  } catch (error) {
    // console.log(
    //   "Failed to load activity tracker data from MongoDB:",
    //   error
    // );
    // Initialize with calculated data on error
    window.activityTrackerData = {
      currentStreak: 0,
      totalSolved: 0,
      averageDaily: 0,
      maxStreak: 0,
      heatmapData: getActivityData(),
      activityHistory: getActivityHistory(),
    };
  }
}

// Save activity tracker data to MongoDB - FIXED VERSION
// Enhanced saveActivityTrackerData function with better error handling
async function saveActivityTrackerData() {
  if (!authToken) {
    // console.log("🔐 Not logged in, skipping activity tracker save");
    return;
  }

  if (isSyncing) {
    // console.log("⏳ Sync already in progress, skipping...");
    return;
  }

  isSyncing = true;

  try {
    // console.log("💾 Starting automatic activity tracker save...");

    // Calculate fresh data
    const analytics = calculateAnalytics();
    const heatmapData = getActivityData();
    const activityHistory = getActivityHistory();

    const trackerData = {
      currentStreak: analytics.currentStreak,
      totalSolved: analytics.totalSolved,
      averageDaily: analytics.averageDaily,
      maxStreak: analytics.maxStreak,
      heatmapData: heatmapData,
      activityHistory: activityHistory,
    };

    // console.log("💾 Activity data to save:", trackerData);

    const response = await fetch(`${API_BASE_URL}/activity-tracker`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        activityData: trackerData,
      }),
    });

    const result = await response.json();

    if (result.success) {
      // console.log("✅ Activity tracker data saved automatically");
      // Update local copy
      window.activityTrackerData = trackerData;
      // Update sync status briefly
      updateSyncStatus("synced", "Auto-saved");
      setTimeout(() => updateSyncStatus("synced", "Synced"), 2000);
    } else {
      console.error("❌ Auto-save failed:", result.error);
      updateSyncStatus("error", "Auto-save failed");
    }
  } catch (error) {
    console.error("❌ Auto-save error:", error);
    updateSyncStatus("offline", "Working offline");
  } finally {
    isSyncing = false;
  }
}

// Get activity history for MongoDB storage
function getActivityHistory() {
  const activityHistory = [];
  const startDate = new Date("2025-09-25");

  appData.forEach((dayData) => {
    const solvedCount = dayData.questions.filter((q) => q.completed).length;
    if (solvedCount > 0) {
      const dayDate = new Date(startDate);
      dayDate.setDate(startDate.getDate() + (dayData.day - 1));

      activityHistory.push({
        date: dayDate.toISOString(),
        day: dayData.day,
        solvedCount: solvedCount,
        totalQuestions: dayData.questions.length,
      });
    }
  });

  return activityHistory;
}

function renderEnhancedActivityTracker() {
  updateAnalyticsDashboard();
  renderHeatmap();
}

function updateAnalyticsDashboard() {
  // Calculate fresh analytics with the corrected logic
  const analytics = calculateAnalytics();

  // Update the UI
  document.getElementById("currentStreak").textContent =
    analytics.currentStreak;
  document.getElementById("totalSolved").textContent = analytics.totalSolved;
  document.getElementById("averageDaily").textContent =
    analytics.averageDaily.toFixed(1);
  document.getElementById("maxStreak").textContent = analytics.maxStreak;

  // Update the stored data with fresh calculations
  if (window.activityTrackerData) {
    window.activityTrackerData.currentStreak = analytics.currentStreak;
    window.activityTrackerData.totalSolved = analytics.totalSolved;
    window.activityTrackerData.averageDaily = analytics.averageDaily;
    window.activityTrackerData.maxStreak = analytics.maxStreak;
    window.activityTrackerData.heatmapData = getActivityData();
    window.activityTrackerData.activityHistory = getActivityHistory();
  }
}

function calculateAnalytics() {
  const startDate = new Date(APP_START_DATE); // Now uses dynamic date

  const today = new Date();
  const activityData = getActivityData();

  // Get all dates with activity and sort them
  const activeDates = Object.keys(activityData)
    .map((dateStr) => new Date(dateStr))
    .sort((a, b) => a - b); // Sort in ascending order

  // Calculate streaks
  let currentStreak = 0;
  let maxStreak = 0;
  let tempStreak = 0;

  // Calculate current streak (ending at today)
  if (activeDates.length > 0) {
    // Start from the most recent date and move backwards
    const sortedDates = [...activeDates].sort((a, b) => b - a); // Sort in descending order

    const todayKey = formatDateKey(today);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = formatDateKey(yesterday);

    // Check if we have activity today or yesterday to start the streak
    if (activityData[todayKey] > 0) {
      currentStreak = 1;
      // Continue backwards from yesterday
      let checkDate = new Date(yesterday);
      while (true) {
        const checkDateKey = formatDateKey(checkDate);
        if (activityData[checkDateKey] > 0) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    } else if (activityData[yesterdayKey] > 0) {
      // If no activity today, but activity yesterday, check backwards from yesterday
      currentStreak = 1;
      let checkDate = new Date(yesterday);
      checkDate.setDate(checkDate.getDate() - 1);
      while (true) {
        const checkDateKey = formatDateKey(checkDate);
        if (activityData[checkDateKey] > 0) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }
    // If no activity today or yesterday, current streak is 0
  }

  // Calculate max streak (longest consecutive period)
  if (activeDates.length > 0) {
    tempStreak = 1;
    for (let i = 1; i < activeDates.length; i++) {
      const prevDate = activeDates[i - 1];
      const currDate = activeDates[i];

      // Check if consecutive
      const expectedDate = new Date(prevDate);
      expectedDate.setDate(expectedDate.getDate() + 1);

      if (formatDateKey(expectedDate) === formatDateKey(currDate)) {
        tempStreak++;
      } else {
        maxStreak = Math.max(maxStreak, tempStreak);
        tempStreak = 1;
      }
    }
    maxStreak = Math.max(maxStreak, tempStreak);
  }

  // Calculate totals
  const totalSolved = Object.values(activityData).reduce(
    (sum, count) => sum + count,
    0
  );
  const daysSinceStart =
    Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;
  const averageDaily = daysSinceStart > 0 ? totalSolved / daysSinceStart : 0;

  return {
    currentStreak,
    totalSolved,
    averageDaily,
    maxStreak,
    activeDays: activeDates.length,
    totalDays: daysSinceStart,
  };
}

function getActivityData() {
  const activityData = {};
  const startDate = new Date(APP_START_DATE); // Now uses dynamic date

  appData.forEach((dayData) => {
    const solvedCount = dayData.questions.filter((q) => q.completed).length;
    if (solvedCount > 0) {
      const dayDate = new Date(startDate);
      dayDate.setDate(startDate.getDate() + (dayData.day - 1));
      const dateKey = formatDateKey(dayDate);
      activityData[dateKey] = solvedCount;
    }
  });

  return activityData;
}

function formatDateKey(date) {
  return date.toISOString().split("T")[0];
}

function isConsecutiveDay(date1, date2) {
  const oneDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.round(Math.abs((date2 - date1) / oneDay));
  return diffDays === 1;
}

function renderHeatmap() {
  const heatmapGrid = document.getElementById("heatmapGrid");
  const monthsRow = document.querySelector(".months-row");

  if (!heatmapGrid) return;

  heatmapGrid.innerHTML = "";
  monthsRow.innerHTML = "";

  const startDate = new Date(APP_START_DATE); // Now uses dynamic date

  const today = new Date();

  // ALWAYS use current activity data, not stored data
  const activityData = getActivityData();

  // Rest of the function remains the same...
  // Generate month labels
  const monthLabels = generateMonthLabels(startDate, today);
  monthLabels.forEach((month) => {
    const monthLabel = document.createElement("div");
    monthLabel.className = "month-label";
    monthLabel.textContent = month;
    monthsRow.appendChild(monthLabel);
  });

  // Generate heatmap cells (52 weeks)
  let currentDate = new Date(startDate);
  const cells = [];

  for (let week = 0; week < 52; week++) {
    for (let day = 0; day < 7; day++) {
      const dateKey = formatDateKey(currentDate);
      const activityCount = activityData[dateKey] || 0;
      const activityLevel = getActivityLevel(activityCount);

      const cell = document.createElement("div");
      cell.className = `heatmap-cell level-${activityLevel}`;
      cell.setAttribute("tabindex", "0");
      cell.setAttribute("role", "button");
      cell.setAttribute(
        "aria-label",
        `Date: ${formatDisplayDate(
          currentDate
        )}, Problems solved: ${activityCount}`
      );

      // Tooltip
      const tooltip = document.createElement("div");
      tooltip.className = "heatmap-tooltip";
      tooltip.textContent = `${formatDisplayDate(
        currentDate
      )}: ${activityCount} problem${activityCount !== 1 ? "s" : ""} solved`;
      cell.appendChild(tooltip);

      // Keyboard navigation
      cell.addEventListener("keydown", (e) => {
        handleHeatmapKeyboardNav(e, cells, week * 7 + day);
      });

      cell.addEventListener("focus", () => {
        cell.classList.add("focused");
      });

      cell.addEventListener("blur", () => {
        cell.classList.remove("focused");
      });

      cells.push(cell);
      currentDate.setDate(currentDate.getDate() + 1);

      // Stop if we reach today
      if (currentDate > today) break;
    }
    if (currentDate > today) break;
  }

  // cells to grid
  cells.forEach((cell) => {
    heatmapGrid.appendChild(cell);
  });
}

function generateMonthLabels(startDate, endDate) {
  const labels = [];
  const currentDate = new Date(startDate);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  while (currentDate <= endDate) {
    // Only show label if it's the first week of the month or if it's the start date
    if (
      currentDate.getDate() <= 7 ||
      currentDate.getTime() === startDate.getTime()
    ) {
      labels.push(months[currentDate.getMonth()]);
    } else {
      labels.push("");
    }
    currentDate.setDate(currentDate.getDate() + 7);
  }

  return labels.slice(0, 52); // Ensure we don't exceed 52 weeks
}

function getActivityLevel(count) {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  return 4; // 4+ problems
}

function formatDisplayDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function handleHeatmapKeyboardNav(event, cells, currentIndex) {
  const key = event.key;
  let newIndex = currentIndex;

  switch (key) {
    case "ArrowLeft":
      newIndex = Math.max(0, currentIndex - 1);
      break;
    case "ArrowRight":
      newIndex = Math.min(cells.length - 1, currentIndex + 1);
      break;
    case "ArrowUp":
      newIndex = Math.max(0, currentIndex - 7);
      break;
    case "ArrowDown":
      newIndex = Math.min(cells.length - 1, currentIndex + 7);
      break;
    case "Home":
      newIndex = 0;
      break;
    case "End":
      newIndex = cells.length - 1;
      break;
    default:
      return; // Do nothing for other keys
  }

  if (newIndex !== currentIndex) {
    event.preventDefault();
    cells[newIndex].focus();
  }
}

if (typeof renderActivityCalendar !== "undefined") {
  delete window.renderActivityCalendar;
}
if (typeof initializeActivityTracker !== "undefined") {
  delete window.initializeActivityTracker;
}
// Handle sync conflict when server has newer data - IMPROVED VERSION
async function handleSyncConflict(conflictResult) {
  // console.log("🔄 Handling sync conflict...");

  // Check if this is a minor conflict that can be auto-merged
  if (!conflictResult.requiresUserResolution) {
    // Auto-merge case - just accept server data with notification
    appData = conflictResult.serverData;
    currentVersion = conflictResult.serverVersion;
    lastUpdated = conflictResult.serverLastUpdated;

    localStorage.setItem("dsaChecklistData", JSON.stringify(appData));
    localStorage.setItem("appVersion", currentVersion.toString());
    localStorage.setItem("lastUpdated", lastUpdated);

    renderTable();
    updateSyncStatus("synced", "Auto-synced with server");

    // Show gentle notification instead of confirmation dialog
    toastManager.info(
      "Your data was automatically synced with the cloud",
      "Auto-Sync Complete",
      3000
    );
    return;
  }

  // Only show confirmation for significant conflicts
  updateSyncStatus("error", "Conflict detected");

  const userChoice = await confirmDialog.show(
    "Sync Conflict Detected",
    "Significant changes were detected between your local data and the server. " +
      "Would you like to load the server data? Choosing 'Cancel' will keep your local changes."
  );

  if (userChoice) {
    // User wants to use server data
    appData = conflictResult.serverData;
    currentVersion = conflictResult.serverVersion;
    lastUpdated = conflictResult.serverLastUpdated;

    localStorage.setItem("dsaChecklistData", JSON.stringify(appData));
    localStorage.setItem("appVersion", currentVersion.toString());
    localStorage.setItem("lastUpdated", lastUpdated);

    renderTable();
    updateSyncStatus("synced", "Loaded server data");
    toastManager.success("Data synchronized with server", "Sync Complete");
  } else {
    // User wants to keep local data - force push with retry logic
    await forcePushToServer();
  }
}

// Improved sync function with debouncing and smarter conflict detection
let syncTimeout = null;
let lastSyncTime = 0;
const SYNC_DEBOUNCE_TIME = 2000; // 2 seconds
// Sync with MongoDB (for conflict resolution) - UPDATED VERSION
async function syncWithMongoDB() {
  if (isSyncing || !authToken) return;

  try {
    const response = await fetch(
      `${API_BASE_URL}/data?userId=${userId}&t=${Date.now()}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      const serverVersion = result.version || 1;
      const serverLastUpdated = result.lastUpdated;

      // Check if server has newer data
      if (serverVersion > currentVersion) {
        appData = result.data;
        currentVersion = serverVersion;
        lastUpdated = serverLastUpdated;

        localStorage.setItem("dsaChecklistData", JSON.stringify(appData));
        localStorage.setItem("appVersion", currentVersion.toString());
        localStorage.setItem("lastUpdated", lastUpdated);

        // CRITICAL: Force reload the activity tracker data
        await setAppStartDateFromUser();

        // CRITICAL: Re-render everything with the new data
        renderTable();
        renderEnhancedActivityTracker();

        updateSyncStatus("synced", "Data updated from cloud");

        // Show immediate feedback to user
        toastManager.info(
          "Data synchronized with cloud",
          "Background Sync Complete"
        );
      } else if (pendingChanges) {
        // We have local changes that need to be pushed
        await saveToMongoDB();
      } else {
        updateSyncStatus("synced", "Data is up to date");
      }
    }
  } catch (error) {
    updateSyncStatus("offline", "Working offline");

    if (!error.message.includes("Failed to fetch")) {
      toastManager.warning("Sync failed, using local data", "Offline Mode");
    }
  }
}

// Enhanced function to update activity tracker with user data
async function updateActivityTrackerWithUserData() {
  if (authToken && userId !== "default-user") {
    try {
      const response = await fetch(`${API_BASE_URL}/user-info`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.user && result.user.accountCreated) {
          const userCreatedAt = new Date(result.user.accountCreated);
          const year = userCreatedAt.getFullYear();
          const month = String(userCreatedAt.getMonth() + 1).padStart(2, "0");
          const day = String(userCreatedAt.getDate()).padStart(2, "0");
          APP_START_DATE = `${year}-${month}-${day}`;

          // Update the activity tracker subtitle
          updateActivityTrackerSubtitle();

          // Force recalculation of analytics with new start date
          renderEnhancedActivityTracker();

          return true;
        }
      }
    } catch (error) {
      console.log("Error updating activity tracker with user data:", error);
    }
  }
  return false;
}
// Improved save function with better change detection
async function saveData() {
  // console.log("💾 saveData() called");

  // Better change detection - only mark as pending if there are actual changes
  const previousData = JSON.parse(
    localStorage.getItem("dsaChecklistData") || "[]"
  );
  const currentDataString = JSON.stringify(appData);

  // Check if there are meaningful changes
  if (JSON.stringify(previousData) === currentDataString) {
    // console.log("💾 No meaningful changes detected, skipping save");
    return;
  }

  pendingChanges = true;

  try {
    // Save to localStorage
    localStorage.setItem("dsaChecklistData", currentDataString);
    localStorage.setItem("appVersion", currentVersion.toString());
    localStorage.setItem("lastUpdated", lastUpdated);

    // console.log("💾 Local storage updated");

    // Save to MongoDB if logged in (with improved error handling)
    if (authToken) {
      // console.log("💾 Saving to MongoDB...");
      await saveToMongoDB();
    } else {
      // console.log("💾 User not logged in, only saving locally");
      updateSyncStatus("offline", "Changes saved locally");
    }
  } catch (error) {
    console.error("💾 Error in saveData:", error);
  }

  // Update activity tracker
  renderEnhancedActivityTracker();
}

// Improved force push with better error handling
async function forcePushToServer() {
  try {
    updateSyncStatus("syncing", "Saving changes...");

    // Increment version appropriately
    currentVersion = (currentVersion || 1) + 1;
    lastUpdated = new Date().toISOString();

    const response = await fetch(`${API_BASE_URL}/data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        userId: userId,
        data: appData,
        clientVersion: currentVersion,
        lastUpdated: lastUpdated,
      }),
    });

    const result = await response.json();

    if (result.success) {
      currentVersion = result.version;
      lastUpdated = result.lastUpdated;

      localStorage.setItem("appVersion", currentVersion.toString());
      localStorage.setItem("lastUpdated", lastUpdated);

      pendingChanges = false;
      updateSyncStatus("synced", "Changes saved to cloud");
      toastManager.success("Changes saved successfully", "Saved");
    } else {
      throw new Error(result.error || "Save failed");
    }
  } catch (error) {
    // console.log("Force push failed:", error);
    updateSyncStatus("error", "Save failed");

    // Show appropriate error message
    if (error.message.includes("CONFLICT")) {
      toastManager.error(
        "Could not save due to conflict. Please refresh and try again.",
        "Save Failed"
      );
    } else {
      toastManager.error(
        "Failed to save changes. Please check your connection.",
        "Save Error"
      );
    }

    // Restore previous version on failure
    const savedVersion = localStorage.getItem("appVersion");
    const savedLastUpdated = localStorage.getItem("lastUpdated");
    if (savedVersion) currentVersion = parseInt(savedVersion);
    if (savedLastUpdated) lastUpdated = savedLastUpdated;
  }
}
// Force push local data to server (overwrite server data)
async function forcePushToServer() {
  try {
    updateSyncStatus("syncing", "Force pushing changes...");

    // Increment version to indicate this is a forced update
    currentVersion = (currentVersion || 1) + 1000; // Large increment to ensure it's seen as newer
    lastUpdated = new Date().toISOString();

    const response = await fetch(`${API_BASE_URL}/data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        userId: userId,
        data: appData,
        clientVersion: currentVersion,
        lastUpdated: lastUpdated,
      }),
    });

    const result = await response.json();

    if (result.success) {
      currentVersion = result.version;
      lastUpdated = result.lastUpdated;

      localStorage.setItem("appVersion", currentVersion.toString());
      localStorage.setItem("lastUpdated", lastUpdated);

      pendingChanges = false;
      updateSyncStatus("synced", "Changes force pushed to cloud");
    } else {
      throw new Error(result.error || "Force push failed");
    }
  } catch (error) {
    // console.log("Force push failed:", error);
    updateSyncStatus("error", "Force push failed");
  }
}

// Sync with MongoDB (for conflict resolution) - OPTIMIZED VERSION
async function syncWithMongoDB() {
  if (isSyncing || !authToken) return;

  try {
    const response = await fetch(
      `${API_BASE_URL}/data?userId=${userId}&t=${Date.now()}`,
      {
        // Added cache busting
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      const serverVersion = result.version || 1;
      const serverLastUpdated = result.lastUpdated;

      // Check if server has newer data
      if (serverVersion > currentVersion) {
        // console.log(
        //   "Server has newer data, updating local copy immediately"
        // );
        appData = result.data;
        currentVersion = serverVersion;
        lastUpdated = serverLastUpdated;

        localStorage.setItem("dsaChecklistData", JSON.stringify(appData));
        localStorage.setItem("appVersion", currentVersion.toString());
        localStorage.setItem("lastUpdated", lastUpdated);

        renderTable();
        updateSyncStatus("synced", "Data updated from cloud");

        // Show immediate feedback to user
        toastManager.info("Data synchronized with cloud", "Sync Complete");
      } else if (pendingChanges) {
        // We have local changes that need to be pushed
        await saveToMongoDB();
      } else {
        updateSyncStatus("synced", "Data is up to date");
      }
    }
  } catch (error) {
    // console.log("Background sync failed:", error);
    updateSyncStatus("offline", "Working offline");

    // Don't show error toast for background sync failures to avoid annoying users
    if (!error.message.includes("Failed to fetch")) {
      toastManager.warning("Sync failed, using local data", "Offline Mode");
    }
  }
}

// Force sync from server (manual sync button) - UPDATED VERSION
async function forceSyncFromServer() {
  if (!authToken) {
    toastManager.warning("Please log in to sync with cloud", "Login Required");
    return;
  }

  try {
    updateSyncStatus("syncing", "Syncing from server...");

    // Show immediate feedback
    toastManager.info("Syncing latest data from cloud...", "Sync Started");

    const response = await fetch(`${API_BASE_URL}/force-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ userId: userId }),
    });

    const result = await response.json();

    if (result.success) {
      // Update local data with server data
      appData = result.data;
      currentVersion = result.version || 1;
      lastUpdated = result.lastUpdated || new Date().toISOString();

      // Save to localStorage
      localStorage.setItem("dsaChecklistData", JSON.stringify(appData));
      localStorage.setItem("appVersion", currentVersion.toString());
      localStorage.setItem("lastUpdated", lastUpdated);

      // CRITICAL: Force reload the activity tracker data
      await setAppStartDateFromUser();

      // CRITICAL: Re-render everything with the new data
      renderTable();
      renderEnhancedActivityTracker();

      // Update filtered data if search is active
      if (searchFilter) {
        filterTableData();
      }

      updateSyncStatus("synced", "Data synced from cloud");

      // Show success message with updated info
      const totalQuestions = appData.reduce(
        (total, day) => total + day.questions.length,
        0
      );
      const solvedQuestions = appData.reduce(
        (total, day) => total + day.questions.filter((q) => q.completed).length,
        0
      );
    } else {
      throw new Error(result.error || "Sync failed");
    }
  } catch (error) {
    console.error("Force sync failed:", error);
    updateSyncStatus("error", "Sync failed");
    toastManager.error(
      "Failed to sync with cloud. Please check your connection.",
      "Sync Error"
    );
  }
}
// Update sync status indicator
function updateSyncStatus(status, message) {
  const syncDot = syncStatus.querySelector(".sync-dot");
  const statusText = syncStatus.querySelector("span");

  // Remove all status classes
  syncDot.classList.remove("synced", "syncing", "error", "offline");

  switch (status) {
    case "synced":
      syncDot.classList.add("synced");
      statusText.textContent = message || "Synced";
      break;
    case "syncing":
      syncDot.classList.add("syncing");
      statusText.textContent = message || "Syncing...";
      break;
    case "error":
      syncDot.classList.add("error");
      statusText.textContent = message || "Sync failed";
      break;
    case "offline":
      syncDot.classList.add("offline");
      statusText.textContent = message || "Offline";
      break;
  }
}

// Add this helper function to get today's date in the same format as APP_START_DATE
function getTodayDateString() {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

// Add this function to check if a day is the current day
function isCurrentDay(dayNumber) {
  const startDate = new Date(APP_START_DATE);
  const dayDate = new Date(startDate);
  dayDate.setDate(startDate.getDate() + (dayNumber - 1));

  const today = new Date();

  // Compare dates without time components
  return dayDate.toDateString() === today.toDateString();
}

// Add this function to check if a day is completed (all questions done)
function isDayCompleted(dayData) {
  return (
    dayData.questions.length > 0 && dayData.questions.every((q) => q.completed)
  );
}

// MODIFIED: renderTable function to sort with current day first and completed days in chronological order
function renderTable() {
  tableBody.innerHTML = "";
  const currentDay = getCurrentDayNumber();

  // Use filteredData for rendering when search is active, otherwise use appData
  const dataToRender = searchFilter ? filteredData : appData;

  // Sort the data: current day first, then incomplete days in chronological order, then completed days in chronological order
  const sortedData = [...dataToRender].sort((a, b) => {
    const aIsCurrent = isCurrentDay(a.day);
    const bIsCurrent = isCurrentDay(b.day);
    const aIsCompleted = isDayCompleted(a);
    const bIsCompleted = isDayCompleted(b);

    // Current day always comes first
    if (aIsCurrent && !bIsCurrent) return -1;
    if (!aIsCurrent && bIsCurrent) return 1;

    // If both are current day, maintain order
    if (aIsCurrent && bIsCurrent) return a.day - b.day;

    // Among non-current days, incomplete days come before completed days
    if (!aIsCompleted && bIsCompleted) return -1;
    if (aIsCompleted && !bIsCompleted) return 1;

    // If both are completed or both are incomplete, sort by day number
    return a.day - b.day;
  });

  sortedData.forEach((dayData, displayIndex) => {
    // Find the original index in appData for data manipulation
    const originalIndex = appData.findIndex((d) => d.day === dayData.day);
    const isEditableDay = isEditable(dayData.day);
    const isCurrent = isCurrentDay(dayData.day);

    const row = document.createElement("tr");

    // Apply non-editable class to entire row if not today
    if (!isEditableDay) {
      row.classList.add("non-editable-day");
    }

    // Add current-day class for styling if it's the current day
    if (isCurrent) {
      row.classList.add("current-day");
    }

    // Day column
    const dayCell = document.createElement("td");
    dayCell.className = "day-cell";
    dayCell.style.cursor = "pointer"; // Add this line

    // Add click event to redirect to day-details
    dayCell.addEventListener("click", () => {
      window.location.href = `/day-details?day=${dayData.day}`;
    });

    // Add current day indicator
    if (isCurrent) {
      const dayWrapper = document.createElement("div");
      dayWrapper.style.display = "flex";
      dayWrapper.style.flexDirection = "column";
      dayWrapper.style.alignItems = "center";
      dayWrapper.style.gap = "4px";

      const dayNumber = document.createElement("span");
      dayNumber.textContent = dayData.day;

      const currentBadge = document.createElement("span");
      currentBadge.textContent = "📍 Today";
      currentBadge.style.fontSize = "0.7rem";
      currentBadge.style.color = "var(--accent-color)";
      currentBadge.style.fontWeight = "bold";

      dayWrapper.appendChild(dayNumber);
      dayWrapper.appendChild(currentBadge);
      dayCell.appendChild(dayWrapper);
    } else {
      dayCell.textContent = dayData.day;
    }

    // Add screen reader information
    const srText = document.createElement("span");
    srText.className = "sr-only";
    if (!isEditableDay) {
      srText.textContent = " - Non-editable day";
    }
    if (isCurrent) {
      srText.textContent = srText.textContent
        ? srText.textContent + " - Current day"
        : " - Current day";
    }
    dayCell.appendChild(srText);

    row.appendChild(dayCell);

    // Questions column - MODIFIED to use originalIndex for data manipulation
    const questionsCell = document.createElement("td");
    questionsCell.className = "questions-cell";

    dayData.questions.forEach((question, qIndex) => {
      const questionItem = document.createElement("div");
      questionItem.className = "question-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = `question-checkbox ${
        isEditableDay ? "editable-control" : "non-editable-control"
      }`;
      checkbox.checked = question.completed;
      checkbox.disabled = !isEditableDay;
      checkbox.setAttribute("aria-disabled", !isEditableDay);

      if (isEditableDay) {
        checkbox.addEventListener("change", () => {
          // Use originalIndex to modify the actual data in appData
          toggleQuestionCompletion(originalIndex, qIndex);
        });
      } else {
        checkbox.tabIndex = -1;
      }

      const questionContent = document.createElement("div");
      questionContent.className = "question-content";

      const questionText = document.createElement("span");
      questionText.className = "question-text";

      if (question.link) {
        const questionLink = document.createElement("a");
        questionLink.href = question.link;
        questionLink.target = "_blank";
        questionLink.rel = "noopener noreferrer";
        questionLink.textContent = question.text;
        questionLink.className = "question-link";
        questionText.appendChild(questionLink);
      } else {
        questionText.textContent = question.text;
      }

      // Add difficulty badge
      const difficulty = question.difficulty || "Medium";
      const difficultyBadge = document.createElement("span");
      difficultyBadge.className = `difficulty-badge ${difficulty.toLowerCase()}`;
      difficultyBadge.textContent = difficulty;
      questionText.appendChild(difficultyBadge);
      // setupDifficultySelector();

      // Only make text editable for today
      if (isEditableDay) {
        questionText.addEventListener("click", (e) => {
          if (!e.target.classList.contains("question-link")) {
            editQuestionText(originalIndex, qIndex, questionText);
          }
        });
      }

      // Edit link button - only for editable days
      const editLinkBtn = document.createElement("button");
      editLinkBtn.textContent = "🔗";
      editLinkBtn.style.background = "none";
      editLinkBtn.style.border = "none";
      editLinkBtn.style.cursor = isEditableDay ? "pointer" : "not-allowed";
      editLinkBtn.style.marginLeft = "8px";
      editLinkBtn.style.opacity = isEditableDay ? "0.7" : "0.3";
      editLinkBtn.title = isEditableDay
        ? "Edit link"
        : "Only today's items are editable";
      editLinkBtn.disabled = !isEditableDay;
      editLinkBtn.setAttribute("aria-disabled", !isEditableDay);

      if (isEditableDay) {
        editLinkBtn.addEventListener("click", () => {
          openLinkModal(originalIndex, qIndex);
        });
      } else {
        editLinkBtn.tabIndex = -1;
        // Add tooltip for non-editable days
        const tooltipContainer = document.createElement("div");
        tooltipContainer.className = "tooltip-container";
        tooltipContainer.appendChild(editLinkBtn);

        const tooltip = document.createElement("span");
        tooltip.className = "tooltip-text";
        tooltip.textContent = "Only today's items are editable.";
        tooltipContainer.appendChild(tooltip);

        questionText.appendChild(tooltipContainer);
      }

      // DELETE QUESTION BUTTON - only for editable days
      const deleteQuestionBtn = document.createElement("button");
      deleteQuestionBtn.className = "delete-question-btn"; // This class is crucial

      deleteQuestionBtn.textContent = "🗑️";
      deleteQuestionBtn.style.background = "none";
      deleteQuestionBtn.style.border = "none";
      deleteQuestionBtn.style.cursor = isEditableDay
        ? "pointer"
        : "not-allowed";
      deleteQuestionBtn.style.marginLeft = "4px";
      deleteQuestionBtn.style.opacity = isEditableDay ? "0.7" : "0.3";
      deleteQuestionBtn.title = isEditableDay
        ? "Delete question"
        : "Only today's items are editable";
      deleteQuestionBtn.disabled = !isEditableDay;
      deleteQuestionBtn.setAttribute("aria-disabled", !isEditableDay);

      if (isEditableDay) {
        deleteQuestionBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          deleteQuestion(originalIndex, qIndex);
        });
      } else {
        deleteQuestionBtn.tabIndex = -1;
        // Add tooltip for non-editable days
        const tooltipContainer = document.createElement("div");
        tooltipContainer.className = "tooltip-container";
        tooltipContainer.appendChild(deleteQuestionBtn);

        const tooltip = document.createElement("span");
        tooltip.className = "tooltip-text";
        tooltip.textContent = "Only today's items are editable.";
        tooltipContainer.appendChild(tooltip);

        questionText.appendChild(tooltipContainer);
      }

      if (isEditableDay) {
        questionText.appendChild(editLinkBtn);
        questionText.appendChild(deleteQuestionBtn);
      }

      questionContent.appendChild(questionText);
      questionItem.appendChild(checkbox);
      questionItem.appendChild(questionContent);
      questionsCell.appendChild(questionItem);
    });

    // Add question button - only for editable days
    const addQuestionBtn = document.createElement("button");
    addQuestionBtn.className = `add-question-btn ${
      isEditableDay ? "editable-control" : "non-editable-control"
    }`;
    addQuestionBtn.textContent = "+ Add Question";
    addQuestionBtn.disabled = !isEditableDay;
    addQuestionBtn.setAttribute("aria-disabled", !isEditableDay);

    if (isEditableDay) {
      addQuestionBtn.addEventListener("click", () => {
        addNewQuestion(originalIndex);
      });
    } else {
      addQuestionBtn.tabIndex = -1;
      // Add tooltip
      const tooltipContainer = document.createElement("div");
      tooltipContainer.className = "tooltip-container";
      tooltipContainer.style.width = "100%";
      tooltipContainer.appendChild(addQuestionBtn);

      const tooltip = document.createElement("span");
      tooltip.className = "tooltip-text";
      tooltip.textContent = "Only today's items are editable.";
      tooltipContainer.appendChild(tooltip);

      questionsCell.appendChild(tooltipContainer);
    }

    questionsCell.appendChild(
      isEditableDay ? addQuestionBtn : addQuestionBtn.parentElement
    );
    row.appendChild(questionsCell);

    // Status column

    // Tags column - MODIFIED for editable state and proper indexing
    const tagsCell = document.createElement("td");
    tagsCell.className = "tags-cell";

    dayData.tags.forEach((tag, tagIndex) => {
      const tagElement = document.createElement("span");
      tagElement.className = "tag";
      tagElement.style.backgroundColor = tag.color;

      // Only show remove button for editable days
      if (isEditableDay) {
        tagElement.innerHTML = `${tag.text} <span class="tag-remove" data-day="${originalIndex}" data-tag-index="${tagIndex}">×</span>`;
      } else {
        tagElement.textContent = tag.text;
        tagElement.style.opacity = "0.7";
      }

      tagsCell.appendChild(tagElement);
    });

    // Tag input - only for editable days
    const addTagInput = document.createElement("input");
    addTagInput.type = "text";
    addTagInput.className = `add-tag-input ${
      isEditableDay ? "editable-control" : "non-editable-control"
    }`;
    addTagInput.placeholder = isEditableDay
      ? "Add tag..."
      : "Only today editable";
    addTagInput.disabled = !isEditableDay;
    addTagInput.setAttribute("aria-disabled", !isEditableDay);

    if (isEditableDay) {
      addTagInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && addTagInput.value.trim() !== "") {
          addNewTag(originalIndex, addTagInput.value.trim());
          addTagInput.value = "";
        }
      });
    } else {
      addTagInput.tabIndex = -1;
    }

    tagsCell.appendChild(addTagInput);
    row.appendChild(tagsCell);

    tableBody.appendChild(row);
  });

  // Update tag removal event listeners
  setupTagRemovalListeners();

  // Always render activity tracker when table is rendered
  renderEnhancedActivityTracker();

  // Update add day button state
  updateAddDayButton();
}

// Also add this CSS for the current day styling
const style = document.createElement("style");
style.textContent = `
  .current-day {
    background-color: rgba(88, 166, 255, 0.1) !important;
    border-left: 3px solid var(--accent-color);
  }
  
  .current-day td {
    border-bottom: 2px solid var(--accent-color);
  }
`;
document.head.appendChild(style);

// NEW: Setup tag removal listeners after table render
function setupTagRemovalListeners() {
  tableBody.addEventListener("click", (e) => {
    if (e.target.classList.contains("tag-remove")) {
      const dayIndex = parseInt(e.target.dataset.day);
      if (!shouldAllowMutation(dayIndex)) return;

      const tagIndex = parseInt(e.target.dataset.tagIndex);
      appData[dayIndex].tags.splice(tagIndex, 1);
      saveData();
      // Re-filter data if search is active
      if (searchFilter) {
        filterTableData();
      }
      renderTable();
    }
  });
}

// Update the deleteQuestion function to ensure modal closes
async function deleteQuestion(dayIndex, questionIndex) {
  if (!shouldAllowMutation(dayIndex)) return;

  const questionText = appData[dayIndex].questions[questionIndex].text;
  const confirmed = await confirmDialog.show(
    "Delete Question",
    `Are you sure you want to delete "${questionText}"? This action cannot be undone.`
  );

  if (confirmed) {
    appData[dayIndex].questions.splice(questionIndex, 1);
    saveData();
    renderTable();
    toastManager.info("Question deleted successfully", "Deleted");
  }
}

// FIXED: Add new day function - adds only the current day
function addNewDay() {
  const currentDay = getCurrentDayNumber();
  const maxDay =
    appData.length > 0 ? Math.max(...appData.map((day) => day.day)) : 0;

  // Only add the current day if it doesn't exist yet
  const currentDayExists = appData.some((day) => day.day === currentDay);

  if (!currentDayExists) {
    const newDay = {
      day: currentDay,
      questions: [],
      tags: [],
      links: "",
      linksArray: [],
    };

    appData.push(newDay);
    saveData();
    renderTable();

    toastManager.success(
      `Day ${currentDay} added successfully`,
      "New Day Added"
    );
  } else {
    // If current day already exists, just focus on it
    const currentDayRow = Array.from(tableBody.querySelectorAll("tr")).find(
      (row) => {
        const dayCell = row.querySelector(".day-cell");
        return dayCell && parseInt(dayCell.textContent) === currentDay;
      }
    );

    if (currentDayRow) {
      currentDayRow.scrollIntoView({ behavior: "smooth" });
      toastManager.info(`Day ${currentDay} already exists`, "Day Found");
    }
  }
}

// Update add day button to show current day info
function updateAddDayButton() {
  const addDayBtn = document.getElementById("addDayBtn");
  if (!addDayBtn) return;

  const currentDay = getCurrentDayNumber();
  const currentDayExists = appData.some((day) => day.day === currentDay);

  if (currentDayExists) {
    addDayBtn.textContent = `📌 Go to Day ${currentDay}`;
    addDayBtn.title = "Scroll to today's day";

    // Remove any existing tooltip
    const tooltipContainer = addDayBtn.parentElement;
    if (
      tooltipContainer &&
      tooltipContainer.classList.contains("tooltip-container")
    ) {
      const parent = tooltipContainer.parentElement;
      parent.insertBefore(addDayBtn, tooltipContainer);
      parent.removeChild(tooltipContainer);
    }
  } else {
    addDayBtn.textContent = `+ Add Day ${currentDay}`;
    addDayBtn.title = "Add today's day";

    // Remove any existing tooltip
    const tooltipContainer = addDayBtn.parentElement;
    if (
      tooltipContainer &&
      tooltipContainer.classList.contains("tooltip-container")
    ) {
      const parent = tooltipContainer.parentElement;
      parent.insertBefore(addDayBtn, tooltipContainer);
      parent.removeChild(tooltipContainer);
    }
  }
}

// // Modify all mutation functions to include guards
// function toggleQuestionCompletion(dayIndex, questionIndex) {
//   if (!shouldAllowMutation(dayIndex)) return;

//   appData[dayIndex].questions[questionIndex].completed =
//     !appData[dayIndex].questions[questionIndex].completed;
//   saveData();
//   updateStatusCell(dayIndex);
// }
// MODIFIED: Enhanced toggleQuestionCompletion function with instant status updates
function toggleQuestionCompletion(dayIndex, questionIndex) {
  if (!shouldAllowMutation(dayIndex)) return;

  // Toggle the completion status
  appData[dayIndex].questions[questionIndex].completed =
    !appData[dayIndex].questions[questionIndex].completed;

  // Save data first
  saveData();

  // Update the status cell INSTANTLY
  updateStatusCellInstantly(dayIndex);

  // Check for celebration after toggling completion
  checkAndCelebrateAchievements(dayIndex);
}

// NEW: Function to instantly update status cell without full table re-render

// Modify the toggleQuestionCompletion function to include celebration check
const originalToggleQuestionCompletion = toggleQuestionCompletion;
toggleQuestionCompletion = function (dayIndex, questionIndex) {
  originalToggleQuestionCompletion(dayIndex, questionIndex);

  // Check for celebration after toggling completion
  checkAndCelebrateAchievements(dayIndex);
};

// Add celebration check when loading data to handle already completed questions - FIXED
function checkExistingAchievements() {
  // Wait for table to be fully rendered
  setTimeout(() => {
    appData.forEach((dayData, dayIndex) => {
      const solvedCount = dayData.questions.filter((q) => q.completed).length;
      if (solvedCount >= 5) {
        changeStatusColorToDarkGreen(dayIndex);
      }
    });
  }, 200);
}

// Call this function after loading data and rendering table
setTimeout(() => {
  checkExistingAchievements();
}, 100);

// Edit question text
function editQuestionText(dayIndex, questionIndex, element) {
  const currentText = appData[dayIndex].questions[questionIndex].text;
  const input = document.createElement("input");
  input.type = "text";
  input.value = currentText;
  input.className = "question-text editing";

  element.parentNode.replaceChild(input, element);
  input.focus();

  const saveEdit = () => {
    const newText = input.value.trim();
    if (newText !== "") {
      appData[dayIndex].questions[questionIndex].text = newText;
      saveData();

      // Re-render the table to update the question display
      renderTable();
    } else {
      // If empty, revert to original text
      input.parentNode.replaceChild(element, input);
    }
  };

  input.addEventListener("blur", saveEdit);
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      saveEdit();
    }
  });
}

// BUGFIX: Ensure new questions have default difficulty
// MODIFY AT addNewQuestion function
function addNewQuestion(dayIndex) {
  if (!shouldAllowMutation(dayIndex)) return;

  appData[dayIndex].questions.push({
    text: "New Question",
    link: "",
    completed: false,
    difficulty: "Medium", // Default difficulty
  });
  saveData();
  renderTable();
}
// Update status cell based on question completion

// MODIFIED: Enhanced getStatusEmoji function with better logic

// Add a new tag to a day
function addNewTag(dayIndex, tagText) {
  if (!shouldAllowMutation(dayIndex)) return;

  // Check for duplicates
  if (appData[dayIndex].tags.some((tag) => tag.text === tagText)) {
    return;
  }

  const colors = [
    "#58A6FF",
    "#3FB950",
    "#D29922",
    "#DB61A2",
    "#8E6CDF",
    "#F85149",
    "#FF8C37",
    "#1F6FEB",
  ];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  appData[dayIndex].tags.push({
    text: tagText,
    color: randomColor,
  });
  saveData();
  renderTable();
}

// Update links for a day
function updateLinks(dayIndex, linksText) {
  appData[dayIndex].links = linksText;
  saveData();
}

// Add a new link tag when Enter is pressed

function addNewLink(dayIndex, linkText) {
  if (!shouldAllowMutation(dayIndex)) return;

  if (!linkText.trim()) return;

  if (!appData[dayIndex].linksArray) {
    appData[dayIndex].linksArray = [];
  }

  if (
    appData[dayIndex].linksArray.some((link) => link.url === linkText.trim())
  ) {
    return;
  }

  appData[dayIndex].linksArray.push({
    url: linkText.trim(),
    text: extractDisplayText(linkText.trim()),
  });
  saveData();
  renderLinksCell(dayIndex);
}

// Remove a link tag
function removeLink(dayIndex, linkIndex) {
  if (!shouldAllowMutation(dayIndex)) return;

  if (appData[dayIndex].linksArray) {
    appData[dayIndex].linksArray.splice(linkIndex, 1);
    saveData();
    renderLinksCell(dayIndex);
  }
}

// Extract display text from URL
function extractDisplayText(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch (e) {
    return url.substring(0, 20) + (url.length > 20 ? "..." : "");
  }
}

// Render links as clickable tags
function renderLinksCell(dayIndex) {
  const rows = tableBody.querySelectorAll("tr");
  if (rows[dayIndex]) {
    const linksCell = rows[dayIndex].querySelector(".links-cell");
    if (linksCell) {
      // Clear existing content
      linksCell.innerHTML = "";

      // Create input for adding new links
      const linkInput = document.createElement("input");
      linkInput.type = "text";
      linkInput.className = "add-link-input";
      linkInput.placeholder = "Enter URL and press Enter to add...";
      linkInput.style.width = "100%";
      linkInput.style.marginBottom = "8px";
      linkInput.style.padding = "6px 8px";
      linkInput.style.background = "var(--bg-color)";
      linkInput.style.border = "1px solid var(--border-color)";
      linkInput.style.borderRadius = "4px";
      linkInput.style.color = "var(--text-color)";

      linkInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && linkInput.value.trim() !== "") {
          addNewLink(dayIndex, linkInput.value.trim());
          linkInput.value = "";
        }
      });

      linksCell.appendChild(linkInput);

      // Create tags container
      const tagsContainer = document.createElement("div");
      tagsContainer.className = "link-tags-container";

      // Display existing links as tags
      if (
        appData[dayIndex].linksArray &&
        appData[dayIndex].linksArray.length > 0
      ) {
        appData[dayIndex].linksArray.forEach((link, index) => {
          const linkTag = document.createElement("div");
          linkTag.className = "link-tag-container";
          linkTag.style.display = "inline-block";
          linkTag.style.marginRight = "6px";
          linkTag.style.marginBottom = "6px";

          const tagElement = document.createElement("a");
          tagElement.href = link.url;
          tagElement.target = "_blank";
          tagElement.rel = "noopener noreferrer";
          tagElement.style.display = "inline-flex";
          tagElement.style.alignItems = "center";
          tagElement.style.backgroundColor = "var(--tag-bg)";
          tagElement.style.color = "white";
          tagElement.style.padding = "4px 8px";
          tagElement.style.borderRadius = "12px";
          tagElement.style.fontSize = "0.8rem";
          tagElement.style.textDecoration = "none";
          tagElement.style.cursor = "pointer";
          tagElement.style.transition = "opacity 0.2s";

          tagElement.textContent = link.text;
          tagElement.title = link.url;

          tagElement.addEventListener("mouseenter", () => {
            tagElement.style.opacity = "0.8";
          });

          tagElement.addEventListener("mouseleave", () => {
            tagElement.style.opacity = "1";
          });

          // Add remove button
          const removeBtn = document.createElement("span");
          removeBtn.innerHTML = " &times;";
          removeBtn.style.cursor = "pointer";
          removeBtn.style.marginLeft = "4px";
          removeBtn.style.fontWeight = "bold";
          removeBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            removeLink(dayIndex, index);
          });

          tagElement.appendChild(removeBtn);
          linkTag.appendChild(tagElement);
          tagsContainer.appendChild(linkTag);
        });
      }

      linksCell.appendChild(tagsContainer);
    }
  }
}

// BUGFIX: Improved openLinkModal function to handle difficulty selector properly
// MODIFY AT openLinkModal function
function openLinkModal(dayIndex, questionIndex) {
  currentEditingQuestion = { dayIndex, questionIndex };
  const question = appData[dayIndex].questions[questionIndex];

  questionTextInput.value = question.text;
  questionLinkInput.value = question.link || "";

  // Initialize difficulty selector and set current value
  const difficultyContainer = setupDifficultySelector();
  const currentDifficulty = question.difficulty || "Medium";
  const difficultyOption = difficultyContainer.querySelector(
    `[data-difficulty="${currentDifficulty}"]`
  );
  if (difficultyOption) {
    const options = difficultyContainer.querySelectorAll(".difficulty-option");
    options.forEach((opt) => opt.classList.remove("selected"));
    difficultyOption.classList.add("selected");
  }

  linkModal.style.display = "flex";
  questionLinkInput.focus();
}

// BUGFIX: Fix multiple difficulty selectors issue in modal
// MODIFY AT setupDifficultySelector function
function setupDifficultySelector() {
  // First, remove any existing difficulty selector to prevent duplicates
  const existingSelector = document.querySelector(".difficulty-selector");
  if (existingSelector) {
    existingSelector.remove();
  }

  const difficultyContainer = document.createElement("div");
  difficultyContainer.className = "difficulty-selector";
  difficultyContainer.innerHTML = `
    <span style="font-size: var(--codeleaf-font-sm); color: var(--codeleaf-text-secondary); margin-right: var(--codeleaf-space-2);">Difficulty:</span>
    <div class="difficulty-option" data-difficulty="Easy">Easy 🌱</div>
    <div class="difficulty-option" data-difficulty="Medium">Medium 🔥</div>
    <div class="difficulty-option" data-difficulty="Hard">Hard 💀</div>
  `;

  // Insert after question text input in modal
  const modalBody = document.querySelector(".modal-body");
  const questionLinkInput = document.getElementById("questionLinkInput");
  modalBody.insertBefore(difficultyContainer, questionLinkInput);

  // Add event listeners for difficulty options
  difficultyContainer.addEventListener("click", (e) => {
    if (e.target.classList.contains("difficulty-option")) {
      const options =
        difficultyContainer.querySelectorAll(".difficulty-option");
      options.forEach((opt) => opt.classList.remove("selected"));
      e.target.classList.add("selected");
    }
  });

  return difficultyContainer;
}

// BUGFIX: Get selected difficulty with proper fallback
function getSelectedDifficulty() {
  const selectedOption = document.querySelector(".difficulty-option.selected");
  return selectedOption ? selectedOption.dataset.difficulty : "Medium";
}

// BUGFIX: Also clean up difficulty selector when closing modal
// MODIFY AT closeLinkModal function
function closeLinkModal() {
  linkModal.style.display = "none";
  currentEditingQuestion = { dayIndex: -1, questionIndex: -1 };

  // Optional: Remove difficulty selector when modal closes to ensure clean state
  const existingSelector = document.querySelector(".difficulty-selector");
  if (existingSelector) {
    existingSelector.remove();
  }
}

// BUGFIX: Save difficulty value when saving question
// MODIFY AT saveQuestionLink function
function saveQuestionLink() {
  const { dayIndex, questionIndex } = currentEditingQuestion;
  if (dayIndex === -1 || questionIndex === -1) return;

  if (!shouldAllowMutation(dayIndex)) {
    closeLinkModal();
    return;
  }

  const newText = questionTextInput.value.trim();
  const newLink = questionLinkInput.value.trim();
  const difficulty = getSelectedDifficulty();

  if (newText !== "") {
    appData[dayIndex].questions[questionIndex].text = newText;
    appData[dayIndex].questions[questionIndex].link = newLink;
    appData[dayIndex].questions[questionIndex].difficulty = difficulty; // Save difficulty
    saveData();
    renderTable();
  }

  closeLinkModal();
}

// Setup event listeners
function setupEventListeners() {
  // Theme toggle
  // themeToggle.addEventListener("click", () => {
  //   document.body.classList.toggle("light-theme");
  //   if (document.body.classList.contains("light-theme")) {
  //     themeToggle.textContent = "Switch to Dark Theme";
  //   } else {
  //     themeToggle.textContent = "Switch to Light Theme";
  //   }
  // });

  // Sync button - updated to use force sync
  syncButton.addEventListener("click", async () => {
    if (authToken) {
      await forceSyncFromServer();
    } else {
      updateSyncStatus("offline", "Login required to sync");
    }
  });

  // NEW: Add Day button
  const addDayBtn = document.getElementById("addDayBtn");
  // Update the add day button event listener
  if (addDayBtn) {
    addDayBtn.addEventListener("click", function () {
      const currentDay = getCurrentDayNumber();
      const currentDayExists = appData.some((day) => day.day === currentDay);

      if (currentDayExists) {
        // Scroll to current day if it exists
        const currentDayRow = Array.from(tableBody.querySelectorAll("tr")).find(
          (row) => {
            const dayCell = row.querySelector(".day-cell");
            return dayCell && parseInt(dayCell.textContent) === currentDay;
          }
        );

        if (currentDayRow) {
          currentDayRow.scrollIntoView({ behavior: "smooth" });
          // Add highlight effect
          currentDayRow.style.backgroundColor = "rgba(88, 166, 255, 0.2)";
          setTimeout(() => {
            currentDayRow.style.backgroundColor = "";
          }, 2000);
        }
      } else {
        // Add new day if it doesn't exist
        addNewDay();
      }
    });
  }

  // Modify the tag removal event listener to include guard
  tableBody.addEventListener("click", (e) => {
    if (e.target.classList.contains("tag-remove")) {
      const dayIndex = parseInt(e.target.dataset.day);
      if (!shouldAllowMutation(dayIndex)) return;

      const tagIndex = parseInt(e.target.dataset.tagIndex);
      appData[dayIndex].tags.splice(tagIndex, 1);
      saveData();
      // Re-filter data if search is active
      if (searchFilter) {
        filterTableData();
      }
      renderTable();
    }
  });

  // Modal event listeners
  closeModal.addEventListener("click", closeLinkModal);
  cancelModal.addEventListener("click", closeLinkModal);
  saveLink.addEventListener("click", saveQuestionLink);

  // Close modal when clicking outside
  linkModal.addEventListener("click", (e) => {
    if (e.target === linkModal) {
      closeLinkModal();
    }
  });

  // Allow saving with Enter key
  questionLinkInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      saveQuestionLink();
    }
  });
}

// Activity Tracker Functionality - FIXED VERSION
function initializeActivityTracker() {
  renderActivityCalendar();

  // Re-render calendar when data changes - FIXED to use the correct reference
  const originalSaveData = saveData;
  window.saveData = function () {
    const result = originalSaveData.apply(this, arguments);
    renderActivityCalendar();
    return result;
  };
}

// Handle the celebration logic
function checkAndCelebrateAchievements(dayIndex) {
  const solvedCount = appData[dayIndex].questions.filter(
    (q) => q.completed
  ).length;

  if (solvedCount == 5 || solvedCount == 10) {
    // Change status color to darker green
    changeStatusColorToDarkGreen(dayIndex);

    // Show congratulatory popup
    showCelebrationPopup(solvedCount);

    // Trigger party popper animation
    triggerPartyPopperAnimation();
  }
}

// Function to change status color to darker green - FIXED VERSION
function changeStatusColorToDarkGreen(dayIndex) {
  // Wait for table to be rendered
  setTimeout(() => {
    const rows = tableBody.querySelectorAll("tr");
    if (rows[dayIndex]) {
      const statusCell = rows[dayIndex].querySelector(".status-cell");
      if (statusCell) {
        statusCell.style.color = "#216e39"; // Darker green color
        statusCell.style.fontWeight = "bold";
        statusCell.style.textShadow = "0 0 10px rgba(33, 110, 57, 0.5)";
      }
    }
  }, 100);
}

// Function to show celebration popup
function showCelebrationPopup(solvedCount) {
  // Create popup element
  const popup = document.createElement("div");
  popup.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #216e39, #3fb950);
        color: white;
        padding: 30px;
        border-radius: 15px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 10000;
        text-align: center;
        max-width: 400px;
        animation: popupBounce 0.5s ease-out;
    `;

  popup.innerHTML = `
        <div style="font-size: 3rem; margin-bottom: 15px;">🎉</div>
        <h3 style="margin: 0 0 10px 0; font-size: 1.5rem;">Amazing Work!</h3>
        <p style="margin: 0; font-size: 1.1rem;">You've solved ${solvedCount} problems today! Keep up the great progress! 🚀</p>
        <button onclick="this.parentElement.remove()" style="
            margin-top: 20px;
            padding: 10px 20px;
            background: rgba(255,255,255,0.2);
            border: 2px solid white;
            color: white;
            border-radius: 25px;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.3s;
        ">Continue Coding</button>
    `;

  //  CSS animation
  const style = document.createElement("style");
  style.textContent = `
        @keyframes popupBounce {
            0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
            70% { transform: translate(-50%, -50%) scale(1.1); }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
    `;
  document.head.appendChild(style);

  document.body.appendChild(popup);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (popup.parentElement) {
      popup.remove();
    }
  }, 5000);
}

// Function to trigger party popper animation
function triggerPartyPopperAnimation() {
  // Create confetti elements
  for (let i = 0; i < 100; i++) {
    createConfetti();
  }

  // celebration sound (optional - silent unless user interacts first)
  playCelebrationSound();
}

// Function to create individual confetti pieces
function createConfetti() {
  const confetti = document.createElement("div");
  const colors = [
    "#216e39",
    "#3fb950",
    "#58a6ff",
    "#db61a2",
    "#f0883e",
    "#f0d33c",
  ];
  const color = colors[Math.floor(Math.random() * colors.length)];

  confetti.style.cssText = `
        position: fixed;
        width: 10px;
        height: 10px;
        background: ${color};
        top: -10px;
        left: ${Math.random() * 100}vw;
        border-radius: ${Math.random() > 0.5 ? "50%" : "0"};
        pointer-events: none;
        z-index: 9999;
        animation: confettiFall ${2 + Math.random() * 3}s linear forwards;
    `;

  // CSS animation for confetti
  const style = document.createElement("style");
  if (!document.querySelector("#confetti-animation")) {
    style.id = "confetti-animation";
    style.textContent = `
            @keyframes confettiFall {
                0% {
                    transform: translateY(0) rotate(0deg);
                    opacity: 1;
                }
                100% {
                    transform: translateY(100vh) rotate(${
                      360 + Math.random() * 360
                    }deg);
                    opacity: 0;
                }
            }
        `;
    document.head.appendChild(style);
  }

  document.body.appendChild(confetti);

  // Remove confetti after animation
  setTimeout(() => {
    if (confetti.parentElement) {
      confetti.remove();
    }
  }, 5000);
}

// Function to play celebration sound (user interaction required)
function playCelebrationSound() {
  // Only play sound if user has interacted with the page
  try {
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();

    // Create a simple celebration sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      1760,
      audioContext.currentTime + 0.1
    );

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.3
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    // Silent fail if audio context is not supported or user hasn't interacted
    // console.log("Audio not available or user interaction required");
  }
}

function renderActivityCalendar() {
  const calendarContainer = document.getElementById("activityCalendar");
  if (!calendarContainer) return;

  const startDate = new Date("2025-09-25");
  const today = new Date();
  const daysDiff = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;
  const totalDays = Math.max(daysDiff, 1); // At least 1 day

  // Calculate questions solved per day
  const questionsPerDay = calculateQuestionsPerDay();

  calendarContainer.innerHTML = "";

  for (let day = 1; day <= totalDays; day++) {
    const dayElement = document.createElement("div");
    dayElement.className = "activity-day";

    const questionsSolved = questionsPerDay[day] || 0;
    let activityClass = "blank";

    if (questionsSolved === 1) {
      activityClass = "green";
    } else if (questionsSolved >= 2) {
      activityClass = "dark-green";
    }

    dayElement.classList.add(activityClass);

    //  tooltip
    const tooltip = document.createElement("div");
    tooltip.className = "activity-tooltip";
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + day - 1);
    tooltip.textContent = `Day ${day} (${formatDate(
      currentDate
    )}): ${questionsSolved} question${questionsSolved !== 1 ? "s" : ""} solved`;
    dayElement.appendChild(tooltip);

    calendarContainer.appendChild(dayElement);
  }
}

function calculateQuestionsPerDay() {
  const questionsPerDay = {};

  appData.forEach((dayData) => {
    const dayNumber = dayData.day;
    const solvedCount = dayData.questions.filter((q) => q.completed).length;

    if (solvedCount > 0) {
      questionsPerDay[dayNumber] = solvedCount;
    }
  });

  return questionsPerDay;
}

function formatDate(date) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Set up direct event listeners as backup
function setupDirectEventListeners() {
  // console.log("🎯 Setting up direct event listeners...");

  // Listen for clicks on checkboxes
  document.addEventListener("change", function (e) {
    if (e.target.classList.contains("question-checkbox")) {
      // console.log("🎯 Checkbox change detected");
      setTimeout(() => {
        saveActivityTrackerData();
      }, 1000);
    }
  });

  // Listen for clicks on add question buttons
  document.addEventListener("click", function (e) {
    if (e.target.classList.contains("add-question-btn")) {
      // console.log("🎯 Add question button click detected");
      setTimeout(() => {
        saveActivityTrackerData();
      }, 1000);
    }
  });

  // Listen for Enter key in tag and link inputs
  document.addEventListener("keypress", function (e) {
    if (
      e.key === "Enter" &&
      (e.target.classList.contains("add-tag-input") ||
        e.target.classList.contains("add-link-input"))
    ) {
      // console.log("🎯 Tag/link input Enter key detected");
      setTimeout(() => {
        saveActivityTrackerData();
      }, 1000);
    }
  });

  // console.log("✅ Direct event listeners set up");
}

// ===== ENHANCED REAL-TIME NOTIFICATION SYSTEM =====

class NotificationManager {
  constructor() {
    this.isOpen = false;
    this.notifications = [];
    this.unreadCount = 0;
    this.pollingInterval = null;
    this.socket = null;
    this.isConnected = false;

    this.initializeElements();
    this.setupEventListeners();
    this.initializeSocketConnection();
    this.startPolling();
  }

  initializeElements() {
    this.bell = document.getElementById("notificationBell");
    this.badge = document.getElementById("notificationBadge");
    this.panel = document.getElementById("notificationPanel");
    this.list = document.getElementById("notificationList");
    this.markAllReadBtn = document.getElementById("markAllRead");
    this.closeBtn = document.getElementById("closeNotifications");
    this.viewAllBtn = document.getElementById("viewAllNotifications");
  }

  setupEventListeners() {
    // Toggle notification panel
    this.bell.addEventListener("click", (e) => {
      e.stopPropagation();
      this.togglePanel();
    });

    // Mark all as read
    this.markAllReadBtn.addEventListener("click", () => {
      this.markAllAsRead();
    });

    // Close panel
    this.closeBtn.addEventListener("click", () => {
      this.closePanel();
    });

    // View all notifications
    this.viewAllBtn.addEventListener("click", () => {
      this.viewAllNotifications();
    });

    // Close panel when clicking outside
    document.addEventListener("click", (e) => {
      if (!this.panel.contains(e.target) && e.target !== this.bell) {
        this.closePanel();
      }
    });

    // Close on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen) {
        this.closePanel();
      }
    });
  }

  initializeSocketConnection() {
    if (!authToken) {
      console.log("No auth token, skipping socket connection");
      return;
    }

    try {
      // Connect to Socket.io
      this.socket = io({
        auth: {
          token: authToken,
        },
      });

      // Socket event handlers
      this.socket.on("connect", () => {
        console.log("🔌 Connected to real-time notifications");
        this.isConnected = true;
        this.updateConnectionStatus(true);
      });

      this.socket.on("disconnect", () => {
        console.log("🔌 Disconnected from real-time notifications");
        this.isConnected = false;
        this.updateConnectionStatus(false);
      });

      this.socket.on("new-notification", (notification) => {
        console.log("📢 Received real-time notification:", notification);
        this.handleRealTimeNotification(notification);
      });

      this.socket.on("notification-count-updated", (data) => {
        if (data.increment) {
          this.unreadCount++;
          this.updateBadge();
          this.showNewNotificationAlert();
        }
      });

      this.socket.on("user-status-changed", (data) => {
        // Handle user online/offline status changes if needed
        console.log("User status changed:", data);
      });
    } catch (error) {
      console.error("Error initializing socket connection:", error);
    }
  }

  updateConnectionStatus(connected) {
    // Add visual indicator for connection status
    if (connected) {
      this.bell.title = "Notifications (Real-time)";
      this.bell.style.color = "var(--codeleaf-accent-primary)";
    } else {
      this.bell.title = "Notifications (Offline)";
      this.bell.style.color = "var(--codeleaf-text-tertiary)";
    }
  }

  handleRealTimeNotification(notification) {
    // Add new notification to the beginning of the list
    this.notifications.unshift(notification);

    // Increment unread count
    this.unreadCount++;

    // Update UI
    this.updateBadge();

    // Show visual alert
    this.showRealTimeNotificationAlert(notification);

    // If panel is open, update the list
    if (this.isOpen) {
      this.renderNotifications();
    }

    // Auto-close notification after 5 seconds
    setTimeout(() => {
      this.hideRealTimeNotificationAlert();
    }, 5000);
  }

  showRealTimeNotificationAlert(notification) {
    // Create floating notification alert
    const alert = document.createElement("div");
    alert.className = "real-time-notification-alert";
    alert.innerHTML = `
      <div class="notification-alert-content">
        <div class="notification-alert-header">
          <span class="notification-alert-type">${this.getTypeLabel(
            notification.type
          )}</span>
          <button class="notification-alert-close">&times;</button>
        </div>
        <div class="notification-alert-message">${notification.message}</div>
        <div class="notification-alert-time">Just now</div>
      </div>
    `;

    // Add styles
    alert.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 350px;
      background: var(--codeleaf-bg-primary);
      border: 1px solid var(--codeleaf-border-light);
      border-left: 4px solid var(--codeleaf-accent-primary);
      border-radius: var(--codeleaf-radius-lg);
      box-shadow: var(--codeleaf-shadow-lg);
      z-index: 10000;
      animation: slideInRight 0.3s ease, slideOutRight 0.3s ease 4.7s forwards;
      cursor: pointer;
    `;

    // Add close button handler
    alert
      .querySelector(".notification-alert-close")
      .addEventListener("click", (e) => {
        e.stopPropagation();
        alert.remove();
      });

    // Add click handler to navigate to blog
    alert.addEventListener("click", () => {
      if (notification.blogSlug) {
        window.location.href = `/blogs/${notification.blogSlug}`;
      }
      alert.remove();
    });

    document.body.appendChild(alert);

    // Add CSS animations if not already added
    this.addNotificationAlertStyles();
  }

  addNotificationAlertStyles() {
    if (!document.getElementById("notification-alert-styles")) {
      const styles = document.createElement("style");
      styles.id = "notification-alert-styles";
      styles.textContent = `
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideOutRight {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(100%);
          }
        }
        
        .real-time-notification-alert {
          transition: all 0.3s ease;
        }
        
        .real-time-notification-alert:hover {
          transform: translateY(-2px);
          box-shadow: var(--codeleaf-shadow-lg);
        }
        
        .notification-alert-content {
          padding: var(--codeleaf-space-4);
        }
        
        .notification-alert-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--codeleaf-space-2);
        }
        
        .notification-alert-type {
          font-size: var(--codeleaf-font-xs);
          color: var(--codeleaf-accent-primary);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .notification-alert-close {
          background: none;
          border: none;
          color: var(--codeleaf-text-tertiary);
          cursor: pointer;
          font-size: 1.2rem;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }
        
        .notification-alert-close:hover {
          background: var(--codeleaf-bg-tertiary);
          color: var(--codeleaf-text-primary);
        }
        
        .notification-alert-message {
          font-size: var(--codeleaf-font-sm);
          color: var(--codeleaf-text-primary);
          line-height: 1.4;
          margin-bottom: var(--codeleaf-space-2);
        }
        
        .notification-alert-time {
          font-size: var(--codeleaf-font-xs);
          color: var(--codeleaf-text-tertiary);
        }
      `;
      document.head.appendChild(styles);
    }
  }

  hideRealTimeNotificationAlert() {
    const alerts = document.querySelectorAll(".real-time-notification-alert");
    alerts.forEach((alert) => {
      alert.style.animation = "slideOutRight 0.3s ease forwards";
      setTimeout(() => alert.remove(), 300);
    });
  }

  async togglePanel() {
    if (this.isOpen) {
      this.closePanel();
    } else {
      await this.openPanel();
    }
  }

  async openPanel() {
    this.isOpen = true;
    this.panel.classList.add("open");
    await this.loadNotifications();
  }

  closePanel() {
    this.isOpen = false;
    this.panel.classList.remove("open");
  }

  async loadNotifications() {
    if (!authToken) return;

    try {
      const response = await fetch(`${API_BASE_URL}/notifications`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          this.notifications = result.notifications;
          this.unreadCount = result.unreadCount;
          this.renderNotifications();
          this.updateBadge();
        }
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  }

  renderNotifications() {
    if (this.notifications.length === 0) {
      this.list.innerHTML = `
        <div class="notification-empty">
          <div class="notification-empty-icon">🔔</div>
          <p>No notifications yet</p>
          <p style="font-size: var(--codeleaf-font-sm); margin-top: var(--codeleaf-space-2);">
            Follow users to see their activity here
          </p>
          ${
            this.isConnected
              ? '<div style="margin-top: var(--codeleaf-space-2); padding: var(--codeleaf-space-2); background: var(--codeleaf-bg-tertiary); border-radius: var(--codeleaf-radius-md); font-size: var(--codeleaf-font-xs); color: var(--codeleaf-accent-primary);">🔗 Real-time notifications enabled</div>'
              : '<div style="margin-top: var(--codeleaf-space-2); padding: var(--codeleaf-space-2); background: var(--codeleaf-bg-tertiary); border-radius: var(--codeleaf-radius-md); font-size: var(--codeleaf-font-xs); color: var(--codeleaf-text-tertiary);">⚠️ Real-time notifications offline</div>'
          }
        </div>
      `;
      return;
    }

    this.list.innerHTML = this.notifications
      .map(
        (notification) => `
      <div class="notification-item ${notification.isRead ? "" : "unread"} ${
          notification.realTime ? "new" : ""
        }" 
           data-id="${notification._id}" 
           data-type="${notification.type}">
        <div class="notification-content">
          <div class="notification-type">${this.getTypeLabel(
            notification.type
          )}</div>
          <p class="notification-message">${notification.message}</p>
          <div class="notification-meta">
            <span class="notification-author">@${notification.author}</span>
            <span class="notification-time">${this.formatTime(
              notification.timestamp
            )}</span>
          </div>
          ${
            notification.realTime
              ? '<div class="notification-live-indicator">🟢 Live</div>'
              : ""
          }
        </div>
      </div>
    `
      )
      .join("");

    // Add click handlers
    this.list.querySelectorAll(".notification-item").forEach((item) => {
      item.addEventListener("click", () => {
        this.handleNotificationClick(item);
      });
    });
  }

  getTypeLabel(type) {
    const labels = {
      new_blog: "New Blog",
      user_activity: "Activity",
    };
    return labels[type] || "Notification";
  }

  formatTime(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return time.toLocaleDateString();
  }

  async handleNotificationClick(notificationElement) {
    const notificationId = notificationElement.dataset.id;
    const notificationType = notificationElement.dataset.type;

    // Mark as read
    await this.markAsRead(notificationId);

    // Handle navigation based on type
    if (notificationType === "new_blog") {
      const notification = this.notifications.find(
        (n) => n._id === notificationId
      );
      if (notification && notification.blogSlug) {
        window.location.href = `/blogs/${notification.blogSlug}`;
      }
    }

    // Remove unread styling
    notificationElement.classList.remove("unread");
    notificationElement.classList.remove("new");
    this.updateBadge();
  }

  async markAsRead(notificationId) {
    if (!authToken) return;

    try {
      await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }

  async markAllAsRead() {
    if (!authToken || this.unreadCount === 0) return;

    try {
      const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        // Update local state
        this.notifications.forEach((notification) => {
          notification.isRead = true;
        });
        this.unreadCount = 0;

        // Update UI
        this.renderNotifications();
        this.updateBadge();

        toastManager.success(
          "All notifications marked as read",
          "Notifications"
        );
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  }

  viewAllNotifications() {
    // For now, just close the panel
    // In future, you could navigate to a dedicated notifications page
    this.closePanel();
    toastManager.info("Notifications page coming soon!", "Feature Preview");
  }

  updateBadge() {
    if (this.unreadCount > 0) {
      this.badge.textContent = this.unreadCount > 99 ? "99+" : this.unreadCount;
      this.badge.style.display = "flex";
      this.bell.classList.add("has-unread");

      // Add pulse animation for new notifications
      if (this.unreadCount === 1) {
        this.bell.style.animation = "bell-pulse 2s infinite";
      }
    } else {
      this.badge.style.display = "none";
      this.bell.classList.remove("has-unread");
      this.bell.style.animation = "none";
    }
  }

  showNewNotificationAlert() {
    // Subtle animation to indicate new notifications
    this.bell.style.animation = "none";
    setTimeout(() => {
      this.bell.style.animation = "bell-pulse 1s ease 2";
    }, 10);
  }

  startPolling() {
    // Poll for new notifications every 2 minutes as fallback
    this.pollingInterval = setInterval(() => {
      if (authToken && !this.isOpen && !this.isConnected) {
        this.checkForNewNotifications();
      }
    }, 120000); // 2 minutes
  }

  async checkForNewNotifications() {
    if (!authToken) return;

    try {
      const response = await fetch(`${API_BASE_URL}/notifications/count`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const previousCount = this.unreadCount;
          this.unreadCount = result.unreadCount;

          // Show subtle notification for new items
          if (this.unreadCount > previousCount && previousCount > 0) {
            this.showNewNotificationAlert();
          }

          this.updateBadge();
        }
      }
    } catch (error) {
      console.error("Error checking notifications:", error);
    }
  }

  // Update following list for real-time notifications
  // Add this method to your existing NotificationManager class in main.js
  updateFollowingList(followingList) {
    this.followingList = followingList || [];

    // Update socket subscriptions if connected
    if (this.socket && this.isConnected) {
      this.socket.emit("update-following", this.followingList);
      console.log(
        `🔔 Updated real-time subscriptions for ${this.followingList.length} followed users`
      );
    }

    // Show visual feedback
    this.showSubscriptionUpdateFeedback(this.followingList.length);
  }

  // Add this helper method for visual feedback
  showSubscriptionUpdateFeedback(followingCount) {
    const feedback = document.createElement("div");
    feedback.className = "subscription-update-feedback";
    feedback.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: var(--codeleaf-accent-primary);
      color: white;
      padding: 12px 16px;
      border-radius: var(--codeleaf-radius-md);
      box-shadow: var(--codeleaf-shadow-lg);
      z-index: 10001;
      font-size: var(--codeleaf-font-sm);
      animation: slideInUp 0.3s ease;
    ">
      🔔 Now receiving real-time updates from ${followingCount} users
    </div>
  `;

    document.body.appendChild(feedback);

    // Remove after 3 seconds
    setTimeout(() => {
      if (feedback.parentNode) {
        feedback.parentNode.removeChild(feedback);
      }
    }, 3000);

    // Add CSS animation if not exists
    this.addSubscriptionUpdateStyles();
  }

  addSubscriptionUpdateStyles() {
    if (!document.getElementById("subscription-update-styles")) {
      const styles = document.createElement("style");
      styles.id = "subscription-update-styles";
      styles.textContent = `
      @keyframes slideInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
      document.head.appendChild(styles);
    }
  }

  destroy() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

// Initialize notification manager when DOM is loaded
let notificationManager;

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

// Initialize activity tracker and app when DOM is loaded - FIXED VERSION
document.addEventListener("DOMContentLoaded", function () {
  // Initialize the main app
  initApp();

  // Initialize enhanced activity tracker after main app is loaded
  setTimeout(() => {
    if (typeof initializeEnhancedActivityTracker === "function") {
      initializeEnhancedActivityTracker();
      // console.log("Enhanced activity tracker initialized");
    }

    // Check achievements after everything is loaded
    checkExistingAchievements();
  }, 1000); // Increased delay to ensure app data is loaded
  // Ensure activity tracker renders after a short delay to catch any initial render
  setTimeout(() => {
    if (typeof renderActivityCalendar === "function") {
      renderActivityCalendar();
    }
  }, 500);

  // Initialize notification manager after a short delay to ensure auth is checked
  setTimeout(() => {
    if (authToken && !window.notificationManager) {
      window.notificationManager = new NotificationManager();

      // Load initial following list and set up subscriptions
      setTimeout(() => {
        initializeNotificationSubscriptions();
      }, 2000);
    }
  }, 1000);
});

// NEW: Initialize notification subscriptions with current following list
async function initializeNotificationSubscriptions() {
  try {
    const token = localStorage.getItem("authToken");
    if (!token || !window.notificationManager) return;

    const response = await fetch(`${API_BASE_URL}/user-info`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success && result.user) {
        const followingList = result.user.social?.following || [];
        window.notificationManager.updateFollowingList(followingList);

        console.log(
          `🎯 Initialized real-time notifications for ${followingList.length} followed users`
        );
      }
    }
  } catch (error) {
    console.error("Error initializing notification subscriptions:", error);
  }
}
