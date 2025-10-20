// Modified version of profile.js that loads data for the specified user
const API_BASE_URL = "https://focus-flow-lopn.onrender.com/api";
let currentViewingUser = null;

// Get username from URL parameters
function getTargetUsername() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("user");
}

// Load user profile data for the target user
async function loadUserProfile() {
  const targetUsername = getTargetUsername();
  if (!targetUsername) {
    window.location.href = "/profile";
    return;
  }

  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch(
      `${API_BASE_URL}/user-info/${encodeURIComponent(targetUsername)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to load user data");
    }

    const result = await response.json();

    if (result.success) {
      currentViewingUser = result.user;
      updateUserProfileMetaTags(currentViewingUser);
      renderUserProfile();
      renderAchievements();
      renderQuestionHistory();
      renderBlogs();
      renderConsistencyMap();
      renderProgressBars();
      loadUserDirectory();
      // Load the new sections
      await loadSocialLinks();
      initializeProgressChart(); // Add this line
    } else {
      throw new Error(result.error || "Failed to load user data");
    }
  } catch (error) {
    console.error("Error loading user profile:", error);
    // Show error and redirect after delay
    showError(
      "User not found or access denied. Redirecting to your profile..."
    );
    setTimeout(() => {
      window.location.href = "/profile";
    }, 3000);
  }
}

// Enhanced function to update ALL meta tags including canonical URL
function updateUserProfileMetaTags(userData) {
  if (!userData) return;

  const username = userData.username || "Coding Enthusiast";
  const totalSolved = userData.statistics?.totalProblemsSolved || 0;
  const currentStreak = userData.statistics?.currentStreak || 0;
  const totalBlogs = userData.statistics?.totalBlogsPublished || 0;
  const blogLikes = userData.statistics?.totalBlogLikes || 0;
  const activeDays = calculateActiveDays(userData);
  const userLevel = calculateUserLevel(userData).level;
  const totalXP = calculateTotalXP(userData);
  const joinDate = userData.accountCreated
    ? new Date(userData.accountCreated).getFullYear()
    : new Date().getFullYear();

  console.log("Updating meta tags for viewed user:", username);

  // Update Canonical URL with username parameter
  const canonicalUrl = `https://focus-flow-lopn.onrender.com/user-profile.html?user=${encodeURIComponent(
    username
  )}`;
  updateCanonicalUrl(canonicalUrl);

  // Update Page Title
  document.title = `${username} - ${userLevel} Level | FocusFlow Profile`;

  // Update Meta Description
  const metaDescription = `View ${username}'s coding profile on FocusFlow: ${totalSolved} problems solved, ${currentStreak} day streak, ${userLevel} level. Track programming progress and achievements.`;
  updateMetaTag("name", "description", metaDescription);

  // Update Open Graph Tags
  updateMetaTag(
    "property",
    "og:title",
    `${username} - FocusFlow Coding Profile`
  );
  updateMetaTag(
    "property",
    "og:description",
    `View ${username}'s coding journey: ${totalSolved} problems solved, ${currentStreak} day streak, ${userLevel} level`
  );
  updateMetaTag("property", "profile:username", username);
  updateMetaTag("property", "og:url", canonicalUrl);

  // Update Twitter Tags
  updateMetaTag(
    "property",
    "twitter:title",
    `${username} - FocusFlow Coding Profile`
  );
  updateMetaTag(
    "property",
    "twitter:description",
    `View ${username}'s coding journey: ${totalSolved} problems solved, ${currentStreak} day streak`
  );
  updateMetaTag("property", "twitter:url", canonicalUrl);

  // Update Both JSON-LD Schemas with screenshot and proper URLs
  updateProfileSchema(
    username,
    totalSolved,
    currentStreak,
    totalBlogs,
    blogLikes,
    activeDays,
    userLevel,
    totalXP,
    joinDate,
    canonicalUrl
  );
  updateLearningResourceSchema(
    username,
    totalSolved,
    currentStreak,
    userLevel,
    canonicalUrl
  );

  // Update keywords with user-specific terms
  updateMetaTag(
    "name",
    "keywords",
    `coding profile, ${username}, ${userLevel} programmer, DSA progress, ${totalSolved} problems solved, coding achievements, ${currentStreak} day streak`
  );
}

// Update canonical URL dynamically
function updateCanonicalUrl(url) {
  let canonicalLink = document.getElementById("canonicalUrl");
  if (!canonicalLink) {
    canonicalLink = document.createElement("link");
    canonicalLink.id = "canonicalUrl";
    canonicalLink.rel = "canonical";
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.href = url;
  console.log("Updated canonical URL:", url);
}

// Helper function to update meta tags
function updateMetaTag(attribute, value, content) {
  let meta = document.querySelector(`meta[${attribute}="${value}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(attribute, value);
    document.head.appendChild(meta);
  }
  meta.content = content;
}

// Update Profile Schema with real user data, screenshot, and proper canonical URL
function updateProfileSchema(
  username,
  totalSolved,
  currentStreak,
  totalBlogs,
  blogLikes,
  activeDays,
  userLevel,
  totalXP,
  joinDate,
  canonicalUrl
) {
  const schemaScript = document.getElementById("profileSchema");
  if (!schemaScript) {
    console.error("Profile schema script element not found");
    return;
  }

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: `${username}'s Coding Profile - FocusFlow`,
    description: `View ${username}'s comprehensive coding progress tracking with ${totalSolved} problems solved and ${currentStreak} day streak`,
    url: canonicalUrl,
    screenshot: "https://focus-flow-lopn.onrender.com/assets/profile-app-screenshot.png",
    mainEntity: {
      "@type": "Person",
      name: username,
      description: `${userLevel} level programmer with ${totalSolved} coding problems solved and active since ${joinDate}`,
      memberOf: {
        "@type": "Organization",
        name: "FocusFlow Coding Community",
        url: "https://focus-flow-lopn.onrender.com",
      },
      knowsAbout: [
        "Data Structures",
        "Algorithms",
        "Problem Solving",
        "Programming",
        "Coding Challenges",
        "Software Development",
      ],
      hasCredential: {
        "@type": "EducationalOccupationalCredential",
        name: `${userLevel} Level Programmer`,
        credentialCategory: "Skill Level",
        competencyRequired: `${totalSolved}+ problems solved`,
      },
    },
    isPartOf: {
      "@type": "WebApplication",
      name: "FocusFlow",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web Browser",
      description:
        "Track your DSA progress and master your programming journey",
      url: "https://focus-flow-lopn.onrender.com",
      screenshot: "https://focus-flow-lopn.onrender.com/assets/profile-app-screenshot.png",
    },
  };

  schemaScript.textContent = JSON.stringify(schemaData);
  console.log("Updated Profile Schema for viewed user:", username);
}

// Update Learning Resource Schema with real user data, screenshot, and proper canonical URL
function updateLearningResourceSchema(
  username,
  totalSolved,
  currentStreak,
  userLevel,
  canonicalUrl
) {
  const schemaScript = document.getElementById("learningResourceSchema");
  if (!schemaScript) {
    console.error("Learning Resource schema script element not found");
    return;
  }

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: `${username}'s Progress Dashboard - FocusFlow`,
    description: `View ${username}'s programming journey tracking: ${totalSolved} problems solved, ${currentStreak} day streak, ${userLevel} level achievement`,
    learningResourceType: "Progress Tracking Dashboard",
    educationalLevel: getUserEducationalLevel(totalSolved),
    typicalAgeRange: "16-99",
    assesses: [
      "Programming Skills",
      "Problem Solving Ability",
      "Algorithm Knowledge",
      "Data Structure Proficiency",
      "Coding Consistency",
    ],
    competencyRequired: "Basic Programming Knowledge",
    screenshot: "https://focus-flow-lopn.onrender.com/assets/profile-app-screenshot.png",
    educationalAlignment: {
      "@type": "AlignmentObject",
      alignmentType: "teaches",
      educationalFramework: "Computer Science Curriculum",
      targetName: "Programming Proficiency",
    },
    provider: {
      "@type": "Organization",
      name: "FocusFlow",
      url: "https://focus-flow-lopn.onrender.com/",
    },
    url: canonicalUrl,
    timeRequired: `PT${Math.round(totalSolved * 30)}M`,
    hasPart: {
      "@type": "WebApplication",
      name: "Progress Analytics",
      description: "Interactive progress charts and consistency tracking",
      screenshot: "https://focus-flow-lopn.onrender.com/assets/progress-chart.png",
    },
  };

  schemaScript.textContent = JSON.stringify(schemaData);
  console.log("Updated Learning Resource Schema for viewed user:", username);
}

// Helper function to determine educational level based on problems solved
function getUserEducationalLevel(totalSolved) {
  if (totalSolved >= 100) return "Advanced";
  if (totalSolved >= 50) return "Intermediate";
  if (totalSolved >= 10) return "Beginner";
  return "Novice";
}

// Load social links for the viewed user
async function loadSocialLinks() {
  const targetUsername = getTargetUsername();
  if (!targetUsername) return;

  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch(
      `${API_BASE_URL}/social-links/${encodeURIComponent(targetUsername)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to load social links");
    }

    const result = await response.json();

    if (result.success) {
      renderSocialLinks(result.socialLinks);
    } else {
      throw new Error(result.error || "Failed to load social links");
    }
  } catch (error) {
    console.error("Error loading social links:", error);
    // Initialize with empty data
    renderSocialLinks({
      linkedin: "",
      github: "",
      leetcode: "",
      gfg: "",
    });
  }
}

// Enhanced render function for view-only social links
function renderSocialLinks(socialLinksData) {
  const displayContainer = document.getElementById("socialLinksDisplay");

  if (!displayContainer) return;

  // Social platforms configuration
  const platforms = [
    {
      key: "linkedin",
      name: "LinkedIn",
      icon: "💼",
    },
    {
      key: "github",
      name: "GitHub",
      icon: "🐙",
    },
    {
      key: "leetcode",
      name: "LeetCode",
      icon: "🐦",
    },
    {
      key: "gfg",
      name: "GeeksforGeeks",
      icon: "🌐",
    },
  ];

  // Render display view only
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
}

// Enhanced Progress Chart for user-profile with full animations
class EnhancedProgressChart {
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
      const targetUsername = getTargetUsername();
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `${API_BASE_URL}/progress-stats/${encodeURIComponent(targetUsername)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          this.currentData = result.stats;
          return;
        }
      }
    } catch (error) {
      console.error("Error loading progress data:", error);
    }

    // Fallback: Try to calculate from user data
    if (currentViewingUser && currentViewingUser.consistency) {
      this.currentData = this.calculateStatsFromUserData(currentViewingUser);
    } else {
      // Final fallback
      this.currentData = { total: 0, easy: 0, medium: 0, hard: 0 };
    }
  }

  calculateStatsFromUserData(user) {
    const totalSolved = user.statistics?.totalProblemsSolved || 0;

    // For demo purposes, distribute among difficulties
    return {
      total: totalSolved,
      easy: Math.floor(totalSolved * 0.4),
      medium: Math.floor(totalSolved * 0.4),
      hard: Math.floor(totalSolved * 0.2),
    };
  }

  // Render unified circular progress chart with animations
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

  // Enhanced legend rendering with click functionality
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

      // Add hover effects
      legendItem.addEventListener("mouseenter", () => {
        if (this.isAnimating || this.activeFilter) return;
        this.highlightSegment(key);
      });

      legendItem.addEventListener("mouseleave", () => {
        if (this.isAnimating || this.activeFilter) return;
        this.unhighlightSegments();
      });

      this.legend.appendChild(legendItem);
      this.legendItems.set(key, legendItem);
    });
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
        <small>This user hasn't solved any problems yet</small>
      </div>
    `;
  }
}

// Initialize the enhanced chart
let enhancedProgressChart;

function initializeProgressChart() {
  enhancedProgressChart = new EnhancedProgressChart();
}

function showError(message) {
  const container = document.querySelector(".container");
  const errorDiv = document.createElement("div");
  errorDiv.style.cssText = `
            background: var(--codeleaf-error);
            color: white;
            padding: var(--codeleaf-space-4);
            border-radius: var(--codeleaf-radius-md);
            margin: var(--codeleaf-space-4);
            text-align: center;
            font-weight: 600;
        `;
  errorDiv.textContent = message;
  container.insertBefore(errorDiv, container.firstChild);
}

// Enhanced render function with all new features - FIXED for user-profile
function renderUserProfile() {
  if (!currentViewingUser) return;

  const user = currentViewingUser;
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
    profileBadge.textContent = "";
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
}

// Reuse all other functions from profile (make sure these are included)
// Pixel Avatar System
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
  const allOptions = [...animals, ...emojis];
  const hash = username.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
  const index = Math.abs(hash) % allOptions.length;
  return allOptions[index];
}

// Format date
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

// Load user directory - all users except current user and current viewing user
async function loadUserDirectory() {
  const container = document.getElementById("userDirectory");
  const currentUsername = currentViewingUser?.username;
  const loggedInUsername = await getCurrentUsername();

  if (!currentUsername || !loggedInUsername) {
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
      // Filter out current viewing user and logged in user
      const otherUsers = result.users.filter(
        (user) =>
          user.username !== currentUsername &&
          user.username !== loggedInUsername
      );
      renderUserDirectory(otherUsers, container);
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
// Get current logged in username
async function getCurrentUsername() {
  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch(`${API_BASE_URL}/verify-token`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const result = await response.json();
      return result.user;
    }
  } catch (error) {
    console.error("Error getting current username:", error);
  }
  return null;
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

// Render user directory (same as profile)
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

// Generate consistent avatar for any user (same as profile)
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
// View user profile - opens in new page (same as profile)
function viewUserProfile(username) {
  // Navigate to profile page with user parameter
  window.location.href = `/user-profile?user=${encodeURIComponent(username)}`;
}

function renderAchievements() {
  const grid = document.getElementById("achievementsGrid");
  const userData = currentViewingUser;

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
                      ? `<br><small>Progress: ${roundedProgress}%</small>`
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
// Render question history with expandable days (same as profile)
function renderQuestionHistory() {
  const container = document.getElementById("questionHistory");
  if (!currentViewingUser) return;

  const questions = currentViewingUser.questions?.dailyProgress || [];
  const solvedQuestions = questions
    .flatMap((day) =>
      day.completedQuestions > 0
        ? [
            {
              day: day.day,
              date: day.date,
              solved: day.completedQuestions,
              total: day.totalQuestions,
              questions: day.questions || [], // Use the actual questions data
            },
          ]
        : []
    )
    .reverse()
    .slice(0, 10); // Show last 10 days with activity

  if (solvedQuestions.length === 0) {
    container.innerHTML =
      '<div class="empty-state">No questions solved yet.</div>';
    return;
  }

  container.innerHTML = solvedQuestions
    .map(
      (day) => `
            <div class="content-item question-day" data-day="${day.day}">
                <div class="question-day-header">
                    <div class="question-day-info">
                        <div class="question-title">Day ${
                          day.day
                        } Progress</div>
                        <div class="question-date">${
                          day.date ? formatDate(day.date) : `Day ${day.day}`
                        }</div>
                    </div>
                    <div class="question-day-stats">
                        <span class="question-count">${day.solved}/${
        day.total
      } solved</span>
                        ${
                          day.questions && day.questions.length > 0
                            ? `
                            <button class="toggle-day-btn" onclick="toggleDayDetails(${day.day})" aria-label="Toggle day details">
                                <span class="toggle-icon">▼</span>
                            </button>
                        `
                            : ""
                        }
                    </div>
                </div>
                ${
                  day.questions && day.questions.length > 0
                    ? `
                    <div class="question-day-details" id="day-${
                      day.day
                    }-details" style="display: none;">
                        <div class="solved-questions-list">
                            ${renderDayQuestions(day.questions)}
                        </div>
                    </div>
                `
                    : ""
                }
            </div>
        `
    )
    .join("");
}

// Render individual questions for a day
function renderDayQuestions(questions) {
  if (!questions || questions.length === 0) {
    return '<div class="empty-day-state">No questions solved this day</div>';
  }

  return questions
    .map(
      (question, index) => `
            <div class="solved-question-item" style="animation-delay: ${
              index * 0.05
            }s">
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

// Toggle day details with smooth animation
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
      if (
        focusedElement &&
        focusedElement.classList.contains("toggle-day-btn")
      ) {
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

// Render blogs (only public blogs for other users)
function renderBlogs() {
  const container = document.getElementById("blogsContent");
  if (!currentViewingUser) return;

  const blogs = currentViewingUser.blogs?.recentBlogs || [];

  if (blogs.length === 0) {
    container.innerHTML = '<div class="empty-state">No public blogs yet.</div>';
    return;
  }

  container.innerHTML = blogs
    .map(
      (blog) => `
                    <div class="content-item blog-item">
                        <div class="blog-info">
                            <div class="blog-title">${escapeHtml(
                              blog.title
                            )}</div>
                            <div class="blog-date">${formatRelativeTime(
                              blog.createdAt
                            )} • ${blog.views || 0} views • ${
        blog.likes || 0
      } likes</div>
                        </div>
                        <a href="/blogs/${
                          blog.slug
                        }" class="blog-link">Read →</a>
                    </div>
                `
    )
    .join("");
}

// Render consistency map
function renderConsistencyMap() {
  const heatmapGrid = document.getElementById("heatmapGrid");
  const monthsRow = document.getElementById("heatmapMonths");
  if (!currentViewingUser) return;
  const heatmapData = currentViewingUser.activity?.heatmapData || {};
  renderHeatmap(heatmapData, heatmapGrid, monthsRow);
}

// Heatmap rendering function
function renderHeatmap(activityData, heatmapGrid, monthsRow) {
  heatmapGrid.innerHTML = "";
  monthsRow.innerHTML = "";
  const startDate = new Date("2025-09-25");
  const today = new Date();
  const monthLabels = generateMonthLabels(startDate, today);
  monthLabels.forEach((month) => {
    const monthLabel = document.createElement("div");
    monthLabel.className = "month-label";
    monthLabel.textContent = month;
    monthsRow.appendChild(monthLabel);
  });
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
  if (!currentViewingUser) return;
  const user = currentViewingUser;
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

// Utility function to escape HTML
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Initialize when page loads
document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("authToken");
  if (!token) {
    window.location.href = "/index";
    return;
  }
  loadUserProfile();
});

// Add responsive behavior for the heatmap
window.addEventListener("resize", function () {
  if (currentViewingUser) {
    renderConsistencyMap();
  }
});

