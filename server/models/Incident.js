const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema(
  {
    incidentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'CAPTURED_ORDER_UNPAID',
        'DUPLICATE_PAYMENT_RISK',
        'WEBHOOK_FAILURE',
        'OUT_OF_ORDER_EVENTS',
        'REFUND_INCONSISTENCY',
        'LATE_AUTHORIZATION',
        'STATISTICALLY_ANOMALOUS',
      ],
    },
    severity: {
      type: String,
      required: true,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    },
    status: {
      type: String,
      required: true,
      enum: ['active', 'investigating', 'resolved'],
      default: 'active',
    },
    affectedTransactions: {
      type: Number,
      required: true,
      default: 0,
    },
    affectedAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    affectedCustomers: {
      type: Number,
      required: true,
      default: 0,
    },
    transactionIds: {
      type: [String],
      default: [],
    },
    rootCause: {
      type: String,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },
    recommendation: {
      type: String,
    },
    explanation: {
      type: String,
    },
    customerImpact: {
      type: String,
    },
    operatorActions: {
      type: [String],
      default: [],
    },
    evidence: {
      type: [String],
      default: [],
    },
    evidenceItems: [
      {
        type: { type: String },
        severity: { type: String },
        description: { type: String },
        source: { type: String },
        confidence: { type: Number }
      }
    ],
    blastRadius: {
      affectedTransactions: { type: Number, default: 0 },
      affectedCustomers: { type: Number, default: 0 },
      affectedMerchants: { type: Number, default: 0 },
      affectedOrders: { type: Number, default: 0 },
      affectedAmount: { type: Number, default: 0 },
      incidentDuration: { type: Number, default: 0 },
      failureRate: { type: Number, default: 0 },
      mlAnomalyCount: { type: Number, default: 0 }
    },
    confidenceBreakdown: {
      score: { type: Number, default: 0 },
      explanation: { type: String },
      factors: [
        {
          name: { type: String },
          score: { type: Number }
        }
      ]
    },
    operatorActionCenter: [
      {
        id: { type: String },
        priority: { type: String },
        action: { type: String },
        reason: { type: String },
        evidenceRef: { type: String },
        status: {
          type: String,
          enum: ['TODO', 'IN_PROGRESS', 'DONE', 'DISMISSED'],
          default: 'TODO'
        }
      }
    ],
    operatorFeedback: {
      type: String,
      enum: ['TRUE_INCIDENT', 'FALSE_POSITIVE', 'UNCERTAIN']
    },
    auditTrail: [
      {
        timestamp: { type: Date, default: Date.now },
        action: { type: String },
        actor: { type: String, default: 'operator' }
      }
    ]
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Incident', incidentSchema);
