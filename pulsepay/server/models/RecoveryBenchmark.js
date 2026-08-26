const mongoose = require('mongoose');

const CalibrationBucketSchema = new mongoose.Schema({
  bucket: { type: String, required: true }, // e.g. "0-10%", "10-20%", ..., "90-100%"
  rangeMin: { type: Number, required: true },
  rangeMax: { type: Number, required: true },
  predictionCount: { type: Number, default: 0 },
  averagePredictedProbability: { type: Number, default: 0 },
  actualRecoveryRate: { type: Number, default: 0 },
  calibrationError: { type: Number, default: 0 },
}, { _id: false });

const StrategyScorecardSchema = new mongoose.Schema({
  strategy: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  successes: { type: Number, default: 0 },
  amountAttempted: { type: Number, default: 0 },
  amountRecovered: { type: Number, default: 0 },
  successRate: { type: Number, default: 0 },
  averageRecovery: { type: Number, default: 0 },
  cost: { type: Number, default: 0 },
  netRecovery: { type: Number, default: 0 },
}, { _id: false });

const ScenarioScorecardSchema = new mongoose.Schema({
  scenarioId: { type: String, required: true },
  name: { type: String, required: true },
  totalCount: { type: Number, default: 0 },
  amountAtRisk: { type: Number, default: 0 },
  actualRecovered: { type: Number, default: 0 },
  recoveryRate: { type: Number, default: 0 },
  precision: { type: Number, default: 0 },
  recall: { type: Number, default: 0 },
  rawAvgProb: { type: Number, default: 0 },
  calibratedAvgProb: { type: Number, default: 0 },
  rawCalibrationError: { type: Number, default: 0 },
  calibratedCalibrationError: { type: Number, default: 0 },
  unsafeActionsBlocked: { type: Number, default: 0 },
  duplicateActionsPrevented: { type: Number, default: 0 },
}, { _id: false });

const BaselineComparisonSchema = new mongoose.Schema({
  pulsePayRecovery: { type: Number, default: 0 },
  pulsePayCost: { type: Number, default: 0 },
  pulsePayNetRecovery: { type: Number, default: 0 },
  pulsePayAttempts: { type: Number, default: 0 },
  pulsePayBlockedActions: { type: Number, default: 0 },

  blindRetryRecovery: { type: Number, default: 0 },
  blindRetryCost: { type: Number, default: 0 },
  blindRetryNetRecovery: { type: Number, default: 0 },
  blindRetryAttempts: { type: Number, default: 0 },
  blindRetryFailedAttempts: { type: Number, default: 0 },
  blindRetryDuplicateCharges: { type: Number, default: 0 },

  netImprovementAmount: { type: Number, default: 0 },
  netImprovementPercentage: { type: Number, default: 0 },
  costReductionPercentage: { type: Number, default: 0 },
  unsafeChargesAvoided: { type: Number, default: 0 },
}, { _id: false });

const MetricSummarySchema = new mongoose.Schema({
  calibrationError: { type: Number, default: 0 },
  ece: { type: Number, default: 0 }, // Expected Calibration Error
  brierScore: { type: Number, default: 0 },
  averagePredictedProbability: { type: Number, default: 0 },
  actualSuccessRate: { type: Number, default: 0 },
  predictedRecovery: { type: Number, default: 0 },
  calibrationBuckets: [CalibrationBucketSchema],
}, { _id: false });

const RecoveryBenchmarkSchema = new mongoose.Schema({
  benchmarkId: { type: String, required: true, unique: true, index: true },
  name: { type: String, default: 'Synthetic Recovery Benchmark Run' },
  seed: { type: Number, required: true, default: 20260826 },
  datasetSize: { type: Number, required: true, default: 10000 },
  evaluationSplitRatio: { type: Number, default: 0.30 }, // 30% evaluation
  trainingCount: { type: Number, default: 7000 },
  evaluationCount: { type: Number, default: 3000 },
  status: { type: String, enum: ['PENDING', 'GENERATING', 'EVALUATING', 'COMPLETED', 'FAILED'], default: 'PENDING' },
  scoringModelType: { type: String, default: 'Recovery scoring heuristic' },
  calibrationMethod: { type: String, default: 'Isotonic Regression & Platt Scaling' },
  calibrationModelId: { type: String },
  
  // Executive Financial Metrics (On Evaluation Set)
  totalAmountAtRisk: { type: Number, default: 0 },
  eligibleAmount: { type: Number, default: 0 },
  predictedRecovery: { type: Number, default: 0 },
  actualRecovery: { type: Number, default: 0 },
  actionCost: { type: Number, default: 0 },
  netRecoveredRevenue: { type: Number, default: 0 },
  recoveryRate: { type: Number, default: 0 }, // % of total risk

  // Statistical & Classification Quality (Calibrated)
  recoveryPrecision: { type: Number, default: 0 },
  recoveryRecall: { type: Number, default: 0 },
  falsePositiveRate: { type: Number, default: 0 },
  falseNegativeRate: { type: Number, default: 0 },
  averagePredictedProbability: { type: Number, default: 0 },
  actualSuccessRate: { type: Number, default: 0 },
  calibrationError: { type: Number, default: 0 },
  ece: { type: Number, default: 0 },
  brierScore: { type: Number, default: 0 },

  // Safety & Guardrail Performance
  actionsAttempted: { type: Number, default: 0 },
  actionsBlocked: { type: Number, default: 0 },
  duplicateActionsPrevented: { type: Number, default: 0 },
  unsafeActionsPrevented: { type: Number, default: 0 },

  // Before vs After Calibration Explicit Comparison
  rawMetrics: MetricSummarySchema,
  calibratedMetrics: MetricSummarySchema,
  calibrationComparison: {
    calibrationErrorBefore: { type: Number, default: 0 },
    calibrationErrorAfter: { type: Number, default: 0 },
    eceBefore: { type: Number, default: 0 },
    eceAfter: { type: Number, default: 0 },
    brierScoreBefore: { type: Number, default: 0 },
    brierScoreAfter: { type: Number, default: 0 },
    netRecoveryBefore: { type: Number, default: 0 },
    netRecoveryAfter: { type: Number, default: 0 },
    precisionBefore: { type: Number, default: 0 },
    precisionAfter: { type: Number, default: 0 },
    recallBefore: { type: Number, default: 0 },
    recallAfter: { type: Number, default: 0 },
    unsafeActionsBefore: { type: Number, default: 0 },
    unsafeActionsAfter: { type: Number, default: 0 },
    duplicateChargesBefore: { type: Number, default: 0 },
    duplicateChargesAfter: { type: Number, default: 0 },
  },

  // Distribution Drift Analysis
  driftAnalysis: {
    psi: { type: Number, default: 0 },
    ksStatistic: { type: Number, default: 0 },
    driftStatus: { type: String, enum: ['LOW_DRIFT', 'MODERATE_DRIFT', 'HIGH_DRIFT'], default: 'LOW_DRIFT' },
    details: { type: String },
  },

  // AI Grounding Evaluation
  aiEvaluation: {
    groundedClaims: { type: Number, default: 0 },
    unsupportedClaims: { type: Number, default: 0 },
    evidenceCoverage: { type: Number, default: 0 },
    hallucinationRate: { type: Number, default: 0 },
    groundingScore: { type: Number, default: 0 },
  },

  // Detailed Analysis Structures
  baselineComparison: BaselineComparisonSchema,
  calibrationBuckets: [CalibrationBucketSchema], // Active (Calibrated)
  strategyScorecards: [StrategyScorecardSchema],
  scenarioScorecards: [ScenarioScorecardSchema],

  durationMs: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
});

module.exports = mongoose.model('RecoveryBenchmark', RecoveryBenchmarkSchema);
