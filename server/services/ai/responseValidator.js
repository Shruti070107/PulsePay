const validateAndFormatResponse = (responseStr, context) => {
  let parsed = null;
  let rawJson = responseStr.trim();

  // Strip markdown wraps if present
  if (rawJson.startsWith('```')) {
    rawJson = rawJson.replace(/^```(json)?/, '').replace(/```$/, '').trim();
  }

  try {
    parsed = JSON.parse(rawJson);
  } catch (err) {
    console.error('[AI responseValidator] Failed to parse JSON response. Executing recovery logic.', err.message);
    return buildFallbackResponse(context, `JSON parse error: ${err.message}`);
  }

  // Enforce types and keys
  const validated = {
    summary: typeof parsed.summary === 'string' ? parsed.summary : `Incident ${context.incidentId} investigation report.`,
    probableRootCause: typeof parsed.probableRootCause === 'string' ? parsed.probableRootCause : 'Unknown root cause. Requires human inspection.',
    alternativeHypotheses: Array.isArray(parsed.alternativeHypotheses) ? parsed.alternativeHypotheses.map(String) : [],
    confidence: typeof parsed.confidence === 'number' ? Math.max(0.0, Math.min(1.0, parsed.confidence)) : 0.5,
    confidenceExplanation: typeof parsed.confidenceExplanation === 'string' ? parsed.confidenceExplanation : 'Confidence level assigned based on basic statistical counts.',
    facts: Array.isArray(parsed.facts) ? parsed.facts.map(String) : [],
    inferences: Array.isArray(parsed.inferences) ? parsed.inferences.map(String) : [],
    hypotheses: Array.isArray(parsed.hypotheses) ? parsed.hypotheses.map(String) : [],
    evidence: Array.isArray(parsed.evidence) ? parsed.evidence.map(e => ({
      statement: typeof e.statement === 'string' ? e.statement : 'Evidence line',
      source: typeof e.source === 'string' ? e.source : 'state_engine'
    })) : [],
    supportingEvidence: Array.isArray(parsed.supportingEvidence) ? parsed.supportingEvidence.map(String) : [],
    contradictingEvidence: Array.isArray(parsed.contradictingEvidence) ? parsed.contradictingEvidence.map(String) : [],
    financialImpact: {
      affectedAmount: (parsed.financialImpact && typeof parsed.financialImpact.affectedAmount === 'number') ? parsed.financialImpact.affectedAmount : context.affectedAmount,
      interpretation: (parsed.financialImpact && typeof parsed.financialImpact.interpretation === 'string') ? parsed.financialImpact.interpretation : 'Total transaction volume linked to incident.'
    },
    customerImpact: typeof parsed.customerImpact === 'string' ? parsed.customerImpact : `Affected customers count: ${context.affectedCustomers}`,
    recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions.map(a => ({
      priority: ['LOW', 'MEDIUM', 'HIGH'].includes(a.priority) ? a.priority : 'MEDIUM',
      action: typeof a.action === 'string' ? a.action : 'Examine incident details.',
      reason: typeof a.reason === 'string' ? a.reason : 'General troubleshooting.'
    })) : [],
    nextChecks: Array.isArray(parsed.nextChecks) ? parsed.nextChecks.map(String) : [],
    unknowns: Array.isArray(parsed.unknowns) ? parsed.unknowns.map(String) : []
  };

  return validated;
};

const buildFallbackResponse = (context, errorMsg) => {
  return {
    summary: `System generated fallback analysis for incident ${context.incidentId}.`,
    probableRootCause: `The AI analysis service failed to parse or return valid structured JSON. Error details: ${errorMsg}.`,
    alternativeHypotheses: ['Potential gateway configuration mismatch or network routing latency'],
    confidence: 0.5,
    confidenceExplanation: 'Fallback confidence assigned due to AI API parse failure.',
    facts: [
      `Incident ID is ${context.incidentId}`,
      `Total affected amount is ₹${context.affectedAmount}`,
      `Affected transaction count is ${context.affectedTransactions}`
    ],
    inferences: [
      'Operational mismatch detected. Refer to evidence list.'
    ],
    hypotheses: [
      'Stuck processing state at payment gateway',
      'Missing merchant endpoint server webhook configuration'
    ],
    evidence: (context.evidence || []).map(statement => ({
      statement,
      source: 'state_engine'
    })),
    supportingEvidence: [],
    contradictingEvidence: [],
    financialImpact: {
      affectedAmount: context.affectedAmount,
      interpretation: 'Affected transaction value linked to deterministic state signals.'
    },
    customerImpact: `Affected customers count is ${context.affectedCustomers || 1}`,
    recommendedActions: [
      {
        priority: 'HIGH',
        action: 'Inspect webhook delivery log metrics on merchant dashboard.',
        reason: 'Order states show unpaid orders while processor reports captured status.'
      }
    ],
    nextChecks: ['Verify merchant network routing table', 'Check webhook retries queue backlog'],
    unknowns: [
      'Model connection or parsing outcome could not be validated.'
    ]
  };
};

module.exports = {
  validateAndFormatResponse,
  buildFallbackResponse
};
