import mongoose from "mongoose";

const systemSettingSchema = new mongoose.Schema({
  timetable: {
    maxHoursPerDay: { type: Number, default: 8 },
    maxHoursPerWeek: { type: Number, default: 40 },
    minBreakBetweenClasses: { type: Number, default: 1 },
    workingDays: [{ type: String }],
    timeSlots: [{
      slot: String,
      order: Number
    }]
  },
  attendance: {
    autoApproveLeaves: { type: Boolean, default: false },
    maxLeavesPerMonth: { type: Number, default: 2 },
    notificationBeforeClass: { type: Number, default: 15 },
    allowLateMarking: { type: Boolean, default: true },
    lateThreshold: { type: Number, default: 10 }
  },
  notifications: {
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
    scheduleChanges: { type: Boolean, default: true },
    leaveApprovals: { type: Boolean, default: true },
    systemUpdates: { type: Boolean, default: true }
  },
  academic: {
    currentAcademicYear: String,
    semesters: [{ type: Number }],
    gradingSystem: { type: String, default: "percentage" },
    passPercentage: { type: Number, default: 40 },
    maxBacklogsAllowed: { type: Number, default: 4 }
  },
  system: {
    maintenanceMode: { type: Boolean, default: false },
    autoBackup: { type: Boolean, default: true },
    backupFrequency: { type: String, default: "daily" },
    dataRetentionPeriod: { type: Number, default: 365 },
    sessionTimeout: { type: Number, default: 30 }
  },
  changeLog: [{
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    changes: String,
    timestamp: { type: Date, default: Date.now }
  }],
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, {
  timestamps: true
});

export default mongoose.model("SystemSetting", systemSettingSchema);