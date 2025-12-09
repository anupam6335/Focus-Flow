/**
 * FocusFlow - Notification System with Deduplication
 * Prevents duplicate global notifications and removes completed task notifications
 */

class NotificationManager {
  constructor() {
    this.state = {
      isInitialized: false,
      unreadCount: 0,
      notifications: [],
      syncInterval: null,
      syncIntervalTime: 60000,
      isLoggedIn: false,
      dynamicDropdown: null,
      shownNotificationIds: new Set(), // Track shown notifications to prevent duplicates
      completedTaskIds: new Set(), // Track completed tasks to prevent re-notification
    };

    this.elements = {};
  }

  async init() {
    if (this.state.isInitialized) return;

    try {
      this.initializeElements();
      this.createDynamicDropdown();
      this.setupEventListeners();

      await this.checkAuthStatus();
      if (this.state.isLoggedIn) {
        await this.loadNotifications();
        this.startPeriodicSync();
      }

      this.state.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize notification system:", error);
    }
  }

  initializeElements() {
    const elementIds = ["notifications-btn", "notification-count"];

    elementIds.forEach((id) => {
      this.elements[id] = document.getElementById(id);
    });
  }

  /**
   * Create a completely new dropdown that bypasses existing CSS
   */
  createDynamicDropdown() {
    // Remove any existing dynamic dropdown
    const existingDropdown = document.getElementById(
      "notifications-dynamic-dropdown"
    );
    if (existingDropdown) {
      existingDropdown.remove();
    }

    // Create new dropdown
    this.state.dynamicDropdown = document.createElement("div");
    this.state.dynamicDropdown.id = "notifications-dynamic-dropdown";
    this.state.dynamicDropdown.className = "notifications-dynamic-dropdown";
    this.state.dynamicDropdown.style.cssText = `
            position: absolute;
            top: 100%;
            right: 0;
            margin-top: 8px;
            background: var(--paper);
            border: 1px solid var(--line);
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            min-width: 320px;
            max-height: 70vh;
            opacity: 0;
            visibility: hidden;
            transform: translateY(-10px);
            transition: all 300ms cubic-bezier(0.25, 0.6, 0.2, 1);
            z-index: 10000;
            display: block;
            overflow: hidden;
        `;

    // Create dropdown structure
    this.state.dynamicDropdown.innerHTML = `
            <div class="dropdown-header" style="padding: 16px 20px; border-bottom: 1px solid var(--line);">
                <h3 style="margin: 0; font-size: 16px; font-weight: 600;">Notifications</h3>
            </div>
            <div class="dropdown-content" id="notifications-dynamic-list" style="padding: 0; max-height: 300px; overflow-y: auto;"></div>
            <div class="dropdown-footer" style="padding: 12px 20px; border-top: 1px solid var(--line);">
                <a href="/notifications" class="dropdown-link" style="color: var(--accent); text-decoration: none; font-size: 14px;">See all notifications</a>
            </div>
        `;

    // Add to DOM
    if (this.elements["notifications-btn"]) {
      this.elements["notifications-btn"].parentNode.appendChild(
        this.state.dynamicDropdown
      );
    } else {
      document.body.appendChild(this.state.dynamicDropdown);
    }
  }

  setupEventListeners() {
    // Notification button click
    if (this.elements["notifications-btn"]) {
      this.elements["notifications-btn"].addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleDynamicDropdown();
      });
    }

    // Close when clicking outside
    document.addEventListener("click", (e) => {
      if (!this.state.dynamicDropdown) return;

      const isClickInside =
        this.state.dynamicDropdown.contains(e.target) ||
        (this.elements["notifications-btn"] &&
          this.elements["notifications-btn"].contains(e.target));

      if (!isClickInside && this.isDropdownVisible()) {
        this.hideDynamicDropdown();
      }
    });

    // Prevent dropdown from closing when clicking inside
    if (this.state.dynamicDropdown) {
      this.state.dynamicDropdown.addEventListener("click", (e) => {
        e.stopPropagation();
      });
    }
  }

  async checkAuthStatus() {
    try {
      const response = await Helper.fx("/api/auth/verify-token");
      this.state.isLoggedIn = response.ok;
      return this.state.isLoggedIn;
    } catch (error) {
      this.state.isLoggedIn = false;
      return false;
    }
  }

  /**
   * Load notifications from server with deduplication
   */
  async loadNotifications() {
    if (!this.state.isLoggedIn) return;

    try {
      const response = await Helper.fx("/api/notifications?limit=20");

      if (response.ok && response.data && response.data.success) {
        const transformedNotifications = this.transformNotifications(
          response.data
        );

        // Filter out duplicates and completed tasks
        const filteredNotifications = this.filterNotifications(
          transformedNotifications
        );

        this.state.notifications = filteredNotifications;
        this.state.unreadCount = this.calculateUnreadCount(
          filteredNotifications
        );
        this.updateNotificationUI();
      }
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  }

  /**
   * Filter notifications to remove duplicates and completed tasks
   */
  filterNotifications(notifications) {
    const filtered = [];
    const seenIds = new Set();
    const seenGlobalMessages = new Set();

    for (const notification of notifications) {
      // Skip if we've already seen this notification ID
      if (seenIds.has(notification.id)) {
        continue;
      }

      // Skip if this is a completed task that we've already processed
      if (this.state.completedTaskIds.has(notification.id)) {
        continue;
      }

      // For global notifications, check for duplicate messages
      if (
        notification.category === "global" ||
        notification.type === "global"
      ) {
        const messageKey = notification.message.toLowerCase().trim();
        if (seenGlobalMessages.has(messageKey)) {
          continue; // Skip duplicate global notification
        }
        seenGlobalMessages.add(messageKey);
      }

      // Add to filtered list and mark as seen
      filtered.push(notification);
      seenIds.add(notification.id);

      // Mark this notification as shown to prevent future duplicates
      this.state.shownNotificationIds.add(notification.id);
    }

    return filtered;
  }

  /**
   * Calculate unread count from filtered notifications
   */
  calculateUnreadCount(notifications) {
    return notifications.filter((notif) => !notif.isRead).length;
  }

  transformNotifications(apiData) {
    const notifications = [];

    // Add legacy notifications
    if (apiData.notifications && Array.isArray(apiData.notifications)) {
      notifications.push(
        ...apiData.notifications.map((notif) => ({
          id: notif._id,
          type: notif.type,
          category: notif.category || "legacy",
          message: notif.message,
          isRead: notif.isRead,
          createdAt: notif.createdAt,
          metadata: notif.metadata,
          url: notif.url,
        }))
      );
    }

    // Add category-based notifications
    if (apiData.categories) {
      Object.keys(apiData.categories).forEach((category) => {
        if (Array.isArray(apiData.categories[category])) {
          notifications.push(
            ...apiData.categories[category].map((notif) => ({
              id: notif._id,
              type: notif.type,
              category: category,
              message: notif.message,
              isRead: notif.isRead,
              createdAt: notif.createdAt,
              metadata: notif.metadata,
            }))
          );
        }
      });
    }

    // Sort by creation date (newest first)
    return notifications.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  startPeriodicSync() {
    if (this.state.syncInterval) {
      clearInterval(this.state.syncInterval);
    }

    this.state.syncInterval = setInterval(() => {
      if (this.state.isLoggedIn) {
        this.loadNotifications();
      }
    }, this.state.syncIntervalTime);
  }

  updateNotificationUI() {
    this.updateNotificationCount();
    this.updateDynamicDropdownContent();
  }

  updateNotificationCount() {
    if (!this.elements["notification-count"]) return;

    const count = this.state.unreadCount;
    const badge = this.elements["notification-count"];

    if (count === 0) {
      badge.style.display = "none";
    } else {
      badge.textContent = count > 99 ? "99+" : count.toString();
      badge.style.display = "grid";
    }
  }

  updateDynamicDropdownContent() {
    const contentElement = document.getElementById(
      "notifications-dynamic-list"
    );
    if (!contentElement) return;

    if (this.state.notifications.length === 0) {
      contentElement.innerHTML = `
                <div class="notification-item" style="padding: 40px 20px; text-align: center; color: var(--muted);">
                    <p style="margin: 0 0 8px 0; font-size: 14px;">No notifications yet. Complete tasks to receive notifications!</p>
                    <span style="font-size: 12px; font-style: italic;">You're all caught up</span>
                </div>
            `;
      return;
    }

    contentElement.innerHTML = this.state.notifications
      .slice(0, 10)
      .map((notification) => this.renderNotificationItem(notification))
      .join("");
  }

  renderNotificationItem(notification) {
    const timeAgo = this.getTimeAgo(notification.createdAt);
    const isUnread = !notification.isRead;
    const unreadStyle = isUnread
      ? "background: rgba(163, 177, 138, 0.05); border-left: 3px solid var(--accent);"
      : "";

    return `
            <div class="notification-item" style="position: relative; padding: 12px 16px; border-bottom: 1px solid var(--line); transition: background-color 200ms; cursor: pointer; ${unreadStyle}"
                 data-id="${notification.id}" 
                 data-category="${notification.category}">
                <p style="margin: 0 0 6px 0; font-size: 14px; line-height: 1.4; color: var(--ink);">${Helper.escapeHtml(
                  notification.message
                )}</p>
                <span style="font-size: 12px; color: var(--muted);">${timeAgo}</span>
                ${
                  isUnread
                    ? '<div style="position: absolute; top: 12px; right: 12px; width: 8px; height: 8px; background: var(--accent); border-radius: 50%;"></div>'
                    : ""
                }
            </div>
        `;
  }

  getTimeAgo(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString();
  }

  /**
   * Dynamic dropdown methods
   */
  toggleDynamicDropdown() {
    if (this.isDropdownVisible()) {
      this.hideDynamicDropdown();
    } else {
      this.showDynamicDropdown();
    }
  }

  isDropdownVisible() {
    return (
      this.state.dynamicDropdown &&
      this.state.dynamicDropdown.style.opacity === "1"
    );
  }

  showDynamicDropdown() {
    if (!this.state.dynamicDropdown) {
      this.createDynamicDropdown();
    }

    // Close any other dropdowns
    this.hideAllOtherDropdowns();

    // Show our dropdown
    this.state.dynamicDropdown.style.opacity = "1";
    this.state.dynamicDropdown.style.visibility = "visible";
    this.state.dynamicDropdown.style.transform = "translateY(0)";

    // Update content and mark as read
    this.updateDynamicDropdownContent();
    this.markAllAsRead();
  }

  hideDynamicDropdown() {
    if (!this.state.dynamicDropdown) return;

    this.state.dynamicDropdown.style.opacity = "0";
    this.state.dynamicDropdown.style.visibility = "hidden";
    this.state.dynamicDropdown.style.transform = "translateY(-10px)";
  }

  hideAllOtherDropdowns() {
    // Hide any other dropdowns that might be open
    document.querySelectorAll(".dropdown").forEach((dropdown) => {
      if (
        dropdown !== this.state.dynamicDropdown &&
        dropdown.classList.contains("show")
      ) {
        dropdown.classList.remove("show");
      }
    });
  }

  async markAllAsRead() {
    if (!this.state.isLoggedIn || this.state.unreadCount === 0) return;

    try {
      const response = await Helper.fx("/api/notifications/read-all", {
        method: "POST",
      });

      if (response.ok && response.data && response.data.success) {
        // Mark all as read locally
        this.state.notifications.forEach((notif) => (notif.isRead = true));
        this.state.unreadCount = 0;
        this.updateNotificationUI();
      }
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
    }
  }

  /**
   * Handle task completion - No toast, with deduplication
   */
  handleTaskCompletion(taskType, taskName, taskId = null) {
    // Generate a unique ID for this task completion
    const taskCompletionId = taskId || `completed_${taskType}_${Date.now()}`;

    // Check if we've already notified about this task completion
    if (this.state.completedTaskIds.has(taskCompletionId)) {
      return;
    }

    // Mark this task as completed to prevent future notifications
    this.state.completedTaskIds.add(taskCompletionId);

    // Create notification (but don't add to server - client-side only)
    if (this.state.isLoggedIn) {
      const newNotification = {
        id: taskCompletionId,
        type: "task_completed",
        category: "achievement",
        message: `${
          taskType === "todo" ? "Todo completed" : "Question solved"
        }: ${taskName}`,
        isRead: false,
        createdAt: new Date().toISOString(),
        metadata: {
          type: taskType,
          taskId: taskCompletionId,
          persistent: false, // Mark as non-persistent
        },
      };

      // Add to beginning of notifications array
      this.state.notifications.unshift(newNotification);
      this.state.unreadCount++;
      this.updateNotificationUI();
    }

    // Reload notifications from server to get any server-generated notifications
    // This will also apply our filters to remove duplicates
    if (this.state.isLoggedIn) {
      setTimeout(() => this.loadNotifications(), 1000);
    }
  }

  /**
   * Remove a specific notification (for when tasks are completed server-side)
   */
  removeNotification(notificationId) {
    const initialLength = this.state.notifications.length;
    this.state.notifications = this.state.notifications.filter(
      (notif) => notif.id !== notificationId
    );

    if (this.state.notifications.length !== initialLength) {
      this.state.unreadCount = this.calculateUnreadCount(
        this.state.notifications
      );
      this.updateNotificationUI();
    }
  }

  /**
   * Mark a task as completed to prevent future notifications
   */
  markTaskAsCompleted(taskId) {
    this.state.completedTaskIds.add(taskId);
  }

  async refresh() {
    if (this.state.isLoggedIn) {
      await this.loadNotifications();
    }
  }

  destroy() {
    if (this.state.syncInterval) {
      clearInterval(this.state.syncInterval);
      this.state.syncInterval = null;
    }

    // Remove dynamic dropdown
    if (this.state.dynamicDropdown) {
      this.state.dynamicDropdown.remove();
      this.state.dynamicDropdown = null;
    }

    this.state.isInitialized = false;
  }
}

// Create global instance
window.notificationManager = new NotificationManager();

function initNotificationSystem() {
  if (window.notificationManager) {
    window.notificationManager.init();
  }
}

/**
 * Handle task completion from anywhere in the app
 * Now accepts an optional taskId for better deduplication
 */
function notifyTaskCompletion(taskType, taskName, taskId = null) {
  if (window.notificationManager) {
    window.notificationManager.handleTaskCompletion(taskType, taskName, taskId);
  }
}

/**
 * Remove a specific notification (useful for server-side completions)
 */
function removeNotification(notificationId) {
  if (window.notificationManager) {
    window.notificationManager.removeNotification(notificationId);
  }
}

/**
 * Mark a task as completed to prevent future notifications
 */
function markTaskAsCompleted(taskId) {
  if (window.notificationManager) {
    window.notificationManager.markTaskAsCompleted(taskId);
  }
}

function refreshNotifications() {
  if (window.notificationManager) {
    window.notificationManager.refresh();
  }
}

// Debug function to test the dynamic dropdown
window.testDynamicDropdown = function () {
  const manager = window.notificationManager;
  if (manager && manager.state.dynamicDropdown) {
    manager.state.dynamicDropdown.style.opacity = "1";
    manager.state.dynamicDropdown.style.visibility = "visible";
    manager.state.dynamicDropdown.style.transform = "translateY(0)";
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initNotificationSystem);
} else {
  initNotificationSystem();
}
