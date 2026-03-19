import mongoose from "mongoose";

const teacherAvailabilitySchema = new mongoose.Schema(
  {
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    day: { type: String, required: true }, // e.g., "Monday"
    slot: { type: String, required: true }, // e.g., "09:00-10:00"
    status: { 
      type: String, 
      enum: ["available", "preferred", "unavailable"], 
      default: "available" 
    },
    reason: { type: String }, // optional, for unavailable slots
  },
  { timestamps: true }
);

export default mongoose.model("TeacherAvailability", teacherAvailabilitySchema);
