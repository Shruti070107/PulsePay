/**
 * Recovery Strategy Engine
 * Evaluates candidate recovery strategies by computing Expected Value (EV):
 * EV = (Recoverable Amount * Success Probability) - Action Operational Cost
 */

const STRATEGY_DEFINITIONS = {
  RECONCILE_WEBHOOK: {
    name: 'Reconcile Webhook State',
    baseCost: 0,
    risk: 'LOW',
    applicableWhen: (ctx) => ctx.isCapturedOrderUnpaid || ctx.hasWebhookFailure,
  },
  RETRY_WEBHOOK: {
    name: 'Re-deliver Failed Webhook',
    baseCost: 0,
    risk: 'LOW',
    applicableWhen: (ctx) => ctx.hasWebhookFailure,
  },
  RETRY_PAYMENT: {
    name: 'Automated Gateway Retry',
    baseCost: 2, // Minor gateway API cost
    risk: 'MEDIUM',
    applicableWhen: (ctx) => !ctx.isCapturedOrderUnpaid && ctx.retryCount < 2 && !ctx.isPermanentFailure,
  },
  SEND_RECOVERY_LINK: {
    name: 'Send Customer Recovery Link',
    baseCost: 5, // SMS/WhatsApp messaging cost
    risk: 'LOW',
    applicableWhen: (ctx) => !ctx.isCapturedOrderUnpaid && !ctx.isPermanentFailure,
  },
  ALTERNATE_PAYMENT_METHOD: {
    name: 'Prompt Alternate Payment Method',
    baseCost: 4,
    risk: 'LOW',
    applicableWhen: (ctx) => String(ctx.failureReason || '').includes('FUNDS') || String(ctx.failureReason || '').includes('DECLINE'),
  },
  WAIT_AND_RETRY: {
    name: 'Cooldown & Delayed Retry',
    baseCost: 2,
    risk: 'LOW',
    applicableWhen: (ctx) => String(ctx.failureReason || '').includes('BUSY') || String(ctx.failureReason || '').includes('503'),
  },
  STOP_RECOVERY: {
    name: 'Halt Recovery (Unrecoverable / High Risk)',
    baseCost: 0,
    risk: 'NONE',
    applicableWhen: () => true,
  },
};

const determineRecoveryStrategy = (input) => {
  const {
    amount,
    recoveryProbability,
    failureReason = 'UNKNOWN_FAILURE',
    isCapturedOrderUnpaid = false,
    hasWebhookFailure = false,
    paymentMethod = 'upi',
    retryCount = 0,
  } = input;

  const reasonUpper = String(failureReason).toUpperCase();
  const isPermanentFailure = reasonUpper.includes('EXPIRED') || 
                             reasonUpper.includes('FRAUD') || 
                             reasonUpper.includes('STOLEN') || 
                             reasonUpper.includes('INVALID_CARD');

  const context = {
    amount,
    recoveryProbability,
    failureReason: reasonUpper,
    isCapturedOrderUnpaid,
    hasWebhookFailure,
    paymentMethod,
    retryCount,
    isPermanentFailure,
  };

  // Evaluate Expected Value for all possible actions
  const actionEvaluations = [];

  // 1. RECONCILE_WEBHOOK
  if (isCapturedOrderUnpaid || hasWebhookFailure) {
    const pSuccess = 0.98;
    const ev = Math.round(amount * pSuccess - 0);
    actionEvaluations.push({
      action: 'RECONCILE_WEBHOOK',
      name: 'Reconcile Webhook State',
      successProbability: pSuccess,
      expectedRecoveredAmount: Math.round(amount * pSuccess),
      cost: 0,
      expectedValue: ev,
      risk: 'LOW',
      reason: 'Funds are already captured at the gateway. Direct ledger synchronization recovers 100% of order value without double-charging.',
    });
  }

  // 2. RETRY_WEBHOOK
  if (hasWebhookFailure) {
    const pSuccess = 0.95;
    const ev = Math.round(amount * pSuccess - 0);
    actionEvaluations.push({
      action: 'RETRY_WEBHOOK',
      name: 'Re-deliver Failed Webhook',
      successProbability: pSuccess,
      expectedRecoveredAmount: Math.round(amount * pSuccess),
      cost: 0,
      expectedValue: ev,
      risk: 'LOW',
      reason: 'Re-delivering the webhook payload triggers the merchant order completion endpoint.',
    });
  }

  // 3. RETRY_PAYMENT (Applicable for transient network / gateway errors, not customer balance declines)
  const isCustomerDecline = reasonUpper.includes('FUNDS') || reasonUpper.includes('INSUFFICIENT') || reasonUpper.includes('USER_CANCELLED');
  if (!isCapturedOrderUnpaid && !isPermanentFailure && !isCustomerDecline && retryCount < 2) {
    const pSuccess = recoveryProbability;
    const cost = 2;
    const ev = Math.round(amount * pSuccess - cost);
    actionEvaluations.push({
      action: 'RETRY_PAYMENT',
      name: 'Automated Gateway Retry',
      successProbability: pSuccess,
      expectedRecoveredAmount: Math.round(amount * pSuccess),
      cost,
      expectedValue: ev,
      risk: 'MEDIUM',
      reason: `Historical simulated recovery rate for this failure pattern is ${Math.round(pSuccess * 100)}%. Immediate automated retry has highest expected yield.`,
    });
  }

  // 4. SEND_RECOVERY_LINK
  if (!isCapturedOrderUnpaid && !isPermanentFailure) {
    const pSuccess = Math.round(recoveryProbability * 0.85 * 100) / 100;
    const cost = 5;
    const ev = Math.round(amount * pSuccess - cost);
    actionEvaluations.push({
      action: 'SEND_RECOVERY_LINK',
      name: 'Send Customer Recovery Link',
      successProbability: pSuccess,
      expectedRecoveredAmount: Math.round(amount * pSuccess),
      cost,
      expectedValue: ev,
      risk: 'LOW',
      reason: 'SMS/WhatsApp checkout recovery link allows the buyer to retry or switch payment methods seamlessly.',
    });
  }

  // 5. ALTERNATE_PAYMENT_METHOD
  if (reasonUpper.includes('FUNDS') || reasonUpper.includes('DECLINE')) {
    const pSuccess = Math.round(recoveryProbability * 0.75 * 100) / 100;
    const cost = 4;
    const ev = Math.round(amount * pSuccess - cost);
    actionEvaluations.push({
      action: 'ALTERNATE_PAYMENT_METHOD',
      name: 'Prompt Alternate Payment Method',
      successProbability: pSuccess,
      expectedRecoveredAmount: Math.round(amount * pSuccess),
      cost,
      expectedValue: ev,
      risk: 'LOW',
      reason: 'Buyer card was declined; offering instant UPI or NetBanking redirection maximizes salvage rate.',
    });
  }

  // 6. WAIT_AND_RETRY
  if (reasonUpper.includes('BUSY') || reasonUpper.includes('503') || reasonUpper.includes('DEGRADED')) {
    const pSuccess = Math.round(recoveryProbability * 0.90 * 100) / 100;
    const cost = 2;
    const ev = Math.round(amount * pSuccess - cost);
    actionEvaluations.push({
      action: 'WAIT_AND_RETRY',
      name: 'Cooldown & Delayed Retry',
      successProbability: pSuccess,
      expectedRecoveredAmount: Math.round(amount * pSuccess),
      cost,
      expectedValue: ev,
      risk: 'LOW',
      reason: 'Provider bank is undergoing transient throttling; waiting for latency normalization improves success rate.',
    });
  }

  // 7. STOP_RECOVERY (Always available as fallback)
  actionEvaluations.push({
    action: 'STOP_RECOVERY',
    name: 'Halt Recovery',
    successProbability: 0,
    expectedRecoveredAmount: 0,
    cost: 0,
    expectedValue: 0,
    risk: 'NONE',
    reason: isPermanentFailure 
      ? 'Permanent card decline / invalid instrument detected. Retrying would violate compliance and waste API budget.'
      : 'Recovery probability below viable threshold.',
  });

  // Sort by Expected Value descending
  actionEvaluations.sort((a, b) => b.expectedValue - a.expectedValue);

  // If permanent failure or negative EV, choose STOP_RECOVERY
  let topStrategy = actionEvaluations[0];
  if (isPermanentFailure || topStrategy.expectedValue <= 0) {
    topStrategy = actionEvaluations.find(a => a.action === 'STOP_RECOVERY') || actionEvaluations[0];
  }

  // Generate comparative justification
  const otherStrategies = actionEvaluations.filter(a => a.action !== topStrategy.action);
  const secondBest = otherStrategies[0];

  const whyThisAction = topStrategy.reason;
  const whyNotAnother = secondBest 
    ? `${secondBest.name} offers lower expected value (₹${secondBest.expectedValue} vs ₹${topStrategy.expectedValue}) and higher customer friction.`
    : 'No alternative action meets minimum safety and positive expected value thresholds.';

  return {
    recommendedAction: topStrategy.action,
    recommendedActionName: topStrategy.name,
    expectedValue: Math.max(0, topStrategy.expectedValue),
    successProbability: topStrategy.successProbability,
    expectedRecoveredAmount: topStrategy.expectedRecoveredAmount,
    actionCost: topStrategy.cost,
    riskLevel: topStrategy.risk,
    whyThisAction,
    whyNotAnother,
    allEvaluations: actionEvaluations,
  };
};

module.exports = {
  determineRecoveryStrategy,
  STRATEGY_DEFINITIONS,
};
