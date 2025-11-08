/**
 * FocusFlow — Home Page Interactions
 * Cinematic, realistic DSA tracking with Japanese calm aesthetic
 */

// State Management
let state = {
  isLoggedIn: false,
  questions: [],
  currentDay: 1,
  leavesAnimation: true,
  lampLight: true,
  editingQuestionId: null,
  deletingQuestionId: null,
  leavesInterval: null,
};

// DOM Elements
let elements = {};

// Initialize the application
async function init() {
  try {
    console.log("Initializing application...");
    initializeElements();
    setupEventListeners();
    updateDateDisplay();
    setupAnimations();
    setupSandTimer();

    // Check auth status first
    await checkAuthStatus();

    // If logged in, load questions immediately
    if (state.isLoggedIn) {
      console.log("User is authenticated, loading questions...");
      await loadQuestions();
    } else {
      console.log("User not authenticated, showing public landing");
      showPublicLanding();
    }

    console.log("Application initialized successfully");
  } catch (error) {
    console.error("Initialization failed:", error);
  }
}

// Initialize DOM elements after page load
function initializeElements() {
  console.log("Initializing DOM elements...");

  elements = {
    // Toggles
    toggleLeaves: document.getElementById("toggle-leaves"),
    toggleLamp: document.getElementById("toggle-lamp"),

    // User Controls
    profileBtn: document.getElementById("profile-btn"),
    profileDropdown: document.getElementById("profile-dropdown"),
    notificationsBtn: document.getElementById("notifications-btn"),
    notificationsDropdown: document.getElementById("notifications-dropdown"),
    loginLink: document.getElementById("login-link"),
    logoutBtn: document.getElementById("logout-btn"),

    // Content
    currentDate: document.getElementById("current-date"),
    currentDay: document.getElementById("current-day"),
    questionList: document.getElementById("question-list"),
    addQuestion: document.getElementById("add-question"),

    // Sand Timer
    sandTimer: document.getElementById("sand-timer"),
    sandTop: document.getElementById("sand-top-fill"), // Updated ID
    sandBottom: document.getElementById("sand-bottom-fill"), // Updated ID
    progressCount: document.getElementById("progress-count"),
    totalCount: document.getElementById("total-count"),

    // Modals
    addModal: document.getElementById("add-modal"),
    deleteModal: document.getElementById("delete-modal"),
    closeModal: document.getElementById("close-modal"),
    closeDeleteModal: document.getElementById("close-delete-modal"),
    cancelAdd: document.getElementById("cancel-add"),
    cancelDelete: document.getElementById("cancel-delete"),
    saveQuestion: document.getElementById("save-question"),
    confirmDelete: document.getElementById("confirm-delete"),

    // Forms
    addQuestionForm: document.getElementById("add-question-form"),
    questionText: document.getElementById("question-text"),
    questionLink: document.getElementById("question-link"),

    // Public Landing
    publicLanding: document.getElementById("public-landing"),

    // Toast
    toast: document.getElementById("toast"),
  };

  // Log which elements were found
  Object.keys(elements).forEach((key) => {
    if (elements[key]) {
      console.log(`✓ Found element: ${key}`);
    } else {
      console.warn(`✗ Missing element: ${key}`);
    }
  });

  console.log("DOM elements initialization completed");
}

// Event Listeners Setup
function setupEventListeners() {
  console.log("Setting up event listeners...");

  // Toggle buttons
  if (elements.toggleLeaves) {
    elements.toggleLeaves.addEventListener("click", toggleLeavesAnimation);
    console.log("Leaves toggle listener added");
  }

  if (elements.toggleLamp) {
    elements.toggleLamp.addEventListener("click", toggleLampLight);
    console.log("Lamp toggle listener added");
  }

  // User controls
  if (elements.profileBtn) {
    elements.profileBtn.addEventListener("click", toggleProfileDropdown);
    console.log("Profile button listener added");
  }

  if (elements.notificationsBtn) {
    elements.notificationsBtn.addEventListener(
      "click",
      toggleNotificationsDropdown
    );
    console.log("Notifications button listener added");
  }

  if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener("click", handleLogout);
    console.log("Logout button listener added");
  }

  // Question actions - CRITICAL: Make sure these are set
  if (elements.addQuestion) {
    elements.addQuestion.addEventListener("click", showAddModal);
    console.log("Add question button listener added");
  } else {
    console.error("Add question button element not found!");
  }

  if (elements.closeModal) {
    elements.closeModal.addEventListener("click", hideAddModal);
  }

  if (elements.cancelAdd) {
    elements.cancelAdd.addEventListener("click", hideAddModal);
  }

  if (elements.saveQuestion) {
    elements.saveQuestion.addEventListener("click", handleAddQuestion);
    console.log("Save question button listener added");
  }

  if (elements.closeDeleteModal) {
    elements.closeDeleteModal.addEventListener("click", hideDeleteModal);
  }

  if (elements.cancelDelete) {
    elements.cancelDelete.addEventListener("click", hideDeleteModal);
  }

  if (elements.confirmDelete) {
    elements.confirmDelete.addEventListener("click", handleDeleteQuestion);
  }

  // Form submission
  if (elements.addQuestionForm) {
    elements.addQuestionForm.addEventListener("submit", function (e) {
      e.preventDefault();
      handleAddQuestion();
    });
    console.log("Add question form listener added");
  }

  // Difficulty selector - use event delegation
  document.addEventListener("click", function (e) {
    if (
      e.target.classList.contains("difficulty-btn") &&
      !e.target.closest(".edit-difficulty")
    ) {
      document
        .querySelectorAll(".difficulty-btn")
        .forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");
    }
  });

  // Close dropdowns when clicking outside
  document.addEventListener("click", (e) => {
    if (elements.profileDropdown && !e.target.closest(".profile-wrapper")) {
      elements.profileDropdown.classList.remove("show");
    }
    if (
      elements.notificationsDropdown &&
      !e.target.closest(".notification-wrapper")
    ) {
      elements.notificationsDropdown.classList.remove("show");
    }
  });

  // Escape key to close modals
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideAddModal();
      hideDeleteModal();
    }
  });

  console.log("All event listeners setup completed");
}

// Authentication
async function checkAuthStatus() {
  try {
    const response = await Helper.fx("/api/auth/verify-token");
    state.isLoggedIn = response.ok;

    if (state.isLoggedIn) {
      if (elements.publicLanding) elements.publicLanding.style.display = "none";
      if (elements.logoutBtn) elements.logoutBtn.style.display = "flex";
      if (elements.loginLink) elements.loginLink.style.display = "none";
      console.log("User authenticated successfully");
      return true;
    } else {
      showPublicLanding();
      console.log("User not authenticated");
      return false;
    }
  } catch (error) {
    console.error("Auth check failed:", error);
    showPublicLanding();
    return false;
  }
}

function showPublicLanding() {
  if (elements.publicLanding) elements.publicLanding.style.display = "flex";
  if (elements.logoutBtn) elements.logoutBtn.style.display = "none";
  if (elements.loginLink) elements.loginLink.style.display = "flex";
}

async function handleLogout() {
  try {
    const response = await Helper.fx("/api/auth/logout", {
      method: "POST",
    });

    if (response.ok) {
      showToast("Signed out");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  } catch (error) {
    console.error("Logout failed:", error);
    showToast("Error during logout");
  }
}

// Date Display
function updateDateDisplay() {
  const now = new Date();
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  if (elements.currentDate) elements.currentDate.textContent = "Today";
  if (elements.currentDay)
    elements.currentDay.textContent = now.toLocaleDateString("en-US", options);
}

// Animation Controls
// Enhanced animation setup
function setupAnimations() {
  // Start with animations enabled by default
  state.leavesAnimation = true;
  state.lampLight = true;

  // Start animations immediately
  startLeavesAnimation();
  enableLampLight();

  // Update UI state
  updateAnimationUI();
}

function updateAnimationUI() {
  if (elements.toggleLeaves) {
    elements.toggleLeaves.setAttribute("aria-pressed", "true");
    const toggleText = elements.toggleLeaves.querySelector(".toggle-text");
    if (toggleText) toggleText.textContent = "Leaves: On";
  }

  if (elements.toggleLamp) {
    elements.toggleLamp.setAttribute("aria-pressed", "true");
    const toggleText = elements.toggleLamp.querySelector(".toggle-text");
    if (toggleText) toggleText.textContent = "Lamp: Light";
  }
}

function toggleLeavesAnimation() {
  state.leavesAnimation = !state.leavesAnimation;
  if (elements.toggleLeaves) {
    elements.toggleLeaves.setAttribute("aria-pressed", state.leavesAnimation);

    const toggleText = elements.toggleLeaves.querySelector(".toggle-text");
    if (toggleText) {
      toggleText.textContent = `Leaves: ${
        state.leavesAnimation ? "On" : "Off"
      }`;
    }
  }

  if (state.leavesAnimation) {
    startLeavesAnimation();
  } else {
    stopLeavesAnimation();
  }
}

function toggleLampLight() {
  state.lampLight = !state.lampLight;
  if (elements.toggleLamp) {
    elements.toggleLamp.setAttribute("aria-pressed", state.lampLight);

    const toggleText = elements.toggleLamp.querySelector(".toggle-text");
    if (toggleText) {
      toggleText.textContent = `Lamp: ${state.lampLight ? "Light" : "Dim"}`;
    }
  }

  if (state.lampLight) {
    enableLampLight();
  } else {
    disableLampLight();
  }
}

// Enhanced leaves animation with better mobile support
function startLeavesAnimation() {
  const petalsContainer = document.getElementById("petals");
  if (!petalsContainer) return;

  petalsContainer.innerHTML = "";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  // Create initial petals
  for (let i = 0; i < 25; i++) {
    createPetal(true);
  }

  // Continuous petal creation
  state.leavesInterval = setInterval(() => {
    const currentPetals = document.querySelectorAll(".petal").length;
    if (currentPetals < 35) {
      createPetal();
    }
  }, 1200);
}

function createPetal(initial = false) {
  const petalsContainer = document.getElementById("petals");
  if (!petalsContainer) return;

  const petal = document.createElement("div");
  petal.className = "petal";

  // More natural random values with mobile consideration
  const isMobile = window.innerWidth < 768;
  const left = isMobile
    ? 10 + Math.random() * 80 // More centered on mobile
    : 5 + Math.random() * 90; // Wider distribution on desktop

  const delay = initial ? Math.random() * 8 : 0;
  const duration = isMobile
    ? 10 + Math.random() * 6 // Slower on mobile
    : 8 + Math.random() * 8; // Variable on desktop

  const size = 0.6 + Math.random() * 0.8;
  const horizontalDrift = (Math.random() - 0.5) * (isMobile ? 40 : 60);

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

function stopLeavesAnimation() {
  if (state.leavesInterval) {
    clearInterval(state.leavesInterval);
    state.leavesInterval = null;
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

function enableLampLight() {
  const lampGlow = document.getElementById("lamp-glow");
  if (lampGlow) {
    document.body.classList.remove("dim-mode");
    document.body.classList.add("light-mode");
    lampGlow.style.opacity = "0.8";
  }
}

function disableLampLight() {
  const lampGlow = document.getElementById("lamp-glow");
  if (lampGlow) {
    document.body.classList.remove("light-mode");
    document.body.classList.add("dim-mode");
    lampGlow.style.opacity = "0.15";
  }
}

// Question Management
async function loadQuestions() {
  if (!state.isLoggedIn) {
    console.log("User not logged in, skipping question load");
    return;
  }

  try {
    console.log("Loading questions from API...");
    const response = await Helper.fx("/api/data");

    if (response.ok) {
      console.log("API response received:", response);

      // Handle the API response structure
      const apiData = response.data;

      if (apiData && apiData.success !== false) {
        const daysData = apiData.data || apiData;

        if (Array.isArray(daysData) && daysData.length > 0) {
          // Use the first day's questions
          const firstDay = daysData[0];
          console.log("First day data:", firstDay);

          if (firstDay.questions && Array.isArray(firstDay.questions)) {
            // Transform questions to handle MongoDB ObjectId
            state.questions = firstDay.questions.map((question) => {
              const questionId = question._id?.$oid || question._id;
              return {
                _id: questionId,
                text: question.text || "",
                link: question.link || "",
                completed: question.completed || false,
                difficulty: question.difficulty || "Medium",
              };
            });

            state.currentDay = firstDay.day || 1;
            console.log(`Loaded ${state.questions.length} questions`);
          } else {
            console.log("No questions array found in day data");
            state.questions = [];
          }
        } else {
          console.log("No days data found in response");
          state.questions = [];
        }
      } else {
        console.log("API response indicates failure");
        state.questions = [];
      }
    } else {
      console.log("API request failed");
      state.questions = [];
    }

    // Always update UI
    renderQuestions();
    updateSandTimer();
  } catch (error) {
    console.error("Failed to load questions:", error);
    state.questions = [];
    renderQuestions();
    updateSandTimer();
  }
}

function renderQuestions() {
  if (!elements.questionList) {
    console.error("Question list element not found");
    return;
  }

  // Ensure state.questions is always an array
  if (!state.questions || !Array.isArray(state.questions)) {
    console.warn("state.questions is not an array, resetting to empty array");
    state.questions = [];
  }

  console.log("Rendering questions, count:", state.questions.length);

  if (state.questions.length === 0) {
    elements.questionList.innerHTML = `
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
    return;
  }

  // Render the questions list
  const questionsHTML = state.questions
    .map((question) => {
      // Ensure all required properties exist
      const questionId = question._id || generateTempId();
      const questionText = question.text || "Untitled Question";
      const questionLink = question.link || "";
      const questionDifficulty = question.difficulty || "Medium";
      const isCompleted = question.completed || false;

      if (!questionId) {
        console.error("Question missing ID:", question);
      }

      const isEditing = state.editingQuestionId === questionId;

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
                    ? /* EDIT MODE - Show all editable fields */
                      `
                    <div class="question-edit-form">
                        <div class="form-group">
                            <input type="text" class="question-text editing" 
                                   value="${Helper.escapeHtml(questionText)}" 
                                   placeholder="Question text"
                                   id="edit-text-${questionId}">
                        </div>
                        <div class="form-group">
                            <label>Difficulty</label>
                            <div class="difficulty-selector edit-difficulty">
                                <button type="button" class="difficulty-btn ${
                                  questionDifficulty === "Easy" ? "active" : ""
                                }" 
                                        data-difficulty="Easy" onclick="app.setEditDifficulty('${questionId}', 'Easy')">
                                    Easy
                                </button>
                                <button type="button" class="difficulty-btn ${
                                  questionDifficulty === "Medium"
                                    ? "active"
                                    : ""
                                }" 
                                        data-difficulty="Medium" onclick="app.setEditDifficulty('${questionId}', 'Medium')">
                                    Medium
                                </button>
                                <button type="button" class="difficulty-btn ${
                                  questionDifficulty === "Hard" ? "active" : ""
                                }" 
                                        data-difficulty="Hard" onclick="app.setEditDifficulty('${questionId}', 'Hard')">
                                    Hard
                                </button>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Problem Link</label>
                            <input type="url" class="question-link editing" 
                                   value="${Helper.escapeHtml(questionLink)}" 
                                   placeholder="https://leetcode.com/problems/..."
                                   id="edit-link-${questionId}">
                        </div>
                        <div class="edit-actions">
                            <button class="btn-secondary" onclick="app.cancelEdit('${questionId}')">Cancel</button>
                            <button class="btn-primary" onclick="app.saveQuestionEdit('${questionId}')">Save</button>
                        </div>
                    </div>
                    `
                    : /* VIEW MODE - Show read-only display */
                      `
                    <p class="question-text">${Helper.escapeHtml(
                      questionText
                    )}</p>
                    <div class="question-meta">
                        <span class="difficulty-tag ${questionDifficulty.toLowerCase()}">${questionDifficulty}</span>
                        ${
                          questionLink
                            ? `<a href="${questionLink}" target="_blank" class="question-link">Problem Link</a>`
                            : ""
                        }
                    </div>
                    `
                }
            </div>
            ${
              !isEditing
                ? `
            <div class="question-actions">
                <button class="action-btn" onclick="app.startQuestionEdit('${questionId}')" title="Edit">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                </button>
                <button class="action-btn" onclick="app.showDeleteModal('${questionId}')" title="Delete">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                </button>
            </div>
            `
                : ""
            }
        </div>
    `;
    })
    .join("");

  elements.questionList.innerHTML = questionsHTML;
  console.log("Questions rendered successfully");
}

// Make functions available globally
window.app = {
  toggleQuestionCompletion,
  startQuestionEdit,
  showDeleteModal,
  saveQuestionEdit,
  setEditDifficulty,
  cancelEdit,
  handleAddQuestion,
  showAddModal,
  hideAddModal,
};

async function toggleQuestionCompletion(questionId) {
  if (!state.isLoggedIn) {
    showToast("Please sign in to continue");
    return;
  }

  try {
    // Find the question in current state
    const questionIndex = state.questions.findIndex(
      (q) => (q._id?.$oid || q._id) === questionId
    );

    if (questionIndex === -1) {
      console.error("Question not found in state:", questionId);
      return;
    }

    const question = state.questions[questionIndex];
    const newCompletedStatus = !question.completed;

    const response = await Helper.fx(
      `/api/data/checklist/question/${questionId}/complete`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completed: newCompletedStatus,
          day: state.currentDay,
        }),
      }
    );

    if (response.ok) {
      // Update local state immediately
      question.completed = newCompletedStatus;
      state.questions[questionIndex] = question;

      // Update UI
      renderQuestions();
      updateSandTimer();
      showToast(newCompletedStatus ? "Completed" : "Marked incomplete");
    } else {
      showToast("Something went wrong—try again");
    }
  } catch (error) {
    console.error("Failed to toggle completion:", error);
    showToast("Something went wrong—try again");
  }
}

// Modal Management
function showAddModal() {
  console.log("Show add modal called");

  if (!state.isLoggedIn) {
    showToast("Please sign in to continue");
    return;
  }

  if (elements.addModal) {
    elements.addModal.style.display = "flex";
    console.log("Add modal displayed");

    // Reset form and focus
    if (elements.addQuestionForm) {
      elements.addQuestionForm.reset();
    }

    // Set default difficulty
    document.querySelectorAll(".difficulty-btn").forEach((btn) => {
      btn.classList.remove("active");
      if (btn.textContent === "Medium") {
        btn.classList.add("active");
      }
    });

    if (elements.questionText) {
      elements.questionText.focus();
    }
  } else {
    console.error("Add modal element not found");
  }
}

function hideAddModal() {
  console.log("Hide add modal called");
  if (elements.addModal) {
    elements.addModal.style.display = "none";
  }
}

function showDeleteModal(questionId) {
  console.log("Show delete modal called for question:", questionId);

  if (!state.isLoggedIn) {
    showToast("Please sign in to continue");
    return;
  }

  state.deletingQuestionId = questionId;
  if (elements.deleteModal) {
    elements.deleteModal.style.display = "flex";
  }
}

function hideDeleteModal() {
  console.log("Hide delete modal called");
  if (elements.deleteModal) {
    elements.deleteModal.style.display = "none";
  }
  state.deletingQuestionId = null;
}

// Question CRUD Operations
async function handleAddQuestion() {
  const text = elements.questionText ? elements.questionText.value.trim() : "";
  const link = elements.questionLink ? elements.questionLink.value.trim() : "";
  const activeDifficulty = document.querySelector(".difficulty-btn.active");
  const difficulty = activeDifficulty
    ? activeDifficulty.dataset.difficulty
    : "Medium";

  if (!text) {
    showToast("This field is required");
    if (elements.questionText) elements.questionText.focus();
    return;
  }

  try {
    console.log("Adding question:", {
      text,
      link,
      difficulty,
      day: state.currentDay,
    });

    const response = await Helper.fx("/api/data/checklist/question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        day: state.currentDay,
        questionText: text,
        link: link,
        difficulty: difficulty,
      }),
    });

    console.log("Add question response:", response);

    if (response.ok) {
      hideAddModal();
      showToast("Added");

      // Wait a moment and reload questions from server to ensure consistency
      setTimeout(async () => {
        await loadQuestions();
      }, 500);
    } else {
      const errorMessage =
        response.data?.error || "Something went wrong—try again";
      console.error("Add question failed:", errorMessage);
      showToast(errorMessage);
    }
  } catch (error) {
    console.error("Failed to add question:", error);
    showToast("Something went wrong—try again");
  }
}

// Helper function to generate temporary ID if needed
function generateTempId() {
  return "temp_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
}

async function handleDeleteQuestion() {
  if (!state.deletingQuestionId) return;

  try {
    const response = await Helper.fx(
      `/api/data/checklist/question/${state.deletingQuestionId}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day: state.currentDay }),
      }
    );

    if (response.ok) {
      hideDeleteModal();
      showToast("Removed");
      // Reload questions from server
      setTimeout(() => {
        loadQuestions();
      }, 300);
    } else {
      showToast("Something went wrong—try again");
    }
  } catch (error) {
    console.error("Failed to delete question:", error);
    showToast("Something went wrong—try again");
  }
}

function startQuestionEdit(questionId) {
  if (!state.isLoggedIn) {
    showToast("Please sign in to continue");
    return;
  }

  state.editingQuestionId = questionId;
  renderQuestions();

  // Focus the text input field after rendering
  setTimeout(() => {
    const input = document.getElementById(`edit-text-${questionId}`);
    if (input) {
      input.focus();
      input.select();
    }
  }, 100);
}

// function handleEditKeypress(event, questionId) {
//   if (event.key === "Enter") {
//     event.target.blur();
//   }
// }

function setEditDifficulty(questionId, difficulty) {
  // Update all difficulty buttons for this question
  const buttons = document.querySelectorAll(
    `[data-id="${questionId}"] .edit-difficulty .difficulty-btn`
  );
  buttons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.difficulty === difficulty);
  });

  // Store the selected difficulty in a data attribute
  const questionElement = document.querySelector(`[data-id="${questionId}"]`);
  if (questionElement) {
    questionElement.dataset.editDifficulty = difficulty;
  }
}

function cancelEdit(questionId) {
  state.editingQuestionId = null;
  renderQuestions();
}

async function saveQuestionEdit(questionId) {
  const questionElement = document.querySelector(`[data-id="${questionId}"]`);
  if (!questionElement) {
    showToast("Question not found");
    return;
  }

  const textInput = document.getElementById(`edit-text-${questionId}`);
  const linkInput = document.getElementById(`edit-link-${questionId}`);

  const newText = textInput ? textInput.value.trim() : "";
  const newLink = linkInput ? linkInput.value.trim() : "";
  const newDifficulty = questionElement.dataset.editDifficulty || "Medium";

  if (!newText) {
    showToast("Question text is required");
    if (textInput) textInput.focus();
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
          day: state.currentDay,
        }),
      }
    );

    if (response.ok) {
      state.editingQuestionId = null;
      showToast("Saved");
      // Reload to ensure consistency with server
      setTimeout(() => {
        loadQuestions();
      }, 300);
    } else {
      showToast("Something went wrong—try again");
    }
  } catch (error) {
    console.error("Failed to edit question:", error);
    showToast("Something went wrong—try again");
  }
}

// Sand Timer

// Enhanced sand timer system
function setupSandTimer() {
  createContinuousSandFlow();
  updateSandTimer(); // Initial update
}

function createContinuousSandFlow() {
  const sandFlow = document.getElementById("sand-flow");
  if (!sandFlow) return;

  sandFlow.innerHTML = "";

  // Create multiple sand grains for continuous flow
  for (let i = 0; i < 8; i++) {
    createSandGrain(i * 0.5);
  }
}

function createSandGrain(delay = 0) {
  const sandFlow = document.getElementById("sand-flow");
  if (!sandFlow) return;

  const grain = document.createElement("div");
  grain.className = "sand-grain";

  const duration = 2 + Math.random() * 1;
  const startDelay = delay + Math.random() * 1;

  grain.style.cssText = `
        animation: sand-flow-fall ${duration}s linear ${startDelay}s infinite;
        top: ${-10 - Math.random() * 5}px;
    `;

  sandFlow.appendChild(grain);
}

function updateSandTimer() {
  const completed = state.questions.filter((q) => q.completed).length;
  const total = state.questions.length;

  if (elements.progressCount) elements.progressCount.textContent = completed;
  if (elements.totalCount) elements.totalCount.textContent = total;

  if (total === 0) {
    resetSandTimer();
    return;
  }

  const percentage = (completed / total) * 100;
  updateSandLevels(percentage);

  // Adjust sand flow intensity based on progress
  adjustSandFlow(percentage);
}

function resetSandTimer() {
  const sandTop = document.getElementById("sand-top-fill");
  const sandBottom = document.getElementById("sand-bottom-fill");

  if (sandTop) {
    sandTop.style.height = "100%";
    sandTop.style.transition = "none";
  }
  if (sandBottom) {
    sandBottom.style.height = "0%";
    sandBottom.style.transition = "none";
  }
}

function updateSandLevels(percentage) {
  const sandTop = document.getElementById("sand-top-fill");
  const sandBottom = document.getElementById("sand-bottom-fill");

  if (sandTop) {
    sandTop.style.transition = "height 2500ms cubic-bezier(0.65, 0, 0.35, 1)";
    sandTop.style.height = `${100 - percentage}%`;
  }

  if (sandBottom) {
    sandBottom.style.transition =
      "height 2500ms cubic-bezier(0.65, 0, 0.35, 1)";
    sandBottom.style.height = `${percentage}%`;
  }
}

function adjustSandFlow(percentage) {
  const sandFlow = document.getElementById("sand-flow");
  if (!sandFlow) return;

  const grains = sandFlow.querySelectorAll(".sand-grain");

  if (percentage >= 100) {
    // Stop animation when complete
    grains.forEach((grain) => {
      grain.style.animationPlayState = "paused";
      grain.style.opacity = "0";
    });
  } else {
    // Adjust flow based on remaining sand
    const remaining = 100 - percentage;
    const intensity = Math.max(0.3, remaining / 100);

    grains.forEach((grain) => {
      grain.style.animationPlayState = "running";
      grain.style.opacity = intensity.toString();
      grain.style.animationDuration = `${2 + (remaining / 100) * 2}s`;
    });
  }
}

// Add dynamic sand particles
function addSandParticles() {
  if (!elements.sandTop || state.questions.length === 0) return;

  const completed = state.questions.filter((q) => q.completed).length;
  const total = state.questions.length;
  const percentage = (completed / total) * 100;

  // Add particles proportional to remaining sand
  const remainingPercentage = 100 - percentage;
  const particleCount = Math.floor((remainingPercentage / 100) * 8);

  for (let i = 0; i < particleCount; i++) {
    setTimeout(() => {
      if (elements.sandTop) {
        const particle = document.createElement("div");
        particle.className = "sand-particle";
        particle.style.cssText = `
                    --delay: ${Math.random() * 2}s;
                    --duration: ${3 + Math.random() * 2}s;
                    left: ${20 + Math.random() * 60}%;
                `;
        elements.sandTop.appendChild(particle);

        // Remove particle after animation
        setTimeout(() => {
          if (particle.parentNode) {
            particle.parentNode.removeChild(particle);
          }
        }, (parseFloat(particle.style.getPropertyValue("--duration")) + parseFloat(particle.style.getPropertyValue("--delay"))) * 1000);
      }
    }, i * 300);
  }
}

// Dropdown Management
function toggleProfileDropdown() {
  if (elements.profileDropdown) {
    const isShowing = elements.profileDropdown.classList.toggle("show");
    if (isShowing && elements.notificationsDropdown) {
      elements.notificationsDropdown.classList.remove("show");
    }
  }
}

function toggleNotificationsDropdown() {
  if (elements.notificationsDropdown) {
    const isShowing = elements.notificationsDropdown.classList.toggle("show");
    if (isShowing && elements.profileDropdown) {
      elements.profileDropdown.classList.remove("show");
    }
  }
}

// Toast Messages
function showToast(message) {
  if (!elements.toast) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;

  elements.toast.appendChild(toast);

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

// Fix the DOM content loaded handler
function checkHelperLoaded() {
  if (typeof Helper !== "undefined") {
    console.log("Helper.js loaded, initializing application...");
    init();
  } else {
    console.log("Waiting for helper.js...");
    setTimeout(checkHelperLoaded, 100);
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM fully loaded and parsed");
  checkHelperLoaded();
});

// Also expose a manual reload function
window.reloadQuestions = function () {
  console.log("Manual reload triggered");
  loadQuestions();
};
