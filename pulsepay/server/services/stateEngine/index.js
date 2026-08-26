const Payment = require('../../models/Payment');
const PaymentEvent = require('../../models/PaymentEvent');
const Order = require('../../models/Order');
const WebhookEvent = require('../../models/WebhookEvent');

const { PaymentStates, OrderStates, WebhookStates, OverallStates } = require('./stateConstants');
const { reconstructPaymentState } = require('./paymentState');
const { reconstructOrderState } = require('./orderState');
const { reconstructWebhookState } = require('./webhookState');

const reconstructFullState = async (paymentId) => {
  // Fetch dependencies concurrently
  const [payment, events, order, webhooks] = await Promise.all([
    Payment.findOne({ paymentId }),
    PaymentEvent.find({ paymentId }),
    Order.findOne({ paymentId }),
    WebhookEvent.find({ paymentId })
  ]);

  if (!payment) {
    throw new Error(`Payment with ID ${paymentId} not found`);
  }

  // 1. Reconstruct component states
  const paymentStateResult = reconstructPaymentState(payment, events);
  const orderStateResult = reconstructOrderState(order, events);
  const webhookStateResult = reconstructWebhookState(webhooks);

  // 2. Query for duplicate payments (same customer, merchant, amount, short window)
  const duplicatePayments = await Payment.find({
    customerId: payment.customerId,
    merchantId: payment.merchantId,
    amount: payment.amount,
    paymentId: { $ne: paymentId }
  });

  let duplicateRiskDetected = false;
  const timeWindowMs = 60000; // 1 minute window
  for (const dup of duplicatePayments) {
    const timeDiff = Math.abs(new Date(dup.createdAt) - new Date(payment.createdAt));
    if (timeDiff <= timeWindowMs) {
      if (
        payment.status === 'processing' || 
        payment.status === 'created' ||
        dup.status === 'processing' ||
        dup.status === 'created'
      ) {
        duplicateRiskDetected = true;
        break;
      }
    }
  }

  // 3. Determine Overall State & Evidence
  let overallState = OverallStates.HEALTHY;
  const combinedEvidence = [
    ...paymentStateResult.evidence,
    ...orderStateResult.evidence,
    ...webhookStateResult.evidence
  ];

  if (duplicateRiskDetected) {
    overallState = OverallStates.DUPLICATE_RISK;
    combinedEvidence.push('Duplicate payment risk: similar transaction detected within 1 minute window');
  } else if (paymentStateResult.refundAnomalyDetected) {
    overallState = OverallStates.REFUND_ANOMALY;
    combinedEvidence.push('Refund anomaly: refund initiated but failed to complete');
  } else if (paymentStateResult.lateAuthorizationDetected) {
    overallState = OverallStates.LATE_AUTHORIZATION;
  } else if (paymentStateResult.outOfOrderDetected) {
    overallState = OverallStates.EVENT_ORDER_ANOMALY;
  } else if (
    paymentStateResult.paymentState === PaymentStates.CAPTURED &&
    orderStateResult.orderState === OrderStates.UNPAID
  ) {
    overallState = OverallStates.AMBIGUOUS;
  }

  // Clean evidence list
  const uniqueEvidence = Array.from(new Set(combinedEvidence.filter(Boolean)));

  return {
    paymentId,
    customerId: payment.customerId,
    merchantId: payment.merchantId,
    amount: payment.amount,
    currency: payment.currency,
    paymentMethod: payment.paymentMethod,
    createdAt: payment.createdAt,
    paymentState: paymentStateResult.paymentState,
    orderState: orderStateResult.orderState,
    webhookState: webhookStateResult.webhookState,
    overallState,
    outOfOrderDetected: paymentStateResult.outOfOrderDetected,
    duplicateEventsDetected: paymentStateResult.duplicateEventsDetected,
    invalidTransitionDetected: paymentStateResult.invalidTransitionDetected,
    lateAuthorizationDetected: paymentStateResult.lateAuthorizationDetected,
    webhookRetryCount: webhookStateResult.webhookRetryCount,
    previousPaymentStates: paymentStateResult.previousPaymentStates,
    evidence: uniqueEvidence,
    timeline: paymentStateResult.timeline
  };
};

module.exports = {
  reconstructFullState
};
