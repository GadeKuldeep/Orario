import mongoose from "mongoose";

const constraintTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    default: null
  },
  isGlobal: {
    type: Boolean,
    default: false
  },
  constraints: {
    hardConstraints: [{
      type: {
        type: String,
        required: true
      },
      condition: {
        type: String,
        required: true
      },
      description: String,
      parameters: mongoose.Schema.Types.Mixed
    }],
    softConstraints: [{
      type: {
        type: String,
        required: true
      },
      condition: {
        type: String,
        required: true
      },
      weight: {
        type: Number,
        min: 0,
        max: 1,
        required: true
      },
      description: String,
      parameters: mongoose.Schema.Types.Mixed
    }],
    optimizationPreferences: {
      priority: {
        type: String,
        enum: ['balanced', 'faculty_preference', 'room_utilization', 'student_preference'],
        default: 'balanced'
      },
      algorithm: {
        type: String,
        enum: ['genetic', 'simulated_annealing', 'tabu_search', 'linear_programming'],
        default: 'genetic'
      },
      maxIterations: {
        type: Number,
        default: 1000
      },
      populationSize: {
        type: Number,
        default: 50
      }
    }
  },
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsedAt: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
constraintTemplateSchema.index({ department: 1, isGlobal: 1 });
constraintTemplateSchema.index({ name: 1, department: 1 }, { unique: true });

export default mongoose.model("ConstraintTemplate", constraintTemplateSchema);