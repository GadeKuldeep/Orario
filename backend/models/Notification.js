// models/Notification.js
import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // recipient
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['info','warning','alert','system'], default: 'info' },
  data: { type: Object, default: {} }, // optional JSON for deep-link (e.g., { route: '/timetable/123' })
  isRead: { type: Boolean, default: false },
  channel: { type: String, enum: ['in-app','email','sms','push'], default: 'in-app' },
  sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // optional: who triggered it
  createdAt: { type: Date, default: Date.now, index: true }
}, {
  timestamps: true
});

const Notification = mongoose.model('Notification', NotificationSchema);
export default Notification; // ✅ default export
