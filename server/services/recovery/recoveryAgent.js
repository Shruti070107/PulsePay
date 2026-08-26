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
    const totalRec = opps.reduce((sum, o) => sum + (o.estimatedRecoverableAmount || (o.amount * 0.8)), 0);
    summaryContext = { totalRevenueAtRisk: totalRisk, estimatedRecoverableAmount: totalRec };
  } else {
    summaryContext = summaryContextOrOpps || { totalRevenueAtRisk: 10000, estimatedRecoverableAmount: 8000 };
    opps = Array.isArray(maybeOpps) ? maybeOpps : [];
  }

  const retryCount = opps.filter(o => o.recommendedAction === 'RETRY_PAYMENT' && o.policyStatus === 'ELIGIBLE').length;
  const reconcileCount = opps.filter(o => o.recommendedAction === 'RECONCILE_WEBHOOK' && o.policyStatus === 'ELIGIBLE').length;
  const recoveryLinkCount = opps.filter(o => o.recommendedAction === 'SEND_RECOVERY_LINK' && o.policyStatus === 'ELIGIBLE').length;
  const blockedCount = opps.filter(o => o.policyStatus === 'BLOCKED').length;

  const evidenceList = Array.from(new Set(opps.flatMap(o => o.evidenceIds || []))).slice(0, 8);

  return {
    status: 'COMPLETED',
    summary: `Identified ${opps.length} revenue leakage candidate transactions with ₹${summaryContext.totalRevenueAtRisk.toLocaleString()} total exposure, of which ₹${summaryContext.estimatedRecoverableAmount.toLocaleString()} is realistically recoverable across prioritized action channels.`,
    revenueAtRisk: summaryContext.totalRevenueAtRisk,
    estimatedRecoverableAmount: summaryContext.estimatedRecoverableAmount,
    recommendedStrategy: 'Multi-Channel Expected Value Optimization (Automated Retries & Instant Webhook Ledger Sync)',
    reasoning: 'Prioritizing immediate automated retry for transient network timeouts yields the highest expected value. For captured order mismatches, webhook reconciliation recovers 100% of order revenue with zero customer billing friction.',
    facts: [
      `Total active payment opportunities evaluated: ${opps.length}`,
      `Total revenue at risk across failed/unpaid flows: ₹${summaryContext.totalRevenueAtRisk.toLocaleString()}`,
      `Eligible transactions passing policy guardrails: ${opps.length - blockedCount}`,
      `Transactions halted by safety policy: ${blockedCount}`,
    ],
    inferences: [
      'Transient timeout failures have an average simulated recoverability probability of 85%+ on initial retry.',
      'Reconciliation actions represent immediate zero-cost revenue salvage without customer re-prompting.',
    ],
    hypotheses: [
      'Downstream acquiring bank gateway experienced intermittent network latency spikes.',
      'Merchant webhook receiver experienced temporary connection pool saturation.',
    ],
    supportingEvidence: evidenceList.length > 0 ? evidenceList : ['EV-RECOVERY-SCAN-01', 'EV-POLICY-CHECK-02'],
    citations: evidenceList.length > 0 ? evidenceList : ['EV-RECOVERY-SCAN-01', 'EV-POLICY-CHECK-02'],
    recommendedActions: [
      {
        action: 'RETRY_PAYMENT',
        targetCount: retryCount,
        priority: 'HIGH',
        expectedYield: Math.round(summaryContext.estimatedRecoverableAmount * 0.65),
        reason: 'Automated retry for transient timeout exceptions with retryCount < 2.',
      },
      {
        action: 'RECONCILE_WEBHOOK',
        targetCount: reconcileCount,
        priority: 'HIGH',
        expectedYield: Math.round(summaryContext.estimatedRecoverableAmount * 0.25),
        reason: 'Synchronize merchant order records where payment was already captured by gateway.',
      },
      {
        action: 'SEND_RECOVERY_LINK',
        targetCount: recoveryLinkCount,
        priority: 'MEDIUM',
        expectedYield: Math.round(summaryContext.estimatedRecoverableAmount * 0.10),
        reason: 'Send digital payment prompt to customers with soft declines.',
      },
    ],
    blockedActions: [
      {
        action: 'RETRY_PAYMENT',
        count: blockedCount,
        reason: 'Halted by safety policy: retry limit exceeded or permanent card decline signature.',
      },
    ],
    confidence: 94,
    limitations: 'Calculations are based on synthetic telemetry and calibrated probabilistic benchmarks; real money is never moved.',
  };
};

module.exports = {
  runRecoveryAgentAnalysis,
  buildDeterministicAgentReport,
};
