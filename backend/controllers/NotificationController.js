// controllers/NotificationController.js
import Notification from "../models/Notification.js";

/**
 * GET /api/notifications/:userId
 */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.params.userId;
    const page = Math.max(1, parseInt(req.query.page || "1"));
    const limit = Math.min(100, parseInt(req.query.limit || "20"));
    const skip = (page - 1) * limit;

    if (req.user.role !== "admin" && req.user.id !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const [total, notifications] = await Promise.all([
      Notification.countDocuments({ userId }),
      Notification.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    res.json({ page, limit, total, notifications });
  } catch (err) {
    console.error("getNotifications error", err);
    res.status(500).json({ message: "Server error fetching notifications" });
  }
};

/**
 * POST /api/notifications/send
 */
export const sendNotification = async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "system") {
      return res.status(403).json({ message: "Not authorized to send notifications" });
    }

    const { userIds, title, message, type = "info", data = {}, channel = "in-app" } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "userIds (non-empty array) is required" });
    }
    if (!title || !message) {
      return res.status(400).json({ message: "title and message are required" });
    }

    const payloads = userIds.map((uid) => ({
      userId: uid,
      title,
      message,
      type,
      data,
      channel,
      sentBy: req.user.id,
    }));

    const docs = await Notification.insertMany(payloads);
    res.status(201).json({ sent: docs.length, notifications: docs });
  } catch (err) {
    console.error("sendNotification error", err);
    res.status(500).json({ message: "Server error sending notifications" });
  }
};

/**
 * PUT /api/notifications/:id/read
 */
export const markAsRead = async (req, res) => {
  try {
    const id = req.params.id;
    const notif = await Notification.findById(id);
    if (!notif) return res.status(404).json({ message: "Notification not found" });

    if (req.user.role !== "admin" && notif.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    notif.isRead = true;
    await notif.save();
    res.json({ message: "Marked as read", notification: notif });
  } catch (err) {
    console.error("markAsRead error", err);
    res.status(500).json({ message: "Server error marking notification as read" });
  }
};

/**
 * PUT /api/notifications/mark-all-read/:userId
 */
export const markAllRead = async (req, res) => {
  try {
    const userId = req.params.userId;
    if (req.user.role !== "admin" && req.user.id !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const result = await Notification.updateMany({ userId, isRead: false }, { $set: { isRead: true } });
    res.json({ message: "Marked all as read", modifiedCount: result.nModified ?? result.modifiedCount });
  } catch (err) {
    console.error("markAllRead error", err);
    res.status(500).json({ message: "Server error marking all as read" });
  }
};

/**
 * DELETE /api/notifications/:id
 */
export const deleteNotification = async (req, res) => {
  try {
    const id = req.params.id;
    const notif = await Notification.findById(id);
    if (!notif) return res.status(404).json({ message: "Notification not found" });

    if (req.user.role !== "admin" && notif.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await notif.remove();
    res.json({ message: "Notification deleted" });
  } catch (err) {
    console.error("deleteNotification error", err);
    res.status(500).json({ message: "Server error deleting notification" });
  }
};
