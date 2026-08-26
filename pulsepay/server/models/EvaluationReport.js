const mongoose = require('mongoose');

const evaluationReportSchema = new mongoose.Schema(
  {
    evaluationId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    scenarioId: {
      type: String,
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now
    },
    stats: {
      transactionsGenerated: { type: Number, default: 0 },
      transactionsAffected: { type: Number, default: 0 },
      customersAffected: { type: Number, default: 0 },
      merchantsAffected: { type: Number, default: 0 },
      financialExposure: { type: Number, default: 0 },
      detectionLatencyMs: { type: Number, default: 0 }
    },
    metrics: {
      precision: { type: Number, default: 0 },
      recall: { type: Number, default: 0 },
      f1Score: { type: Number, default: 0 },
      rootCauseAccuracy: { type: Number, default: 0 },
      evidenceGroundingRate: { type: Number, default: 0 }
    },
    scorecard: {
      detection: { type: String, enum: ['PASS', 'FAIL'], default: 'FAIL' },
      rootCause: { type: String, enum: ['PASS', 'FAIL'], default: 'FAIL' },
      evidence: { type: String, enum: ['PASS', 'FAIL'], default: 'FAIL' },
      ml: { type: String, enum: ['PASS', 'FAIL'], default: 'FAIL' },
      ai: { type: String, enum: ['PASS', 'FAIL'], default: 'FAIL' },
      blastRadius: { type: String, enum: ['PASS', 'FAIL'], default: 'FAIL' },
      replay: { type: String, enum: ['PASS', 'FAIL'], default: 'FAIL' },
      whatIf: { type: String, enum: ['PASS', 'FAIL'], default: 'FAIL' },
      overallScore: { type: Number, default: 0 }
    },
    actualIncidentId: {
      type: String,
      index: true
    },
    aiMode: {
      type: String,
      enum: ['LIVE LLM', 'DETERMINISTIC FALLBACK'],
      default: 'DETERMINISTIC FALLBACK'
    },
    evaluationDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('EvaluationReport', evaluationReportSchema);
