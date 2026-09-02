# PulsePay

An **Evidence-Driven AI Revenue Recovery** system that systematically evaluates:

$$\text{Recoverability} \longrightarrow \text{Probability} \longrightarrow \text{Calibration} \longrightarrow \text{Net EV} \longrightarrow \text{Safety Invariants} \longrightarrow \text{Bounded Execution}$$

PulsePay identifies revenue at risk across failed payment streams, estimates true recovery likelihood, ranks candidate recovery channels by net Expected Value, and enforces deterministic safety guardrails before executing bounded recovery in a simulation sandbox.

---

## Why PulsePay?

PulsePay is **not** a blind retry automation script or a generic chatbot wrapper. 

Traditional payment recovery relies on crude blanket retries that spam acquiring banks, risk customer double-billing, and incur fees on permanent declines. Conversely, unconstrained LLM recovery agents lack deterministic financial guardrails.

PulsePay bridges this gap through:
- **Evidence-Driven Decisioning**: Every recommendation is grounded in immutable payment event telemetry stored in MongoDB.
- **Calibrated Probabilities**: Machine learning confidence is calibrated via Isotonic Regression (PAVA) to reflect empirical success rates.
- **Economic Optimization (Net EV)**: Recovery actions are selected only when expected financial gains exceed transaction and friction costs.
- **Deterministic Safety**: Non-negotiable code rules strictly block duplicate charges, retry storms, and permanent hard declines.
- **Measurable Benchmark Outcomes**: Realized net recovery is continuously benchmarked against a naive blind-retry baseline.

---

## Problem

Failed payments cause severe revenue leakage for digital merchants. However, naive blind retries create critical operational risks:
- **Duplicate Charges**: Retrying during webhook dropouts or network latency causes customer double-billing.
- **Wasted Fees**: Retrying permanent hard declines (e.g. expired cards, stolen accounts) wastes acquirer transaction fees.
- **Customer Friction**: Haphazard customer outreach and retry storms trigger payment disputes, chargebacks, and gateway penalties.

---

## Solution

PulsePay provides an end-to-end intelligent revenue recovery pipeline:
1. **Detects** failed and inconsistent payment events where revenue is genuinely at risk.
2. **Estimates** recovery probability using multi-factor failure signals and historical latency models.
3. **Calibrates** raw model estimates using out-of-sample Isotonic Regression (PAVA) to eliminate overconfidence.
4. **Calculates Expected Value (EV)**: Defined as **estimated recovered revenue minus expected transaction/action costs and friction penalties**.
5. **Ranks** candidate recovery channels (delayed retry, alternate routing, webhook reconciliation, payment links) to maximize net EV.
6. **Enforces** deterministic safety policies (permanent decline filtering, duplicate lockouts, retry limits).
7. **Executes** bounded synthetic recovery actions in a safe simulation environment.
8. **Measures** realized net recovery outcomes against a naive blind-retry baseline.

---

## AI vs. Deterministic Control

PulsePay strictly separates probabilistic inference from deterministic execution:

| Layer | Component | Function |
| :--- | :--- | :--- |
| **Probabilistic / AI Layer** | • ML Recovery Scoring<br>• Isotonic Probability Calibration<br>• Expected Value (EV) Calculation<br>• Strategy Channel Ranking | Estimates recovery likelihood and proposes the highest-yield intervention channel. |
| **Deterministic Layer** | • Permanent Decline Gate<br>• Duplicate Charge Lockout<br>• Retry Budget Limiter ($\le 2$ attempts)<br>• Financial Viability Gate ($EV > ₹0$)<br>• Idempotent Execution Locks | Authoritative invariant guardrails that decide whether an action is permitted to execute. |

> **Core Architectural Principle:**  
> *"ML estimates what is likely to work; deterministic policies decide whether an action is allowed to execute."*

---

## Architecture & Technology Stack

- **Frontend**: React, Vite, Vanilla CSS
- **Backend**: Node.js, Express
- **Database**: MongoDB (Mongoose)
- **ML Service**: Python, FastAPI, Scikit-Learn

### Decision Pipeline Flow

```text
Payment Telemetry (MongoDB Events)
              │
              ▼
Recovery Scoring (ML Probability)
              │
              ▼
Probability Calibration (Isotonic PAVA)
              │
              ▼
Expected Value Optimization (Net EV = Revenue - Action Cost)
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
- **Idempotent Single-Execution**: Unique execution tokens prevent duplicate execution of the same recovery action.
- **Evidence-Grounded Explanations**: AI explanations are generated from captured payment telemetry and constrained to observed evidence.

---

## Authoritative Benchmark

Evaluated over a standardized, seed-reproducible **10,000-transaction synthetic benchmark** (7,000 training / 3,000 unseen evaluation, seed: `20260826`, calibration: `Isotonic Regression / PAVA`):

| Metric | PulsePay | Blind Retry (Naive Baseline) | Outperformance / Net Impact |
| :--- | :--- | :--- | :--- |
| **Net Recovered Revenue** | **₹1,40,64,879 (₹1.41 Cr)** | ₹1,16,19,196 (₹1.16 Cr) | **+₹24,45,683 (+21.0% Net Lift)** |
| **Duplicate Charges** | **0** | 583 | **100% duplicate elimination** |
| **Unsafe Actions Prevented** | **317** | 0 (all retried) | **317 permanent declines blocked** |
| **Recovery Precision** | **96.0%** | — | **High-precision intervention** |
| **Recovery Recall** | **100.0%** | — | **100.0% recall on defined recoverable opportunities** |
| **Expected Calibration Error (ECE)** | **14.8% (0.148)** | 33.7% (0.337 raw) | **56.1% relative error reduction** |
| **Brier Score** | **0.1483** | 0.2515 (raw) | **Improved probability accuracy** |

*Note: All benchmark metrics reflect strictly out-of-sample evaluation on the 3,000 unseen test records.*

### Benchmark Result Interpretation

- **Net Revenue Realized**: PulsePay achieved **₹1,40,64,879** in net recovered revenue compared to **₹1,16,19,196** for the naive baseline—generating **+₹24,45,683** in net value added (**+21.0% net lift**).
- **Safety Superiority**: While blind retry caused **583 duplicate customer charges**, PulsePay caused **0** duplicate charges.
- **Waste Suppression**: PulsePay's deterministic policy gates blocked **317 unsafe attempts** on permanent declines, saving gateway transaction fees.
- **Probability Calibration**: Applying Isotonic Regression (PAVA) reduced Expected Calibration Error from **33.7% to 14.8%** and improved the Brier score from **0.2515 to 0.1483**.

---

## Important Disclosure

This project uses synthetic/test-mode data and bounded simulation to demonstrate decisioning and safety architecture under controlled, reproducible conditions. It does **not** process real customer funds, live banking rails, or live merchant production traffic.
