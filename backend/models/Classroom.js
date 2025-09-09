import mongoose from "mongoose";

const classroomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    capacity: { type: Number, required: true },
    facilities: [{ type: String }], // e.g. ["Projector", "Lab", "AC"]
  },
  { timestamps: true }
);

export default mongoose.model("Classroom", classroomSchema);
