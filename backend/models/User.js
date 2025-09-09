import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "faculty", "student"], required: true },
    department: { type: String },
    subjects: [{ type: String }], // for faculty
    coursesEnrolled: [{ type: String }], // for students
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
