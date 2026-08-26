const mongoose = require('mongoose');

const webhookEventSchema = new mongoose.Schema(
  {
    webhookId: {
      type: String,
      required: true,
      index: true,
    },
    paymentId: {
      type: String,
      required: true,
      index: true,
    },
    eventId: {
      type: String,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
    },
    deliveryStatus: {
      type: String,
      required: true,
      enum: ['delivered', 'failed', 'retrying'],
    },
    responseCode: {
      type: Number,
    },
    attemptNumber: {
      type: Number,
      required: true,
      default: 1,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('WebhookEvent', webhookEventSchema);
