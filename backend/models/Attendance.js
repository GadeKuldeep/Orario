import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  // Basic Information
  faculty: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  date: { type: Date, required: true },
  
  // Attendance Status
  status: { 
    type: String, 
    enum: ["present", "absent", "leave", "half_day"], 
    required: true 
  },
  leaveType: {  // If status is "leave"
    type: String,
    enum: ["sick", "casual", "emergency", "planned", "other"]
  },
  reason: { type: String },
  
  // Substitute Information
  substitute: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  substituteApproved: { type: Boolean, default: false },
  substituteReason: { type: String },
  
  // Affected Classes
  affectedClasses: [{
    timetableEntry: { type: mongoose.Schema.Types.ObjectId, ref: "Timetable" },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
    timeSlot: { type: String },
    status: { 
      type: String, 
      enum: ["cancelled", "rescheduled", "substitute_assigned"],
      default: "cancelled"
    },
    newSchedule: {
      date: Date,
      timeSlot: String,
      classroom: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom" }
    }
  }],
  
  // Approval Workflow
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  approvalStatus: { 
    type: String, 
    enum: ["pending", "approved", "rejected"], 
    default: "pending" 
  },
  approvalDate: { type: Date },
  
  // Notification Status
  notifications: {
    studentsNotified: { type: Boolean, default: false },
    substituteNotified: { type: Boolean, default: false },
    adminNotified: { type: Boolean, default: false },
    lastNotificationSent: { type: Date }
  },
  
  // Supporting Documents
  supportingDocs: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    uploadDate: { type: Date, default: Date.now }
  }],
  
  // System Fields
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" } // Self or admin
}, { 
  timestamps: true 
});

// Index for faculty attendance queries
attendanceSchema.index({ faculty: 1, date: 1 });
attendanceSchema.index({ date: 1, status: 1 });

export default mongoose.model("Attendance", attendanceSchema);