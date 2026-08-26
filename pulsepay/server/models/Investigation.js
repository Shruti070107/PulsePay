const mongoose = require('mongoose');

const actionSchema = new mongoose.Schema({
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    required: true
  },
  action: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true
  }
}, { _id: false });

const evidenceSchema = new mongoose.Schema({
  statement: {
    type: String,
    required: true
  },
  source: {
    type: String,
    required: true
  }
}, { _id: false });

const investigationSchema = new mongoose.Schema(
  {
    investigationId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    incidentId: {
      type: String,
      required: true,
      index: true
    },
    summary: {
      type: String,
      required: true
    },
    probableRootCause: {
      type: String,
      required: true
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1
    },
    confidenceExplanation: {
      type: String,
      required: true
    },
    facts: {
      type: [String],
      default: []
    },
    inferences: {
      type: [String],
      default: []
    },
    evidence: {
      type: [evidenceSchema],
      default: []
    },
    financialImpact: {
      affectedAmount: {
        type: Number,
        required: true
      },
      interpretation: {
        type: String,
        required: true
      }
    },
    customerImpact: {
      type: String,
      required: true
    },
    recommendedActions: {
      type: [actionSchema],
      default: []
    },
    unknowns: {
      type: [String],
      default: []
    },
    alternativeHypotheses: {
      type: [String],
      default: []
    },
    hypotheses: {
      type: [String],
      default: []
    },
    supportingEvidence: {
      type: [String],
      default: []
    },
    contradictingEvidence: {
      type: [String],
      default: []
    },
    nextChecks: {
      type: [String],
      default: []
    },
    rawModelResponse: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Investigation', investigationSchema);
