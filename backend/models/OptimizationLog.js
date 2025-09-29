import mongoose from "mongoose";

const optimizationLogSchema = new mongoose.Schema({
  // Reference Information
  timetable: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Timetable", 
    required: true 
  },
  department: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Department", 
    required: true 
  },
  
  // Algorithm Information
  algorithmUsed: { 
    type: String, 
    enum: ["genetic", "constraint_satisfaction", "hybrid", "manual"],
    required: true 
  },
  algorithmVersion: { type: String, default: "1.0" },
  
  // Constraints Configuration
  constraints: {
    hardConstraints: [{ type: String }],
    softConstraints: [{ type: String }],
    weights: mongoose.Schema.Types.Mixed
  },
  
  // Performance Metrics
  performance: {
    executionTime: { type: Number, required: true }, // milliseconds
    memoryUsed: { type: Number }, // MB
    iterations: { type: Number },
    fitnessScore: { type: Number }, // 0-100
    conflictsInitial: { type: Number },
    conflictsFinal: { type: Number },
    constraintsSatisfied: { type: Number },
    totalConstraints: { type: Number }
  },
  
  // Optimization Results
  results: {
    facultySatisfaction: { type: Number }, // 0-100
    roomUtilization: { type: Number }, // Percentage
    timeEfficiency: { type: Number }, // 0-100
    overallScore: { type: Number } // 0-100
  },
  
  // Input/Output Data
  inputData: {
    facultyCount: { type: Number },
    subjectCount: { type: Number },
    classroomCount: { type: Number },
    timeSlots: { type: Number }
  },
  
  // Error Handling
  status: { 
    type: String, 
    enum: ["success", "partial_success", "failed", "timeout"], 
    required: true 
  },
  errorLog: { type: String },
  
  // System Information
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  systemInfo: {
    nodeVersion: String,
    memory: String,
    timestamp: { type: Date, default: Date.now }
  }
}, { 
  timestamps: true 
});

// Index for analysis and reporting
optimizationLogSchema.index({ department: 1, createdAt: -1 });
optimizationLogSchema.index({ algorithmUsed: 1, status: 1 });

export default mongoose.model("OptimizationLog", optimizationLogSchema);