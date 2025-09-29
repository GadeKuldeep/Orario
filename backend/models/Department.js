import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true 
  },
  code: { 
    type: String, 
    required: true, 
    unique: true,
    uppercase: true 
  }, // e.g., "CSE", "ECE"
  
  // Department Head
  headOfDepartment: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },
  
  // Academic Information
  totalSemesters: { type: Number, default: 8 },
  establishedYear: { type: Number },
  
  // Statistics (updated automatically)
  facultyCount: { type: Number, default: 0 },
  studentCount: { type: Number, default: 0 },
  subjectCount: { type: Number, default: 0 },
  
  // Configuration
  workingDays: [{ 
    type: String, 
    enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    default: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
  }],
  timeSlots: [{
    slot: { type: String, required: true }, // "9:00-10:00"
    order: { type: Number, required: true } // 1, 2, 3...
  }],
  
  contactEmail: { type: String },
  contactPhone: { type: String }
}, { 
  timestamps: true 
});

export default mongoose.model("Department", departmentSchema);