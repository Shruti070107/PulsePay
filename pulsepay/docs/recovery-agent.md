# PulsePay AI Revenue Recovery Agent

## 1. Agent Design Principles

The PulsePay AI Recovery Agent operates under strict financial engineering standards:
1. **Never Invent Facts**: The agent cannot fabricate customer states, amounts, or gateway responses. All context is grounded in empirical database records.
2. **Zero Financial Hallucination**: Probability calculations and Expected Values are computed deterministically before reaching the AI agent prompt.
3. **Structured JSON Output**: All agent conclusions follow a rigid schema containing:
   - Executive Briefing Summary
   - Empirical Facts Array
   - Causal Inferences Array
   - Structured Action Recommendations
   - Confidence Score & Grounding Attribution
4. **Safety Fallback**: If LLM connectivity is unavailable, the agent invokes an internal deterministic fallback engine that synthesizes the grounded report with 100% mathematical fidelity.

---

## 2. 5-Point Structured Recovery Explanation

For every candidate transaction, the AI Agent produces a comprehensive 5-point rationale:

```json
{
  "whyThisPayment": "Transaction pay_892182 failed due to GATEWAY_TIMEOUT with ₹2,499 at risk.",
  "whyThisAction": "RETRY_PAYMENT offers the highest net Expected Value (₹2,197) after deducting attempt costs.",
  "whyNow": "Immediate retry within 5 minutes catches the session before buyer abandonment.",
  "whyNotAnother": "Alternative action SEND_RECOVERY_LINK incurs higher customer friction and lower conversion for transient errors.",
  "whySafe": "Zero duplicate flags detected, retryCount (0) <= 2, and Expected Value is positive."
}
```

---

## 3. Grounding & Anti-Hallucination Measures

### Context Sanitization Layer
Before the context is provided to the LLM:
- All sensitive tokens, API credentials, and internal hostnames are stripped.
- Customer identifiers are pseudonmyized.
- Only verifiable metadata (`amount`, `failureReason`, `retryCount`, `timestamp`, `eventTimeline`) is included.

### Output Validation Layer
All agent outputs are validated against the `AI_RESPONSE_SCHEMA`. If JSON parsing fails or schema keys are omitted, the response validator activates schema repair and deterministic fallback.
