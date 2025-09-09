// routes/notificationRoutes.js
import express from "express";
import {
  getNotifications,
  sendNotification,
  markAsRead,
  markAllRead,
  deleteNotification,
} from "../controllers/NotificationController.js";

import { verifyToken } from "../middleware/authMiddleware.js"; // fixed import

const router = express.Router();

// Get notifications for a user (paginated)
router.get("/:userId", verifyToken, getNotifications);

// Send notification(s) — body: { userIds: [], title, message, ... }
router.post("/send", verifyToken, sendNotification);

// Mark single notification as read
router.put("/:id/read", verifyToken, markAsRead);

// Mark all for user as read
router.put("/mark-all-read/:userId", verifyToken, markAllRead);

// Delete a notification
router.delete("/:id", verifyToken, deleteNotification);

export default router;
