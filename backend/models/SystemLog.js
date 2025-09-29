import mongoose from "mongoose";

const systemLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  target: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'targetModel'
  },
  targetModel: {
    type: String,
    enum: ['Timetable', 'User', 'Department', 'Subject', 'Classroom'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  metadata: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

systemLogSchema.index({ action: 1, createdAt: -1 });
systemLogSchema.index({ performedBy: 1, createdAt: -1 });

export default mongoose.model("SystemLog", systemLogSchema);