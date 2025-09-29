import Notification from "../models/Notification.js";
import User from "../models/User.js";
import Department from "../models/Department.js";
import Attendance from "../models/Attendance.js";
import Timetable from "../models/Timetable.js";

/**
 * Notification Controller - Handles all notification operations
 */

// === USER NOTIFICATION MANAGEMENT ===

/**
 * Get notifications for current user with pagination and filtering
 */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const targetUserId = req.params.userId || userId; // For admin accessing user notifications
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const isRead = req.query.isRead; // 'true' or 'false'
    const priority = req.query.priority; // 'low', 'medium', 'high', 'urgent'
    const type = req.query.type;

    // Build query
    const query = {
      $or: [
        { recipient: targetUserId },
        { 
          recipientType: { 
            $in: await getUserNotificationTypes(req.user) 
          } 
        }
      ]
    };

    // Add filters
    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }
    if (priority) {
      query.priority = priority;
    }
    if (type) {
      query.type = type;
    }

    const skip = (page - 1) * limit;

    const [notifications, totalCount, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('sender', 'name email')
        .populate('relatedEntity.entityId')
        .lean(),

      Notification.countDocuments(query),

      Notification.countDocuments({ ...query, isRead: false })
    ]);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          unreadCount,
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching notifications",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get notifications by specific type
 */
export const getNotificationsByType = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const validTypes = [
      "schedule_change", "substitute_assignment", "leave_approval",
      "timetable_published", "system_alert", "reminder", "announcement"
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification type"
      });
    }

    const query = {
      type,
      $or: [
        { recipient: userId },
        { 
          recipientType: { 
            $in: await getUserNotificationTypes(req.user) 
          } 
        }
      ]
    };

    const skip = (page - 1) * limit;

    const [notifications, totalCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('sender', 'name email')
        .lean(),

      Notification.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        type,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount
        }
      }
    });

  } catch (error) {
    console.error("Get notifications by type error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching notifications by type",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get unread notifications count
 */
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const query = {
      isRead: false,
      $or: [
        { recipient: userId },
        { 
          recipientType: { 
            $in: await getUserNotificationTypes(req.user) 
          } 
        }
      ]
    };

    const unreadCount = await Notification.countDocuments(query);

    // Count by priority
    const priorityCounts = await Notification.aggregate([
      { $match: query },
      { $group: { _id: "$priority", count: { $sum: 1 } } }
    ]);

    const priorityMap = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0
    };

    priorityCounts.forEach(item => {
      priorityMap[item._id] = item.count;
    });

    res.status(200).json({
      success: true,
      data: {
        unreadCount,
        priorityBreakdown: priorityMap,
        actionRequired: await Notification.countDocuments({
          ...query,
          actionRequired: true
        })
      }
    });

  } catch (error) {
    console.error("Get unread count error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching unread count",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Mark specific notifications as read
 */
export const markAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { notificationIds } = req.body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({
        success: false,
        message: "Notification IDs array is required"
      });
    }

    // Verify user owns these notifications or has access
    const notifications = await Notification.find({
      _id: { $in: notificationIds },
      $or: [
        { recipient: userId },
        { 
          recipientType: { 
            $in: await getUserNotificationTypes(req.user) 
          } 
        }
      ]
    });

    if (notifications.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No valid notifications found"
      });
    }

    const updateResult = await Notification.updateMany(
      { _id: { $in: notificationIds } },
      { 
        $set: { 
          isRead: true, 
          readAt: new Date() 
        } 
      }
    );

    res.status(200).json({
      success: true,
      message: `${updateResult.modifiedCount} notifications marked as read`,
      data: {
        markedCount: updateResult.modifiedCount
      }
    });

  } catch (error) {
    console.error("Mark as read error:", error);
    res.status(500).json({
      success: false,
      message: "Error marking notifications as read",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Mark all notifications as read for current user
 */
export const markAllRead = async (req, res) => {
  try {
    const userId = req.user._id;

    const query = {
      isRead: false,
      $or: [
        { recipient: userId },
        { 
          recipientType: { 
            $in: await getUserNotificationTypes(req.user) 
          } 
        }
      ]
    };

    const updateResult = await Notification.updateMany(
      query,
      { 
        $set: { 
          isRead: true, 
          readAt: new Date() 
        } 
      }
    );

    res.status(200).json({
      success: true,
      message: `All ${updateResult.modifiedCount} notifications marked as read`,
      data: {
        markedCount: updateResult.modifiedCount
      }
    });

  } catch (error) {
    console.error("Mark all read error:", error);
    res.status(500).json({
      success: false,
      message: "Error marking all notifications as read",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete a notification (user's own or admin)
 */
export const deleteNotification = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const targetUserId = req.params.userId; // For admin deletion

    let query = { _id: id };

    // If not admin deleting another user's notification, verify ownership
    if (!targetUserId) {
      query.$or = [
        { recipient: userId },
        { 
          recipientType: { 
            $in: await getUserNotificationTypes(req.user) 
          } 
        }
      ];
    } else {
      // Admin deleting specific user's notification
      query.recipient = targetUserId;
    }

    const notification = await Notification.findOne(query);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found or access denied"
      });
    }

    await Notification.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully"
    });

  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting notification",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Manage notification preferences
 */
export const manageNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (req.method === 'GET') {
      // Return current preferences
      const preferences = user.notificationPreferences || getDefaultPreferences();
      
      return res.status(200).json({
        success: true,
        data: { preferences }
      });
    }

    if (req.method === 'PUT') {
      // Update preferences
      const { preferences } = req.body;

      if (!preferences) {
        return res.status(400).json({
          success: false,
          message: "Preferences object is required"
        });
      }

      user.notificationPreferences = {
        ...getDefaultPreferences(),
        ...preferences
      };

      await user.save();

      res.status(200).json({
        success: true,
        message: "Notification preferences updated successfully",
        data: { preferences: user.notificationPreferences }
      });
    }

  } catch (error) {
    console.error("Manage preferences error:", error);
    res.status(500).json({
      success: false,
      message: "Error managing notification preferences",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// === ADMIN/FACULTY NOTIFICATION SENDING ===

/**
 * Send notification to users/groups
 */
export const sendNotification = async (req, res) => {
  try {
    const senderId = req.user._id;
    const {
      recipients, // Can be user ID, department ID, or special type
      recipientType, // 'individual', 'department', 'all_faculty', 'all_students'
      title,
      message,
      type = 'announcement',
      priority = 'medium',
      actionRequired = false,
      actionType,
      actionUrl,
      relatedEntity,
      channels = ['in_app'],
      metadata
    } = req.body;

    // Validate required fields
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required"
      });
    }

    if (!recipientType || !['individual', 'department', 'all_faculty', 'all_students', 'role_based'].includes(recipientType)) {
      return res.status(400).json({
        success: false,
        message: "Valid recipientType is required"
      });
    }

    // Prepare notification data
    const notificationData = {
      title,
      message,
      type,
      priority,
      actionRequired,
      actionType,
      actionUrl,
      relatedEntity,
      channels: channels.map(channel => ({
        channel,
        status: 'pending'
      })),
      sender: senderId,
      systemGenerated: false,
      metadata,
      recipientType
    };

    let notifications = [];

    // Handle different recipient types
    switch (recipientType) {
      case 'individual':
        if (!recipients || !Array.isArray(recipients)) {
          return res.status(400).json({
            success: false,
            message: "Recipients array is required for individual notifications"
          });
        }
        
        notifications = recipients.map(recipientId => ({
          ...notificationData,
          recipient: recipientId
        }));
        break;

      case 'department':
        if (!recipients) {
          return res.status(400).json({
            success: false,
            message: "Department ID is required"
          });
        }
        
        notificationData.relatedEntity = {
          entityType: 'department',
          entityId: recipients
        };
        notifications = [notificationData];
        break;

      case 'all_faculty':
      case 'all_students':
      case 'role_based':
        notifications = [notificationData];
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid recipient type"
        });
    }

    // Save notifications
    const savedNotifications = await Notification.insertMany(notifications);

    // Trigger delivery for each channel
    savedNotifications.forEach(notification => {
      deliverNotification(notification);
    });

    res.status(201).json({
      success: true,
      message: `Notification sent to ${savedNotifications.length} recipient(s)`,
      data: {
        notifications: savedNotifications,
        deliveryStatus: "Initiated"
      }
    });

  } catch (error) {
    console.error("Send notification error:", error);
    res.status(500).json({
      success: false,
      message: "Error sending notification",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// === HELPER FUNCTIONS ===

/**
 * Get notification types user has access to based on role
 */
const getUserNotificationTypes = async (user) => {
  const types = ['individual'];
  
  if (user.role === 'faculty') {
    types.push('all_faculty', 'role_based');
  } else if (user.role === 'student') {
    types.push('all_students', 'role_based');
  }
  
  if (user.department) {
    types.push('department');
  }
  
  return types;
};

/**
 * Get default notification preferences
 */
const getDefaultPreferences = () => ({
  channels: {
    in_app: true,
    email: true,
    push: false,
    sms: false
  },
  types: {
    schedule_change: true,
    substitute_assignment: true,
    leave_approval: true,
    timetable_published: true,
    system_alert: true,
    reminder: true,
    announcement: true
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '07:00'
  },
  priorityLevels: {
    low: true,
    medium: true,
    high: true,
    urgent: true
  }
});

/**
 * Deliver notification through configured channels
 */
const deliverNotification = async (notification) => {
  try {
    for (const channel of notification.channels) {
      try {
        switch (channel.channel) {
          case 'email':
            await deliverEmailNotification(notification);
            break;
          case 'sms':
            await deliverSMSNotification(notification);
            break;
          case 'push':
            await deliverPushNotification(notification);
            break;
          case 'in_app':
            // In-app notifications are already delivered by being saved
            channel.status = 'delivered';
            channel.sentAt = new Date();
            break;
        }
      } catch (error) {
        console.error(`Error delivering ${channel.channel} notification:`, error);
        channel.status = 'failed';
        channel.deliveryReport = { error: error.message };
      }
    }

    await Notification.findByIdAndUpdate(notification._id, {
      channels: notification.channels
    });

  } catch (error) {
    console.error("Error in deliverNotification:", error);
  }
};

// Placeholder functions for channel delivery
const deliverEmailNotification = async (notification) => {
  // Implement email delivery logic
  console.log("Email notification delivered:", notification._id);
};

const deliverSMSNotification = async (notification) => {
  // Implement SMS delivery logic
  console.log("SMS notification delivered:", notification._id);
};

const deliverPushNotification = async (notification) => {
  // Implement push notification delivery logic
  console.log("Push notification delivered:", notification._id);
};

export default {
  getNotifications,
  sendNotification,
  markAsRead,
  markAllRead,
  deleteNotification,
  getUnreadCount,
  getNotificationsByType,
  manageNotificationPreferences
};