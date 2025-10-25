// API Configuration
const API_BASE_URL = "http://localhost:3000/api";
const FRONTEND_URL = "http://localhost:3000";
let currentUserData = null;
let currentBlogTab = "public";

// Premium Progress Chart - Fixed Animation & Revert Issues
class PremiumProgressChart {
  constructor() {
    this.container = document.getElementById("progressChartContainer");
    this.wrapper = document.getElementById("progressChartWrapper");
    this.svg = document.querySelector(".progress-chart-svg");
    this.center = document.getElementById("progressChartCenter");
    this.totalElement = document.getElementById("progressTotal");
    this.labelElement = document.getElementById("progressLabel");
    this.tooltip = document.getElementById("progressTooltip");
    this.legend = document.getElementById("progressLegend");

    this.segments = new Map();
    this.legendItems = new Map();
    this.currentData = null;
    this.activeFilter = null;
    this.isAnimating = false;
    this.originalSegments = new Map();

    this.init();
  }

  async init() {
    await this.loadData();
    this.renderUnifiedChart();
    this.bindEvents();
  }

  async loadData() {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/progress-stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch progress stats");

      const result = await response.json();

      if (result.success) {
        this.currentData = result.stats;
      } else {
        throw new Error(result.error || "Invalid response");
      }
    } catch (error) {
      console.error("Error loading progress data:", error);
      // Fallback data for testing
      this.currentData = { total: 17, easy: 5, medium: 10, hard: 2 };
    }
  }

  // Render unified circular progress chart - Seamless Continuous Circle
  renderUnifiedChart() {
    if (!this.currentData) return;

    // Clear existing segments (except total background)
    this.svg
      .querySelectorAll(".progress-circle:not(.total)")
      .forEach((segment) => segment.remove());
    this.segments.clear();
    this.originalSegments.clear();

    const total = this.currentData.total;
    if (total === 0) {
      this.showEmptyState();
      return;
    }

    // Calculate percentages
    const percentages = {
      easy: (this.currentData.easy / total) * 100,
      medium: (this.currentData.medium / total) * 100,
      hard: (this.currentData.hard / total) * 100,
    };

    // Create seamless segments in correct order (Easy -> Medium -> Hard)
    const segments = [
      { key: "easy", percentage: percentages.easy, offset: 0 },
      {
        key: "medium",
        percentage: percentages.medium,
        offset: percentages.easy,
      },
      {
        key: "hard",
        percentage: percentages.hard,
        offset: percentages.easy + percentages.medium,
      },
    ];

    segments.forEach(({ key, percentage, offset }) => {
      if (percentage === 0) return;

      const segment = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle"
      );
      segment.classList.add("progress-circle", key);
      segment.setAttribute("cx", "50");
      segment.setAttribute("cy", "50");
      segment.setAttribute("r", "44");
      segment.setAttribute("data-difficulty", key);
      segment.setAttribute("data-count", this.currentData[key].toString());
      segment.setAttribute("data-percentage", percentage.toFixed(1));
      segment.setAttribute("data-offset", offset.toFixed(1));
      segment.setAttribute("tabindex", "0");
      segment.setAttribute("role", "button");
      segment.setAttribute(
        "aria-label",
        `${this.capitalizeFirst(key)}: ${
          this.currentData[key]
        } problems (${percentage.toFixed(1)}%)`
      );

      // Calculate stroke dash for seamless continuous circle
      const circumference = 2 * Math.PI * 44;
      const dashLength = (percentage / 100) * circumference;
      const gapLength = circumference - dashLength;
      const dashOffset = -((offset / 100) * circumference);

      segment.style.strokeDasharray = `${dashLength} ${gapLength}`;
      segment.style.strokeDashoffset = dashOffset;
      segment.style.opacity = "1";

      // Store original values for smooth revert
      this.originalSegments.set(key, {
        dashArray: `${dashLength} ${gapLength}`,
        dashOffset: dashOffset,
        opacity: "1",
      });

      this.svg.appendChild(segment);
      this.segments.set(key, segment);

      this.addSegmentEventListeners(
        segment,
        key,
        this.currentData[key],
        percentage
      );
    });

    this.renderLegend();
    this.animateChartEntrance();
  }

  // Enhanced event listeners with better visual feedback
  addSegmentEventListeners(segment, difficulty, count, percentage) {
    const difficultyNames = {
      easy: "Easy",
      medium: "Medium",
      hard: "Hard",
    };

    segment.addEventListener("mouseenter", (e) => {
      if (this.isAnimating || this.activeFilter) return;
      this.showTooltip(e, difficultyNames[difficulty], count, percentage);
      this.highlightSegment(difficulty);

      // Add micro-interaction
      segment.style.transform = "scale(1.02)";
      segment.style.transition = "transform 0.2s ease-out";
    });

    segment.addEventListener("mouseleave", () => {
      if (this.isAnimating || this.activeFilter) return;
      this.hideTooltip();
      this.unhighlightSegments();

      // Reset micro-interaction
      segment.style.transform = "scale(1)";
    });

    segment.addEventListener("mousemove", (e) => {
      if (this.isAnimating) return;
      this.updateTooltipPosition(e);
    });

    segment.addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.isAnimating) return;

      // Add click feedback
      segment.style.transform = "scale(0.98)";
      setTimeout(() => {
        segment.style.transform = "scale(1)";
      }, 150);

      this.toggleDifficultyFilter(difficulty);
    });

    segment.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (this.isAnimating) return;
        this.toggleDifficultyFilter(difficulty);
      }
    });
  }

  // Enhanced toggle with smooth animations
  async toggleDifficultyFilter(difficulty) {
    if (this.isAnimating) return;

    this.isAnimating = true;

    if (this.activeFilter === difficulty) {
      // Deselect - return to unified view with smooth animation
      await this.animateToUnifiedView();
      this.activeFilter = null;
    } else {
      // Select specific difficulty with premium animation
      await this.animateToDifficultyView(difficulty);
      this.activeFilter = difficulty;
    }

    this.updateActiveStates();
    this.isAnimating = false;
  }
  // Smooth animation to unified view with enhanced effects
  async animateToUnifiedView() {
    this.wrapper.classList.remove("filtered");
    this.center.classList.remove("filtered");
    this.labelElement.classList.remove("filtered");
    this.labelElement.textContent = "Total Solved";

    // Create unified view ripple
    this.createRippleEffect("total");

    // Animate count back to total
    await this.animateCount(
      parseInt(this.totalElement.textContent),
      this.currentData.total
    );

    // Smoothly revert all segments to original positions with sequenced animation
    this.segments.forEach((segment, key) => {
      const original = this.originalSegments.get(key);
      if (original) {
        const delay = key === "easy" ? 0 : key === "medium" ? 50 : 100;

        setTimeout(() => {
          segment.classList.remove("active");
          segment.style.transition =
            "all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)";
          segment.style.strokeDasharray = original.dashArray;
          segment.style.strokeDashoffset = original.dashOffset;
          segment.style.opacity = original.opacity;
          segment.style.transform = "scale(1)";
        }, delay);
      }
    });

    // Wait for animations to complete
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  // Premium animation to difficulty view
  async animateToDifficultyView(difficulty) {
    const count = this.currentData[difficulty];
    const total = this.currentData.total;

    this.wrapper.classList.add("filtered");
    this.center.classList.add("filtered");
    this.labelElement.classList.add("filtered");
    this.labelElement.textContent = `${this.capitalizeFirst(
      difficulty
    )} Solved`;

    // Create ripple effect
    this.createRippleEffect(difficulty);

    // Animate count to filtered value
    await this.animateCount(parseInt(this.totalElement.textContent), count);

    // Premium animations for segments with sequenced timing
    const circumference = 2 * Math.PI * 44;

    this.segments.forEach((segment, key) => {
      segment.style.transition = "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)";

      if (key === difficulty) {
        // Expand active segment to full circle with premium animation
        setTimeout(() => {
          segment.classList.add("active");
          segment.style.strokeDasharray = `${circumference} 0`;
          segment.style.strokeDashoffset = "0";
          segment.style.opacity = "1";
          segment.style.transform = "scale(1.03)";
        }, 200);
      } else {
        // Fade out other segments with staggered timing
        const delay = key === "easy" ? 100 : key === "medium" ? 150 : 200;
        setTimeout(() => {
          segment.style.opacity = "0.15";
          segment.style.transform = "scale(0.95)";
        }, delay);
      }
    });

    // Trigger enhanced celebration
    if (count > 0) {
      this.triggerPremiumCelebration();
    }

    // Wait for animations to complete
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  // Enhanced smooth count animation with spring effect
  animateCount(from, to) {
    return new Promise((resolve) => {
      const duration = 800;
      const startTime = performance.now();
      const startValue = from;

      // Add spring animation to total element
      this.totalElement.classList.add("animating");

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Spring easing function for premium feel
        const springProgress =
          1 -
          Math.pow(1 - progress, 3) * Math.cos(progress * Math.PI * 2) * 0.2;
        const currentValue = Math.floor(
          startValue + (to - startValue) * springProgress
        );

        this.totalElement.textContent = currentValue.toString();

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.totalElement.textContent = to.toString();
          setTimeout(() => {
            this.totalElement.classList.remove("animating");
          }, 400);
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  // Update active states with visual feedback
  updateActiveStates() {
    // Update segments
    this.segments.forEach((segment, difficulty) => {
      if (difficulty === this.activeFilter) {
        segment.classList.add("active");
        segment.setAttribute("aria-pressed", "true");
      } else {
        segment.classList.remove("active");
        segment.setAttribute("aria-pressed", "false");
      }
    });

    // Update legend items with smooth transitions
    this.legendItems.forEach((item, difficulty) => {
      if (difficulty === this.activeFilter) {
        item.classList.add("active");
        item.setAttribute("aria-checked", "true");
        item.style.transform = "translateY(-2px)";
      } else {
        item.classList.remove("active");
        item.setAttribute("aria-checked", "false");
        item.style.transform = "translateY(0)";
      }
    });
  }

  // Enhanced legend rendering
  renderLegend() {
    this.legend.innerHTML = "";
    this.legendItems.clear();

    const difficulties = [
      { key: "easy", name: "Easy", icon: "🟢" },
      { key: "medium", name: "Medium", icon: "🟡" },
      { key: "hard", name: "Hard", icon: "🔴" },
    ];

    difficulties.forEach(({ key, name, icon }) => {
      const count = this.currentData[key];
      const percentage =
        this.currentData.total > 0 ? (count / this.currentData.total) * 100 : 0;

      const legendItem = document.createElement("div");
      legendItem.className = "legend-item";
      legendItem.setAttribute("data-difficulty", key);
      legendItem.setAttribute("role", "radio");
      legendItem.setAttribute("aria-checked", "false");
      legendItem.setAttribute("tabindex", "0");
      legendItem.setAttribute(
        "aria-label",
        `${name}: ${count} problems solved`
      );
      legendItem.style.transition =
        "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)";

      legendItem.innerHTML = `
        <div class="legend-color ${key}"></div>
        <div class="legend-text">
          <span class="legend-difficulty">${icon} ${name}</span>
          <span class="legend-count">${count} solved</span>
          <span class="legend-percentage">${percentage.toFixed(1)}%</span>
        </div>
      `;

      legendItem.addEventListener("click", () => {
        if (this.isAnimating) return;
        this.toggleDifficultyFilter(key);
      });

      legendItem.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (this.isAnimating) return;
          this.toggleDifficultyFilter(key);
        }
      });

      this.legend.appendChild(legendItem);
      this.legendItems.set(key, legendItem);
    });
  }

  // Premium celebration effect with multiple animations
  triggerPremiumCelebration() {
    this.center.classList.add("celebrating");

    // Add multiple shimmer effects
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.center.classList.add("celebrating");
        setTimeout(() => {
          this.center.classList.remove("celebrating");
        }, 600);
      }, i * 300);
    }

    // Final celebration state
    setTimeout(() => {
      this.center.classList.add("celebrating");
      setTimeout(() => {
        this.center.classList.remove("celebrating");
      }, 1500);
    }, 900);
  }

  // Create ripple effect for interactions
  createRippleEffect(difficulty) {
    const segment = this.segments.get(difficulty);
    if (!segment) return;

    const rect = segment.getBoundingClientRect();
    const wrapperRect = this.wrapper.getBoundingClientRect();

    const ripple = document.createElement("div");
    ripple.className = "ripple";

    const size = Math.max(rect.width, rect.height) * 2;
    const x = rect.left - wrapperRect.left + rect.width / 2 - size / 2;
    const y = rect.top - wrapperRect.top + rect.height / 2 - size / 2;

    ripple.style.width = ripple.style.height = size + "px";
    ripple.style.left = x + "px";
    ripple.style.top = y + "px";

    // Set ripple color based on difficulty
    const colors = {
      easy: "rgba(45, 122, 45, 0.3)",
      medium: "rgba(179, 143, 45, 0.3)",
      hard: "rgba(196, 69, 69, 0.3)",
      total: "rgba(76, 166, 76, 0.3)",
    };

    ripple.style.background = colors[difficulty] || colors.total;

    this.wrapper.appendChild(ripple);

    // Remove ripple after animation
    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, 600);
  }

  // Enhanced chart entrance animation
  animateChartEntrance() {
    // Initial hidden state
    this.segments.forEach((segment) => {
      segment.style.opacity = "0";
      segment.style.transform = "scale(0.8) rotate(-10deg)";
    });

    this.center.style.transform = "translate(-50%, -50%) scale(0)";
    this.totalElement.style.opacity = "0";

    // Staggered entrance animation
    this.segments.forEach((segment, difficulty) => {
      const delay =
        difficulty === "easy" ? 200 : difficulty === "medium" ? 400 : 600;

      setTimeout(() => {
        segment.style.transition = "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)";
        segment.style.opacity = "1";
        segment.style.transform = "scale(1) rotate(0deg)";
      }, delay);
    });

    // Center content animation
    setTimeout(() => {
      this.center.style.transition =
        "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)";
      this.center.style.transform = "translate(-50%, -50%) scale(1)";
      this.totalElement.style.transition = "all 0.5s ease-out";
      this.totalElement.style.opacity = "1";
    }, 800);

    // Animate initial count with spring effect
    setTimeout(() => {
      this.animateCount(0, this.currentData.total);
    }, 1200);
  }

  // Show enhanced tooltip
  showTooltip(event, difficulty, count, percentage) {
    this.tooltip.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
        <strong style="color: var(--codeleaf-text-primary);">${difficulty}</strong>
      </div>
      <div style="color: var(--codeleaf-text-secondary);">${count} problems solved</div>
      <div style="color: var(--codeleaf-accent-primary); font-weight: 700; margin-top: 2px;">
        ${percentage.toFixed(1)}% of total
      </div>
    `;
    this.tooltip.classList.add("show");
    this.updateTooltipPosition(event);
  }

  // Update tooltip position
  updateTooltipPosition(event) {
    const rect = this.wrapper.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.tooltip.style.left = x + "px";
    this.tooltip.style.top = y - 70 + "px";
  }

  // Hide tooltip
  hideTooltip() {
    this.tooltip.classList.remove("show");
  }

  // Highlight segment
  highlightSegment(difficulty) {
    this.segments.forEach((segment, key) => {
      if (key === difficulty) {
        segment.style.filter = "brightness(1.2)";
      } else {
        segment.style.opacity = "0.7";
      }
    });
  }

  // Unhighlight segments
  unhighlightSegments() {
    this.segments.forEach((segment) => {
      segment.style.opacity = "1";
      segment.style.filter = "";
    });
  }

  // Premium celebration effect
  triggerCelebration() {
    this.center.classList.add("celebrating");

    // Remove celebrating class after animation
    setTimeout(() => {
      this.center.classList.remove("celebrating");
    }, 1500);
  }

  // Enhanced event binding
  bindEvents() {
    // Click outside to reset filter
    document.addEventListener("click", (e) => {
      if (
        this.activeFilter !== null &&
        !this.wrapper.contains(e.target) &&
        !this.legend.contains(e.target) &&
        !this.isAnimating
      ) {
        this.toggleDifficultyFilter(this.activeFilter);
      }
    });

    // Keyboard navigation
    this.wrapper.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        this.activeFilter !== null &&
        !this.isAnimating
      ) {
        this.toggleDifficultyFilter(this.activeFilter);
      }
    });

    // Prevent animations during resize
    window.addEventListener("resize", () => {
      this.isAnimating = true;
      setTimeout(() => {
        this.isAnimating = false;
      }, 300);
    });
  }

  // Utility function
  capitalizeFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  // Show empty state
  showEmptyState() {
    this.container.innerHTML = `
      <div class="empty-state">
        <div>📊</div>
        <div>No progress data yet</div>
        <small>Start solving problems to see your progress!</small>
      </div>
    `;
  }

  // Refresh data (for real-time updates)
  async refresh() {
    await this.loadData();
    this.renderUnifiedChart();
  }
}

// Initialize the premium chart
let premiumProgressChart;

function initializePremiumProgressChart() {
  premiumProgressChart = new PremiumProgressChart();
}
// Toast Notification System
class ToastManager {
  constructor() {
    this.container = document.getElementById("toastContainer");
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.className = "toast-container";
      this.container.id = "toastContainer";
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
    toast.innerHTML = `
                    <div class="toast-icon">${icon}</div>
                    <div class="toast-content">
                        ${
                          title ? `<div class="toast-title">${title}</div>` : ""
                        }
                        <div class="toast-message">${message}</div>
                    </div>
                    <button class="toast-close" onclick="toastManager.hideToast(${toastId})">×</button>
                `;

    this.container.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 10);

    if (duration > 0) {
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

// Pixel Avatar System - Generate unique avatar based on username
function generatePixelAvatar(username) {
  const animals = [
    "🐶",
    "🐱",
    "🐭",
    "🐹",
    "🐰",
    "🦊",
    "🐻",
    "🐼",
    "🐨",
    "🐯",
    "🦁",
    "🐮",
    "🐷",
    "🐸",
    "🐵",
  ];
  const emojis = [
    "🌟",
    "🚀",
    "💻",
    "📚",
    "🎯",
    "🔥",
    "💡",
    "⚡",
    "🎨",
    "🔮",
    "🎭",
    "🏆",
    "💎",
    "🌿",
    "🍃",
  ];

  // Use username to generate consistent avatar
  const hash = username.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);

  const allOptions = [...animals, ...emojis];
  const index = Math.abs(hash) % allOptions.length;
  return allOptions[index];
}

// Format date for display
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Format relative time
function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return formatDate(dateString);
}

// Enhanced user level calculation with single-word, positive names
function calculateUserLevel(user) {
  const totalSolved = user.statistics?.totalProblemsSolved || 0;
  const currentStreak = user.statistics?.currentStreak || 0;
  const totalBlogs = user.statistics?.totalBlogsPublished || 0;
  const totalXP = calculateTotalXP(user);

  // Single-word, positive level names unique to FocusFlow
  if (totalXP >= 1000) return { level: "Luminary", xp: totalXP };
  if (totalXP >= 500) return { level: "Virtuoso", xp: totalXP };
  if (totalXP >= 250) return { level: "Sage", xp: totalXP };
  if (totalXP >= 100) return { level: "Explorer", xp: totalXP };
  if (totalXP >= 50) return { level: "Builder", xp: totalXP };
  if (totalXP >= 10) return { level: "Sprout", xp: totalXP };
  return { level: "Seedling", xp: totalXP };
}
// Calculate total XP based on various factors
function calculateTotalXP(user) {
  const totalSolved = user.statistics?.totalProblemsSolved || 0;
  const totalBlogs = user.statistics?.totalBlogsPublished || 0;
  const currentStreak = user.statistics?.currentStreak || 0;
  const maxStreak = user.statistics?.maxStreak || 0;
  const blogLikes = user.statistics?.totalBlogLikes || 0;

  // XP calculation formula
  let xp = 0;
  xp += totalSolved * 10; // 10 XP per problem
  xp += totalBlogs * 25; // 25 XP per blog
  xp += currentStreak * 5; // 5 XP per day of current streak
  xp += maxStreak * 2; // 2 XP per day of max streak
  xp += blogLikes * 3; // 3 XP per blog like

  return Math.floor(xp);
}

// Calculate today's solved problems
function calculateTodaySolved(user) {
  const today = new Date().toISOString().split("T")[0];
  const activityData = user.activity?.heatmapData || {};
  return activityData[today] || 0;
}

// Calculate this week's blogs
function calculateThisWeekBlogs(user) {
  // Simple implementation - you can enhance this with actual blog dates
  const recentBlogs = user.blogs?.recentBlogs || [];
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  return recentBlogs.filter((blog) => new Date(blog.createdAt) > oneWeekAgo)
    .length;
}

// Calculate active days
function calculateActiveDays(user) {
  const heatmapData = user.activity?.heatmapData || {};
  return Object.values(heatmapData).filter((count) => count > 0).length;
}

// Get streak status message
function getStreakStatus(currentStreak) {
  if (currentStreak === 0) return "Start your streak!";
  if (currentStreak < 3) return "Keep going! 💪";
  if (currentStreak < 7) return "Building momentum! 🔥";
  if (currentStreak < 14) return "On fire! 🌟";
  if (currentStreak < 30) return "Unstoppable! ⚡";
  return "Legendary streak! 🏆";
}

// Question History Search System
class QuestionHistorySearch {
  constructor() {
    this.searchInput = document.getElementById("questionSearch");
    this.searchLoader = document.getElementById("questionSearchLoader");
    this.searchClear = document.getElementById("questionSearchClear");
    this.questionHistoryContainer = document.getElementById("questionHistory");

    this.debounceTimer = null;
    this.searchDelay = 300; // ms
    this.isSearching = false;
    this.originalQuestionData = [];
    this.filteredQuestionData = [];
    this.currentSearchTerm = "";

    this.init();
  }

  init() {
    this.bindEvents();
    this.initializeSearchResultsInfo();
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

  initializeSearchResultsInfo() {
    // Create results info element if it doesn't exist
    if (!document.getElementById("questionSearchResultsInfo")) {
      const resultsInfo = document.createElement("div");
      resultsInfo.id = "questionSearchResultsInfo";
      resultsInfo.className = "question-search-results-info";
      resultsInfo.style.display = "none";
      resultsInfo.innerHTML = `
        <div class="question-search-results-header">
          <span id="questionSearchResultsCount">0 results</span>
          <button class="clear-search-btn" id="questionClearSearchBtn">
            Clear search
          </button>
        </div>
      `;

      // Insert after search container
      const searchContainer = this.searchInput.closest(".search-container");
      searchContainer.parentNode.insertBefore(
        resultsInfo,
        searchContainer.nextSibling
      );

      // Bind clear button
      document
        .getElementById("questionClearSearchBtn")
        .addEventListener("click", () => {
          this.clearSearch();
        });
    }
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
    if (!this.originalQuestionData || this.originalQuestionData.length === 0) {
      console.warn("No question data available for search");
      this.setSearchingState(false);
      return;
    }

    this.currentSearchTerm = searchTerm.toLowerCase().trim();

    // Filter questions based on day number or question title
    this.filteredQuestionData = this.originalQuestionData.filter((day) => {
      // Search by day number
      const dayMatch =
        `day ${day.day}`.includes(this.currentSearchTerm) ||
        day.day.toString().includes(this.currentSearchTerm);

      // Search by question titles
      const questionMatch = day.questions?.some((question) =>
        question.text.toLowerCase().includes(this.currentSearchTerm)
      );

      return dayMatch || questionMatch;
    });

    // Update UI with search results
    this.displaySearchResults(this.filteredQuestionData, searchTerm);
    this.setSearchingState(false);
  }

  displaySearchResults(filteredDays, searchTerm) {
    const hasResults = filteredDays.length > 0;
    const resultsInfo = document.getElementById("questionSearchResultsInfo");
    const resultsCount = document.getElementById("questionSearchResultsCount");

    // Update results count
    if (resultsCount) {
      resultsCount.textContent = `${filteredDays.length} ${
        filteredDays.length === 1 ? "result" : "results"
      } for "${searchTerm}"`;
    }

    // Show/hide results info
    if (resultsInfo) {
      if (hasResults) {
        resultsInfo.style.display = "block";
      } else {
        resultsInfo.style.display = "block";
        if (resultsCount) {
          resultsCount.textContent = `No results found for "${searchTerm}"`;
        }
      }
    }

    // Render filtered questions with highlight animation
    this.renderFilteredQuestions(filteredDays, searchTerm);

    // Add premium animation for search results
    this.triggerSearchAnimation(hasResults);
  }

  renderFilteredQuestions(filteredDays, searchTerm) {
    if (filteredDays.length === 0) {
      this.questionHistoryContainer.innerHTML = `
        <div class="empty-state question-search-empty-state">
          <div style="font-size: 3rem; margin-bottom: var(--codeleaf-space-2);">🔍</div>
          <div>No questions found matching "${searchTerm}"</div>
          <small>Try searching by day number or question title</small>
        </div>
      `;
      return;
    }

    this.questionHistoryContainer.innerHTML = filteredDays
      .map((day, index) => {
        const delay = index * 100; // Stagger animation
        const highlightedDay = this.highlightSearchTerm(
          `Day ${day.day}`,
          searchTerm
        );
        const matchingQuestions =
          day.questions?.filter((q) =>
            q.text.toLowerCase().includes(searchTerm.toLowerCase())
          ) || [];

        return `
          <div class="content-item question-day question-search-result-item" 
               data-day="${day.day}"
               style="animation-delay: ${delay}ms">
            <div class="question-day-header">
              <div class="question-day-info">
                <div class="question-title">${highlightedDay} Progress</div>
                <div class="question-date">${
                  day.date ? formatDate(day.date) : `Day ${day.day}`
                }</div>
              </div>
              <div class="question-day-stats">
                <span class="question-count">${day.solved}/${
          day.total
        } solved</span>
                <button class="toggle-day-btn" onclick="toggleDayDetails(${
                  day.day
                })" aria-label="Toggle day details">
                  <span class="toggle-icon">▼</span>
                </button>
              </div>
            </div>
            <div class="question-day-details" id="day-${
              day.day
            }-details" style="display: none;">
              <div class="solved-questions-list">
                ${this.renderDayQuestionsWithHighlight(
                  day.questions,
                  searchTerm
                )}
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    // Auto-expand first result for better UX
    if (filteredDays.length > 0) {
      setTimeout(() => {
        toggleDayDetails(filteredDays[0].day);
      }, 500);
    }
  }

  renderDayQuestionsWithHighlight(questions, searchTerm) {
    if (!questions || questions.length === 0) {
      return '<div class="empty-day-state">No questions solved this day</div>';
    }

    return questions
      .map((question, index) => {
        const delay = index * 50;
        const highlightedText = this.highlightSearchTerm(
          question.text,
          searchTerm
        );

        return `
          <div class="solved-question-item question-search-result-item" 
               style="animation-delay: ${delay}ms">
            <div class="question-text">${highlightedText}</div>
            ${
              question.link
                ? `
                <a href="${
                  question.link
                }" target="_blank" rel="noopener noreferrer" class="question-action-link">
                  ${
                    question.link.includes("leetcode.com")
                      ? "Solve this"
                      : "See this question"
                  } →
                </a>
              `
                : ""
            }
          </div>
        `;
      })
      .join("");
  }

  highlightSearchTerm(text, searchTerm) {
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

      return `${beforeMatch}<span class="question-search-highlight">${match}</span>${afterMatch}`;
    }

    return escapedText;
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
    this.questionHistoryContainer.classList.add("search-success-animation");
    setTimeout(() => {
      this.questionHistoryContainer.classList.remove(
        "search-success-animation"
      );
    }, 1000);
  }

  createFloatingParticles() {
    const container = this.questionHistoryContainer;
    const particles = ["🔍", "✨", "🎯", "💡", "📚"];

    for (let i = 0; i < 3; i++) {
      const particle = document.createElement("div");
      particle.className = "search-particle";
      particle.textContent =
        particles[Math.floor(Math.random() * particles.length)];
      particle.style.cssText = `
        position: absolute;
        font-size: 1.2rem;
        pointer-events: none;
        z-index: 1000;
        opacity: 0;
        animation: searchFloatParticle 1.2s ease-out forwards;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
      `;

      container.appendChild(particle);

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
    const resultsInfo = document.getElementById("questionSearchResultsInfo");
    if (resultsInfo) {
      resultsInfo.style.display = "none";
    }

    // Reset to original question history
    if (this.originalQuestionData.length > 0) {
      this.renderOriginalQuestionHistory();
    }

    // Focus back on input for better UX
    this.searchInput.focus();
  }

  // Method to set original question data
  setQuestionData(questionData) {
    this.originalQuestionData = questionData;
  }

  // Render original question history
  renderOriginalQuestionHistory() {
    renderQuestionHistory();
  }
}

// Initialize question search functionality
let questionHistorySearch;

function initializeQuestionHistorySearch() {
  questionHistorySearch = new QuestionHistorySearch();
}

// Update the renderQuestionHistory function to work with search
function renderQuestionHistory() {
  const container = document.getElementById("questionHistory");

  if (!currentUserData) return;

  const questions = currentUserData.consistency?.dailyProgress || [];
  const solvedQuestions = questions
    .flatMap((day) =>
      day.completedQuestions > 0
        ? [
            {
              day: day.day,
              date: day.date,
              solved: day.completedQuestions,
              total: day.totalQuestions,
              questions: getQuestionsForDay(day.day),
            },
          ]
        : []
    )
    .reverse()
    .slice(0, 10);

  // Store data in search system
  if (questionHistorySearch) {
    questionHistorySearch.setQuestionData(solvedQuestions);
  }

  if (solvedQuestions.length === 0) {
    container.innerHTML =
      '<div class="empty-state">No questions solved yet. Start your coding journey!</div>';
    return;
  }

  // If there's an active search, let the search system handle rendering
  if (questionHistorySearch && questionHistorySearch.currentSearchTerm) {
    questionHistorySearch.renderFilteredQuestions(
      questionHistorySearch.filteredQuestionData,
      questionHistorySearch.currentSearchTerm
    );
    return;
  }

  // Otherwise, render normally
  container.innerHTML = solvedQuestions
    .map(
      (day) => `
        <div class="content-item question-day" data-day="${day.day}">
            <div class="question-day-header">
                <div class="question-day-info">
                    <div class="question-title">Day ${day.day} Progress</div>
                    <div class="question-date">${
                      day.date ? formatDate(day.date) : `Day ${day.day}`
                    }</div>
                </div>
                <div class="question-day-stats">
                    <span class="question-count">${day.solved}/${
        day.total
      } solved</span>
                    <button class="toggle-day-btn" onclick="toggleDayDetails(${
                      day.day
                    })" aria-label="Toggle day details">
                        <span class="toggle-icon">▼</span>
                    </button>
                </div>
            </div>
            <div class="question-day-details" id="day-${
              day.day
            }-details" style="display: none;">
                <div class="solved-questions-list">
                    ${renderDayQuestions(day.questions)}
                </div>
            </div>
        </div>
    `
    )
    .join("");
}

// Helper function to get questions for a specific day
function getQuestionsForDay(dayNumber) {
  // This function needs access to the main checklist data
  // You might need to load this separately or ensure it's included in user-info
  const checklistData = window.checklistData || getChecklistDataFromStorage();

  if (!checklistData || !Array.isArray(checklistData)) {
    console.warn("Checklist data not available");
    return [];
  }

  const dayData = checklistData.find((day) => day.day === dayNumber);
  if (!dayData || !dayData.questions) return [];

  // Return only completed questions
  return dayData.questions
    .filter((q) => q.completed)
    .map((q) => ({
      text: q.text || "Untitled Question",
      link: q.link || "",
      completed: true,
    }));
}

// Helper to get checklist data from localStorage
function getChecklistDataFromStorage() {
  try {
    const savedData = localStorage.getItem("dsaChecklistData");
    return savedData ? JSON.parse(savedData) : null;
  } catch (error) {
    console.error("Error loading checklist data:", error);
    return null;
  }
}
// Render individual questions for a day
function renderDayQuestions(questions) {
  if (!questions || questions.length === 0) {
    return '<div class="empty-day-state">No questions solved this day</div>';
  }

  return questions
    .map(
      (question) => `
        <div class="solved-question-item">
            <div class="question-text">${escapeHtml(question.text)}</div>
            ${
              question.link
                ? `
                <a href="${
                  question.link
                }" target="_blank" rel="noopener noreferrer" class="question-action-link">
                    ${
                      question.link.includes("leetcode.com")
                        ? "Solve this"
                        : "See this question"
                    } →
                </a>
            `
                : ""
            }
        </div>
    `
    )
    .join("");
}

// Toggle day details with smooth animation and auto-close others
function toggleDayDetails(dayNumber) {
  const detailsElement = document.getElementById(`day-${dayNumber}-details`);
  const toggleIcon = document.querySelector(
    `[onclick="toggleDayDetails(${dayNumber})"] .toggle-icon`
  );
  const dayElement = document.querySelector(`[data-day="${dayNumber}"]`);

  if (!detailsElement || !toggleIcon || !dayElement) return;

  // Check if we're opening or closing
  const isOpening = detailsElement.style.display === "none";

  // Close all other open days first (if opening a new one)
  if (isOpening) {
    closeAllOtherDays(dayNumber);
  }

  if (isOpening) {
    // Expand with smooth animation
    detailsElement.style.display = "block";
    // Small delay to ensure display change is processed
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        detailsElement.style.opacity = "1";
        detailsElement.style.transform = "translateY(0)";
        toggleIcon.style.transform = "rotate(180deg)";
        dayElement.classList.add("expanded");
      });
    });
  } else {
    // Collapse with smooth animation
    detailsElement.style.opacity = "0";
    detailsElement.style.transform = "translateY(-10px)";
    toggleIcon.style.transform = "rotate(0deg)";
    dayElement.classList.remove("expanded");

    setTimeout(() => {
      detailsElement.style.display = "none";
    }, 300);
  }
}

// Close all other open days except the specified one
function closeAllOtherDays(exceptDayNumber) {
  document.querySelectorAll(".question-day.expanded").forEach((dayElement) => {
    const dayNum = parseInt(dayElement.dataset.day);
    if (dayNum !== exceptDayNumber) {
      const otherDetails = document.getElementById(`day-${dayNum}-details`);
      const otherToggleIcon = document.querySelector(
        `[onclick="toggleDayDetails(${dayNum})"] .toggle-icon`
      );

      if (otherDetails && otherToggleIcon) {
        // Animate collapse
        otherDetails.style.opacity = "0";
        otherDetails.style.transform = "translateY(-10px)";
        otherToggleIcon.style.transform = "rotate(0deg)";
        dayElement.classList.remove("expanded");

        setTimeout(() => {
          otherDetails.style.display = "none";
        }, 300);
      }
    }
  });
}

// Enhanced keyboard navigation support
function enhanceKeyboardNavigation() {
  document.addEventListener("keydown", function (event) {
    // Close all dropdowns when Escape is pressed
    if (event.key === "Escape") {
      closeAllOtherDays(-1); // Close all days
    }

    // Support arrow key navigation between days
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      const focusedElement = document.activeElement;
      if (focusedElement.classList.contains("toggle-day-btn")) {
        event.preventDefault();
        navigateDays(event.key === "ArrowDown" ? 1 : -1, focusedElement);
      }
    }
  });
}

// Navigate between days with arrow keys
function navigateDays(direction, currentButton) {
  const allDayButtons = Array.from(
    document.querySelectorAll(".toggle-day-btn")
  );
  const currentIndex = allDayButtons.indexOf(currentButton);
  const nextIndex =
    (currentIndex + direction + allDayButtons.length) % allDayButtons.length;

  if (allDayButtons[nextIndex]) {
    allDayButtons[nextIndex].focus();
  }
}

// Initialize keyboard navigation when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  enhanceKeyboardNavigation();
});

// Close all other open days when opening a new one (optional)
function closeOtherDays(currentDayNumber) {
  document.querySelectorAll(".question-day.expanded").forEach((dayElement) => {
    const dayNum = parseInt(dayElement.dataset.day);
    if (dayNum !== currentDayNumber) {
      toggleDayDetails(dayNum);
    }
  });
}

// Social Links Management
let socialLinksData = {
  linkedin: "",
  github: "",
  leetcode: "",
  gfg: "",
};
let originalSocialLinksData = {};

// Load social links
async function loadSocialLinks() {
  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch(`${API_BASE_URL}/social-links`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to load social links");
    }

    const result = await response.json();

    if (result.success) {
      socialLinksData = { ...socialLinksData, ...result.socialLinks };
      originalSocialLinksData = { ...socialLinksData };
      renderSocialLinks();
    } else {
      throw new Error(result.error || "Failed to load social links");
    }
  } catch (error) {
    console.error("Error loading social links:", error);
    // Initialize with empty data
    originalSocialLinksData = { ...socialLinksData };
    renderSocialLinks();
  }
}

// Enhanced render function
function renderSocialLinks() {
  const displayContainer = document.getElementById("socialLinksDisplay");
  const gridContainer = document.getElementById("socialLinksGrid");

  if (!displayContainer || !gridContainer) return;

  // Social platforms configuration
  const platforms = [
    {
      key: "linkedin",
      name: "LinkedIn",
      icon: "💼",
      placeholder: "https://linkedin.com/in/yourname",
    },
    {
      key: "github",
      name: "GitHub",
      icon: "🐙",
      placeholder: "https://github.com/yourusername",
    },
    {
      key: "leetcode",
      name: "leetcode",
      icon: "🐦",
      placeholder: "https://leetcode.com/yourhandle",
    },
    {
      key: "gfg",
      name: "GFG",
      icon: "🌐",
      placeholder: "https://yourgfg.com",
    },
  ];

  // Render display view
  displayContainer.innerHTML = platforms
    .map((platform) => {
      const url = socialLinksData[platform.key];
      const hasLink = url && url.trim() !== "";
      const displayUrl = hasLink ? url : "Not set";

      return `
      <a href="${hasLink ? url : "#"}" 
         class="social-link-display-item" 
         data-platform="${platform.key}"
         ${
           hasLink
             ? 'target="_blank" rel="noopener noreferrer"'
             : 'onclick="return false;"'
         }>
        <div class="social-link-icon">${platform.icon}</div>
        <div class="social-link-content">
          <div class="social-link-platform">${platform.name}</div>
          <div class="social-link-url" title="${displayUrl}">${displayUrl}</div>
        </div>
      </a>
    `;
    })
    .join("");

  // Render edit form
  gridContainer.innerHTML = platforms
    .map((platform) => {
      const currentUrl = socialLinksData[platform.key] || "";

      return `
      <div class="social-link-item">
        <label class="social-link-label">
          ${platform.icon} ${platform.name}
        </label>
        <div class="social-link-input-group">
          <input type="url" 
                 class="social-link-input" 
                 id="social-${platform.key}" 
                 value="${currentUrl}" 
                 placeholder="${platform.placeholder}"
                 oninput="updateSocialLink('${platform.key}', this.value)">
          <button type="button" 
                  class="social-link-test-btn" 
                  onclick="testSocialLink('${platform.key}')"
                  ${!currentUrl ? "disabled" : ""}
                  title="Test link">
            🔗 Test
          </button>
        </div>
      </div>
    `;
    })
    .join("");
}

// Toggle edit mode
function toggleSocialLinksEdit() {
  const section = document.getElementById("socialLinksSection");
  const editBtn = document.getElementById("editSocialLinksBtn");

  section.classList.add("editing");
  editBtn.style.display = "none";

  // Focus on first input
  const firstInput = document.querySelector(".social-link-input");
  if (firstInput) {
    setTimeout(() => firstInput.focus(), 100);
  }
}

// Cancel editing
function cancelSocialLinksEdit() {
  const section = document.getElementById("socialLinksSection");
  const editBtn = document.getElementById("editSocialLinksBtn");

  // Revert to original data
  socialLinksData = { ...originalSocialLinksData };
  renderSocialLinks();

  section.classList.remove("editing");
  editBtn.style.display = "flex";
}

// Update social link in memory
function updateSocialLink(platform, value) {
  socialLinksData[platform] = value.trim();

  // Enable/disable test button
  const testBtn = document.querySelector(
    `[onclick="testSocialLink('${platform}')"]`
  );
  if (testBtn) {
    testBtn.disabled = !value.trim();
  }
}

// Test social link
function testSocialLink(platform) {
  const url = socialLinksData[platform];
  if (url && url.trim() !== "") {
    // Add https if missing
    let testUrl = url;
    if (!testUrl.startsWith("http://") && !testUrl.startsWith("https://")) {
      testUrl = "https://" + testUrl;
    }

    window.open(testUrl, "_blank", "noopener,noreferrer");
  }
}

// Save social links
async function saveSocialLinks() {
  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch(`${API_BASE_URL}/social-links`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        links: socialLinksData,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to save social links");
    }

    const result = await response.json();

    if (result.success) {
      // Update original data
      originalSocialLinksData = { ...socialLinksData };

      // Exit edit mode
      const section = document.getElementById("socialLinksSection");
      const editBtn = document.getElementById("editSocialLinksBtn");

      section.classList.remove("editing");
      editBtn.style.display = "flex";

      // Show success message
      toastManager.success("Social links updated successfully!", "Links Saved");

      // Re-render display
      renderSocialLinks();
    } else {
      throw new Error(result.error || "Failed to save social links");
    }
  } catch (error) {
    console.error("Error saving social links:", error);
    toastManager.error("Failed to save social links", "Save Error");
  }
}

// Load user profile data
async function loadUserProfile() {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      window.location.href = "/";
      return;
    }

    const response = await fetch(`${API_BASE_URL}/user-info`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to load user data");
    }

    const result = await response.json();

    if (result.success) {
      currentUserData = result.user;

      initializeUserStatusManager();
      // Initialize community search after directory is loaded
      initializeCommunitySearch();
      initializeQuestionHistorySearch();
      initializeBlogSearch();

      renderUserProfile();
      renderAchievements();
      renderQuestionHistory();
      renderBlogs();
      initializePremiumProgressChart();
      renderConsistencyMap();
      renderProgressBars();
      loadUserDirectory();
    } else {
      throw new Error(result.error || "Failed to load user data");
    }

    // Load social links
    await loadSocialLinks();
  } catch (error) {
    console.error("Error loading user profile:", error);
    toastManager.error("Failed to load profile data", "Profile Error");
  }
}

// Enhanced render function with all new features - FIXED for profile
function renderUserProfile() {
  if (!currentUserData) return; // Use currentUserData instead of currentViewingUser

  const user = currentUserData; // Use currentUserData
  const userLevel = calculateUserLevel(user);
  const todaySolved = calculateTodaySolved(user);
  const thisWeekBlogs = calculateThisWeekBlogs(user);
  const activeDays = calculateActiveDays(user);
  const avgDaily = user.activity?.averageDaily || 0;
  const maxStreak = user.statistics?.maxStreak || 0;

  // Set avatar and level badge
  const avatarElement = document.getElementById("userAvatar");
  avatarElement.textContent = generatePixelAvatar(user.username);

  const levelBadge = document.getElementById("userLevelBadge");
  levelBadge.textContent = userLevel.level;
  levelBadge.className = `user-level-badge ${userLevel.level.toLowerCase()}`;

  // Set user name and bio
  document.getElementById("userName").textContent = user.username.toUpperCase();
  document.getElementById("joinDate").textContent = formatDate(
    user.accountCreated
  );

  // Update profile badge based on context
  const profileBadge = document.getElementById("profileOwnerBadge");
  if (window.location.pathname.includes("user-profile")) {
    profileBadge.textContent = "Viewing Profile";
  } else {
    profileBadge.textContent = "My Profile";
  }

  // Set main stats
  document.getElementById("totalSolved").textContent =
    user.statistics?.totalProblemsSolved || 0;
  document.getElementById("totalBlogs").textContent =
    user.statistics?.totalBlogsPublished || 0;
  document.getElementById("currentStreak").textContent =
    user.statistics?.currentStreak || 0;
  document.getElementById("activeDays").textContent = activeDays;

  // Set trend indicators
  document.getElementById("solvedTrend").textContent =
    todaySolved > 0 ? `+${todaySolved} today` : "+0 today";
  document.getElementById("blogsTrend").textContent =
    thisWeekBlogs > 0 ? `+${thisWeekBlogs} this week` : "+0 this week";
  document.getElementById("streakStatus").textContent = getStreakStatus(
    user.statistics?.currentStreak || 0
  );
  document.getElementById("activityTrend").textContent =
    avgDaily > 2 ? "Highly Active" : "Building Consistency";

  // Set detailed profile information
  document.getElementById("userLevel").textContent = userLevel.level;
  document.getElementById("totalXP").textContent = userLevel.xp;
  document.getElementById("avgDaily").textContent = avgDaily.toFixed(1);
  document.getElementById("maxStreak").textContent = maxStreak;

  updateShareButton();
}

// Share Profile Functionality
async function shareProfile() {
  try {
    const username = currentUserData?.username;
    if (!username) {
      toastManager.error("Unable to get user information", "Share Error");
      return;
    }

    // Construct the profile URL
    const profileUrl = `http://localhost:3000/user-profile?user=${encodeURIComponent(
      username
    )}`;

    // Use the Clipboard API to copy the URL
    await navigator.clipboard.writeText(profileUrl);

    // Show success feedback
    const shareBtn = document.querySelector(".share-profile-btn");
    const originalText = shareBtn.innerHTML;

    shareBtn.classList.add("copied");
    shareBtn.innerHTML = "<span>✓</span><span>Copied!</span>";

    toastManager.success(
      "Profile link copied to clipboard!",
      "Share Ready",
      3000
    );

    // Revert button after 2 seconds
    setTimeout(() => {
      shareBtn.classList.remove("copied");
      shareBtn.innerHTML = originalText;
    }, 2000);
  } catch (error) {
    console.error("Error sharing profile:", error);

    // Fallback for browsers that don't support Clipboard API
    const username = currentUserData?.username;
    const profileUrl = `http://localhost:3000/user-profile?user=${encodeURIComponent(
      username
    )}`;

    // Create a temporary input element for fallback copy
    const tempInput = document.createElement("input");
    tempInput.value = profileUrl;
    document.body.appendChild(tempInput);
    tempInput.select();
    tempInput.setSelectionRange(0, 99999); // For mobile devices

    try {
      const successful = document.execCommand("copy");
      document.body.removeChild(tempInput);

      if (successful) {
        toastManager.success(
          "Profile link copied to clipboard!",
          "Share Ready",
          3000
        );
      } else {
        throw new Error("execCommand failed");
      }
    } catch (fallbackError) {
      // Last resort - show the URL to the user
      toastManager.info(
        `Share this link: ${profileUrl}`,
        "Copy Manually",
        5000
      );
    }
  }
}

// Enhanced function to handle social sharing if needed
function shareProfileToSocial() {
  const username = currentUserData?.username;
  const profileUrl = `http://localhost:3000/user-profile?user=${encodeURIComponent(
    username
  )}`;
  const shareText = `Check out my FocusFlow profile: ${username}`;

  // Web Share API for native sharing
  if (navigator.share) {
    navigator
      .share({
        title: "My FocusFlow Profile",
        text: shareText,
        url: profileUrl,
      })
      .catch((error) => {
        // Fallback to clipboard
        shareProfile();
      });
  } else {
    // Fallback to clipboard
    shareProfile();
  }
}

// Add keyboard event listener for sharing
document.addEventListener("keydown", function (event) {
  // Ctrl/Cmd + Shift + S to share profile
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === "S") {
    event.preventDefault();
    shareProfile();
  }
});

// Add this to the renderUserProfile function to update the share button state
function updateShareButton() {
  const shareBtn = document.querySelector(".share-profile-btn");
  if (shareBtn) {
    shareBtn.setAttribute(
      "aria-label",
      `Share ${currentUserData?.username}'s profile`
    );
  }
}

// Enhanced achievements rendering with tooltips
function renderAchievements() {
  const grid = document.getElementById("achievementsGrid");
  const userData = currentUserData || currentViewingUser; // Works for both pages

  if (!userData) return;

  const achievements = calculateAchievements(userData);

  if (achievements.length === 0) {
    grid.innerHTML =
      '<div class="empty-state">No achievements yet. Start coding to earn your first achievement!</div>';
    return;
  }

  grid.innerHTML = achievements
    .map((achievement) => {
      const tooltipText = getAchievementTooltip(achievement);
      const progressBar =
        !achievement.unlocked && achievement.progress > 0
          ? `<div class="achievement-progress">
                    <div class="achievement-progress-bar" style="width: ${achievement.progress}%"></div>
                </div>`
          : "";

      // Round progress to whole number for display
      const roundedProgress = Math.round(achievement.progress);

      return `
                <div class="achievement-card ${
                  achievement.unlocked ? "unlocked" : ""
                }">
                    <div class="achievement-lock">🔒</div>
                    <div class="achievement-icon">${achievement.icon}</div>
                    <div class="achievement-title">${achievement.title}</div>
                    ${progressBar}
                    <div class="achievement-tooltip">
                        <strong>${achievement.title}</strong><br>
                        ${tooltipText}
                        ${
                          !achievement.unlocked
                            ? `<br><small>Progress:  ${roundedProgress}%</small>`
                            : ""
                        }
                    </div>
                </div>
            `;
    })
    .join("");
}

// Helper function to get achievement tooltip text
function getAchievementTooltip(achievement) {
  const tooltips = {
    "First Steps":
      "Solve your very first coding problem to unlock this achievement",
    "Problem Solver":
      "Reach 50 problems solved to become a reliable problem solver",
    "Code Master":
      "Achieve mastery by solving 100 problems across various topics",
    Blogger:
      "Share your knowledge by writing and publishing your first blog post",
    "Content Creator": "Become a content creator by publishing 5 helpful blogs",
    "Consistency King": "Maintain a 7-day coding streak to build strong habits",
    "Dedicated Learner":
      "Show incredible dedication with a 30-day coding streak",
    "Community Star":
      "Get 10 likes on your blogs to become a community favorite",
  };
  return tooltips[achievement.title] || achievement.description;
}

// Calculate user achievements based on data
function calculateAchievements(user) {
  const totalSolved = user.statistics?.totalProblemsSolved || 0;
  const totalBlogs = user.statistics?.totalBlogsPublished || 0;
  const currentStreak = user.statistics?.currentStreak || 0;
  const maxStreak = user.statistics?.maxStreak || 0;
  const blogLikes = user.statistics?.totalBlogLikes || 0;

  return [
    {
      icon: "🚀",
      title: "First Steps",
      description: "Solve your first problem",
      unlocked: totalSolved >= 1,
      progress: Math.min((totalSolved / 1) * 100, 100),
    },
    {
      icon: "💪",
      title: "Problem Solver",
      description: "Solve 50 problems",
      unlocked: totalSolved >= 50,
      progress: Math.min((totalSolved / 50) * 100, 100),
    },
    {
      icon: "🏆",
      title: "Code Master",
      description: "Solve 100 problems",
      unlocked: totalSolved >= 100,
      progress: Math.min((totalSolved / 100) * 100, 100),
    },
    {
      icon: "✍️",
      title: "Blogger",
      description: "Write your first blog",
      unlocked: totalBlogs >= 1,
      progress: Math.min((totalBlogs / 1) * 100, 100),
    },
    {
      icon: "📝",
      title: "Content Creator",
      description: "Write 5 blogs",
      unlocked: totalBlogs >= 5,
      progress: Math.min((totalBlogs / 5) * 100, 100),
    },
    {
      icon: "🔥",
      title: "Consistency King",
      description: "Maintain a 7-day streak",
      unlocked: currentStreak >= 7,
      progress: Math.min((currentStreak / 7) * 100, 100),
    },
    {
      icon: "⚡",
      title: "Dedicated Learner",
      description: "Maintain a 30-day streak",
      unlocked: currentStreak >= 30,
      progress: Math.min((currentStreak / 30) * 100, 100),
    },
    {
      icon: "🌟",
      title: "Community Star",
      description: "Get 10 blog likes",
      unlocked: blogLikes >= 10,
      progress: Math.min((blogLikes / 10) * 100, 100),
    },
  ];
}

// Blog Search System - UPDATED to handle both public and private blogs
class BlogSearch {
  constructor() {
    this.searchInput = document.getElementById("blogsSearch");
    this.searchLoader = document.getElementById("blogsSearchLoader");
    this.searchClear = document.getElementById("blogsSearchClear");
    this.searchResultsInfo = document.getElementById("blogsSearchResultsInfo");
    this.searchResultsCount = document.getElementById(
      "blogsSearchResultsCount"
    );
    this.clearSearchBtn = document.getElementById("blogsClearSearchBtn");
    this.blogsContent = document.getElementById("blogsContent");

    this.debounceTimer = null;
    this.searchDelay = 300; // ms
    this.isSearching = false;
    this.allBlogsData = []; // Store ALL blogs (public + private)
    this.currentBlogsData = []; // Current tab's blogs
    this.filteredBlogsData = [];
    this.currentSearchTerm = "";
    this.currentBlogTab = "public";

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

  // Set ALL blog data (both public and private)
  setAllBlogsData(allBlogs) {
    this.allBlogsData = Array.isArray(allBlogs) ? allBlogs : [];
    this.updateCurrentBlogsData();
  }

  // Update current tab's data based on active tab
  updateCurrentBlogsData() {
    if (this.currentBlogTab === "public") {
      this.currentBlogsData = this.allBlogsData.filter((blog) => blog.isPublic);
    } else {
      this.currentBlogsData = this.allBlogsData.filter(
        (blog) => !blog.isPublic
      );
    }
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
    if (!this.currentBlogsData || this.currentBlogsData.length === 0) {
      console.warn("BlogSearch: No blog data available for search");
      this.setSearchingState(false);
      return;
    }

    this.currentSearchTerm = searchTerm.toLowerCase().trim();

    // Search through CURRENT tab's blogs
    this.filteredBlogsData = this.currentBlogsData.filter((blog) => {
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

      return titleMatch || contentMatch || tagsMatch;
    });

    // Update UI with search results
    this.displaySearchResults(this.filteredBlogsData, searchTerm);
    this.setSearchingState(false);
  }

  displaySearchResults(filteredBlogs, searchTerm) {
    const hasResults = filteredBlogs.length > 0;

    // Update results count with tab info
    this.searchResultsCount.textContent = `${filteredBlogs.length} ${
      filteredBlogs.length === 1 ? "result" : "results"
    } in ${this.currentBlogTab} blogs for "${searchTerm}"`;

    // Show/hide results info
    if (hasResults) {
      this.searchResultsInfo.style.display = "block";
    } else {
      this.searchResultsInfo.style.display = "block";
      this.searchResultsCount.textContent = `No results found in ${this.currentBlogTab} blogs for "${searchTerm}"`;
    }

    // Render filtered blogs with highlight animation
    this.renderFilteredBlogs(filteredBlogs, searchTerm);

    // Add premium animation for search results
    this.triggerSearchAnimation(hasResults);
  }

  renderFilteredBlogs(filteredBlogs, searchTerm) {
    if (filteredBlogs.length === 0) {
      this.blogsContent.innerHTML = `
        <div class="empty-state blog-search-empty-state">
          <div style="font-size: 3rem; margin-bottom: var(--codeleaf-space-2);">📝</div>
          <div>No ${this.currentBlogTab} blogs found matching "${searchTerm}"</div>
          <small>Try searching by title, content, or tags</small>
        </div>
      `;
      return;
    }

    this.blogsContent.innerHTML = filteredBlogs
      .map((blog, index) => {
        const delay = index * 100; // Stagger animation
        const highlightedTitle = this.highlightSearchTerm(
          blog.title,
          searchTerm
        );

        // Create excerpt with highlighted content if available
        let excerpt =
          blog.excerpt || blog.content?.substring(0, 150) + "..." || "";
        if (
          blog.content &&
          blog.content.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          excerpt = this.highlightSearchTermInContent(excerpt, searchTerm);
        }

        // Add privacy badge for clarity
        const privacyBadge = blog.isPublic
          ? '<span style="color: var(--codeleaf-success); font-size: 0.7em; background: var(--codeleaf-bg-tertiary); padding: 2px 6px; border-radius: 10px; margin-left: 8px;">PUBLIC</span>'
          : '<span style="color: var(--codeleaf-warning); font-size: 0.7em; background: var(--codeleaf-bg-tertiary); padding: 2px 6px; border-radius: 10px; margin-left: 8px;">PRIVATE</span>';

        return `
          <div class="content-item blog-item blog-search-result-item" 
               style="animation-delay: ${delay}ms">
            <div class="blog-info">
              <div class="blog-title">${highlightedTitle} ${privacyBadge}</div>
              <div class="blog-date">${formatRelativeTime(blog.createdAt)} • ${
          blog.views || 0
        } views • ${blog.likes || 0} likes</div>
              ${
                excerpt
                  ? `<div class="blog-excerpt" style="margin-top: 8px; font-size: 0.9em; color: var(--codeleaf-text-secondary);">${excerpt}</div>`
                  : ""
              }
              ${blog.tags ? this.renderTags(blog.tags, searchTerm) : ""}
            </div>
            <a href="${FRONTEND_URL}/blogs/${
          blog.slug
        }" class="blog-link">Read →</a>
          </div>
        `;
      })
      .join("");
  }

  highlightSearchTerm(text, searchTerm) {
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

  renderTags(tags, searchTerm) {
    const highlightedTags = tags
      .map((tag) => {
        if (tag.toLowerCase().includes(searchTerm.toLowerCase())) {
          return `<span class="blog-search-highlight">${escapeHtml(
            tag
          )}</span>`;
        }
        return escapeHtml(tag);
      })
      .join(", ");

    return `<div class="blog-tags" style="margin-top: 4px; font-size: 0.8em; color: var(--codeleaf-text-tertiary);">Tags: ${highlightedTags}</div>`;
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
    this.blogsContent.classList.add("blog-search-success-animation");
    setTimeout(() => {
      this.blogsContent.classList.remove("blog-search-success-animation");
    }, 1000);
  }

  createFloatingParticles() {
    const container = this.blogsContent;
    const particles = ["📝", "✨", "🔍", "💡", "📚"];

    for (let i = 0; i < 3; i++) {
      const particle = document.createElement("div");
      particle.className = "blog-search-particle";
      particle.textContent =
        particles[Math.floor(Math.random() * particles.length)];
      particle.style.cssText = `
        position: absolute;
        font-size: 1.2rem;
        pointer-events: none;
        z-index: 1000;
        opacity: 0;
        animation: blogSearchFloatParticle 1.2s ease-out forwards;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
      `;

      container.appendChild(particle);

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
    this.renderOriginalBlogs();

    // Focus back on input for better UX
    this.searchInput.focus();
  }

  // Switch tabs - UPDATED
  switchTab(tab) {
    this.currentBlogTab = tab;
    this.updateCurrentBlogsData();

    if (this.currentSearchTerm) {
      // If there's an active search, re-filter for the new tab
      this.performSearch(this.currentSearchTerm);
    } else {
      // Otherwise, just render the original content
      this.renderOriginalBlogs();
    }
  }

  // Render original blogs for current tab
  renderOriginalBlogs() {
    renderBlogs();
  }
}

// Initialize blog search functionality
let blogSearch;

function initializeBlogSearch() {
  blogSearch = new BlogSearch();
}

// Update the data setup in renderBlogs function
function renderBlogs() {
  const container = document.getElementById("blogsContent");
  if (!currentUserData) return;

  const allBlogs = currentUserData.blogs?.recentBlogs || [];
  const filteredBlogs =
    currentBlogTab === "public"
      ? allBlogs.filter((blog) => blog.isPublic)
      : allBlogs.filter((blog) => !blog.isPublic);

  // Store ALL blog data in search system (both public and private)
  if (blogSearch) {
    blogSearch.setAllBlogsData(allBlogs);
  } else {
    console.log("Blog search not initialized yet");
  }

  // If there's an active search, let the search system handle rendering
  if (blogSearch && blogSearch.currentSearchTerm) {
    return; // Search system will handle rendering
  }

  // Otherwise, render normally
  if (filteredBlogs.length === 0) {
    const message =
      currentBlogTab === "public"
        ? "No public blogs yet. Share your knowledge!"
        : "No private blogs yet. Start writing!";
    container.innerHTML = `<div class="empty-state">${message}</div>`;
    return;
  }

  container.innerHTML = filteredBlogs
    .map(
      (blog) => `
        <div class="content-item blog-item">
          <div class="blog-info">
            <div class="blog-title">${escapeHtml(blog.title)} ${
        blog.isPublic
          ? '<span style="color: var(--codeleaf-success); font-size: 0.7em; background: var(--codeleaf-bg-tertiary); padding: 2px 6px; border-radius: 10px; margin-left: 8px;">PUBLIC</span>'
          : '<span style="color: var(--codeleaf-warning); font-size: 0.7em; background: var(--codeleaf-bg-tertiary); padding: 2px 6px; border-radius: 10px; margin-left: 8px;">PRIVATE</span>'
      }</div>
            <div class="blog-date">${formatRelativeTime(blog.createdAt)} • ${
        blog.views || 0
      } views • ${blog.likes || 0} likes</div>
            ${
              blog.content
                ? `<div class="blog-excerpt" style="margin-top: 8px; font-size: 0.9em; color: var(--codeleaf-text-secondary);">${blog.content.substring(
                    0,
                    100
                  )}${blog.content.length > 100 ? "..." : ""}</div>`
                : ""
            }
            ${
              blog.tags
                ? `<div class="blog-tags" style="margin-top: 4px; font-size: 0.8em; color: var(--codeleaf-text-tertiary);">Tags: ${blog.tags.join(
                    ", "
                  )}</div>`
                : ""
            }
          </div>
          <a href="${FRONTEND_URL}/blogs/${
        blog.slug
      }" class="blog-link">Read →</a>
        </div>
      `
    )
    .join("");
}

// Update the switchBlogTab function
function switchBlogTab(tab) {
  currentBlogTab = tab;
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  event.target.classList.add("active");

  // Update search system if it exists
  if (blogSearch) {
    blogSearch.switchTab(tab);
  } else {
    renderBlogs();
  }
}

// Render consistency map (heatmap)
function renderConsistencyMap() {
  const heatmapGrid = document.getElementById("heatmapGrid");
  const monthsRow = document.getElementById("heatmapMonths");

  if (!currentUserData) return;

  const heatmapData = currentUserData.activity?.heatmapData || {};
  renderHeatmap(heatmapData, heatmapGrid, monthsRow);
}

// Heatmap rendering function (similar to index)
function renderHeatmap(activityData, heatmapGrid, monthsRow) {
  heatmapGrid.innerHTML = "";
  monthsRow.innerHTML = "";

  const startDate = new Date("2025-09-25");
  const today = new Date();

  // Generate month labels
  const monthLabels = generateMonthLabels(startDate, today);
  monthLabels.forEach((month) => {
    const monthLabel = document.createElement("div");
    monthLabel.className = "month-label";
    monthLabel.textContent = month;
    monthsRow.appendChild(monthLabel);
  });

  // Generate heatmap cells
  let currentDate = new Date(startDate);
  const cells = [];

  for (let week = 0; week < 52; week++) {
    for (let day = 0; day < 7; day++) {
      const dateKey = formatDateKey(currentDate);
      const activityCount = activityData[dateKey] || 0;
      const activityLevel = getActivityLevel(activityCount);

      const cell = document.createElement("div");
      cell.className = `heatmap-cell level-${activityLevel}`;
      cell.setAttribute(
        "title",
        `${formatDisplayDate(currentDate)}: ${activityCount} problems solved`
      );
      cells.push(cell);

      currentDate.setDate(currentDate.getDate() + 1);
      if (currentDate > today) break;
    }
    if (currentDate > today) break;
  }

  cells.forEach((cell) => {
    heatmapGrid.appendChild(cell);
  });
}

// Helper functions for heatmap
function formatDateKey(date) {
  return date.toISOString().split("T")[0];
}

function formatDisplayDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getActivityLevel(count) {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  return 4;
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

  return labels.slice(0, 52);
}

// Render progress bars
function renderProgressBars() {
  const container = document.getElementById("progressBars");
  if (!currentUserData) return;

  const user = currentUserData;
  const totalSolved = user.statistics?.totalProblemsSolved || 0;
  const totalBlogs = user.statistics?.totalBlogsPublished || 0;
  const blogLikes = user.statistics?.totalBlogLikes || 0;
  const blogViews = user.statistics?.totalBlogViews || 0;

  container.innerHTML = `
                <div class="progress-item">
                    <div class="progress-header">
                        <span class="progress-label">Problems Solved</span>
                        <span class="progress-value">${totalSolved}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(
                          (totalSolved / 100) * 100,
                          100
                        )}%"></div>
                    </div>
                </div>
                <div class="progress-item">
                    <div class="progress-header">
                        <span class="progress-label">Blogs Published</span>
                        <span class="progress-value">${totalBlogs}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(
                          (totalBlogs / 10) * 100,
                          100
                        )}%"></div>
                    </div>
                </div>
                <div class="progress-item">
                    <div class="progress-header">
                        <span class="progress-label">Blog Engagement</span>
                        <span class="progress-value">${blogLikes} likes</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(
                          (blogLikes / 50) * 100,
                          100
                        )}%"></div>
                    </div>
                </div>
                <div class="progress-item">
                    <div class="progress-header">
                        <span class="progress-label">Knowledge Shared</span>
                        <span class="progress-value">${blogViews} views</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(
                          (blogViews / 100) * 100,
                          100
                        )}%"></div>
                    </div>
                </div>
            `;
}

// Update the loadUserDirectory function to work with search
async function loadUserDirectory() {
  const container = document.getElementById("userDirectory");
  const currentUsername = currentUserData?.username;

  if (!currentUsername) {
    container.innerHTML =
      '<div class="empty-state">Please log in to see the community</div>';
    return;
  }

  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch(`${API_BASE_URL}/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to load users");
    }

    const result = await response.json();

    if (result.success && result.users) {
      // Filter out current user and render others
      const otherUsers = result.users.filter(
        (user) => user.username !== currentUsername
      );

      // Initialize search if not already done
      if (!communitySearch) {
        initializeCommunitySearch();
      }

      // Set users in search system and render
      communitySearch.setAllUsers(otherUsers);
      communitySearch.renderUserDirectory(otherUsers);
    } else {
      throw new Error(result.error || "No users found");
    }
  } catch (error) {
    console.error("Error loading user directory:", error);
    // Fallback: Show message about community feature
    container.innerHTML = `
            <div class="empty-state">
                Community feature coming soon! 
                <br><small>Other users will appear here as they join.</small>
            </div>
        `;
  }
}

// Add particle animation to CSS
const particleStyles = `
@keyframes floatParticle {
    0% {
        opacity: 0;
        transform: translateY(0) scale(0.5) rotate(0deg);
    }
    20% {
        opacity: 1;
    }
    80% {
        opacity: 1;
    }
    100% {
        opacity: 0;
        transform: translateY(-100px) scale(1.2) rotate(180deg);
    }
}

.search-highlight {
    background: linear-gradient(120deg, var(--codeleaf-accent-primary), var(--codeleaf-accent-secondary));
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-weight: 700;
    padding: 2px 0;
    animation: textShimmer 2s ease-in-out infinite;
}

@keyframes textShimmer {
    0%, 100% {
        background-position: -200% center;
    }
    50% {
        background-position: 200% center;
    }
}

.search-empty-state {
    text-align: center;
    padding: var(--codeleaf-space-8) !important;
    animation: elegantFadeIn 0.8s ease-out;
}

.search-empty-state div:first-child {
    animation: bounceIn 1s ease-out;
}
`;

// Inject particle styles
const styleSheet = document.createElement("style");
styleSheet.textContent = particleStyles;
document.head.appendChild(styleSheet);

// Search functionality for Community section
class CommunitySearch {
  constructor() {
    this.searchInput = document.getElementById("userSearch");
    this.searchLoader = document.getElementById("searchLoader");
    this.searchClear = document.getElementById("searchClear");
    this.searchResultsInfo = document.getElementById("searchResultsInfo");
    this.searchResultsCount = document.getElementById("searchResultsCount");
    this.clearSearchBtn = document.getElementById("clearSearchBtn");
    this.userDirectory = document.getElementById("userDirectory");

    this.debounceTimer = null;
    this.searchDelay = 300; // ms
    this.isSearching = false;
    this.allUsers = [];
    this.filteredUsers = [];

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
    if (!this.allUsers || this.allUsers.length === 0) {
      console.warn("No users available for search");
      this.setSearchingState(false);
      return;
    }

    const searchLower = searchTerm.toLowerCase().trim();

    // Filter users based on username match
    this.filteredUsers = this.allUsers.filter((user) =>
      user.username.toLowerCase().includes(searchLower)
    );

    // Update UI with search results
    this.displaySearchResults(this.filteredUsers, searchTerm);
    this.setSearchingState(false);
  }

  displaySearchResults(users, searchTerm) {
    const hasResults = users.length > 0;

    // Update results count
    this.searchResultsCount.textContent = `${users.length} ${
      users.length === 1 ? "result" : "results"
    } for "${searchTerm}"`;

    // Show/hide results info
    if (hasResults) {
      this.searchResultsInfo.style.display = "block";
    } else {
      this.searchResultsInfo.style.display = "block";
      this.searchResultsCount.textContent = `No results found for "${searchTerm}"`;
    }

    // Render filtered users with highlight animation
    this.renderFilteredUsers(users, searchTerm);

    // Add premium animation for search results
    this.triggerSearchAnimation(hasResults);
  }

  renderFilteredUsers(users, searchTerm) {
    if (users.length === 0) {
      this.userDirectory.innerHTML = `
                <div class="empty-state search-empty-state">
                    <div style="font-size: 3rem; margin-bottom: var(--codeleaf-space-2);">🔍</div>
                    <div>No users found matching "${searchTerm}"</div>
                    <small>Try adjusting your search terms</small>
                </div>
            `;
      return;
    }

    this.userDirectory.innerHTML = users
      .map((user, index) => {
        const delay = index * 100; // Stagger animation
        return `
                <div class="user-item search-result-item" 
                     style="animation-delay: ${delay}ms;"
                     onclick="viewUserProfile('${user.username}')">
                    <div class="user-avatar">${generateUserAvatar(
                      user.username
                    )}</div>
                    <div class="user-details">
                        <div class="user-name">${this.highlightSearchTerm(
                          user.username,
                          searchTerm
                        )}</div>
                        <div class="user-stats">
                            <span class="user-stat">${
                              user.totalSolved || 0
                            } solved</span>
                            <span class="user-stat">${
                              user.totalBlogs || 0
                            } blogs</span>
                            <span class="user-stat">${
                              user.currentStreak || 0
                            } day streak</span>
                        </div>
                    </div>
                    <div class="user-action">View Profile →</div>
                </div>
            `;
      })
      .join("");

    // Load status for all displayed users
    this.loadCommunityUsersStatus(users.map((user) => user.username));
  }

  // Add this method to CommunitySearch class
  async loadCommunityUsersStatus(usernames) {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/users-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ usernames }),
      });

      if (!response.ok) throw new Error("Failed to fetch users status");

      const result = await response.json();

      if (result.success) {
        Object.entries(result.status).forEach(([username, status]) => {
          this.updateUserStatusElement(username, status);
        });
      }
    } catch (error) {
      console.error("Error loading community users status:", error);
    }
  }

  updateUserStatusElement(username, status) {
    const statusElement = document.getElementById(`user-status-${username}`);
    if (!statusElement) return;

    const timeAgo = userStatusManager
      ? userStatusManager.getTimeAgo(status.lastActive)
      : "some time ago";

    if (status.isOnline) {
      statusElement.innerHTML =
        '<div class="status-indicator online"></div> Online now';
    } else {
      statusElement.innerHTML = `<div class="status-indicator offline"></div> Last seen ${timeAgo}`;
    }
  }

  highlightSearchTerm(username, searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    const usernameLower = username.toLowerCase();
    const matchIndex = usernameLower.indexOf(searchLower);

    if (matchIndex === -1) {
      return escapeHtml(username.toUpperCase());
    }

    const beforeMatch = username.substring(0, matchIndex);
    const match = username.substring(
      matchIndex,
      matchIndex + searchTerm.length
    );
    const afterMatch = username.substring(matchIndex + searchTerm.length);

    return `${escapeHtml(
      beforeMatch.toUpperCase()
    )}<span class="search-highlight">${escapeHtml(
      match.toUpperCase()
    )}</span>${escapeHtml(afterMatch.toUpperCase())}`;
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

    // Add subtle pulse to results count
    this.searchResultsCount.style.animation = "highlightPulse 1s ease-in-out";
    setTimeout(() => {
      this.searchResultsCount.style.animation = "";
    }, 1000);
  }

  createFloatingParticles() {
    const container = this.userDirectory;
    const particles = ["🌟", "✨", "⚡", "🎯", "💫"];

    for (let i = 0; i < 5; i++) {
      const particle = document.createElement("div");
      particle.className = "search-particle";
      particle.textContent =
        particles[Math.floor(Math.random() * particles.length)];
      particle.style.cssText = `
                position: absolute;
                font-size: 1.5rem;
                pointer-events: none;
                z-index: 1000;
                opacity: 0;
                animation: floatParticle 1.5s ease-out forwards;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
            `;

      container.appendChild(particle);

      // Remove particle after animation
      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      }, 1500);
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

    // Hide clear button and results info
    this.toggleClearButton(false);
    this.searchResultsInfo.style.display = "none";

    // Reset to original user directory
    if (this.allUsers.length > 0) {
      this.renderUserDirectory(this.allUsers);
    }

    // Focus back on input for better UX
    this.searchInput.focus();
  }

  // Method to set all users (called from loadUserDirectory)
  setAllUsers(users) {
    this.allUsers = users;
  }

  // Enhanced render method that works with search
  renderUserDirectory(users) {
    this.userDirectory.innerHTML = users
      .map(
        (user) => `
            <div class="user-item" onclick="viewUserProfile('${
              user.username
            }')">
                <div class="user-avatar">${generateUserAvatar(
                  user.username
                )}</div>
                <div class="user-details">
                    <div class="user-name">${escapeHtml(
                      user.username.toUpperCase()
                    )}</div>
                    <div class="user-stats">
                        <span class="user-stat">${
                          user.totalSolved || 0
                        } solved</span>
                        <span class="user-stat">${
                          user.totalBlogs || 0
                        } blogs</span>
                        <span class="user-stat">${
                          user.currentStreak || 0
                        } day streak</span>
                    </div>
                </div>
                <div class="user-action">View Profile →</div>
            </div>
        `
      )
      .join("");
  }
}

// Initialize search functionality
let communitySearch;

function initializeCommunitySearch() {
  communitySearch = new CommunitySearch();
}

// Render user directory
function renderUserDirectory(users, container) {
  if (!users || users.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                No other users yet 
                <br><small>Be the first to invite friends to join!</small>
            </div>
        `;
    return;
  }

  container.innerHTML = users
    .map(
      (user) => `
        <div class="user-item" onclick="viewUserProfile('${user.username}')">
            <div class="user-avatar">${generateUserAvatar(user.username)}</div>
            <div class="user-details">
                <div class="user-name">${escapeHtml(
                  user.username.toUpperCase()
                )}</div>
                <div class="user-stats">
                    <span class="user-stat">${
                      user.totalSolved || 0
                    } solved</span>
                    <span class="user-stat">${user.totalBlogs || 0} blogs</span>
                    <span class="user-stat">${
                      user.currentStreak || 0
                    } day streak</span>
                </div>
            </div>
            <div class="user-action">View Profile →</div>
        </div>
    `
    )
    .join("");
}

// Generate consistent avatar for any user

// Enhanced avatar system - unique, thematic, and expressive
function generateUserAvatar(username) {
  // Theme-based avatar collections
  const codingThemed = [
    "💻",
    "🔍",
    "⚡",
    "🔧",
    "🚀",
    "🎯",
    "💡",
    "🔮",
    "📱",
    "💾",
    "📊",
    "🔒",
    "🎮",
    "🌐",
    "🛠️",
    "📐",
  ];

  const natureThemed = [
    "🌱",
    "🍃",
    "🌿",
    "☘️",
    "🎍",
    "🌴",
    "🌲",
    "🌳",
    "🌺",
    "🌸",
    "🌼",
    "🌻",
    "🍀",
    "🎋",
    "🪴",
    "🌵",
  ];

  const animalThemed = [
    "🐶",
    "🐱",
    "🐭",
    "🐹",
    "🐰",
    "🦊",
    "🐻",
    "🐼",
    "🐨",
    "🐯",
    "🦁",
    "🐮",
    "🐷",
    "🐸",
    "🐵",
    "🦄",
  ];

  const creativeThemed = [
    "🎨",
    "✏️",
    "📝",
    "🎭",
    "🎪",
    "🎼",
    "🎹",
    "🎸",
    "🎺",
    "🥁",
    "🎬",
    "📷",
    "🎮",
    "🧩",
    "🔭",
    "📚",
  ];

  const wisdomThemed = [
    "🌟",
    "⭐",
    "✨",
    "🔭",
    "📖",
    "🎓",
    "🧠",
    "💎",
    "🏆",
    "🎖️",
    "👑",
    "💫",
    "🌠",
    "🪐",
    "🚀",
    "🔬",
  ];

  // Combine all themes
  const allAvatars = [
    ...codingThemed,
    ...natureThemed,
    ...animalThemed,
    ...creativeThemed,
    ...wisdomThemed,
  ];

  // Generate consistent hash from username
  const hash = username.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);

  // Select avatar based on hash
  const avatarIndex = Math.abs(hash) % allAvatars.length;

  return allAvatars[avatarIndex];
}

// Enhanced pixel avatar generation for profile header
function generatePixelAvatar(username) {
  // Specialized collection for larger profile avatars
  const profileAvatars = [
    "👨‍💻",
    "👩‍💻",
    "🧙‍♂️",
    "🧙‍♀️",
    "🦊",
    "🐱",
    "🐼",
    "🐨",
    "🦁",
    "🐯",
    "🐉",
    "🦄",
    "🌟",
    "🚀",
    "🎯",
    "💎",
    "🔮",
    "⚡",
    "🔥",
    "🌙",
    "☀️",
    "🌈",
    "🌊",
    "🌳",
    "🎨",
    "📚",
    "🔧",
    "🎭",
    "👑",
    "🛡️",
    "🗝️",
    "💡",
  ];

  const hash = username.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);

  const avatarIndex = Math.abs(hash) % profileAvatars.length;
  return profileAvatars[avatarIndex];
}
// View user profile - opens in new page
function viewUserProfile(username) {
  // Navigate to profile page with user parameter
  window.location.href = `/user-profile?user=${encodeURIComponent(username)}`;
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

// Enhanced User Status Manager with Stable Status Display
class UserStatusManager {
  constructor() {
    this.socket = null;
    this.statusUpdateInterval = null;
    this.heartbeatInterval = null;
    this.currentUsername = null;
    this.lastKnownStatus = null;
    this.statusCheckTimeout = null;
  }

  initialize() {
    this.currentUsername = currentUserData?.username;
    if (!this.currentUsername) return;

    this.connectSocket();
    this.startStatusUpdates();
    this.startHeartbeat();
    this.initializeStatusDisplay();
  }

  connectSocket() {
    try {
      this.socket = io("http://localhost:3000", {
        auth: {
          token: localStorage.getItem("authToken"),
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000
      });

      this.socket.on('connect', () => {
        console.log('Connected for real-time status updates');
        this.updateStatusDisplay();
      });

      this.socket.on("user-status-changed", (data) => {
        this.handleStatusUpdate(data);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Disconnected from status updates:', reason);
        // Don't immediately update status - wait for reconnection
      });

      this.socket.on('reconnect', () => {
        console.log('Reconnected to status updates');
        this.updateStatusDisplay();
      });

    } catch (error) {
      console.error("Failed to connect to socket:", error);
    }
  }

  initializeStatusDisplay() {
    // Set initial status to "Checking..." while we fetch actual status
    this.renderStatus({ isOnline: null, lastActive: new Date() });
    
    // Initial status fetch
    this.updateStatusDisplay();
  }

  startStatusUpdates() {
    // Update status every 45 seconds (less frequent to reduce flicker)
    this.statusUpdateInterval = setInterval(() => {
      this.updateStatusDisplay();
    }, 45000);
  }

  startHeartbeat() {
    // Send heartbeat every 25 seconds
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit("heartbeat");
      }
    }, 25000);
  }

  async updateStatusDisplay(username = null) {
    const targetUsername = username || this.currentUsername;
    if (!targetUsername) return;

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `${API_BASE_URL}/user-status/${targetUsername}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch status");

      const result = await response.json();

      if (result.success) {
        this.lastKnownStatus = result.status;
        this.renderStatus(result.status);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      // Don't change status on error - maintain last known status
    }
  }

  renderStatus(status) {
    const statusIndicator = document.getElementById("statusIndicator");
    const statusText = document.getElementById("statusText");
    const profileStatus = document.getElementById("profileStatus");

    if (!statusIndicator || !statusText) return;

    // Clear any pending timeouts
    if (this.statusCheckTimeout) {
      clearTimeout(this.statusCheckTimeout);
    }

    // Add smooth transition
    profileStatus.classList.add("updating");

    setTimeout(() => {
      if (status.isOnline === null) {
        // Status checking
        statusIndicator.className = "status-indicator checking";
        statusText.textContent = "Checking status...";
      } else if (status.isOnline) {
        // User is online
        statusIndicator.className = "status-indicator online";
        statusText.textContent = "Online now";
      } else {
        // User is offline
        statusIndicator.className = "status-indicator offline";
        const timeAgo = this.getTimeAgo(status.lastActive);
        
        // Only show "Last seen just now" for very recent activity
        if (timeAgo === "just now") {
          statusText.textContent = "Online";
          // Re-check in 10 seconds to update to "Last seen X ago"
          this.statusCheckTimeout = setTimeout(() => {
            this.updateStatusDisplay();
          }, 10000);
        } else {
          statusText.textContent = `Last seen ${timeAgo}`;
        }
      }

      profileStatus.classList.remove("updating");
    }, 300);
  }

  getTimeAgo(lastActive) {
    const now = new Date();
    const lastActiveDate = new Date(lastActive);
    const diffMs = now - lastActiveDate;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffSecs < 10) {
      return "just now";
    } else if (diffSecs < 60) {
      return `${diffSecs} seconds ago`;
    } else if (diffMins < 2) {
      return "1 minute ago";
    } else if (diffMins < 60) {
      return `${diffMins} minutes ago`;
    } else if (diffHours < 2) {
      return "1 hour ago";
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else if (diffDays < 2) {
      return "1 day ago";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return lastActiveDate.toLocaleDateString();
    }
  }

  handleStatusUpdate(data) {
    // Only update if it's for the current user
    if (data.username === this.currentUsername) {
      this.lastKnownStatus = data;
      this.renderStatus(data);
    }

    // Update community directory status
    this.updateCommunityUserStatus(data.username, data);
  }

  updateCommunityUserStatus(username, status) {
    const userElement = document.querySelector(`[data-username="${username}"]`);
    if (userElement) {
      const statusElement = userElement.querySelector(".user-status");
      if (statusElement) {
        if (status.isOnline) {
          statusElement.innerHTML = '<div class="status-indicator online"></div> Online now';
        } else {
          const timeAgo = this.getTimeAgo(status.lastActive);
          // For community users, be more conservative with "just now"
          if (timeAgo === "just now") {
            statusElement.innerHTML = '<div class="status-indicator online"></div> Online';
          } else {
            statusElement.innerHTML = `<div class="status-indicator offline"></div> Last seen ${timeAgo}`;
          }
        }
      }
    }
  }

  // Force logout/disconnect
  forceOffline() {
    if (this.socket) {
      this.socket.emit('force-disconnect');
    }
  }

  destroy() {
    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval);
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.statusCheckTimeout) {
      clearTimeout(this.statusCheckTimeout);
    }
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

// Initialize status manager
let userStatusManager;

function initializeUserStatusManager() {
  userStatusManager = new UserStatusManager();
  userStatusManager.initialize();
}

// Initialize profile when page loads
document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("authToken");
  if (!token) {
    window.location.href = "/";
    return;
  }
  loadUserProfile();
  // Initialize question history search after profile loads
  setTimeout(() => {
    initializeQuestionHistorySearch();
  }, 1000);
});

// Add responsive behavior for the heatmap
window.addEventListener("resize", function () {
  if (currentUserData) {
    renderConsistencyMap();
  }
});

// Add to profile.js
window.addEventListener("beforeunload", () => {
  if (userStatusManager) {
    userStatusManager.destroy();
  }
});