const mongoose = require('mongoose');

const recoveryCampaignSchema = new mongoose.Schema(
  {
    campaignId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    targetScenario: {
      type: String,
      default: 'ALL_FAILURES',
    },
    mode: {
      type: String,
      enum: ['SIMULATION', 'TEST_EXECUTION'],
      default: 'SIMULATION',
    },
    status: {
      type: String,
      enum: ['DRAFT', 'SIMULATED', 'EXECUTED', 'COMPLETED'],
      default: 'DRAFT',
    },
    strategySelected: {
      type: String,
      default: 'OPTIMIZED_EXPECTED_VALUE',
    },
    targetedCount: {
      type: Number,
      default: 0,
    },
    revenueAtRisk: {
      type: Number,
      default: 0,
    },
    eligibleRevenue: {
      type: Number,
      default: 0,
    },
    expectedRecovery: {
      type: Number,
      default: 0,
    },
    actualRecovered: {
      type: Number,
      default: 0,
    },
    actualFailed: {
      type: Number,
      default: 0,
    },
    blockedAmount: {
      type: Number,
      default: 0,
    },
    recoveryRate: {
      type: Number,
      default: 0,
    },
    expectedVsActual: {
      type: Number,
      default: 0,
    },
    actionsBreakdown: {
      retryCount: { type: Number, default: 0 },
      recoveryLinkCount: { type: Number, default: 0 },
      webhookReconcileCount: { type: Number, default: 0 },
      alternateMethodCount: { type: Number, default: 0 },
      waitRetryCount: { type: Number, default: 0 },
      blockedCount: { type: Number, default: 0 },
    },
    policy: {
      maxRetries: { type: Number, default: 2 },
      allowRecoveryLinks: { type: Boolean, default: true },
      minTimeBetweenRetriesSec: { type: Number, default: 300 },
      maxTransactionAmount: { type: Number, default: 50000 },
    },
    learningMetrics: {
      calibrationError: { type: Number, default: 0 },
      precision: { type: Number, default: 0 },
      recoveredTransactions: { type: Number, default: 0 },
    },
    executedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('RecoveryCampaign', recoveryCampaignSchema);
