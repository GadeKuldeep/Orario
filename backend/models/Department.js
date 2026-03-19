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
  contactPhone: { type: String },
  
  // NEP 2020: Flexible Timing Configuration
  flexibleTiming: {
    enabled: { type: Boolean, default: false },
    minSlotDuration: { type: Number, default: 50, description: "Minimum minutes per slot" },
    maxSlotDuration: { type: Number, default: 90, description: "Maximum minutes per slot" },
    allowedDurations: [Number], // e.g., [50, 60, 75, 90] for flexible slot lengths
    compressedSemesterAllowed: { type: Boolean, default: false, description: "Courses can be completed in shortened duration (e.g., 4 weeks intensive)" }
  },
  
  // NEP 2020: Experiential Learning Infrastructure
  experientialLearningSupport: {
    hasInternshipCell: { type: Boolean, default: false },
    hasIndustryPartnership: { type: Boolean, default: false },
    designatedPracticalSpaces: { type: Number, default: 0 },
    industryPartners: [String], // e.g., ["Company A", "Company B"]
    fieldWorkLocations: [String]
  },
  
  // NEP 2020: Online/Blended Learning Capability
  onlineCapability: {
    enabled: { type: Boolean, default: false },
    platforms: [String], // e.g., ["Zoom", "Google Meet", "MS Teams"]
    maxOnlineStudents: { type: Number, default: 100 },
    videoRecordingAllowed: { type: Boolean, default: true },
    asynchronousLearningSupported: { type: Boolean, default: true }
  },
  
  // NEP 2020: Inter-disciplinary & Multi-discipline Courses
  supportsCrossDisciplinaryOfferings: { type: Boolean, default: false },
  collaboratingDepartments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department"
  }],
  
  // NEP 2020: Assessment & Ranking parameters
  assessmentPolicy: {
    continuousEvaluation: { type: Boolean, default: true },
    projectBasedEvaluation: { type: Boolean, default: true },
    internshipEvaluation: { type: Boolean, default: false },
    industryEvaluation: { type: Boolean, default: false }
  }
}, { 
  timestamps: true 
});

export default mongoose.model("Department", departmentSchema);