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
    }
  },
  { timestamps: true }
);

export default mongoose.model("Timetable", timetableSchema);
