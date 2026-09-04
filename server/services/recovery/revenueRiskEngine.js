const Payment = require('../../models/Payment');
const PaymentEvent = require('../../models/PaymentEvent');
const Order = require('../../models/Order');
const WebhookEvent = require('../../models/WebhookEvent');
const Incident = require('../../models/Incident');
const RecoveryOpportunity = require('../../models/RecoveryOpportunity');
const { calculateRecoveryProbability } = require('./recoveryScoringEngine');
const { determineRecoveryStrategy } = require('./recoveryStrategyEngine');
const { evaluateRecoveryPolicies } = require('./recoveryPolicyEngine');
const { randomId } = require('../../utils/idGenerator');

/**
 * Quantifies revenue at risk across all failed or inconsistent payments.
 * Generates and updates structured RecoveryOpportunity documents.
 */
const scanRevenueAtRisk = async (options = {}) => {
  const { merchantId, lookbackHours = 72, limit = 500 } = options;

  const queryTime = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
  const paymentFilter = {
    createdAt: { $gte: queryTime },
    status: { $in: ['failed', 'processing', 'captured'] }
  };
  if (merchantId) paymentFilter.merchantId = merchantId;

  const scanPoolLimit = Math.max(limit * 10, 500);
  const payments = await Payment.find(paymentFilter).sort({ createdAt: -1 }).limit(scanPoolLimit).lean();

  if (payments.length === 0) {
    return {
      totalRevenueAtRisk: 0,
      estimatedRecoverableAmount: 0,
      recoverableCount: 0,
      opportunities: [],
    };
  }

  const paymentIds = payments.map(p => p.paymentId);
  const [events, orders, webhooks, incidents] = await Promise.all([
    PaymentEvent.find({ paymentId: { $in: paymentIds } }).lean(),
    Order.find({ paymentId: { $in: paymentIds } }).lean(),
    WebhookEvent.find({ paymentId: { $in: paymentIds } }).lean(),
    Incident.find({ transactionIds: { $in: paymentIds } }).lean()
  ]);

  // Group by paymentId
  const eventMap = {};
  events.forEach(e => {
    eventMap[e.paymentId] = eventMap[e.paymentId] || [];
    eventMap[e.paymentId].push(e);
  });

  const orderMap = {};
  orders.forEach(o => {
    orderMap[o.paymentId] = o;
  });

  const webhookMap = {};
  webhooks.forEach(w => {
    webhookMap[w.paymentId] = webhookMap[w.paymentId] || [];
    webhookMap[w.paymentId].push(w);
  });

  const incidentMap = {};
  incidents.forEach(inc => {
    (inc.transactionIds || []).forEach(txId => {
      incidentMap[txId] = inc;
    });
  });

  const opportunities = [];
  let totalRevenueAtRisk = 0;
  let totalEstimatedRecoverable = 0;

  for (const payment of payments) {
    const payEvents = eventMap[payment.paymentId] || [];
    const payOrder = orderMap[payment.paymentId];
    const payWebhooks = webhookMap[payment.paymentId] || [];
    const linkedIncident = incidentMap[payment.paymentId];

    // Determine if payment represents active revenue at risk
    const isFailed = payment.status === 'failed';
    const isCapturedOrderUnpaid = payment.status === 'captured' && payOrder && payOrder.status === 'unpaid';
    const hasWebhookFailure = payWebhooks.some(w => w.deliveryStatus === 'failed');
    const isStuckProcessing = payment.status === 'processing' && (Date.now() - new Date(payment.createdAt).getTime() > 10 * 60 * 1000);

    if (!isFailed && !isCapturedOrderUnpaid && !hasWebhookFailure && !isStuckProcessing) {
      continue; // Healthy payment
    }

    totalRevenueAtRisk += payment.amount;

    // Determine failure reason & failure timestamp
    let failureReason = 'UNKNOWN_FAILURE';
    let failureTimestamp = payment.updatedAt || payment.createdAt;
    let failureSource = 'gateway';

    const failEvent = payEvents.find(e => e.type === 'payment.failed' || e.type === 'webhook.failed');
    if (failEvent) {
      failureReason = failEvent.metadata?.errorCode || failEvent.metadata?.failureReason || failEvent.metadata?.responseCode || failEvent.type;
      failureTimestamp = failEvent.eventTimestamp || failEvent.timestamp;
      failureSource = failEvent.source || 'gateway';
    } else if (isCapturedOrderUnpaid) {
      failureReason = 'CAPTURED_ORDER_UNPAID_STATE_MISMATCH';
      failureSource = 'merchant_reconciliation';
    } else if (hasWebhookFailure) {
      failureReason = 'WEBHOOK_DELIVERY_FAILURE';
      failureSource = 'webhook_pipeline';
    } else if (isStuckProcessing) {
      failureReason = 'PROCESSING_TIMEOUT_ABANDONMENT';
      failureSource = 'gateway_timeout';
    }

    // Previous retry attempts count
    const attemptCount = payEvents.filter(e => e.type === 'payment.created' || e.type === 'payment.attempt').length || 1;
    const retryCount = Math.max(0, attemptCount - 1);
    const timeSinceFailureMinutes = Math.max(0, Math.round((Date.now() - new Date(failureTimestamp).getTime()) / (1000 * 60)));

    // Evidence IDs
    const evidenceIds = [];
    if (linkedIncident) evidenceIds.push(`INC-${linkedIncident.incidentId}`);
    if (failEvent) evidenceIds.push(`EV-${failEvent.eventId}`);
    payWebhooks.forEach(w => evidenceIds.push(`WH-${w.webhookId}`));

    // Compute recoverability scoring
    const scoreResult = calculateRecoveryProbability({
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      provider: payment.provider || 'gateway_mock',
      merchantId: payment.merchantId,
      failureReason,
      failureSource,
      retryCount,
      previousAttempts: attemptCount,
      timeSinceFailureMinutes,
      isCapturedOrderUnpaid,
      hasWebhookFailure,
      incidentSeverity: linkedIncident?.severity || 'LOW',
    });

    // Compute strategy with Expected Value
    const strategyResult = determineRecoveryStrategy({
      amount: payment.amount,
      recoveryProbability: scoreResult.recoveryProbability,
      failureReason,
      isCapturedOrderUnpaid,
      hasWebhookFailure,
      paymentMethod: payment.paymentMethod,
      retryCount,
    });

    // Safety policy evaluation
    const policyResult = evaluateRecoveryPolicies({
      paymentId: payment.paymentId,
      amount: payment.amount,
      failureReason,
      retryCount,
      timeSinceFailureMinutes,
      expectedValue: strategyResult.expectedValue,
      recommendedAction: strategyResult.recommendedAction,
      provider: payment.provider,
    });

    const estimatedRecoverableAmount = policyResult.allowed 
      ? Math.round(payment.amount * scoreResult.recoveryProbability)
      : 0;

    if (policyResult.allowed) {
      totalEstimatedRecoverable += estimatedRecoverableAmount;
    }

    const opportunityData = {
      opportunityId: `OPP-${payment.paymentId.replace(/^pay_/, '')}`,
      paymentId: payment.paymentId,
      merchantId: payment.merchantId,
      customerId: payment.customerId,
      orderId: payment.orderId,
      amount: payment.amount,
      currency: payment.currency || 'INR',
      provider: payment.provider || 'gateway_mock',
      paymentMethod: payment.paymentMethod || 'upi',
      failureReason,
      failureTimestamp,
      retryCount,
      previousAttempts: attemptCount,
      timeSinceFailureMinutes,
      incidentId: linkedIncident?.incidentId || null,
      recoverabilityClassification: scoreResult.classification,
      recoverabilityScore: scoreResult.recoverabilityScore,
      recoveryProbability: scoreResult.recoveryProbability,
      estimatedRecoverableAmount,
      recommendedAction: strategyResult.recommendedAction,
      expectedValue: strategyResult.expectedValue,
      riskScore: scoreResult.riskScore,
      confidence: scoreResult.confidence,
      evidenceIds,
      policyStatus: policyResult.allowed ? 'ELIGIBLE' : 'BLOCKED',
      blockedReason: policyResult.reason || null,
      policyChecks: policyResult.policyChecks,
      featureInfluence: scoreResult.featureInfluence,
      reasons: scoreResult.reasons,
      explanations: {
        whyThisPayment: scoreResult.explanations.whyThisPayment,
        whyThisAction: strategyResult.whyThisAction,
        whyNow: scoreResult.explanations.whyNow,
        whyNotAnother: strategyResult.whyNotAnother,
        whySafe: policyResult.whySafe,
      },
      stopConditions: scoreResult.stopConditions,
      status: 'PENDING',
    };

    // Upsert into MongoDB
    await RecoveryOpportunity.findOneAndUpdate(
      { paymentId: payment.paymentId },
      { $set: opportunityData },
      { upsert: true, new: true }
    );

    opportunities.push(opportunityData);
  }

  return {
    totalRevenueAtRisk,
    estimatedRecoverableAmount: totalEstimatedRecoverable,
    totalOpportunities: opportunities.length,
    eligibleCount: opportunities.filter(o => o.policyStatus === 'ELIGIBLE').length,
    blockedCount: opportunities.filter(o => o.policyStatus === 'BLOCKED').length,
    opportunities: opportunities.sort((a, b) => b.expectedValue - a.expectedValue).slice(0, limit),
  };
};

module.exports = {
  scanRevenueAtRisk,
};
