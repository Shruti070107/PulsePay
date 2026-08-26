const mongoose = require('mongoose');

const recoveryActionSchema = new mongoose.Schema(
  {
    recoveryActionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    batchId: {
      type: String,
      index: true,
    },
    campaignId: {
      type: String,
      index: true,
    },
    paymentId: {
      type: String,
      required: true,
      index: true,
    },
    opportunityId: {
      type: String,
      index: true,
    },
    action: {
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
    },
    previousState: {
      type: String,
      required: true,
    },
    newState: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    recoveredAmount: {
      type: Number,
      default: 0,
    },
    result: {
      type: String,
      required: true,
      enum: ['RECOVERED', 'FAILED', 'BLOCKED', 'SKIPPED'],
    },
    reason: {
      type: String,
    },
    policyDecision: {
      allowed: Boolean,
      ruleEvaluated: String,
      reason: String,
    },
    executionDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('RecoveryAction', recoveryActionSchema);
