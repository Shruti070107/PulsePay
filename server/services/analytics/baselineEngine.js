const Payment = require('../../models/Payment');
const PaymentEvent = require('../../models/PaymentEvent');
const WebhookEvent = require('../../models/WebhookEvent');

/**
 * Calculates historical baseline metrics for a single merchant.
 */
const calculateMerchantBaseline = async (merchantId) => {
  const payments = await Payment.find({ merchantId });
  if (payments.length < 3) {
    return {
      success: false,
      reason: 'Insufficient historical data for merchant baseline'
    };
  }

  const amounts = payments.map(p => p.amount);
  const totalAmount = amounts.reduce((sum, val) => sum + val, 0);
  const averageAmount = totalAmount / payments.length;

  // Std dev
  const sqDiffs = amounts.map(val => Math.pow(val - averageAmount, 2));
  const avgSqDiff = sqDiffs.reduce((sum, val) => sum + val, 0) / payments.length;
  const stdDev = Math.sqrt(avgSqDiff) || 1;

  // Median
  const sorted = [...amounts].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianAmount = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  // Failure rate
  const failedCount = payments.filter(p => p.status === 'failed').length;
  const normalFailureRate = (failedCount / payments.length) * 100;

  // Webhook delays
  const webhooks = await WebhookEvent.find({ paymentId: { $in: payments.map(p => p.paymentId) } });
  let totalDelay = 0;
  let delayCount = 0;
  webhooks.forEach(wh => {
    // If webhook timestamps exist
    const diff = Math.abs(new Date(wh.createdAt) - new Date(wh.timestamp));
    totalDelay += diff;
    delayCount++;
  });
  const normalWebhookDelay = delayCount > 0 ? (totalDelay / delayCount / 1000) : 0; // in seconds

  return {
    success: true,
    merchantId,
    sampleSize: payments.length,
    averageAmount: Math.round(averageAmount),
    medianAmount: Math.round(medianAmount),
    stdDev: Math.round(stdDev),
    normalFailureRate: Math.round(normalFailureRate),
    normalWebhookDelay: Math.round(normalWebhookDelay)
  };
};

module.exports = {
  calculateMerchantBaseline
};
