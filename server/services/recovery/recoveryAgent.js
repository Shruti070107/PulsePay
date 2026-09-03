const RecoveryOpportunity = require('../../models/RecoveryOpportunity');
const { queryGemini } = require('../ai/aiProvider');
const { randomId } = require('../../utils/idGenerator');

const sanitizeAgentContext = (opps) => {
  return opps.map(o => ({
    opportunityId: o.opportunityId,
    paymentId: o.paymentId,
    amount: o.amount,
    currency: o.currency,
    failureReason: o.failureReason,
    retryCount: o.retryCount,
    timeSinceFailureMinutes: o.timeSinceFailureMinutes,
    recoveryProbability: o.recoveryProbability,
    recommendedAction: o.recommendedAction,
    expectedValue: o.expectedValue,
    policyStatus: o.policyStatus,
    blockedReason: o.blockedReason,
    evidenceIds: o.evidenceIds,
  }));
};

const buildRecoverySystemPrompt = () => {
  return `You are the PulsePay AI Revenue Recovery Agent, an expert in payment routing, state reconciliation, and financial loss mitigation.

STRICT OPERATING CONSTRAINTS:
1. NEVER invent transaction IDs, customer names, financial amounts, timestamps, HTTP response codes, or evidence numbers.
2. Rely EXCLUSIVELY on the structured payment facts provided in the prompt.
3. Every recommendation must respect policy guardrails: do not suggest automated retries for permanent card declines or duplicate payments.
4. Output MUST be strictly valid JSON matching the specified schema.

JSON SCHEMA:
{
  "summary": "High-level briefing of revenue leakage and recoverable potential",
  "revenueAtRisk": number,
  "estimatedRecoverableAmount": number,
  "recommendedStrategy": "Strategy title (e.g., Automated Gateway Retry & Webhook Ledger Sync)",
  "reasoning": "Detailed technical rationale for the chosen strategy",
  "facts": ["Array of verifiable empirical facts from the evidence"],
  "inferences": ["Logical deductions from the facts"],
  "hypotheses": ["Potential root-cause factors of the payment failures"],
  "supportingEvidence": ["List of evidence IDs referenced"],
  "recommendedActions": [
    {
      "action": "RETRY_PAYMENT | SEND_RECOVERY_LINK | RECONCILE_WEBHOOK | ALTERNATE_PAYMENT_METHOD",
      "targetCount": number,
      "priority": "HIGH | MEDIUM | LOW",
      "expectedYield": number,
      "reason": "Why this action has highest positive expected value"
    }
  ],
  "blockedActions": [
    {
      "action": "RETRY_PAYMENT",
      "count": number,
      "reason": "Why blocked by policy (e.g. permanent failure or retry limit exceeded)"
    }
  ],
  "confidence": number,
  "limitations": "Transparency disclaimer on simulation constraints"
}`;
};

const buildRecoveryUserPrompt = (summaryContext, sanitizedOpps) => {
  return `ANALYZE THE FOLLOWING PAYMENT RECOVERY EVIDENCE:

TOTAL REVENUE AT RISK: ₹${summaryContext.totalRevenueAtRisk}
ELIGIBLE REVENUE: ₹${summaryContext.eligibleRevenue}
ESTIMATED RECOVERABLE: ₹${summaryContext.estimatedRecoverableAmount}
ACTIVE CANDIDATE OPPORTUNITIES COUNT: ${sanitizedOpps.length}

TOP OPPORTUNITIES DATA:
${JSON.stringify(sanitizedOpps.slice(0, 15), null, 2)}

Provide an evidence-grounded revenue recovery report in strict JSON format.`;
};

const runRecoveryAgentAnalysis = async (options = {}) => {
  const { limit = 20 } = options;

  const opportunities = await RecoveryOpportunity.find()
    .sort({ expectedValue: -1 })
    .limit(limit)
    .lean();

  const totalRevenueAtRisk = opportunities.reduce((sum, o) => sum + (o.amount || 0), 0);
  const eligibleOpps = opportunities.filter(o => o.policyStatus === 'ELIGIBLE');
  const eligibleRevenue = eligibleOpps.reduce((sum, o) => sum + (o.amount || 0), 0);
  const estimatedRecoverableAmount = eligibleOpps.reduce((sum, o) => sum + (o.estimatedRecoverableAmount || 0), 0);

  const summaryContext = {
    totalRevenueAtRisk,
    eligibleRevenue,
    estimatedRecoverableAmount,
  };

  const sanitizedOpps = sanitizeAgentContext(opportunities);
  const apiKey = process.env.GEMINI_API_KEY;

  let agentReport = null;

  if (apiKey && apiKey.trim() !== '' && apiKey !== 'YOUR_GEMINI_API_KEY') {
    try {
      const systemPrompt = buildRecoverySystemPrompt();
      const userPrompt = buildRecoveryUserPrompt(summaryContext, sanitizedOpps);
      const rawResponse = await queryGemini(systemPrompt, userPrompt, apiKey);
      const cleaned = rawResponse.replace(/```json\n?|\n?```/g, '').trim();
      agentReport = JSON.parse(cleaned);
    } catch (err) {
      console.warn('[Recovery Agent] Gemini API call failed or timed out. Using deterministic rule fallback:', err.message);
      agentReport = buildDeterministicAgentReport(summaryContext, sanitizedOpps);
    }
  } else {
    agentReport = buildDeterministicAgentReport(summaryContext, sanitizedOpps);
  }

  return agentReport;
};

const buildDeterministicAgentReport = (summaryContextOrOpps, maybeOpps) => {
  let summaryContext;
  let opps;
  if (Array.isArray(summaryContextOrOpps)) {
    opps = summaryContextOrOpps;
    const totalRisk = opps.reduce((sum, o) => sum + (o.amount || 0), 0);
    const totalRec = opps.reduce((sum, o) => sum + (o.estimatedRecoverableAmount || 0), 0);
    summaryContext = { totalRevenueAtRisk: totalRisk, estimatedRecoverableAmount: totalRec, eligibleRevenue: opps.filter(o => o.policyStatus === 'ELIGIBLE').reduce((sum, o) => sum + (o.amount || 0), 0) };
  } else {
    summaryContext = summaryContextOrOpps || { totalRevenueAtRisk: 0, estimatedRecoverableAmount: 0, eligibleRevenue: 0 };
    opps = Array.isArray(maybeOpps) ? maybeOpps : [];
  }

  const blockedCount = opps.filter(o => o.policyStatus === 'BLOCKED').length;

  const evidenceList = Array.from(new Set(opps.flatMap(o => o.evidenceIds || []))).slice(0, 8);
  const eligibleCount = opps.filter(o => o.policyStatus === 'ELIGIBLE').length;
  const confidenceValues = opps.map(o => Number(o.confidence)).filter(Number.isFinite);
  const avgConfidence = confidenceValues.length > 0
    ? Math.round(confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length)
    : (opps.length > 0
      ? Math.round(opps.reduce((sum, o) => sum + ['opportunityId', 'amount', 'failureReason', 'expectedValue', 'recommendedAction'].filter(field => o[field] != null).length / 5, 0) / opps.length * 100)
      : 0);
  const actionGroups = new Map();
  opps.filter(o => o.policyStatus === 'ELIGIBLE').forEach((opp) => {
    const action = opp.recommendedAction || 'UNSPECIFIED';
    const group = actionGroups.get(action) || { count: 0, expectedYield: 0 };
    group.count += 1;
    group.expectedYield += Number(opp.expectedValue) || 0;
    actionGroups.set(action, group);
  });
  const recommendedActions = Array.from(actionGroups.entries())
    .sort(([, left], [, right]) => right.expectedYield - left.expectedYield)
    .map(([action, group]) => ({
      action,
      targetCount: group.count,
      priority: group.expectedYield > 0 ? 'HIGH' : 'LOW',
      expectedYield: Math.round(group.expectedYield),
      reason: 'Aggregated from persisted opportunity expected values and policy status.',
    }));
  const blockedActions = opps.filter(o => o.policyStatus === 'BLOCKED').map(o => ({
    action: o.recommendedAction || 'UNSPECIFIED',
    count: 1,
    reason: o.blockedReason || 'Blocked reason unavailable for this record.',
  }));
  const topAction = recommendedActions[0]?.action || 'NO_ACTION';

  return {
    status: 'COMPLETED',
    summary: `Identified ${opps.length} revenue leakage candidate transactions with ₹${summaryContext.totalRevenueAtRisk.toLocaleString()} total exposure, of which ₹${summaryContext.estimatedRecoverableAmount.toLocaleString()} is realistically recoverable across prioritized action channels.`,
    revenueAtRisk: summaryContext.totalRevenueAtRisk,
    estimatedRecoverableAmount: summaryContext.estimatedRecoverableAmount,
    recommendedStrategy: topAction,
    reasoning: 'This report is assembled from the persisted opportunity records, their expected values, and backend policy decisions.',
    facts: [
      `Total active payment opportunities evaluated: ${opps.length}`,
      `Total revenue at risk across failed/unpaid flows: ₹${summaryContext.totalRevenueAtRisk.toLocaleString()}`,
      `Eligible transactions passing policy guardrails: ${eligibleCount}`,
      `Transactions halted by safety policy: ${blockedCount}`,
    ],
    inferences: [],
    hypotheses: [],
    supportingEvidence: evidenceList,
    citations: evidenceList.length > 0 ? evidenceList : opps.map(o => o.opportunityId).filter(Boolean).slice(0, 8),
    recommendedActions,
    blockedActions,
    confidence: avgConfidence,
    limitations: 'Calculations are based on synthetic telemetry and calibrated probabilistic benchmarks; real money is never moved.',
  };
};

module.exports = {
  runRecoveryAgentAnalysis,
  buildDeterministicAgentReport,
};
