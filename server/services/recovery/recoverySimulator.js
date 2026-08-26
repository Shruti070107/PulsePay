const RecoveryOpportunity = require('../../models/RecoveryOpportunity');
const { evaluateRecoveryPolicies } = require('./recoveryPolicyEngine');
const { determineRecoveryStrategy } = require('./recoveryStrategyEngine');

/**
 * Recovery Simulator (Zero database side-effects on real transactions)
 * Runs hypothetical what-if simulations across recovery opportunities with strategy overrides.
 */
const simulateRecoveryBatch = async (params = {}) => {
  const {
    opportunityIds = [],
    strategyOverride, // 'OPTIMIZED', 'RETRY_ALL', 'HIGH_CONFIDENCE_ONLY', 'RECOVERY_LINKS_ONLY', 'WEBHOOK_RECONCILE_ONLY'
    maxRetriesOverride,
    successRateAssumption = 1.0,
  } = params;

  let query = {};
  if (opportunityIds.length > 0) {
    query.opportunityId = { $in: opportunityIds };
  }

  let opportunities = await RecoveryOpportunity.find(query).lean();
  if (opportunities.length === 0) {
    opportunities = await RecoveryOpportunity.find({}).lean();
  }

  let totalTargeted = 0;
  let totalRevenueAtRisk = 0;
  let totalEligibleRevenue = 0;
  let expectedRecoveredAmount = 0;
  let transactionsExpectedRecovered = 0;
  let policyBlockedCount = 0;
  let blockedAmount = 0;

  const actionsBreakdown = {
    retryCount: 0,
    recoveryLinkCount: 0,
    webhookReconcileCount: 0,
    alternateMethodCount: 0,
    waitRetryCount: 0,
    blockedCount: 0,
  };

  const simulatedOpportunities = [];

  for (const opp of opportunities) {
    totalTargeted++;
    totalRevenueAtRisk += opp.amount;

    let targetAction = opp.recommendedAction;
    let prob = opp.recoveryProbability * successRateAssumption;

    // Apply strategy overrides
    if (strategyOverride === 'RETRY_ALL') {
      targetAction = 'RETRY_PAYMENT';
    } else if (strategyOverride === 'HIGH_CONFIDENCE_ONLY') {
      if (opp.confidence < 90 || opp.recoveryProbability < 0.75) {
        targetAction = 'STOP_RECOVERY';
      }
    } else if (strategyOverride === 'RECOVERY_LINKS_ONLY') {
      targetAction = 'SEND_RECOVERY_LINK';
      prob = prob * 0.85;
    } else if (strategyOverride === 'WEBHOOK_RECONCILE_ONLY') {
      if (opp.recommendedAction === 'RECONCILE_WEBHOOK' || opp.recommendedAction === 'RETRY_WEBHOOK') {
        targetAction = opp.recommendedAction;
      } else {
        targetAction = 'STOP_RECOVERY';
      }
    }

    // Evaluate policy under simulation
    const policyResult = evaluateRecoveryPolicies(
      {
        paymentId: opp.paymentId,
        amount: opp.amount,
        failureReason: opp.failureReason,
        retryCount: opp.retryCount,
        timeSinceFailureMinutes: opp.timeSinceFailureMinutes,
        expectedValue: opp.expectedValue,
        recommendedAction: targetAction,
      },
      maxRetriesOverride !== undefined ? { maxRetries: maxRetriesOverride } : {}
    );

    if (!policyResult.allowed || targetAction === 'STOP_RECOVERY') {
      policyBlockedCount++;
      blockedAmount += opp.amount;
      actionsBreakdown.blockedCount++;
      simulatedOpportunities.push({
        opportunityId: opp.opportunityId,
        paymentId: opp.paymentId,
        amount: opp.amount,
        action: targetAction,
        simulatedOutcome: 'BLOCKED',
        simulatedRecovered: 0,
        policyReason: policyResult.reason || 'Blocked by strategy filter',
      });
      continue;
    }

    totalEligibleRevenue += opp.amount;

    // Categorize actions breakdown
    if (targetAction === 'RETRY_PAYMENT') actionsBreakdown.retryCount++;
    else if (targetAction === 'SEND_RECOVERY_LINK') actionsBreakdown.recoveryLinkCount++;
    else if (targetAction === 'RECONCILE_WEBHOOK') actionsBreakdown.webhookReconcileCount++;
    else if (targetAction === 'ALTERNATE_PAYMENT_METHOD') actionsBreakdown.alternateMethodCount++;
    else if (targetAction === 'WAIT_AND_RETRY') actionsBreakdown.waitRetryCount++;

    const expectedRec = Math.round(opp.amount * Math.min(1.0, prob));
    expectedRecoveredAmount += expectedRec;

    if (prob >= 0.5) {
      transactionsExpectedRecovered++;
    }

    simulatedOpportunities.push({
      opportunityId: opp.opportunityId,
      paymentId: opp.paymentId,
      amount: opp.amount,
      action: targetAction,
      simulatedOutcome: 'RECOVERED_PROBABLE',
      simulatedRecovered: expectedRec,
      expectedSuccessRate: Math.round(prob * 100) / 100,
    });
  }

  const expectedUnrecoveredAmount = Math.max(0, totalRevenueAtRisk - expectedRecoveredAmount);
  const recoveryRate = totalRevenueAtRisk > 0 
    ? Math.round((expectedRecoveredAmount / totalRevenueAtRisk) * 1000) / 10 
    : 0;

  return {
    mode: 'SIMULATION',
    strategyApplied: strategyOverride || 'OPTIMIZED_EXPECTED_VALUE',
    transactionsTargeted: totalTargeted,
    transactionsExpectedRecovered,
    amountAtRisk: totalRevenueAtRisk,
    eligibleRevenue: totalEligibleRevenue,
    expectedRecoveredAmount,
    expectedUnrecoveredAmount,
    blockedAmount,
    policyBlockedCount,
    projectedRecoveryRate: recoveryRate,
    actionsBreakdown,
    simulatedOpportunities,
  };
};

module.exports = {
  simulateRecoveryBatch,
};
