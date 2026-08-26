const mongoose = require('mongoose');

const paymentEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    paymentId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    eventTimestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    receivedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    merchantId: {
      type: String,
      index: true,
    },
    customerId: {
      type: String,
    },
    orderId: {
      type: String,
      index: true,
    },
    amount: {
      type: Number,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    provider: {
      type: String,
      default: 'gateway_mock',
    },
    attempt: {
      type: Number,
      default: 1,
    },
    eventType: {
      type: String,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('PaymentEvent', paymentEventSchema);
