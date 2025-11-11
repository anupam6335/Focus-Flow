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
    initializeElements();
    setupEventListeners();
    updateDateDisplay();
    setupAnimations();
    setupSandTimer();

    // Check auth status first
    await checkAuthStatus();

    // If logged in, load questions immediately
    if (state.isLoggedIn) {
      await loadQuestions();
    } else {
      showPublicLanding();
    }
  } catch (error) {
    console.error("Initialization failed:", error);
  }
}

// Initialize DOM elements after page load
function initializeElements() {
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
    sandTop: document.getElementById("sand-top-fill"),
    sandBottom: document.getElementById("sand-bottom-fill"),
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
    }
  });
}

// Event Listeners Setup
function setupEventListeners() {
  // Toggle buttons
  if (elements.toggleLeaves) {
    elements.toggleLeaves.addEventListener("click", toggleLeavesAnimation);
  }

  if (elements.toggleLamp) {
    elements.toggleLamp.addEventListener("click", toggleLampLight);
  }

  // User controls
  if (elements.profileBtn) {
    elements.profileBtn.addEventListener("click", toggleProfileDropdown);
  }

  if (elements.notificationsBtn) {
    elements.notificationsBtn.addEventListener(
      "click",
      toggleNotificationsDropdown
    );
  }

  if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener("click", handleLogout);
  }

  // Question actions - CRITICAL: Make sure these are set
  if (elements.addQuestion) {
    elements.addQuestion.addEventListener("click", showAddModal);
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

      return true;
    } else {
      showPublicLanding();

      return false;
    }
  } catch (error) {
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

  const isMobile = window.innerWidth < 768;
  const left = isMobile ? 10 + Math.random() * 80 : 5 + Math.random() * 90;
  const delay = initial ? Math.random() * 8 : 0;
  const duration = isMobile ? 10 + Math.random() * 6 : 8 + Math.random() * 8;
  const size = 0.6 + Math.random() * 0.8;
  const horizontalDrift = (Math.random() - 0.5) * (isMobile ? 40 : 60);

  // Choose random leaf style and color
  const leafType = Math.floor(Math.random() * 3) + 1; // 3 different leaf styles
  const leafColor = Math.floor(Math.random() * 4) + 1; // 4 color variations

  petal.innerHTML = getLeafSVG(leafType, leafColor);

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

function getLeafSVG(type, colorClass) {
  const leafSVGs = {
    // ORIGINAL
    1: `<svg class="leaf-svg leaf-\${colorClass}" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <g transform="scale(1.25)">
          <path d="M12.295,14.201 C12.43,14.088 12.557,13.969 12.676,13.847 C10.687,12.944 9.178,11.848 7.818,10.739 C6.194,10.735 4.52,10.321 3.663,9.262 C4.94,9.905 6.284,9.908 6.737,9.847 C2.898,6.381 1.835,2.992 1.835,2.992 C3.149,5.052 4.536,6.644 5.894,7.908 C5.325,6.82 5.658,4.808 5.658,4.808 C6.765,8.706 6.895,8.768 6.822,8.802 C7.722,9.531 8.697,10.216 9.509,10.739 C9.217,10.059 9.01,9.068 9.037,7.37 C9.037,7.37 9.759,10.932 10.893,11.809 C11.796,12.33 12.591,12.734 13.207,13.041 C14.183,11.585 14.188,7.703 11.796,6.144 C9.218,4.462 4.871,4.398 0.474,0.096 C-0.841,-1.191 1.603,10.132 5.144,13.289 C7.32,15.234 10.152,15.99 12.295,14.201 Z"/>
          <path d="M11.266,14.064 C11.266,14.064 12.446,14.677 13.8,15.275 C15.154,15.873 15.803,15.752 15.879,15.9 C15.957,16.05 15.918,14.258 15.918,14.258 C15.918,14.258 14.09,14.691 12.055,13.562 L11.266,14.064 Z"/>
        </g>
      </svg>`,

    // MIRRORED
    2: `<svg class="leaf-svg leaf-\${colorClass}" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(20,0) scale(-1.25,1.25)">
          <path d="M12.295,14.201 C12.43,14.088 12.557,13.969 12.676,13.847 C10.687,12.944 9.178,11.848 7.818,10.739 C6.194,10.735 4.52,10.321 3.663,9.262 C4.94,9.905 6.284,9.908 6.737,9.847 C2.898,6.381 1.835,2.992 1.835,2.992 C3.149,5.052 4.536,6.644 5.894,7.908 C5.325,6.82 5.658,4.808 5.658,4.808 C6.765,8.706 6.895,8.768 6.822,8.802 C7.722,9.531 8.697,10.216 9.509,10.739 C9.217,10.059 9.01,9.068 9.037,7.37 C9.037,7.37 9.759,10.932 10.893,11.809 C11.796,12.33 12.591,12.734 13.207,13.041 C14.183,11.585 14.188,7.703 11.796,6.144 C9.218,4.462 4.871,4.398 0.474,0.096 C-0.841,-1.191 1.603,10.132 5.144,13.289 C7.32,15.234 10.152,15.99 12.295,14.201 Z"/>
          <path d="M11.266,14.064 C11.266,14.064 12.446,14.677 13.8,15.275 C15.154,15.873 15.803,15.752 15.879,15.9 C15.957,16.05 15.918,14.258 15.918,14.258 C15.918,14.258 14.09,14.691 12.055,13.562 L11.266,14.064 Z"/>
        </g>
      </svg>`,

    // ROTATED SLIGHTLY
    3: `<svg class="leaf-svg leaf-\${colorClass}" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(10,10) rotate(-18) translate(-10,-10) scale(1.25)">
          <path d="M12.295,14.201 C12.43,14.088 12.557,13.969 12.676,13.847 C10.687,12.944 9.178,11.848 7.818,10.739 C6.194,10.735 4.52,10.321 3.663,9.262 C4.94,9.905 6.284,9.908 6.737,9.847 C2.898,6.381 1.835,2.992 1.835,2.992 C3.149,5.052 4.536,6.644 5.894,7.908 C5.325,6.82 5.658,4.808 5.658,4.808 C6.765,8.706 6.895,8.768 6.822,8.802 C7.722,9.531 8.697,10.216 9.509,10.739 C9.217,10.059 9.01,9.068 9.037,7.37 C9.037,7.37 9.759,10.932 10.893,11.809 C11.796,12.33 12.591,12.734 13.207,13.041 C14.183,11.585 14.188,7.703 11.796,6.144 C9.218,4.462 4.871,4.398 0.474,0.096 C-0.841,-1.191 1.603,10.132 5.144,13.289 C7.32,15.234 10.152,15.99 12.295,14.201 Z"/>
          <path d="M11.266,14.064 C11.266,14.064 12.446,14.677 13.8,15.275 C15.154,15.873 15.803,15.752 15.879,15.9 C15.957,16.05 15.918,14.258 15.918,14.258 C15.918,14.258 14.09,14.691 12.055,13.562 L11.266,14.064 Z"/>
        </g>
      </svg>`,
  };

  return leafSVGs[type] || leafSVGs[1];
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
    return;
  }

  try {
    const response = await Helper.fx("/api/data");

    if (response.ok) {
      // Handle the API response structure
      const apiData = response.data;

      if (apiData && apiData.success !== false) {
        const daysData = apiData.data || apiData;

        if (Array.isArray(daysData) && daysData.length > 0) {
          // Use the first day's questions
          const firstDay = daysData[0];

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
          } else {
            state.questions = [];
          }
        } else {
          state.questions = [];
        }
      } else {
        state.questions = [];
      }
    } else {
      state.questions = [];
    }

    // Always update UI
    renderQuestions();
    updateSandTimer();
  } catch (error) {
    state.questions = [];
    renderQuestions();
    updateSandTimer();
  }
}

function renderQuestions() {
  if (!elements.questionList) {
    return;
  }

  // Ensure state.questions is always an array
  if (!state.questions || !Array.isArray(state.questions)) {
    state.questions = [];
  }

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
    const questionIndex = state.questions.findIndex(
      (q) => (q._id?.$oid || q._id) === questionId
    );

    if (questionIndex === -1) {
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

      // Get updated counts
      const completed = state.questions.filter((q) => q.completed).length;
      const total = state.questions.length;

      // Trigger appropriate animation
      if (newCompletedStatus) {
        // Question was completed - trigger sand falling
        triggerSandAnimation(completed, total);
      } else {
        // Question was unchecked - reverse sand animation
        reverseSandAnimation(completed, total);
      }

      // Update UI
      renderQuestions();
      updateSandTimer();
      showToast(newCompletedStatus ? "Completed" : "Marked incomplete");
    } else {
      showToast("Something went wrong—try again");
    }
  } catch (error) {
    showToast("Something went wrong—try again");
  }
}

// Modal Management
function showAddModal() {
  if (!state.isLoggedIn) {
    showToast("Please sign in to continue");
    return;
  }

  if (elements.addModal) {
    elements.addModal.style.display = "flex";

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
  }
}

function hideAddModal() {
  if (elements.addModal) {
    elements.addModal.style.display = "none";
  }
}

function showDeleteModal(questionId) {
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

      showToast(errorMessage);
    }
  } catch (error) {
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
    showToast("Something went wrong—try again");
  }
}

// Sand Timer
// Enhanced Sand Timer with Gradual Progress
let sandAnimationState = {
  currentProgress: 0,
  totalQuestions: 0,
  isAnimating: false,
  activeParticles: new Set(),
};

function setupSandTimer() {
  sandAnimationState.currentProgress = 0;
  sandAnimationState.totalQuestions = 0;
  sandAnimationState.isAnimating = false;
  sandAnimationState.activeParticles.clear();
}

// Sand Timer State Management
function updateSandTimer() {
  const completed = state.questions.filter((q) => q.completed).length;
  const total = state.questions.length || 1;

  if (elements.progressCount) elements.progressCount.textContent = completed;
  if (elements.totalCount)
    elements.totalCount.textContent = state.questions.length;

  sandAnimationState.totalQuestions = state.questions.length;

  // Calculate progress percentage (0 to 1)
  const progress = total > 0 ? completed / total : 0;

  // Update sand visuals based on actual progress
  updateSandVisuals(completed, total, progress);
  updateContinuousSandFlow(completed, total);
}

function toggleHourglassState(completed, total) {
  const fullSvg = document.querySelector(".hourglass-full");
  const flowSvg = document.querySelector(".hourglass-flow");

  if (!fullSvg || !flowSvg) return;

  if (completed === 0) {
    // Show full state (top sand full, bottom empty)
    fullSvg.style.display = "block";
    flowSvg.style.display = "none";
  } else {
    // Show flowing state (top empty, bottom accumulating)
    fullSvg.style.display = "none";
    flowSvg.style.display = "block";
  }
}

// Enhanced sand animation
function triggerSandAnimation(completed, total) {
  if (sandAnimationState.isAnimating) return;

  sandAnimationState.isAnimating = true;
  const previousCompleted = sandAnimationState.currentProgress;
  sandAnimationState.currentProgress = completed;

  // Calculate the exact progress (0 to 1)
  const progress = total > 0 ? completed / total : 0;
  const previousProgress = total > 0 ? previousCompleted / total : 0;

  // Calculate how many questions were just completed
  const newlyCompleted = completed - previousCompleted;

  // Create particles proportional to the newly completed questions
  const particlesPerQuestion = 4;
  const totalParticles = Math.max(
    particlesPerQuestion,
    Math.floor(newlyCompleted * particlesPerQuestion)
  );

  // Update sand visuals FIRST to ensure correct state
  updateSandVisuals(completed, total, progress, true);

  // Then create particles for visual effect
  createGradualSandParticles(totalParticles, progress);
  updateContinuousSandFlow(completed, total);

  if (completed === total && total > 0) {
    triggerCompletionCelebration();
  }

  setTimeout(() => {
    sandAnimationState.isAnimating = false;
  }, 2500);
}

function createGradualSandParticles(particleCount, progress) {
  const particlesContainer = document.getElementById("sand-particles-overlay");
  if (!particlesContainer) return;

  particlesContainer.innerHTML = "";

  const batchSize = 2;
  const batches = Math.ceil(particleCount / batchSize);

  for (let batch = 0; batch < batches; batch++) {
    setTimeout(() => {
      for (
        let i = 0;
        i < batchSize && batch * batchSize + i < particleCount;
        i++
      ) {
        createProgressBasedSandParticle(
          particlesContainer,
          batch * batchSize + i,
          progress
        );
      }
    }, batch * 400);
  }
}

function createProgressBasedSandParticle(container, index, progress) {
  const particle = document.createElement("div");
  particle.className = "sand-particle";

  // Start from the neck area
  const neckCenterX = 50;
  const neckWidth = 6;
  const startX = neckCenterX - neckWidth / 2 + Math.random() * neckWidth;

  // Slower physics for gradual feel
  const size = 0.15 + Math.random() * 0.3;
  const mass = size;
  const gravity = 0.05 + mass * 0.03;
  const initialVelocity = 0.03 + Math.random() * 0.1;
  const horizontalDrift = (Math.random() - 0.5) * 0.2;

  const brightness = 45 + Math.random() * 25;
  const saturation = 12 + Math.random() * 8;
  const particleColor = `hsl(85, ${saturation}%, ${brightness}%)`;

  particle.style.cssText = `
    left: ${startX}%;
    width: ${size * 3}px;
    height: ${size * 3}px;
    background: ${particleColor};
    box-shadow: 0 0 ${size * 1.5}px ${particleColor}60;
    opacity: 0;
    border-radius: 50%;
    position: absolute;
    pointer-events: none;
    z-index: 10;
    filter: blur(0.5px);
    top: 40%;
  `;

  container.appendChild(particle);
  sandAnimationState.activeParticles.add(particle);

  let startTime = null;
  let currentY = 0;
  let velocity = initialVelocity;
  let currentX = startX;

  function animateParticle(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;

    velocity += gravity;
    velocity *= 0.999;
    currentY += velocity;

    currentX = startX + horizontalDrift * Math.min(elapsed / 3000, 1);

    particle.style.transform = `translate(${
      currentX - startX
    }%, ${currentY}px) scale(${size})`;
    particle.style.opacity = Math.min(0.7, elapsed / 600);

    if (currentY < 100 && elapsed < 4500) {
      requestAnimationFrame(animateParticle);
    } else {
      particle.style.opacity = "0";
      particle.style.transition = "opacity 1s ease-out";
      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
          sandAnimationState.activeParticles.delete(particle);
        }
      }, 1000);
    }
  }

  requestAnimationFrame(animateParticle);
}

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

      // Get updated counts
      const completed = state.questions.filter((q) => q.completed).length;
      const total = state.questions.length;

      // Trigger sand animation based on completion change
      if (newCompletedStatus) {
        // Question was just completed - trigger sand falling
        triggerSandAnimation(completed, total);
      } else {
        // Question was unchecked - reverse sand animation
        reverseSandAnimation(completed, total);
      }

      // Update UI
      renderQuestions();
      updateSandTimer();
      showToast(newCompletedStatus ? "Completed" : "Marked incomplete");
    } else {
      showToast("Something went wrong—try again");
    }
  } catch (error) {
    showToast("Something went wrong—try again");
  }
}

function triggerSandAnimation(completed, total) {
  if (sandAnimationState.isAnimating) return;

  sandAnimationState.isAnimating = true;

  const previousProgress = sandAnimationState.currentProgress;
  sandAnimationState.currentProgress = completed;

  const progressIncrement = completed - previousProgress;
  const particlesPerQuestion = 8; // Reduced for slower animation
  const totalParticles = Math.max(
    particlesPerQuestion,
    Math.floor(progressIncrement * particlesPerQuestion)
  );

  // Create boundary-constrained falling sand particles
  createBoundaryConstrainedSandParticles(totalParticles);

  updateSandVisuals(completed, total, true);
  updateContinuousSandFlow(completed, total);

  if (completed === total && total > 0) {
    triggerCompletionCelebration();
  }

  // Longer timeout to match slower SVG animation
  setTimeout(() => {
    sandAnimationState.isAnimating = false;
  }, 3500); // Increased from 2000ms to 3500ms
}

function createBoundaryConstrainedSandParticles(particleCount) {
  const particlesContainer = document.getElementById("sand-particles-overlay");
  if (!particlesContainer) return;

  particlesContainer.innerHTML = "";

  const batchSize = 2; // Even fewer particles for more gradual feel
  const batches = Math.ceil(particleCount / batchSize);

  for (let batch = 0; batch < batches; batch++) {
    setTimeout(() => {
      for (
        let i = 0;
        i < batchSize && batch * batchSize + i < particleCount;
        i++
      ) {
        createGradualSandParticle(
          particlesContainer,
          batch * batchSize + i,
          particleCount
        );
      }
    }, batch * 300); // Slower batch creation
  }
}

function createGradualSandParticle(container, index, totalParticles) {
  const particle = document.createElement("div");
  particle.className = "sand-particle";

  // Start from the neck area (where sand actually falls from)
  const neckCenterX = 50;
  const neckWidth = 6;
  const startX = neckCenterX - neckWidth / 2 + Math.random() * neckWidth;

  // Even slower, more gradual physics
  const size = 0.2 + Math.random() * 0.4;
  const mass = size;
  const gravity = 0.06 + mass * 0.04; // Reduced gravity for slower fall
  const initialVelocity = 0.05 + Math.random() * 0.15; // Slower initial velocity
  const horizontalDrift = (Math.random() - 0.5) * 0.3; // Reduced drift

  // Natural sand colors
  const brightness = 45 + Math.random() * 25;
  const saturation = 12 + Math.random() * 8;
  const particleColor = `hsl(85, ${saturation}%, ${brightness}%)`;

  particle.style.cssText = `
    left: ${startX}%;
    width: ${size * 4}px;
    height: ${size * 4}px;
    background: ${particleColor};
    box-shadow: 0 0 ${size * 2}px ${particleColor}60;
    opacity: 0;
    border-radius: 50%;
    position: absolute;
    pointer-events: none;
    z-index: 10;
    filter: blur(0.6px);
    top: 40%; // Start from neck area
  `;

  container.appendChild(particle);
  sandAnimationState.activeParticles.add(particle);

  // Animation using requestAnimationFrame for precise control
  let startTime = null;
  let currentY = 0;
  let velocity = initialVelocity;
  let currentX = startX;

  function animateParticle(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;

    // Apply slower, more natural physics
    velocity += gravity;
    velocity *= 0.998; // Very slight damping
    currentY += velocity;

    // Constrained horizontal movement
    const maxHorizontalMovement = 1.5; // Reduced maximum drift
    currentX =
      startX +
      horizontalDrift * Math.min(elapsed / 2500, 1) * maxHorizontalMovement;

    // Update position
    particle.style.transform = `translate(${
      currentX - startX
    }%, ${currentY}px) scale(${size})`;
    particle.style.opacity = Math.min(0.8, elapsed / 500); // Slower fade in

    // Extended boundary check for slower animation
    if (currentY < 120 && elapsed < 4000) {
      // Longer duration
      requestAnimationFrame(animateParticle);
    } else {
      // Slower fade out
      particle.style.opacity = "0";
      particle.style.transition = "opacity 0.8s ease-out";
      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
          sandAnimationState.activeParticles.delete(particle);
        }
      }, 800);
    }
  }

  requestAnimationFrame(animateParticle);
}

function createConstrainedSandParticle(container, index) {
  const particle = document.createElement("div");
  particle.className = "sand-particle";

  // Constrained positioning within sandclock boundaries
  const neckCenterX = 50;
  const neckWidth = 8;
  const startX = neckCenterX - neckWidth / 2 + Math.random() * neckWidth;

  // SLOWER PHYSICS - More realistic gravity and timing
  const size = 0.3 + Math.random() * 0.6;
  const mass = size;
  const gravity = 0.08 + mass * 0.06; // Reduced gravity for slower fall
  const initialVelocity = 0.1 + Math.random() * 0.2; // Slower initial velocity
  const horizontalDrift = (Math.random() - 0.5) * 0.5; // Reduced drift

  // Natural sand colors
  const brightness = 45 + Math.random() * 25;
  const saturation = 12 + Math.random() * 8;
  const particleColor = `hsl(85, ${saturation}%, ${brightness}%)`;

  particle.style.cssText = `
        left: ${startX}%;
        width: ${size * 5}px;
        height: ${size * 5}px;
        background: ${particleColor};
        box-shadow: 0 0 ${size * 2}px ${particleColor}60;
        opacity: 0;
        border-radius: 50%;
        position: absolute;
        pointer-events: none;
        z-index: 10;
        filter: blur(0.6px);
        animation-timing-function: cubic-bezier(0.4, 0.2, 0.2, 1);
    `;

  container.appendChild(particle);
  sandAnimationState.activeParticles.add(particle);

  // Animation using requestAnimationFrame for precise control
  let startTime = null;
  let currentY = -10;
  let velocity = initialVelocity;
  let currentX = startX;

  function animateParticle(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;

    // Apply slower, more natural physics
    velocity += gravity;
    velocity *= 0.995; // Very slight damping
    currentY += velocity;

    // Constrained horizontal movement
    const maxHorizontalMovement = 2; // Reduced maximum drift
    currentX =
      startX +
      horizontalDrift * Math.min(elapsed / 2000, 1) * maxHorizontalMovement;

    // Update position
    particle.style.transform = `translate(${
      currentX - startX
    }%, ${currentY}px) scale(${size})`;
    particle.style.opacity = Math.min(1, elapsed / 300); // Slower fade in

    // Extended boundary check for slower animation
    if (currentY < 160 && elapsed < 3500) {
      // Longer duration
      requestAnimationFrame(animateParticle);
    } else {
      // Slower fade out
      particle.style.opacity = "0";
      particle.style.transition = "opacity 0.6s ease-out";
      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
          sandAnimationState.activeParticles.delete(particle);
        }
      }, 600);
    }
  }

  requestAnimationFrame(animateParticle);
}

function reverseSandAnimation(completed, total) {
  // For unchecking questions, reverse the animation smoothly
  sandAnimationState.currentProgress = completed;
  const progress = total > 0 ? completed / total : 0;
  updateSandVisuals(completed, total, progress, false);

  // Create reverse particles (optional - can be removed if not needed)
  createReverseSandParticles(completed, total);
}

function createReverseSandParticles(completed, total) {
  const particlesContainer = document.getElementById("sand-particles-overlay");
  if (!particlesContainer) return;

  // Create a few particles moving upward to indicate reversal
  for (let i = 0; i < 3; i++) {
    createReverseSandParticle(particlesContainer, i);
  }
}

function createReverseSandParticle(container, index) {
  const particle = document.createElement("div");
  particle.className = "sand-particle";

  const neckCenterX = 50;
  const neckWidth = 8;
  const startX = neckCenterX - neckWidth / 2 + Math.random() * neckWidth;

  const size = 0.2 + Math.random() * 0.4;
  const initialVelocity = -0.2; // Negative for upward movement
  const horizontalDrift = (Math.random() - 0.5) * 0.3;

  const brightness = 45 + Math.random() * 25;
  const saturation = 12 + Math.random() * 8;
  const particleColor = `hsl(85, ${saturation}%, ${brightness}%)`;

  particle.style.cssText = `
    left: ${startX}%;
    width: ${size * 4}px;
    height: ${size * 4}px;
    background: ${particleColor};
    box-shadow: 0 0 ${size * 2}px ${particleColor}60;
    opacity: 0;
    border-radius: 50%;
    position: absolute;
    pointer-events: none;
    z-index: 10;
    filter: blur(0.6px);
    top: 60%; // Start from bottom area
  `;

  container.appendChild(particle);
  sandAnimationState.activeParticles.add(particle);

  let startTime = null;
  let currentY = 0;
  let velocity = initialVelocity;
  let currentX = startX;

  function animateParticle(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;

    // Gentle upward movement
    velocity += 0.05; // Slow down upward movement
    currentY += velocity;
    currentX = startX + horizontalDrift * Math.min(elapsed / 1000, 1);

    particle.style.transform = `translate(${
      currentX - startX
    }%, ${currentY}px) scale(${size})`;
    particle.style.opacity = Math.min(0.7, elapsed / 400); // Quick fade in

    if (currentY > -50 && elapsed < 1500) {
      requestAnimationFrame(animateParticle);
    } else {
      particle.style.opacity = "0";
      particle.style.transition = "opacity 0.4s ease-out";
      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
          sandAnimationState.activeParticles.delete(particle);
        }
      }, 400);
    }
  }

  requestAnimationFrame(animateParticle);
}

function updateSandVisuals(completed, total, progress, animate = false) {
  const fullSvg = document.querySelector(".hourglass-full");
  const flowSvg = document.querySelector(".hourglass-flow");

  if (!fullSvg || !flowSvg) return;

  // ALWAYS use the flow state when there's any progress
  // This ensures gradual sand transfer is always visible
  if (progress === 0) {
    // Only show full state when absolutely no progress
    fullSvg.style.display = "block";
    flowSvg.style.display = "none";

    resetSandPaths();
  } else {
    // For ANY progress (even 1 question), show flow state with gradual sand
    fullSvg.style.display = "none";
    flowSvg.style.display = "block";

    // CRITICAL: Set the flow state to show EXACT current progress
    setFlowStateSandLevel(progress);
  }
}

function resetSandPaths() {
  // Reset full state SVG to original state
  const topSand = document.querySelector(".hourglass-full #sand-top path");
  const bottomSand = document.querySelector(
    ".hourglass-full #sand-animation-path"
  );

  if (topSand) {
    topSand.setAttribute(
      "d",
      `
      M 2.15 1.90
      L 11.85 1.90
      L 11.85 4.90
      Q 9.50 6.60 7.006958 8.67
      Q 4.50 6.60 2.15 4.90
      Z
    `
    );
    topSand.setAttribute("fill", "#a3b18a");
    topSand.setAttribute("fill-opacity", "0.85");
  }

  if (bottomSand) {
    bottomSand.setAttribute("d", "M 7 16 L 7 16");
    bottomSand.setAttribute("fill", "none");
  }

  // Also ensure flow state starts with empty bottom
  const bottomSandFlow = document.querySelector(
    ".hourglass-flow #sand-animation-path-flow"
  );
  if (bottomSandFlow) {
    bottomSandFlow.setAttribute("d", "M 7 16 L 7 16");
    bottomSandFlow.setAttribute("fill", "none");
  }
}

function setFlowStateSandLevel(progress) {
  const topSand = document.querySelector(".hourglass-flow #sand-top-flow path");
  const bottomSand = document.querySelector(
    ".hourglass-flow #sand-animation-path-flow"
  );

  if (!topSand || !bottomSand) return;

  // Calculate heights based on progress (0 to 1)
  const maxTopHeight = 4.9; // Original top sand height from y=1.90 to y=4.90
  const maxBottomHeight = 4.57; // Bottom sand height when full

  // Top sand: Empty from the top down based on progress
  const topSandStartY = 1.9 + maxTopHeight * progress;

  // Update top sand (gradually emptying FROM THE TOP)
  if (progress < 1) {
    // Top sand still has some content
    topSand.setAttribute(
      "d",
      `
      M 2.15 ${topSandStartY.toFixed(2)}
      L 11.85 ${topSandStartY.toFixed(2)}
      L 11.85 4.90
      Q 9.50 6.60 7.006958 8.67
      Q 4.50 6.60 2.15 4.90
      Z
    `
    );
    topSand.setAttribute("fill", "#a3b18a");
    topSand.setAttribute("fill-opacity", "0.85");
  } else {
    // Top sand completely empty
    topSand.setAttribute("d", "M 7 1.9 L 7 1.9");
    topSand.setAttribute("fill", "none");
  }

  // Update bottom sand (gradually filling FROM THE BOTTOM)
  // CRITICAL: Only show the exact amount that corresponds to progress
  if (progress > 0) {
    const bottomSandHeight = maxBottomHeight * progress;
    const bottomStartY = 16.47052 - bottomSandHeight;

    // Only draw bottom sand for the completed percentage
    bottomSand.setAttribute(
      "d",
      `
      M 1.50 16.47052
      L 12.50 16.47052
      L 12.50 ${bottomStartY.toFixed(2)}
      C 10.80 ${(10.7 + 1.2 * progress).toFixed(2)} 9.10 ${(
        9.7 +
        0.85 * progress
      ).toFixed(2)} 7.00 ${(8.85 + 0.82 * progress).toFixed(2)}
      C 4.90 ${(9.7 + 0.85 * progress).toFixed(2)} 3.20 ${(
        10.7 +
        1.2 * progress
      ).toFixed(2)} 1.50 ${bottomStartY.toFixed(2)}
      Z
    `
    );
    bottomSand.setAttribute("fill", "#a3b18a");
    bottomSand.setAttribute("fill-opacity", "0.85");
  } else {
    // Bottom sand completely empty - use invisible path
    bottomSand.setAttribute("d", "M 7 16 L 7 16");
    bottomSand.setAttribute("fill", "none");
  }
}

function getSandPathForProgress(frameIndex) {
  const paths = [
    "M2.33630371,3.07006836 C2.33630371,3.07006836 5.43261719,3.33813477 6.80957031,3.33813477 C8.18652344,3.33813477 11.3754883,3.07006836 11.3754883,3.07006836 C11.3754883,3.07006836 10.8122559,4.96514893 9.58630371,6.16516113 C8.36035156,7.36517334 7.09265137,8.2623291 7.09265137,8.2623291 L7.09265137,8.35028076 L7.09265137,8.46459961 L6.87243652,8.46459961 L6.87243652,8.35028076 L6.80957031,8.2623291 C6.80957031,8.2623291 4.9704053,7.27703707 3.96130371,5.96057129 C2.5045166,4.06005859 2.33630371,3.07006836 2.33630371,3.07006836 Z",
    "M2.375,3.11462402 C2.375,3.11462402 5.71569824,3.44421387 7.09265137,3.44421387 C8.46960449,3.44421387 11.4150391,3.31262207 11.4150391,3.31262207 C11.4150391,3.31262207 10.8122559,4.96514893 9.58630371,6.16516113 C8.36035156,7.36517334 7.09265137,8.2623291 7.09265137,8.2623291 L7.09265137,15.5496216 L7.09265137,16.47052 L6.87243652,16.47052 L6.87243652,15.5496216 L6.80957031,8.2623291 C6.80957031,8.2623291 4.9704053,7.27703707 3.96130371,5.96057129 C2.5045166,4.06005859 2.375,3.11462402 2.375,3.11462402 Z",
    "M2.49230957,3.31262207 C2.49230957,3.31262207 5.71569824,3.66851807 7.09265137,3.66851807 C8.46960449,3.66851807 11.3153076,3.53222656 11.3153076,3.53222656 C11.3153076,3.53222656 10.8122559,4.96514893 9.58630371,6.16516113 C8.36035156,7.36517334 7.09265137,8.2623291 7.09265137,8.2623291 L7.09265137,15.149231 L7.9152832,16.47052 L6.10144043,16.47052 L6.87243652,15.149231 L6.80957031,8.2623291 C6.80957031,8.2623291 4.9704053,7.27703707 3.96130371,5.96057129 C2.5045166,4.06005859 2.49230957,3.31262207 2.49230957,3.31262207 Z",
    "M2.98474121,4.37164307 C2.98474121,4.37164307 5.49548338,4.7074585 6.87243651,4.7074585 C8.24938963,4.7074585 10.8119509,4.64428711 10.8119509,4.64428711 C10.8119509,4.64428711 10.8122559,4.96514893 9.58630371,6.16516113 C8.36035156,7.36517334 7.09265137,8.2623291 7.09265137,8.2623291 L7.09265137,12.5493774 L9.36248779,16.47052 L4.5581665,16.47052 L6.87243652,12.5493774 L6.80957031,8.2623291 C6.80957031,8.2623291 4.9704053,7.27703707 3.96130371,5.96057129 C2.5045166,4.06005859 2.98474121,4.37164307 2.98474121,4.37164307 Z",
    "M4.49743651,6.36560059 C4.49743651,6.36560059 5.63000487,6.72412109 7.00695799,6.72412109 C8.38391112,6.72412109 9.56188963,6.36560059 9.56188963,6.36560059 C9.56188963,6.36560059 9.48870848,6.54571533 8.79962157,7.09661865 C8.11053465,7.64752197 7.09265137,8.2623291 7.09265137,8.2623291 L7.09265137,10.5493774 L11.4924319,16.47052 L2.52148436,16.47052 L6.87243652,10.5493774 L6.80957031,8.2623291 C6.80957031,8.2623291 6.01727463,8.16043491 4.82800292,6.81622307 C4.42932128,6.36560059 4.49743651,6.36560059 4.49743651,6.36560059 Z",
    "M5.87017821,7.51904297 C5.87017821,7.51904297 6.14080809,7.70904542 6.87243651,7.64453126 C7.60406493,7.5800171 7.47180174,7.51904297 7.47180174,7.51904297 C7.47180174,7.51904297 8.51336669,7.23876953 7.82427977,7.78967285 C7.13519286,8.34057617 7.09265137,8.2623291 7.09265137,8.2623291 L7.09265137,10.5493774 L11.4924319,16.4705197 L2.52148436,16.4705197 L6.87243652,10.5493774 L6.80957031,8.2623291 C6.80957031,8.2623291 6.66632079,8.14239502 6.34619139,7.953125 C5.84610144,7.65745695 5.87017821,7.51904297 5.87017821,7.51904297 Z",
    "M7.00695799,8.06219482 C7.00695799,8.06219482 6.27532958,8.12670898 7.00695799,8.06219482 C7.73858641,7.99768066 7.00695799,8.06219482 7.00695799,8.06219482 C7.00695799,8.06219482 7.78173827,7.71142576 7.09265135,8.26232908 C6.40356444,8.8132324 7.09265137,8.2623291 7.09265137,8.2623291 L7.09265137,10.5493774 L11.4924319,16.4705197 L2.52148436,16.4705197 L6.87243652,10.5493774 L6.80957031,8.2623291 C6.80957031,8.2623291 7.1925659,8.45159912 6.87243651,8.2623291 C6.37234656,7.96666105 7.00695799,8.06219482 7.00695799,8.06219482 Z",
    "M7.00695799,10.3484497 C7.00695799,10.3484497 6.27532958,10.4129639 7.00695799,10.3484497 C7.73858641,10.2839355 7.00695799,10.3484497 7.00695799,10.3484497 C7.00695799,10.3484497 7.78173827,9.99768063 7.09265135,10.548584 C6.40356444,11.0994873 7.09265137,10.548584 7.09265137,10.548584 L7.09265137,10.5493774 L11.4924319,16.4705197 L2.52148436,16.4705197 L6.87243652,10.5493774 L6.80957031,10.548584 C6.80957031,10.548584 7.1925659,10.737854 6.87243651,10.548584 C6.37234656,10.2529159 7.00695799,10.3484497 7.00695799,10.3484497 Z",
  ];

  return paths[frameIndex] || paths[7];
}

function getSandColorForProgress(frameIndex) {
  const colors = [
    "#a3b18a",
    "#9aa882",
    "#929e7a",
    "#8a9572",
    "#828b6a",
    "#7a8262",
    "#72785a",
    "#6a6f52",
  ];
  return colors[frameIndex] || "#a3b18a";
}

function createEnhancedFallingSandParticles(particleCount) {
  const particlesContainer = document.getElementById("sand-particles-overlay");
  if (!particlesContainer) return;

  // Clear existing particles
  particlesContainer.innerHTML = "";

  for (let i = 0; i < particleCount; i++) {
    setTimeout(() => {
      createEnhancedSandParticle(particlesContainer, i, particleCount);
    }, i * 40); // Faster particle creation for better flow
  }
}

function createEnhancedSandParticle(container, index, totalParticles) {
  const particle = document.createElement("div");
  particle.className = "sand-particle";

  const left = 25 + Math.random() * 50;

  const animationTypes = [
    "sand-particle-fall",
    "sand-particle-fall-2",
    "sand-particle-fall-3",
  ];
  const animationType =
    animationTypes[Math.floor(Math.random() * animationTypes.length)];

  // Slower timing
  const delay = Math.random() * 1.2;
  const duration = 2.5 + Math.random() * 1.5; // Longer duration
  const size = 0.7 + Math.random() * 0.6;

  const colorVariation = Math.random() * 20;
  const particleColor = `hsl(${85 - colorVariation}, 20%, ${
    55 + colorVariation
  }%)`;

  particle.style.cssText = `
        left: ${left}%;
        animation: ${animationType} ${duration}s cubic-bezier(0.4, 0.2, 0.2, 1) ${delay}s forwards;
        transform: scale(${size});
        background: ${particleColor};
        box-shadow: 0 0 4px ${particleColor}80;
    `;

  container.appendChild(particle);

  // Longer removal time to match slower animation
  setTimeout(() => {
    if (particle.parentNode) {
      particle.parentNode.removeChild(particle);
    }
  }, (duration + delay) * 1200);
}

function updateContinuousSandFlow(completed, total) {
  const flowingSand = document.getElementById("flowing-sand");
  if (!flowingSand || total === 0) return;

  const progress = completed / total;

  // Only show flowing sand when there's ongoing progress (not 0% and not 100%)
  if (progress > 0 && progress < 1) {
    const flowSpeed = 4 + (1 - progress) * 3;
    const flowOpacity = 0.2 + progress * 0.6;

    flowingSand.style.animationDuration = `${flowSpeed}s`;
    flowingSand.style.opacity = flowOpacity.toString();
    flowingSand.style.display = "block";
  } else {
    flowingSand.style.opacity = "0";
    flowingSand.style.display = "none";
  }
}

function triggerCompletionCelebration() {
  const sandTimer = document.getElementById("sand-timer");
  if (sandTimer) {
    sandTimer.classList.add("sand-completion-animation");
    setTimeout(() => {
      sandTimer.classList.remove("sand-completion-animation");
    }, 2000);
  }

  // Create constrained celebration particles
  const particlesContainer = document.getElementById("sand-particles-overlay");
  if (particlesContainer) {
    for (let i = 0; i < 15; i++) {
      setTimeout(() => {
        createConstrainedCelebrationParticle(particlesContainer, i);
      }, i * 60);
    }
  }
}

function createConstrainedCelebrationParticle(container, index) {
  const particle = document.createElement("div");
  particle.className = "sand-particle";

  // Celebration particles constrained within sandclock
  const startX = 40 + Math.random() * 20;
  const horizontalVelocity = (Math.random() - 0.5) * 2;
  const size = 0.5 + Math.random() * 0.8;
  const initialVelocity = -1.5 - Math.random() * 2;
  const gravity = 0.3;

  const brightness = 55 + Math.random() * 20;
  const particleColor = `hsl(85, 20%, ${brightness}%)`;

  particle.style.cssText = `
        left: ${startX}%;
        width: ${size * 5}px;
        height: ${size * 5}px;
        background: ${particleColor};
        box-shadow: 0 0 ${size * 3}px ${particleColor}80;
        opacity: 0;
        border-radius: 50%;
        position: absolute;
        pointer-events: none;
        z-index: 10;
        filter: blur(0.4px);
    `;

  container.appendChild(particle);
  sandAnimationState.activeParticles.add(particle);

  let startTime = null;
  let currentY = 150;
  let velocity = initialVelocity;
  let currentX = startX;

  function animateCelebration(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;

    velocity += gravity * 0.6;
    currentY += velocity;
    currentX += horizontalVelocity * (1 - elapsed / 1500);

    particle.style.transform = `translate(${
      currentX - startX
    }%, ${currentY}px) scale(${size})`;
    particle.style.opacity = Math.min(1, (1200 - elapsed) / 1200);

    if (currentY > -30 && elapsed < 1800) {
      requestAnimationFrame(animateCelebration);
    } else {
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle);
        sandAnimationState.activeParticles.delete(particle);
      }
    }
  }

  requestAnimationFrame(animateCelebration);
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
    init();
  } else {
    setTimeout(checkHelperLoaded, 100);
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  checkHelperLoaded();
});

// Also expose a manual reload function
window.reloadQuestions = function () {
  loadQuestions();
};
