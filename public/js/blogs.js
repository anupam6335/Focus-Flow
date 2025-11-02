let currentPage = 1;
let totalPages = 1;
let editingBlog = null;
let currentTab = "all"; // 'all', 'my-blogs', 'popular'
const API_BASE_URL = "https://focus-flow-lopn.onrender.com/api";
const BASE_URL = "https://focus-flow-lopn.onrender.com";

// URL Redirect
const FRONTEND_URL = "https://focus-flow-lopn.onrender.com";

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

// ===== ENHANCED REAL-TIME NOTIFICATION SYSTEM =====
class NotificationManager {
  constructor() {
    this.isOpen = false;
    this.notifications = [];
    this.unreadCount = 0;
    this.currentCategory = "all";
    this.pollingInterval = null;
    this.socket = null;
    this.isConnected = false;

    // Get auth token from localStorage
    this.authToken = localStorage.getItem("authToken");
    this.userId = localStorage.getItem("userId");

    this.initializeElements();
    this.setupEventListeners();
    this.initializeSocketConnection();
    this.startPolling();
    this.startAutoRefresh();
  }

  // NEW: Start automatic notification refresh
  startAutoRefresh() {
    // Clear any existing interval
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
    }

    // Refresh notifications every 30 seconds when panel is closed
    this.autoRefreshInterval = setInterval(() => {
      if (!this.isOpen && this.authToken) {
        this.checkForNewNotifications();
      }
    }, 30000); // 30 seconds

    // Also refresh immediately on initialization
    setTimeout(() => {
      if (this.authToken) {
        this.loadNotifications();
      }
    }, 2000);
  }

  // ENHANCED: Initialize with automatic loading
  async initializeElements() {
    this.bell = document.getElementById("notificationBell");
    this.badge = document.getElementById("notificationBadge");
    this.panel = document.getElementById("notificationPanel");
    this.list = document.getElementById("notificationList");
    this.markAllReadBtn = document.getElementById("markAllRead");
    this.closeBtn = document.getElementById("closeNotifications");
    this.viewAllBtn = document.getElementById("viewAllNotifications");

    // Category elements
    this.categoryTabs = document.querySelectorAll(".category-tab");

    // Load notifications automatically if user is authenticated
    if (this.authToken) {
      await this.loadNotifications();
    }
  }

  // ENHANCED: Setup event listeners with page visibility support
  setupEventListeners() {
    // Toggle notification panel
    if (this.bell) {
      this.bell.addEventListener("click", (e) => {
        e.stopPropagation();
        this.togglePanel();
      });
    }

    // Mark all as read
    if (this.markAllReadBtn) {
      this.markAllReadBtn.addEventListener("click", () => {
        this.markAllAsRead();
      });
    }

    // Close panel
    if (this.closeBtn) {
      this.closeBtn.addEventListener("click", () => {
        this.closePanel();
      });
    }

    // View all notifications
    if (this.viewAllBtn) {
      this.viewAllBtn.addEventListener("click", () => {
        this.viewAllNotifications();
      });
    }

    // Category tab event listeners
    if (this.categoryTabs) {
      this.categoryTabs.forEach((tab) => {
        tab.addEventListener("click", (e) => {
          e.stopPropagation();
          const category = e.currentTarget.dataset.category;
          this.switchCategory(category);
        });
      });
    }

    // Close panel when clicking outside
    document.addEventListener("click", (e) => {
      if (
        this.isOpen &&
        this.panel &&
        !this.panel.contains(e.target) &&
        e.target !== this.bell
      ) {
        this.closePanel();
      }
    });

    // Close on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen) {
        this.closePanel();
      }
    });

    // NEW: Refresh notifications when page becomes visible
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && this.authToken && !this.isOpen) {
        this.checkForNewNotifications();
      }
    });

    // NEW: Refresh notifications when user comes back online
    window.addEventListener("online", () => {
      if (this.authToken) {
        this.loadNotifications();
      }
    });
  }

  // Switch between notification categories
  switchCategory(category) {
    if (this.currentCategory === category) return;

    console.log(`Switching to category: ${category}`);

    // Update active tab
    this.categoryTabs.forEach((tab) => {
      tab.classList.remove("active");
      if (tab.dataset.category === category) {
        tab.classList.add("active");
      }
    });

    this.currentCategory = category;

    // Add switching animation
    if (this.list) {
      this.list.classList.add("switching");
    }

    // Re-render notifications for the selected category
    setTimeout(() => {
      this.renderNotifications();
      if (this.list) {
        this.list.classList.remove("switching");
      }
    }, 150);
  }

  // Render notifications with category filtering
  renderNotifications() {
    if (!this.list) return;

    console.log(
      `Rendering notifications for category: ${this.currentCategory}`
    );

    // Filter notifications based on current category
    let filteredNotifications = [...this.notifications];

    if (this.currentCategory === "unread") {
      filteredNotifications = this.notifications.filter((n) => !n.isRead);
    } else if (this.currentCategory === "read") {
      filteredNotifications = this.notifications.filter((n) => n.isRead);
    }

    console.log(`Filtered notifications: ${filteredNotifications.length}`);

    if (filteredNotifications.length === 0) {
      this.renderEmptyState();
      return;
    }

    // In renderNotifications method - update the HTML template
    this.list.innerHTML = filteredNotifications
      .map((notification) => {
        const isUnread = !notification.isRead;
        return `
    <div class="notification-item ${
      isUnread ? "unread" : "read"
    } clickable-notification" 
         data-id="${notification._id}" 
         data-type="${notification.type}"
         title="Click to view">
      <div class="notification-content">
        <div class="notification-type">
          <span class="notification-type-icon">${this.getTypeIcon(
            notification.type
          )}</span>
          ${this.getTypeLabel(notification.type)}
        </div>
        <p class="notification-message">${notification.message}</p>
        <div class="notification-meta">
          <span class="notification-author">@${notification.sender}</span>
          <span class="notification-time">${this.formatTime(
            notification.timestamp
          )}</span>
        </div>
        ${
          isUnread
            ? '<div class="notification-live-indicator">🟢 Live</div>'
            : ""
        }
        ${
          notification.url
            ? '<div class="notification-url-hint">🔗 Click to view</div>'
            : ""
        }
      </div>
    </div>
  `;
      })
      .join("");

    // Add click handlers
    this.list.querySelectorAll(".notification-item").forEach((item) => {
      item.addEventListener("click", () => {
        this.handleNotificationClick(item);
      });
    });
  }

  // Render empty state for categories
  renderEmptyState() {
    if (!this.list) return;

    let emptyMessage = "";
    let emptyIcon = "🔔";

    switch (this.currentCategory) {
      case "unread":
        emptyMessage = "No unread notifications";
        emptyIcon = "📭";
        break;
      case "read":
        emptyMessage = "No read notifications";
        emptyIcon = "📖";
        break;
      default:
        emptyMessage = "No notifications yet";
        emptyIcon = "🔔";
    }

    this.list.innerHTML = `
      <div class="notification-empty">
        <div class="notification-empty-icon">${emptyIcon}</div>
        <p>${emptyMessage}</p>
        <p style="font-size: var(--codeleaf-font-sm); margin-top: var(--codeleaf-space-2);">
          ${
            this.currentCategory === "all"
              ? "Follow users to see their activity here"
              : "Notifications will appear here"
          }
        </p>
        ${
          this.isConnected
            ? '<div style="margin-top: var(--codeleaf-space-2); padding: var(--codeleaf-space-2); background: var(--codeleaf-bg-tertiary); border-radius: var(--codeleaf-radius-md); font-size: var(--codeleaf-font-xs); color: var(--codeleaf-accent-primary);">🔗 Real-time notifications enabled</div>'
            : ""
        }
      </div>
    `;
  }

  // ENHANCED: Update badge with animation for new notifications
  updateBadge() {
    // Update main badge
    if (this.badge) {
      if (this.unreadCount > 0) {
        this.badge.textContent =
          this.unreadCount > 99 ? "99+" : this.unreadCount;
        this.badge.style.display = "flex";
        if (this.bell) {
          this.bell.classList.add("has-unread");
        }

        // Add pulse animation for new notifications
        if (this.unreadCount === 1 && this.bell) {
          this.bell.style.animation = "bell-pulse 2s infinite";
        }
      } else {
        this.badge.style.display = "none";
        if (this.bell) {
          this.bell.classList.remove("has-unread");
          this.bell.style.animation = "none";
        }
      }
    }

    // Update category counters
    this.updateCategoryCounters();
  }

  // Update counters on category tabs
  updateCategoryCounters() {
    const totalCount = this.notifications.length;
    const unreadCount = this.notifications.filter((n) => !n.isRead).length;
    const readCount = totalCount - unreadCount;

    console.log(
      `Updating counters - Total: ${totalCount}, Unread: ${unreadCount}, Read: ${readCount}`
    );

    // Update counters for each category
    this.updateCategoryCounter("all", totalCount);
    this.updateCategoryCounter("unread", unreadCount);
    this.updateCategoryCounter("read", readCount);

    // Add/remove unread indicator from unread tab
    const unreadTab = document.querySelector('[data-category="unread"]');
    if (unreadTab) {
      if (unreadCount > 0) {
        unreadTab.classList.add("has-unread");
      } else {
        unreadTab.classList.remove("has-unread");
      }
    }
  }

  // Helper to update category counter
  updateCategoryCounter(category, count) {
    const tab = document.querySelector(`[data-category="${category}"]`);
    if (!tab) {
      console.error(`Tab for category ${category} not found`);
      return;
    }

    let counter = tab.querySelector(".category-counter");

    if (count > 0) {
      if (!counter) {
        counter = document.createElement("span");
        counter.className = "category-counter";
        tab.appendChild(counter);
      }
      counter.textContent = count;
    } else if (counter) {
      counter.remove();
    }
  }

  async handleNotificationClick(notificationElement) {
    const notificationId = notificationElement.dataset.id;
    const notification = this.notifications.find(
      (n) => n._id === notificationId
    );

    if (!notification) return;

    console.log(`🖱️ Handling notification click:`, notification);

    // Mark as read on server
    await this.markAsRead(notificationId);

    // Update local state
    notification.isRead = true;
    this.unreadCount = Math.max(0, this.unreadCount - 1);

    // Handle navigation based on notification type
    if (notification.url) {
      console.log(`🔗 Navigating to: ${notification.url}`);
      window.location.href = notification.url;
      return;
    }

    // FIX: Handle like notifications specifically
    if (notification.type === "like_on_blog" && notification.blogSlug) {
      console.log(`❤️ Redirecting to blog: ${notification.blogSlug}`);
      window.location.href = `/blogs/${notification.blogSlug}`;
      return;
    }

    // Fallback navigation for other notification types
    if (notification.blogSlug) {
      let url = `/blogs/${notification.blogSlug}`;

      // Add comment parameter for comment-related notifications
      if (
        notification.commentId &&
        (notification.type === "comment_on_blog" ||
          notification.type === "reply_to_comment" ||
          notification.type === "mention_in_comment")
      ) {
        url += `?comment=${notification.commentId}`;
      }

      console.log(`🔄 Fallback navigation to: ${url}`);
      window.location.href = url;
      return;
    }

    // Update UI if no navigation occurred
    this.updateBadge();
    if (this.currentCategory === "unread" && this.unreadCount === 0) {
      this.switchCategory("all");
    } else {
      this.renderNotifications();
    }
  }

  // FIXED: Mark all as read with proper real-time updates
  async markAllAsRead() {
    if (!this.authToken || this.unreadCount === 0) return;

    try {
      const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
        },
      });

      if (response.ok) {
        // Update local state
        this.notifications.forEach((notification) => {
          notification.isRead = true;
        });
        this.unreadCount = 0;

        // Update UI
        this.updateBadge();

        // FIXED: Handle category switching based on current view
        if (this.currentCategory === "unread") {
          // If we're viewing unread and mark all as read, switch to all
          this.switchCategory("all");
        } else {
          // Otherwise just re-render the current view
          this.renderNotifications();
        }

        toastManager.success(
          "All notifications marked as read",
          "Notifications"
        );
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toastManager.error("Failed to mark all as read", "Error");
    }
  }

  // ENHANCED: Handle real-time notifications with visual feedback
  handleRealTimeNotification(notification) {
    // Add new notification to the beginning of the list
    this.notifications.unshift(notification);

    // Increment unread count
    this.unreadCount++;

    // Update UI immediately
    this.updateBadge();

    // Show real-time alert (even when panel is closed)
    this.showRealTimeNotificationAlert(notification);

    // Update the list if panel is open
    if (this.isOpen) {
      this.renderNotifications();
    }

    // Auto-close notification after 5 seconds
    setTimeout(() => {
      this.hideRealTimeNotificationAlert();
    }, 5000);
  }

  // In main.js - Back to using main route
  async loadNotifications() {
    if (!this.authToken) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/notifications?category=${this.currentCategory}`,
        {
          headers: {
            Authorization: `Bearer ${this.authToken}`,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          this.notifications = result.notifications || [];
          this.unreadCount = result.unreadCount || 0;

          // Update UI even if panel is closed
          this.updateBadge();

          // Only render if panel is open
          if (this.isOpen) {
            this.renderNotifications();
          }
        }
      }
    } catch (error) {
      // Silent fail for background updates
    }
  }

  // Keep fallback as backup
  async loadFallbackNotifications() {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications-fallback`, {
        headers: { Authorization: `Bearer ${this.authToken}` },
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
      console.error("Fallback also failed:", error);
    }
  }

  getTypeLabel(type) {
    const labels = {
      new_blog: "New Blog",
      comment_on_blog: "Comment on Blog",
      reply_to_comment: "Reply to Comment",
      like_on_blog: "Like on Blog",
      like_on_comment: "Like on Comment",
      mention_in_blog: "Mention in Blog",
      mention_in_comment: "Mention in Comment",
      comments_disabled: "Comments Disabled",
      user_activity: "Activity",
    };
    return labels[type] || "Notification";
  }

  // Add icon for comment likes
  getTypeIcon(type) {
    const icons = {
      new_blog: "📝",
      comment_on_blog: "💬",
      reply_to_comment: "↩️",
      like_on_blog: "❤️",
      like_on_comment: "👍",
      mention_in_blog: "📌",
      mention_in_comment: "📌",
      comments_disabled: "🚫",
      user_activity: "🔔",
    };
    return icons[type] || "🔔";
  }

  formatTime(timestamp) {
    try {
      // Handle both string and Date objects
      const time = new Date(timestamp);

      // Check if the date is valid
      if (isNaN(time.getTime())) {
        return "Recently";
      }

      const now = new Date();
      const diffMs = now - time;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      // For older dates, use a more readable format
      return time.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: time.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    } catch (error) {
      console.error("Error formatting time:", error, "Timestamp:", timestamp);
      return "Recently";
    }
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
    if (this.panel) {
      this.panel.classList.add("open");
    }
    await this.loadNotifications();
  }

  closePanel() {
    this.isOpen = false;
    if (this.panel) {
      this.panel.classList.remove("open");
    }
  }

  viewAllNotifications() {
    this.closePanel();
    toastManager.info("Notifications page coming soon!", "Feature Preview");
  }

  async markAsRead(notificationId) {
    if (!this.authToken) return;

    try {
      await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
        },
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }

  showNewNotificationAlert() {
    if (this.bell) {
      this.bell.style.animation = "none";
      setTimeout(() => {
        this.bell.style.animation = "bell-pulse 1s ease 2";
      }, 10);
    }
  }

  startPolling() {
    this.pollingInterval = setInterval(() => {
      if (this.authToken && !this.isOpen && !this.isConnected) {
        this.checkForNewNotifications();
      }
    }, 120000);
  }

  // ENHANCED: Check for new notifications (optimized for background use)
  async checkForNewNotifications() {
    if (!this.authToken) return;

    try {
      const response = await fetch(`${API_BASE_URL}/notifications/count`, {
        headers: {
          Authorization: `Bearer ${this.authToken}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const previousCount = this.unreadCount;
          this.unreadCount = result.unreadCount;

          // Update badge if count changed
          if (this.unreadCount !== previousCount) {
            this.updateBadge();

            // Show subtle visual feedback for new notifications
            if (this.unreadCount > previousCount) {
              this.showNewNotificationAlert();
            }
          }
        }
      }
    } catch (error) {
      // Silent fail for background checks
    }
  }

  // Real-time notification alert methods
  showRealTimeNotificationAlert(notification) {
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

    alert
      .querySelector(".notification-alert-close")
      .addEventListener("click", (e) => {
        e.stopPropagation();
        alert.remove();
      });

    alert.addEventListener("click", () => {
      if (notification.blogSlug) {
        window.location.href = `/blogs/${notification.blogSlug}`;
      }
      alert.remove();
    });

    document.body.appendChild(alert);
    this.addNotificationAlertStyles();
  }

  addNotificationAlertStyles() {
    if (!document.getElementById("notification-alert-styles")) {
      const styles = document.createElement("style");
      styles.id = "notification-alert-styles";
      styles.textContent = `
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideOutRight {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(100%); }
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

  // Socket connection methods
  initializeSocketConnection() {
    if (!this.authToken) {
      return;
    }

    try {
      this.socket = io({
        auth: {
          token: this.authToken,
        },
      });

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
    } catch (error) {
      console.error("Error initializing socket connection:", error);
    }
  }

  updateConnectionStatus(connected) {
    if (this.bell) {
      if (connected) {
        this.bell.title = "Notifications (Real-time)";
        this.bell.style.color = "var(--codeleaf-accent-primary)";
      } else {
        this.bell.title = "Notifications (Offline)";
        this.bell.style.color = "var(--codeleaf-text-tertiary)";
      }
    }
  }

  updateFollowingList(followingList) {
    this.followingList = followingList || [];
    if (this.socket && this.isConnected) {
      this.socket.emit("update-following", this.followingList);
      console.log(
        `🔔 Updated real-time subscriptions for ${this.followingList.length} followed users`
      );
    }
    this.showSubscriptionUpdateFeedback(this.followingList.length);
  }

  showSubscriptionUpdateFeedback(followingCount) {
    const feedback = document.createElement("div");
    feedback.className = "subscription-update-feedback";

    document.body.appendChild(feedback);
    setTimeout(() => {
      if (feedback.parentNode) {
        feedback.parentNode.removeChild(feedback);
      }
    }, 3000);
    this.addSubscriptionUpdateStyles();
  }

  addSubscriptionUpdateStyles() {
    if (!document.getElementById("subscription-update-styles")) {
      const styles = document.createElement("style");
      styles.id = "subscription-update-styles";
      styles.textContent = `
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
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

// Notification System for Blog Page
let notificationManager;

// Initialize notification system
function initializeBlogNotificationSystem() {
  const token = localStorage.getItem("authToken");
  if (token && !window.notificationManager) {
    try {
      // Reuse the same NotificationManager class from main.js
      window.notificationManager = new NotificationManager();
      console.log("🔔 Notification system initialized on blog page");
    } catch (error) {
      console.error("❌ Error initializing notification system:", error);
    }
  }
}
// Enhanced initBlogs function with notifications
async function initBlogs() {
  const token = localStorage.getItem("authToken");
  const userId = localStorage.getItem("userId");

  // Initialize notification system for logged-in users
  if (token && userId) {
    initializeBlogNotificationSystem();
  }

  if (!token || !userId) {
    // Unlogged user - show public blogs only
    document.getElementById("unloggedSection").style.display = "block";
    document.getElementById("blogsContent").style.display = "block";
    document.body.classList.add("unlogged-user");

    // Initialize search for public blogs
    initializeBlogsPageSearch();

    // Load only public blogs for unlogged users and update counts
    await loadPublicBlogs();
    await updatePublicTabCounts();
    return;
  }

  // Logged in user - show full functionality
  document.getElementById("blogsContent").style.display = "block";

  // Initialize search
  initializeBlogsPageSearch();

  // Then load blogs and update counts
  await loadBlogs();
  await updateTabCounts();
}

// New function to load public blogs for unlogged users
async function loadPublicBlogs(page = 1) {
  try {
    const url = `${API_BASE_URL}/blogs/all?page=${page}&limit=9`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      displayBlogs(result.blogs);
      setupPagination(result.currentPage, result.totalPages, result.total);

      // Update the popular count based on actual loaded data
      const popularBlogsRes = await fetch(
        `${API_BASE_URL}/blogs/popular?limit=100`
      );
      if (popularBlogsRes.ok) {
        const popularResult = await popularBlogsRes.json();
        if (popularResult.success) {
          document.getElementById("popular-blogs-count").textContent =
            popularResult.blogs?.length || 0;
        }
      }
    } else {
      // console.error("Failed to load public blogs:", result.error);
    }
  } catch (error) {
    // console.error("Error loading public blogs:", error);
  }
}

// Update switchTab function to handle unlogged users
async function switchTab(tabName) {
  const token = localStorage.getItem("authToken");
  const userId = localStorage.getItem("userId");

  // Unlogged users can only access "all" and "popular" tabs
  if ((!token || !userId) && tabName === "my-blogs") {
    toastManager.info(
      "Please log in to access your personal blogs",
      "Login Required"
    );
    return;
  }

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
    if (!token || !userId) {
      // Unlogged user - only load public blogs
      await loadPublicBlogs();
    } else {
      // Logged in user - load normally
      await loadBlogs();
    }

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
    // console.error("Error loading blogs:", error);

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

async function updateTabCounts() {
  try {
    const token = localStorage.getItem("authToken");
    const userId = localStorage.getItem("userId");
    const isLoggedIn = token && userId;

    if (!isLoggedIn) {
      // For unlogged users, only get public counts
      await updatePublicTabCounts();
      return;
    }

    // For logged-in users, get all counts as before
    const [allBlogsRes, myBlogsRes, popularBlogsRes] = await Promise.all([
      fetch(`${API_BASE_URL}/blogs/all?limit=1`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`${API_BASE_URL}/blogs/my?limit=1`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`${API_BASE_URL}/blogs/popular?limit=100`, {
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
    // console.error("Error updating tab counts:", error);
    // Set fallback values
    document.getElementById("all-blogs-count").textContent = "0";
    document.getElementById("my-blogs-count").textContent = "0";
    document.getElementById("popular-blogs-count").textContent = "0";
  }
}

// New function to update counts for unlogged users
async function updatePublicTabCounts() {
  try {
    // Get public blogs count
    const allBlogsRes = await fetch(`${API_BASE_URL}/blogs/all?limit=1`);
    const popularBlogsRes = await fetch(
      `${API_BASE_URL}/blogs/popular?limit=100`
    );

    const [allBlogs, popularBlogs] = await Promise.all([
      allBlogsRes.ok ? allBlogsRes.json() : { success: false },
      popularBlogsRes.ok ? popularBlogsRes.json() : { success: false },
    ]);

    // Update public counts
    if (allBlogs.success) {
      document.getElementById("all-blogs-count").textContent =
        allBlogs.total || 0;
    } else {
      document.getElementById("all-blogs-count").textContent = "0";
    }

    if (popularBlogs.success) {
      document.getElementById("popular-blogs-count").textContent =
        popularBlogs.blogs?.length || 0;
    } else {
      document.getElementById("popular-blogs-count").textContent = "0";
    }

    // Hide "My Blogs" count for unlogged users or show 0
    document.getElementById("my-blogs-count").textContent = "0";
  } catch (error) {
    // console.error("Error updating public tab counts:", error);
    // Set fallback values
    document.getElementById("all-blogs-count").textContent = "0";
    document.getElementById("popular-blogs-count").textContent = "0";
    document.getElementById("my-blogs-count").textContent = "0";
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
    this.originalBlogsData = Array.isArray(blogData) ? blogData : [];
    this.currentTab = tab;
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
    if (!this.originalBlogsData || this.originalBlogsData.length === 0) {
      // // console.warn("BlogsPageSearch: No blog data available for search");
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

      return titleMatch || contentMatch || tagsMatch || authorMatch;
    });

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

// Update displayBlogs to handle unlogged users
function displayBlogs(blogs) {
  const blogsGrid = document.getElementById("blogsGrid");
  const currentUser = localStorage.getItem("userId");
  const token = localStorage.getItem("authToken");
  const isLoggedIn = token && currentUser;

  // Store data in search system
  if (blogsPageSearch) {
    blogsPageSearch.setBlogData(blogs, currentTab);
  }

  // If there's an active search, let the search system handle rendering
  if (blogsPageSearch && blogsPageSearch.currentSearchTerm) {
    return; // Search system will handle rendering
  }

  if (blogs.length === 0) {
    let emptyMessage = "";
    switch (currentTab) {
      case "all":
        emptyMessage = "No public blogs available yet.";
        break;
      case "my-blogs":
        emptyMessage = isLoggedIn
          ? "You haven't created any blogs yet."
          : "Please log in to view your blogs.";
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
          currentTab === "my-blogs" && isLoggedIn
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

      // For unlogged users, don't show edit buttons and disable likes
      const showEditButton = isLoggedIn && blog.author === currentUser;
      const canLike = isLoggedIn && blog.author !== currentUser;

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
                  showEditButton
                    ? `
                  <button class="blog-action-btn edit-btn" onclick="event.stopPropagation(); editBlog('${blog.slug}')" title="Edit blog">
                    <span class="action-icon">✏️</span>
                  </button>
                `
                    : ""
                }
                <button class="blog-action-btn like-btn ${
                  blog.likedBy && blog.likedBy.includes(currentUser) && canLike
                    ? "liked"
                    : ""
                } 
                           ${!canLike ? "disabled" : ""}" 
                        onclick="event.stopPropagation(); ${
                          canLike
                            ? `toggleLike('${blog.slug}', event)`
                            : "void(0)"
                        }"
                        ${!canLike ? "disabled" : ""}
                        title="${
                          !isLoggedIn
                            ? "Please log in to like blogs"
                            : !canLike
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
  const token = localStorage.getItem("authToken");
  const currentUser = localStorage.getItem("userId");

  if (!token || !currentUser) {
    toastManager.info("Please log in to like blogs", "Login Required");
    return;
  }

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
    // console.error("Error toggling like:", error);
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

// Add this to handle page visibility changes for notifications
document.addEventListener("visibilitychange", function () {
  if (!document.hidden && window.notificationManager) {
    // Refresh notifications when page becomes visible
    window.notificationManager.checkForNewNotifications();
  }
});

// Add this to handle online/offline status
window.addEventListener("online", function () {
  if (window.notificationManager) {
    window.notificationManager.loadNotifications();
  }
});

// Function to position modal in visible viewport
function positionModalInViewport() {
  const modal = document.getElementById("blogModal");
  const modalContent = modal.querySelector(".modal-content");

  if (!modal || !modalContent) return;

  // Calculate viewport dimensions
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;

  // Calculate modal dimensions
  const modalHeight = modalContent.offsetHeight;
  const modalWidth = modalContent.offsetWidth;

  // Position modal in the center of the visible viewport
  const topPosition = Math.max(20, (viewportHeight - modalHeight) / 2);
  const leftPosition = (viewportWidth - modalWidth) / 2;

  // Apply positioning
  modalContent.style.position = "fixed";
  modalContent.style.top = `${topPosition}px`;
  modalContent.style.left = `${leftPosition}px`;
  modalContent.style.transform = "none"; // Remove any existing transforms
  modalContent.style.margin = "0"; // Remove default margins
}

// Enhanced modal opening with viewport positioning
function openCreateModal() {
  editingBlog = null;
  document.getElementById("modalTitle").textContent =
    "Create New Blog – Editable Anytime";
  document.getElementById("modalSubmit").textContent = "Create Blog";
  document.getElementById("blogForm").reset();

  const modal = document.getElementById("blogModal");
  modal.style.display = "flex";

  // Position modal in viewport after it's displayed
  setTimeout(() => {
    positionModalInViewport();
  }, 10);

  // Add resize listener for responsive positioning
  window.addEventListener("resize", positionModalInViewport);
}

// Enhanced edit blog modal with viewport positioning
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

      const modal = document.getElementById("blogModal");
      modal.style.display = "flex";

      // Position modal in viewport after it's displayed
      setTimeout(() => {
        positionModalInViewport();
      }, 10);

      // Add resize listener for responsive positioning
      window.addEventListener("resize", positionModalInViewport);
    } else {
      toastManager.error(result.error, "Error Loading Blog");
    }
  } catch (error) {
    // console.error("Error loading blog for edit:", error);
    toastManager.error("Failed to load blog for editing", "Network Error");
  }
}

// Enhanced close modal function
function closeModal() {
  const modal = document.getElementById("blogModal");
  modal.style.display = "none";
  editingBlog = null;

  // Remove resize listener when modal is closed
  window.removeEventListener("resize", positionModalInViewport);

  // Reset modal positioning for next open
  const modalContent = modal.querySelector(".modal-content");
  if (modalContent) {
    modalContent.style.position = "";
    modalContent.style.top = "";
    modalContent.style.left = "";
    modalContent.style.transform = "";
    modalContent.style.margin = "";
  }
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
    // console.error("Error saving blog:", error);
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
    // console.error("Error tracking view:", error);
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
