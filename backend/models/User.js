import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "faculty", "student", "hod"], required: true },
    department: { type: String },
    isActive: { type: Boolean, default: true },
    uniqueId: { type: String, unique: true, sparse: true },
    semester: { type: Number },
    designation: { type: String },
    profileCompleted: { type: Boolean, default: false },
    lastLogin: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date },
    subjects: [{ type: String }], // for faculty
    coursesEnrolled: [{ type: String }], // for students
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
