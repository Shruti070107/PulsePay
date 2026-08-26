const mongoose = require('mongoose');

const RecoveryBenchmarkResultSchema = new mongoose.Schema({
  benchmarkId: { type: String, required: true, index: true },
  paymentId: { type: String, required: true, index: true },
  split: { type: String, enum: ['TRAIN', 'EVALUATION'], required: true, index: true },
  scenarioId: { type: String, required: true },
  scenarioName: { type: String, required: true },
  
  // Public Synthetic Attributes (Available to Decision Engine)
  merchantId: { type: String, required: true },
  customerId: { type: String, required: true },
  orderId: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  provider: { type: String, required: true },
  paymentMethod: { type: String, required: true },
  failureType: { type: String, required: true },
  attemptCount: { type: Number, default: 0 },
  timestamp: { type: Date, required: true },
  providerHealth: { type: String, enum: ['HEALTHY', 'DEGRADED', 'DOWN'], default: 'HEALTHY' },
  customerHistory: {
    lifetimeSuccessfulTransactions: { type: Number, default: 0 },
    fraudRiskTier: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'LOW' },
  },
  latencyMs: { type: Number, default: 250 },
  webhookStatus: { type: String, enum: ['DELIVERED', 'FAILED', 'PENDING', 'NONE'], default: 'NONE' },
  historicalRecoverySignal: { type: String, enum: ['STRONG', 'MODERATE', 'WEAK', 'ZERO'], default: 'MODERATE' },

  // Decision & Strategy Output (Computed by PulsePay)
  rawRecoveryScore: { type: Number, default: 0 },
  rawRecoveryProbability: { type: Number, default: 0 },
  calibratedRecoveryProbability: { type: Number, default: 0 },
  recoveryProbability: { type: Number, default: 0 }, // Active probability (Calibrated)
  
  rawExpectedRecovery: { type: Number, default: 0 },
  expectedRecovery: { type: Number, default: 0 },
  estimatedActionCost: { type: Number, default: 0 },
  rawExpectedValue: { type: Number, default: 0 },
  expectedValue: { type: Number, default: 0 },
  
  recommendedStrategy: { type: String, required: true },
  policyDecision: { type: String, enum: ['ELIGIBLE', 'BLOCKED'], required: true },
  blockedReasons: [{ type: String }],
  
  // Synthetic Execution Result (PulsePay)
  execution: {
    executionId: { type: String },
    strategy: { type: String },
    startedAt: { type: Date },
    completedAt: { type: Date },
    success: { type: Boolean, default: false },
    amountRecovered: { type: Number, default: 0 },
    costIncurred: { type: Number, default: 0 },
    netYield: { type: Number, default: 0 },
    failureReason: { type: String },
    idempotencyKey: { type: String },
  },

  // Naive Baseline Execution (Blind Retry All)
  blindRetryExecution: {
    attempted: { type: Boolean, default: true },
    success: { type: Boolean, default: false },
    amountRecovered: { type: Number, default: 0 },
    costIncurred: { type: Number, default: 2 },
    netYield: { type: Number, default: -2 },
    isDuplicateCharge: { type: Boolean, default: false },
  },

  // 5-Point Explainability
  explanations: {
    whyThisPayment: { type: String },
    whyThisAction: { type: String },
    whyNow: { type: String },
    whyNotAnother: { type: String },
    whySafe: { type: String },
    calibrationNote: { type: String },
  },

  // =========================================================================
  // ISOLATED GROUND TRUTH (NEVER ACCESSIBLE DURING AGENT DECISION MAKING)
  // =========================================================================
  groundTruth: {
    recoverable: { type: Boolean, required: true },
    recoveryProbability: { type: Number, required: true },
    optimalStrategy: { type: String, required: true },
    isDuplicateRisk: { type: Boolean, default: false },
    isPermanentDecline: { type: Boolean, default: false },
    webhookDeliveredToGateway: { type: Boolean, default: false },
    softDeclineRequiresNewMethod: { type: Boolean, default: false },
  },
}, { timestamps: true });

RecoveryBenchmarkResultSchema.index({ benchmarkId: 1, split: 1 });
RecoveryBenchmarkResultSchema.index({ benchmarkId: 1, scenarioId: 1 });

module.exports = mongoose.model('RecoveryBenchmarkResult', RecoveryBenchmarkResultSchema);
