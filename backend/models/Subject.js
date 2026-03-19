import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema(
  {
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
    },
    type: { 
      type: String, 
      enum: ["theory", "lab", "tutorial", "seminar"],
      default: "theory"
    },
    department: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Department",
      required: true
    },
    semester: { 
      type: Number, 
      required: true,
      min: 1,
      max: 8
    },
    credits: { 
      type: Number, 
      required: true,
      min: 1,
      max: 5,
      default: 3
    },
    // Changed from single ObjectId to array for multiple faculty
    facultyAssigned: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],
    practicalBatches: {
      type: Number,
      default: 1,
      description: "Number of batches for lab (A, B, C, etc.)"
    },
    courseObjectives: [String],
    prerequisites: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject"
    }],
    preferredTimeSlots: [String],  // e.g., ["09:00-10:00", "10:00-11:00"]
    maxClassesPerWeek: {
      type: Number,
      default: 3,
      min: 1,
      max: 7
    },
    requiresLab: {
      type: Boolean,
      default: false
    },
    sequentialSlots: {
      type: Boolean,
      default: false,
      description: "Can this subject have multiple slots on same day (for labs)"
    },
    // NEP 2020 COMPLIANCE: Multi-department course sharing
    sharedDepartments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      description: "Other departments that can use this course"
    }],
    // NEP 2020 COMPLIANCE: Experiential learning designation
    isExperientialLearning: {
      type: Boolean,
      default: false,
      description: "Course involves hands-on learning, internship, or project-based work"
    },
    experientialLearningDetails: {
      type: String,
      enum: ["internship", "industry-project", "field-work", "lab-project", "research"],
      description: "Type of experiential learning component"
    },
    minimumInternshipHours: {
      type: Number,
      default: 0,
      description: "Minimum hours for internship/field work component"
    },
    // NEP 2020 COMPLIANCE: Flexible delivery mode
    deliveryMode: {
      type: String,
      enum: ["offline", "online", "blended"],
      default: "offline",
      description: "How the course is delivered"
    },
    // Learning outcomes aligned with NEP 2020 (4Cs: Critical thinking, Communication, Collaboration, Creativity)
    learningOutcomes: [{
      outcome: String,
      alignedWith: {
        type: String,
        enum: ["critical-thinking", "communication", "collaboration", "creativity", "disciplinary"],
        default: "disciplinary"
      }
    }],
    // NEP 2020: Skill-based learning components
    skillComponents: [{
      skillName: String,
      assessmentMethod: String,
      weightage: Number
    }],
    // Credit equivalence for multi-disciplinary courses
    creditEquivalence: {
      type: Number,
      description: "Credit value if different from actual credits (for cross-listing)"
    }
  },
  { timestamps: true }
);

// Index for efficient queries
subjectSchema.index({ department: 1, semester: 1 });
subjectSchema.index({ code: 1 });

export default mongoose.model("Subject", subjectSchema);
