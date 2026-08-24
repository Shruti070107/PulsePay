const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const queryGemini = async (systemPrompt, userPrompt, apiKey) => {
  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt },
            { text: userPrompt }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API error (HTTP ${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
    return data.candidates[0].content.parts[0].text;
  }
  throw new Error('Malformed response structure from Gemini API');
};

const queryMockProvider = (context) => {
  console.log('[AI Provider] GEMINI_API_KEY not found. Operating in MOCK mode.');

  const type = context.type;
  
  if (type === 'WEBHOOK_FAILURE' || type === 'CAPTURED_ORDER_UNPAID') {
    return JSON.stringify({
      summary: `Webhook delivery failure affecting ${context.affectedTransactions} transactions for merchant ${context.commonPatterns.merchant}.`,
      probableRootCause: `Merchant webhook endpoint returned server errors (status codes: ${context.commonPatterns.failureCodes.join(', ') || '500, 503'}). This prevented the order state from updating to "paid" even though the payment gateway successfully captured the funds.`,
      confidence: 0.95,
      confidenceExplanation: 'Determined with high confidence due to 100% agreement between captured payments and unpaid orders, alongside logged webhook failure events.',
      facts: [
        `Affected transaction count is ${context.affectedTransactions}`,
        `Unpaid order count is ${context.orderStates.unpaid || context.affectedTransactions}`,
        `Logged webhook failures: ${context.webhookStats.failed} attempts`
      ],
      inferences: [
        'The gateway successfully processed customer cards and moved funds to CAPTURED.',
        'The merchant order database remains out of sync because webhook retries exhausted without a 200 OK response.'
      ],
      evidence: (context.evidence || []).map(statement => ({
        statement,
        source: 'state_engine'
      })),
      financialImpact: {
        affectedAmount: context.affectedAmount,
        interpretation: 'Total captured volume at risk of merchant inventory discrepancies.'
      },
      customerImpact: `Customers were charged but did not receive order confirmation. They are likely to attempt duplicate payments or raise disputes.`,
      recommendedActions: [
        {
          priority: 'HIGH',
          action: `Verify network connectivity and check HTTP server logs for merchant endpoint ${context.commonPatterns.webhookEndpoint}.`,
          reason: `Status code logs show error codes: ${context.commonPatterns.failureCodes.join(', ') || '500'}.`
        },
        {
          priority: 'MEDIUM',
          action: 'Manually sync order records in merchant backend for affected payments once server stability is restored.',
          reason: 'Ensures customers receive their orders and reduces refund disputes.'
        }
      ],
      unknowns: [
        'Whether the merchant backend has custom rate limits or firewall blocklists affecting the gateway IP block.'
      ]
    });
  }

  if (type === 'DUPLICATE_PAYMENT_RISK') {
    return JSON.stringify({
      summary: `Duplicate transaction risk detected involving customer payments in quick succession.`,
      probableRootCause: 'Customers submitting multiple payment requests within 1 minute, possibly due to interface double-clicks, slow loading state indication, or lacking idempotent keys on merchant checkout request.',
      confidence: 0.90,
      confidenceExplanation: 'High duplicate similarity matching within narrow time sliding windows confirms customer click behavior.',
      facts: [
        `Affected transactions: ${context.affectedTransactions}`,
        `Impacted volume: ₹${context.affectedAmount}`
      ],
      inferences: [
        'Slow UI response times caused customers to click checkout multiple times.',
        'Merchant forms did not disable the submit button during processing.'
      ],
      evidence: (context.evidence || []).map(statement => ({
        statement,
        source: 'state_engine'
      })),
      financialImpact: {
        affectedAmount: context.affectedAmount,
        interpretation: 'Double-captured funds requiring manual refund review.'
      },
      customerImpact: 'Customers charged multiple times for a single order.',
      recommendedActions: [
        {
          priority: 'HIGH',
          action: 'Audit frontend button states and disable submit button immediately on first tap.',
          reason: 'Prevents duplicate requests from reaching the server.'
        },
        {
          priority: 'HIGH',
          action: 'Process refunds for the duplicate (secondary) payment IDs to resolve customer disputes.',
          reason: 'Only one payment corresponds to the merchant order; the second is an excess capture.'
        }
      ],
      unknowns: [
        'Whether the merchant checkout generates unique idempotency keys in payment request headers.'
      ]
    });
  }

  // Fallback default mock for other types (Out of order, refund inconsistency, late auth, etc.)
  return JSON.stringify({
    summary: `Operational transaction mismatch of type ${type} affecting ${context.affectedTransactions} transactions.`,
    probableRootCause: `Deterministic parsing engines flagged transition rules inconsistency or timing mismatch. State reconstruction points to event sequence anomaly.`,
    confidence: 0.85,
    confidenceExplanation: 'System state engine validated invalid transition sequences or chronological event order violation.',
    facts: [
      `Operational incident type is ${type}`,
      `Total affected amount is ₹${context.affectedAmount}`,
      `Affected transaction count is ${context.affectedTransactions}`
    ],
    inferences: [
      'Chronological sequence of events arrived out of order, or refund was declined by processor.'
    ],
    evidence: (context.evidence || []).map(statement => ({
      statement,
      source: 'state_engine'
    })),
    financialImpact: {
      affectedAmount: context.affectedAmount,
      interpretation: 'Transaction values linked to transition mismatch.'
    },
    customerImpact: `Varying customer impact depending on transaction finality. Customers may experience delays in status refresh.`,
    recommendedActions: [
      {
        priority: 'MEDIUM',
        action: 'Review ingestion pipeline queue latency logs and check processor webhook retry rules.',
        reason: 'Event ingestion delay is the primary driver of out-of-order logs.'
      }
    ],
    unknowns: [
      'Whether external network load caused delays in webhook arrivals.'
    ]
  });
};

module.exports = {
  queryGemini,
  queryMockProvider
};
