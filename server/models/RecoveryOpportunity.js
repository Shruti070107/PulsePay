const mongoose = require('mongoose');

const recoveryOpportunitySchema = new mongoose.Schema(
  {
    opportunityId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    paymentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    merchantId: {
      type: String,
      required: true,
      index: true,
    },
    customerId: {
      type: String,
      required: true,
      index: true,
    },
    orderId: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: 'INR',
    },
    provider: {
      type: String,
      default: 'gateway_mock',
    },
    paymentMethod: {
      type: String,
      default: 'upi',
    },
    failureReason: {
      type: String,
      required: true,
    },
    failureTimestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    previousAttempts: {
      type: Number,
      default: 1,
    },
    timeSinceFailureMinutes: {
      type: Number,
      default: 0,
    },
    incidentId: {
      type: String,
      index: true,
    },
    recoverabilityClassification: {
      type: String,
      required: true,
      enum: ['RECOVERABLE', 'POSSIBLY_RECOVERABLE', 'LOW_PROBABILITY', 'NON_RECOVERABLE'],
      default: 'POSSIBLY_RECOVERABLE',
    },
    recoverabilityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
    },
    rawProbability: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5,
    },
    recoveryProbability: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5,
    },
    estimatedRecoverableAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    recommendedAction: {
      type: String,
      required: true,
      enum: [
        'RETRY_PAYMENT',
        'SEND_RECOVERY_LINK',
        'RECONCILE_WEBHOOK',
        'RETRY_WEBHOOK',
        'ALTERNATE_PAYMENT_METHOD',
        'WAIT_AND_RETRY',
        'STOP_RECOVERY',
        'DELAYED_RETRY',
        'ALTERNATE_ROUTE',
        'PAYMENT_LINK',
        'RECONCILIATION',
        'IMMEDIATE_RETRY',
        'NO_ACTION'
      ],
      default: 'RETRY_PAYMENT',
    },
    expectedValue: {
      type: Number,
      required: true,
      default: 0,
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 20,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 85,
    },
    evidenceIds: {
      type: [String],
      default: [],
    },
    policyChecks: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    featureInfluence: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    reasons: {
      type: [String],
      default: [],
    },
    explanations: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    stopConditions: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'SIMULATED', 'QUEUED', 'EXECUTING', 'RECOVERED', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    policyStatus: {
      type: String,
      required: true,
      enum: ['ELIGIBLE', 'BLOCKED', 'REQUIRES_APPROVAL'],
      default: 'ELIGIBLE',
      index: true,
    },
    blockedReason: {
      type: String,
    },
    featureAttributions: [
      {
        feature: String,
        contribution: Number,
        direction: { type: String, enum: ['POSITIVE', 'NEGATIVE'] },
      },
    ],
    agentAnalysis: {
      summary: String,
      confidence: Number,
      suggestedAction: String,
      modelUsed: String,
      reasoning: [String],
      citations: [String],
      timestamp: Date,
    },
    actualRecoveredAmount: {
      type: Number,
      default: 0,
    },
    lastActionAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('RecoveryOpportunity', recoveryOpportunitySchema);
