# PulsePay

An evidence-driven AI revenue recovery system that combines probabilistic recovery scoring with deterministic safety policies.

---

## Problem

Failed payments create substantial revenue leakage for modern online merchants. However, blindly retrying every failed payment is dangerous:
- **Duplicate Charges**: Retrying during webhook dropouts or network partitions causes customer double-billing.
- **Wasted Fees**: Retrying permanent hard declines (e.g. expired cards, stolen accounts) wastes acquirer transaction fees.
- **Customer Friction**: Haphazard customer communications and retry storms trigger chargebacks and merchant penalties.

---

## Solution

PulsePay provides an end-to-end intelligent recovery pipeline:
1. **Detects** failed and inconsistent payments where revenue is genuinely at risk.
2. **Estimates** recovery probability using observed payment signals and historical models.
3. **Calibrates** raw model estimates using out-of-sample Isotonic Regression (PAVA) to reflect empirical success rates.
4. **Ranks** candidate interventions by net Expected Value ($EV$).
5. **Enforces** deterministic safety policies (permanent decline filtering, duplicate lockouts, retry limits).
6. **Executes** bounded synthetic recovery actions in a safe simulation sandbox.
7. **Measures** realized net recovery outcomes against a naive blind-retry baseline.

---

## Architecture & Technology Stack

- **Frontend**: React, Vite, Vanilla CSS
- **Backend**: Node.js, Express
- **Database**: MongoDB (Mongoose)
- **ML Service**: Python, FastAPI, Scikit-Learn

### Decision Pipeline Flow

```text
Payment Telemetry
       │
       ▼
Recovery Scoring (ML Probability)
       │
       ▼
Probability Calibration (Isotonic PAVA)
       │
       ▼
Expected Value Optimization (Net EV)
       │
       ▼
Strategy Channel Selection (Retry / Alternate Route / Webhook Recon / Payment Link)
       │
       ▼
Deterministic Safety Policy (Permanent Decline / Duplicate Lockout / Retry Limit)
       │
       ▼
Bounded Synthetic Execution (Simulation Sandbox)
       │
       ▼
Outcome Measurement & Telemetry Audit
```

---

## Key Safety Guarantees

- **Permanent Decline Gate**: Zero automated retries on hard rejection codes (`CARD_EXPIRED`, `FRAUD_SUSPECTED`, `INVALID_ACCOUNT`, `STOLEN_CARD`).
- **Duplicate Charge Lockout**: Strict hash and idempotency locks prevent double-billing during webhook latency.
- **Retry Budget Limiter**: Hard ceiling of max 2 automated retries per transaction to prevent retry storms.
- **Financial Viability Gate**: Suppresses any recovery channel where expected value is non-positive ($EV \le ₹0$).
- **Idempotent Single-Execution**: Unique execution tokens ensure actions execute exactly once.
- **Evidence-Grounded Explanations**: Plain-English AI summaries grounded strictly in observed telemetry with zero hallucination.

---

## Authoritative Benchmark

Evaluated over a standardized, seed-reproducible **10,000-transaction synthetic benchmark** (7,000 training / 3,000 unseen evaluation, seed: `20260826`, calibration: `Isotonic Regression / PAVA`):

| Metric | PulsePay | Blind Retry (Naive Baseline) | Outperformance / Net Impact |
| :--- | :--- | :--- | :--- |
| **Net Recovered Revenue** | **₹1,40,64,879 (₹1.41 Cr)** | ₹1,16,19,196 (₹1.16 Cr) | **+₹24,45,683 (+21.0% Net Lift)** |
| **Duplicate Charges** | **0** | 583 | **100% duplicate elimination** |
| **Unsafe Actions Prevented** | **317** | 0 (all retried) | **317 permanent declines blocked** |
| **Recovery Precision** | **96.0%** | — | **High-precision intervention** |
| **Recovery Recall** | **100.0%** | — | **Complete recoverable capture** |
| **Expected Calibration Error (ECE)** | **14.8% (0.148)** | 33.7% (0.337 raw) | **56.1% relative error reduction** |
| **Brier Score** | **0.1483** | 0.2515 (raw) | **Improved probability accuracy** |

*Note: All benchmark metrics reflect strictly out-of-sample evaluation on the 3,000 unseen test records.*

---

## Important Disclosure

This project uses synthetic/test-mode data and bounded simulation. No real customer funds, live banking rails, or credit card networks are charged.
