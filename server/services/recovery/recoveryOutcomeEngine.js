const RecoveryOpportunity = require('../../models/RecoveryOpportunity');
const RecoveryAction = require('../../models/RecoveryAction');
const RecoveryCampaign = require('../../models/RecoveryCampaign');

/**
 * Recovery Outcome Engine
 * Quantifies historical and campaign-specific recovery outcomes,
 * strictly distinguishing between predicted recovery and actual measured recovery.
 */
const calculateRecoveryOutcomes = async (campaignId = null) => {
  let oppFilter = {};
  let actionFilter = {};

  if (campaignId) {
    actionFilter.campaignId = campaignId;
  }

  const [opportunities, actions, campaigns] = await Promise.all([
    RecoveryOpportunity.find(oppFilter).lean(),
    RecoveryAction.find(actionFilter).lean(),
    RecoveryCampaign.find().sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  const totalRevenueAtRisk = opportunities.reduce((sum, o) => sum + (o.amount || 0), 0);
  const eligibleOpportunities = opportunities.filter(o => o.policyStatus === 'ELIGIBLE');
  const eligibleRevenue = eligibleOpportunities.reduce((sum, o) => sum + (o.amount || 0), 0);
  const expectedRecovery = eligibleOpportunities.reduce((sum, o) => sum + (o.estimatedRecoverableAmount || 0), 0);

  const recoveredActions = actions.filter(a => a.result === 'RECOVERED');
  const failedActions = actions.filter(a => a.result === 'FAILED');
  const blockedActions = actions.filter(a => a.result === 'BLOCKED');

  const actualRecovered = recoveredActions.reduce((sum, a) => sum + (a.recoveredAmount || a.amount || 0), 0);
  const actualFailed = failedActions.reduce((sum, a) => sum + (a.amount || 0), 0);
  const blockedAmount = blockedActions.reduce((sum, a) => sum + (a.amount || 0), 0);

  const recoveryRate = totalRevenueAtRisk > 0 
    ? Math.round((actualRecovered / totalRevenueAtRisk) * 1000) / 10 
    : 0;

  const expectedVsActual = expectedRecovery > 0 
    ? Math.round((actualRecovered / expectedRecovery) * 1000) / 10 
    : 0;

  const calibrationError = expectedRecovery > 0 
    ? Math.round(Math.abs(expectedRecovery - actualRecovered) / expectedRecovery * 1000) / 10 
    : 0;

  // Breakdown by failure type
  const outcomeByFailureReason = {};
  opportunities.forEach(opp => {
    const reason = opp.failureReason || 'UNKNOWN';
    outcomeByFailureReason[reason] = outcomeByFailureReason[reason] || { count: 0, atRisk: 0, recovered: 0 };
    outcomeByFailureReason[reason].count++;
    outcomeByFailureReason[reason].atRisk += opp.amount;
    if (opp.status === 'RECOVERED') {
      outcomeByFailureReason[reason].recovered += opp.actualRecoveredAmount || opp.amount;
    }
  });

  return {
    totalRevenueAtRisk,
    eligibleRevenue,
    expectedRecovery,
    actualRecovered,
    actualFailed,
    blockedAmount,
    recoveryRate,
    expectedVsActual,
    calibrationError,
    totalOpportunitiesCount: opportunities.length,
    recoveredCount: recoveredActions.length,
    failedCount: failedActions.length,
    blockedCount: blockedActions.length,
    outcomeByFailureReason,
    recentCampaigns: campaigns,
  };
};

module.exports = {
  calculateRecoveryOutcomes,
};
