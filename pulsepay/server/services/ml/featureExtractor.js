const Payment = require('../../models/Payment');
const PaymentEvent = require('../../models/PaymentEvent');
const WebhookEvent = require('../../models/WebhookEvent');
const { reconstructFullState } = require('../stateEngine');

const extractFeaturesForPayment = async (paymentId) => {
  const payment = await Payment.findOne({ paymentId });
  if (!payment) {
    throw new Error(`Payment ${paymentId} not found`);
  }

  const [events, webhooks] = await Promise.all([
    PaymentEvent.find({ paymentId }),
    WebhookEvent.find({ paymentId })
  ]);

  // 1. Amount
  const amount = payment.amount;

  // 2. Processing time (created to captured/failed)
  const createdEvent = events.find(e => e.type === 'payment.created');
  const terminalEvent = events.find(e => e.type === 'payment.captured' || e.type === 'payment.failed');
  let processing_time_ms = 0;
  if (createdEvent && terminalEvent) {
    processing_time_ms = Math.abs(new Date(terminalEvent.eventTimestamp) - new Date(createdEvent.eventTimestamp));
  }

  // 3. Webhook failure count
  const webhook_failure_count = webhooks.filter(w => w.deliveryStatus === 'failed').length;

  // 4. Webhook retry count
  const webhook_retry_count = webhooks.length > 0 ? Math.max(...webhooks.map(w => w.attemptNumber || 1)) : 0;

  // 5. Webhook delay (captured to first webhook attempt)
  const capturedEvent = events.find(e => e.type === 'payment.captured');
  let webhook_delay_ms = 0;
  if (capturedEvent && webhooks.length > 0) {
    const firstWebhookTimestamp = new Date(Math.min(...webhooks.map(w => new Date(w.timestamp))));
    webhook_delay_ms = Math.abs(firstWebhookTimestamp - new Date(capturedEvent.eventTimestamp));
  }

  // 6. Event count
  const event_count = events.length;

  // 7. Event order violation (using state reconstruction logic)
  const stateResult = await reconstructFullState(paymentId);
  const event_order_violation = stateResult.outOfOrderDetected ? 1.0 : 0.0;

  // 8. Duplicate similarity (using stateResult overallState duplicate checking)
  const duplicate_similarity = stateResult.overallState === 'DUPLICATE_RISK' ? 1.0 : 0.0;

  // 9. Merchant & Payment failure rates
  const merchantId = payment.merchantId;
  const [totalPayments, failedPayments, totalMerchant, failedMerchant] = await Promise.all([
    Payment.countDocuments(),
    Payment.countDocuments({ status: 'failed' }),
    Payment.countDocuments({ merchantId }),
    Payment.countDocuments({ merchantId, status: 'failed' })
  ]);

  const payment_failure_rate = totalPayments > 0 ? (failedPayments / totalPayments) : 0;
  const merchant_failure_rate = totalMerchant > 0 ? (failedMerchant / totalMerchant) : 0;

  // 10. Hour of day
  const hour_of_day = new Date(payment.createdAt).getHours();

  return {
    amount,
    processing_time_ms,
    webhook_failure_count,
    webhook_retry_count,
    webhook_delay_ms,
    event_count,
    event_order_violation,
    duplicate_similarity,
    merchant_failure_rate,
    payment_failure_rate,
    hour_of_day
  };
};

module.exports = {
  extractFeaturesForPayment
};
