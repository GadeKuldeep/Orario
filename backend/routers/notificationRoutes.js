import express from "express";
import {
  getNotifications,
  sendNotification,
  markAsRead,
  markAllRead,
  deleteNotification,
  getUnreadCount,
  getNotificationsByType,
  manageNotificationPreferences
} from "../controllers/NotificationController.js";

import { 
  verifyToken, 
  isAdmin, 
  isFaculty,
  isAdminOrFaculty,
  isAdminOrSelf,
  rateLimitByUser 
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply JWT protection and rate limiting to all routes
router.use(verifyToken);
router.use(rateLimitByUser);

// === USER NOTIFICATION MANAGEMENT ===

// Get notifications for current user
router.get("/", getNotifications);

// Get notifications by type
router.get("/type/:type", getNotificationsByType);

// Get unread count
router.get("/unread/count", getUnreadCount);

// Mark notifications as read
router.put("/mark-read", markAsRead);
router.put("/mark-all-read", markAllRead);

// Notification preferences (user can manage their own preferences)
router.get("/preferences", manageNotificationPreferences);
router.put("/preferences", manageNotificationPreferences);

// Delete user's own notification
router.delete("/:id", deleteNotification);

// === ADMIN/FACULTY NOTIFICATION SENDING ===

// Send notification (Admin/Faculty only)
router.post("/send", isAdminOrFaculty, sendNotification);

// Admin-only notification management
router.get("/admin/user/:userId", isAdmin, getNotifications); // Admin can view any user's notifications
router.delete("/admin/user/:userId/:notificationId", isAdmin, deleteNotification); // Admin can delete any notification

export default router;