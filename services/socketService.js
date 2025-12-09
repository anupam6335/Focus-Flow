/**
 * Socket Service
 * Handles real-time WebSocket connections and events
 */

import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import config from "../config/environment.js";
import { SOCKET_EVENTS, SOCKET_CONFIG } from "../utils/constants.js";

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // Track connected users and their sockets
  }

  /**
   * Initialize Socket.io with the HTTP server
   */
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: SOCKET_CONFIG.CORS_ORIGIN,
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    this.setupEventHandlers();
    this.startCleanupInterval();

    console.log("✅ Socket.io initialized");
  }

  /**
   * Set up Socket.io event handlers
   */
  setupEventHandlers() {
    this.io.on(SOCKET_EVENTS.CONNECTION, async (socket) => {
      // Extract username from token
      const token = socket.handshake.auth.token;
      let username = null;

      if (token) {
        try {
          const decoded = jwt.verify(token, config.JWT_SECRET);
          username = decoded.username;

          if (username) {
            await this.handleUserConnection(socket, username);
          }
        } catch (error) {
          console.log("Invalid token for socket connection");
        }
      }

      // Set up event listeners for this socket
      this.setupSocketEventListeners(socket, username);

      // Handle graceful disconnect
      socket.on(SOCKET_EVENTS.DISCONNECT, async (reason) => {
        await this.handleUserDisconnect(socket, username, reason);
      });
    });
  }

  /**
   * Handle new user connection
   */
  async handleUserConnection(socket, username) {
    // Store user connection info
    this.connectedUsers.set(username, {
      socketId: socket.id,
      lastHeartbeat: new Date(),
      isOnline: true,
    });

    // Join user's personal notification room
    socket.join(`user-${username}`);

    // Join rooms for followed users to receive their notifications
    const user = await User.findOne({ username });
    if (user && user.following) {
      user.following.forEach((followedUser) => {
        socket.join(`blog-publish-${followedUser}`);
      });
    }

    // Update user as online with timestamp
    await User.findOneAndUpdate(
      { username: username },
      {
        isOnline: true,
        lastActive: new Date(),
      }
    ).exec();

    // Broadcast online status to all clients
    socket.broadcast.emit(SOCKET_EVENTS.USER_STATUS_CHANGED, {
      username: username,
      isOnline: true,
      lastActive: new Date(),
      type: "online",
    });

    console.log(`🔗 User ${username} connected (socket: ${socket.id})`);
  }

  /**
   * Set up event listeners for a socket
   */
  setupSocketEventListeners(socket, username) {
    // Join blog room for real-time updates
    socket.on(SOCKET_EVENTS.JOIN_BLOG, (blogSlug) => {
      socket.join(blogSlug);
      console.log(`📝 User ${username} joined blog: ${blogSlug}`);
    });

    // Leave blog room
    socket.on(SOCKET_EVENTS.LEAVE_BLOG, (blogSlug) => {
      socket.leave(blogSlug);
      console.log(`📝 User ${username} left blog: ${blogSlug}`);
    });

    // Update following list when user follows/unfollows
    socket.on(SOCKET_EVENTS.UPDATE_FOLLOWING, async (followingList) => {
      if (username) {
        // Leave all blog-publish rooms
        const rooms = Array.from(socket.rooms);
        rooms.forEach((room) => {
          if (
            room.startsWith("blog-publish-") &&
            room !== `blog-publish-${username}`
          ) {
            socket.leave(room);
          }
        });

        // Join rooms for new followed users
        followingList.forEach((followedUser) => {
          const roomName = `blog-publish-${followedUser}`;
          if (!socket.rooms.has(roomName)) {
            socket.join(roomName);
          }
        });

        // Also join user's personal room for direct notifications
        socket.join(`user-${username}`);
      }
    });

    // Enhanced Heartbeat with status maintenance
    socket.on(SOCKET_EVENTS.HEARTBEAT, async () => {
      if (username) {
        const userInfo = this.connectedUsers.get(username);
        if (userInfo) {
          userInfo.lastHeartbeat = new Date();
          this.connectedUsers.set(username, userInfo);

          // Only update lastActive, maintain online status
          await User.findOneAndUpdate(
            { username: username },
            { lastActive: new Date() }
          ).exec();
        }
      }
    });

    // Force disconnect (for logout)
    socket.on(SOCKET_EVENTS.FORCE_DISCONNECT, async () => {
      if (username) {
        await User.findOneAndUpdate(
          { username: username },
          {
            isOnline: false,
            lastActive: new Date(),
          }
        ).exec();

        this.connectedUsers.delete(username);

        socket.broadcast.emit(SOCKET_EVENTS.USER_STATUS_CHANGED, {
          username: username,
          isOnline: false,
          lastActive: new Date(),
          type: "offline",
        });

        console.log(`🔌 User ${username} force disconnected`);
      }
    });

    // ✅ CORRECT PLACEMENT: Add notification event listeners HERE
    socket.on("join-notifications", () => {
      if (username) {
        socket.join(`user-notifications-${username}`);
        console.log(`🔔 User ${username} joined notifications room`);
      }
    });

    socket.on("leave-notifications", () => {
      if (username) {
        socket.leave(`user-notifications-${username}`);
        console.log(`🔔 User ${username} left notifications room`);
      }
    });
  }

  /**
   * Handle user disconnect with grace period
   */
  async handleUserDisconnect(socket, username, reason) {
    console.log(`🔌 User ${username} disconnected: ${reason}`);

    // Update user as offline only after a delay for page refreshes/navigation
    if (username) {
      setTimeout(async () => {
        // Check if user reconnected in the meantime
        const currentUserInfo = this.connectedUsers.get(username);
        if (!currentUserInfo || currentUserInfo.socketId === socket.id) {
          // User didn't reconnect, mark as offline
          await User.findOneAndUpdate(
            { username: username },
            {
              isOnline: false,
              lastActive: new Date(),
            }
          ).exec();

          // Remove from connected users
          this.connectedUsers.delete(username);

          // Broadcast offline status to all clients
          socket.broadcast.emit(SOCKET_EVENTS.USER_STATUS_CHANGED, {
            username: username,
            isOnline: false,
            lastActive: new Date(),
            type: "offline",
          });

          console.log(`👋 User ${username} marked as offline`);
        }
      }, SOCKET_CONFIG.GRACE_PERIOD);
    }
  }

  /**
   * Periodic cleanup for stale connections
   */
  startCleanupInterval() {
    setInterval(() => {
      this.cleanupStaleConnections();
    }, SOCKET_CONFIG.HEARTBEAT_INTERVAL);
  }

  /**
   * Clean up stale connections
   */
  async cleanupStaleConnections() {
    const now = new Date();

    this.connectedUsers.forEach(async (userInfo, username) => {
      if (now - userInfo.lastHeartbeat > SOCKET_CONFIG.STALE_THRESHOLD) {
        await User.findOneAndUpdate(
          { username: username },
          {
            isOnline: false,
            lastActive: new Date(),
          }
        ).exec();

        this.connectedUsers.delete(username);

        this.io.emit(SOCKET_EVENTS.USER_STATUS_CHANGED, {
          username: username,
          isOnline: false,
          lastActive: new Date(),
          type: "timeout",
        });

        console.log(`🕒 User ${username} connection timed out`);
      }
    });
  }

  /**
   * Emit event to specific user
   */
  emitToUser(username, event, data) {
    const userConnection = this.connectedUsers.get(username);
    if (userConnection) {
      this.io.to(userConnection.socketId).emit(event, data);
    }

    // Also emit to notification room for broader reach
    this.emitToRoom(`user-notifications-${username}`, event, data);
  }

  /**
   * Emit event to all users in a room
   */
  emitToRoom(room, event, data) {
    this.io.to(room).emit(event, data);
  }

  /**
   * Broadcast event to all connected clients
   */
  broadcast(event, data) {
    this.io.emit(event, data);
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  /**
   * Check if user is connected
   */
  isUserConnected(username) {
    return this.connectedUsers.has(username);
  }
}

// Create and export a singleton instance
const socketService = new SocketService();
export { socketService };
