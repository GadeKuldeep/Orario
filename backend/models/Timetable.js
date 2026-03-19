import mongoose from "mongoose";

const timetableSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    semester: { type: Number, required: true },
    academicYear: { type: String, required: true },
    schedule: [
      {
        day: { type: String, required: true },
        slots: [
          {
            timeSlot: { type: String, required: true },
            slotOrder: { type: Number, required: true },
            subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
            faculty: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
            classroom: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom", required: true },
            type: { type: String, enum: ["regular", "tutorial", "lab"], default: "regular" },
            isSubstitute: { type: Boolean, default: false },
            substituteApproved: { type: Boolean, default: false }
          }
        ]
      }
    ],
    status: { 
      type: String, 
      enum: ["draft", "review", "approved", "locked"], 
      default: "draft" 
    },
    version: { type: Number, default: 1 },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    validity: {
      startDate: { type: Date },
      endDate: { type: Date },
      isCurrent: { type: Boolean, default: false }
    },
    optimizationMetrics: {
      fitnessScore: { type: Number },
      conflictsResolved: { type: Number },
      roomUtilization: { type: Number }
    },
    constraints: {
      hardConstraints: [String],
      softConstraints: [String]
    },
    // NEP 2020: Delivery Mode & Online Configuration
    deliveryConfig: {
      mode: {
        type: String,
        enum: ["offline", "online", "blended"],
        default: "offline"
      },
      onlineClasses: [{
        day: String,
        timeSlot: String,
        platform: String,
        recordingAvailable: Boolean,
        recordingURL: String
      }],
      blendedRatio: {
        online: { type: Number, default: 0, min: 0, max: 100 },
        offline: { type: Number, default: 100, min: 0, max: 100 }
      }
    },
    // NEP 2020: Experiential Learning Hours Integration
    experientialLearningSchedule: [{
      week: Number,
      activityType: String,
      description: String,
      hours: Number,
      location: String,
      industryPartner: String
    }],
    // Cross-institutional offerings tracking
    crossInstitutionalParticipants: [{
      institution: String,
      department: String,
      studentsEnrolled: Number,
      faculty: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    }],
    // NEP 2020: Skill Assessment Tracking
    skillAssessmentPlan: [{
      skillName: String,
      assessmentWeek: Number,
      methods: [String],
      rubric: String
    }],
    // NEP 2020 Compliance Flag
    isNEP2020Compliant: {
      type: Boolean,
      default: false,
      description: "Marks timetable as fully NEP 2020 compliant"
    },
    complianceCheckpoints: [{
      checkpoint: String,
      status: { type: String, enum: ["pending", "satisfied", "not-applicable"], default: "pending" },
      remarks: String
    }]
  },
  { timestamps: true }
);

export default mongoose.model("Timetable", timetableSchema);
