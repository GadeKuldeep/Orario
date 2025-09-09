import mongoose from "mongoose";

const timetableSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom", required: true },
    day: { type: String, required: true }, // e.g. "Monday"
    time: { type: String, required: true }, // e.g. "10:00-11:00"
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    conflict: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Timetable", timetableSchema);
