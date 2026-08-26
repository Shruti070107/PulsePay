# PulsePay — AI Revenue Recovery & Payment Intelligence Agent

PulsePay is an **Evidence-Driven AI Revenue Recovery & Payment Intelligence Platform** designed for payment operations, merchant engineering, and SRE teams.

PulsePay identifies **revenue at risk**, determines what portion is **realistically recoverable**, explains **why the revenue was lost**, recommends the **safest recovery strategy**, simulates the **expected financial outcome**, executes bounded recovery actions in a **controlled test environment**, and measures the **actual recovery result**.

---

## 🚀 Core Value Proposition

In modern digital commerce, payment failures cause immediate revenue loss. Traditional payment gateways rely on crude, blanket retry rules that cause customer churn or billing disputes.

**PulsePay combines**:
$$\text{DETERMINISTIC FACTS} + \text{ML ANOMALY SIGNALS} + \text{RECOVERY PROBABILITY} + \text{EXPECTED VALUE} + \text{AI REASONING} + \text{SAFETY RULES} + \text{SIMULATION} + \text{MEASURED OUTCOMES}$$

---

## 🛠️ Complete System Architecture

```text
+─────────────────────────────────────────────────────────────────────────────+
|                    PULSEPAY REVENUE RECOVERY PIPELINE                       |
+─────────────────────────────────────────────────────────────────────────────+
                                       │
                                       ▼
                     +───────────────────────────────────+
                     |        Revenue Risk Engine        |
                     |  (Scans failed/unpaid transactions) |
                     +───────────────────────────────────+
                                       │
                                       ▼
                     +───────────────────────────────────+
                     |     Recovery Scoring Engine       |
                     |   (Calculates P(recovery) & decay) |
                     +───────────────────────────────────+
                                       │
                                       ▼
                     +───────────────────────────────────+
                     |     Recovery Strategy Engine      |
                     |  (Computes Net Expected Value EV) |
                     +───────────────────────────────────+
                                       │
                                       ▼
                     +───────────────────────────────────+
                     |   Deterministic Policy Engine     |
                     | (Enforces retry limits, no dups)  |
                     +───────────────────────────────────+
                                       │
                         ┌─────────────┴─────────────┐
                         ▼                           ▼
            +─────────────────────────+ +─────────────────────────+
            |    Recovery Simulator   | |    Recovery Executor    |
            |   (Zero side-effects)   | | (Bounded synthetic rail)|
            +─────────────────────────+ +─────────────────────────+
                         └─────────────┬─────────────┘
                                       │
                                       ▼
                     +───────────────────────────────────+
                     |      Recovery Outcome Engine      |
                     | (Measures actual vs expected EV)  |
                     +───────────────────────────────────+
                                       │
                                       ▼
                     +───────────────────────────────────+
                     |    AI Recovery Agent Briefing     |
                     | (5-point grounded justifications) |
                     +───────────────────────────────────+
```

---

## 💡 Key Capabilities

### 1. Revenue Risk Scanner & State Reconstruction
- Ingests raw transaction event timelines and identifies failed or inconsistent transactions.
- Classifies failures into deterministic taxonomies (`GATEWAY_TIMEOUT`, `WEBHOOK_DELIVERY_FAILURE`, `INSUFFICIENT_FUNDS`, `DUPLICATE_PAYMENT_RISK`, `CARD_EXPIRED`).

### 2. Multi-Factor Probabilistic Scoring & Decay
- Computes calibrated recovery probabilities $P(\text{recovery})$.
- Features include: failure signature baseline, retry count decay ($-25\%$ per attempt), time half-life decay, and payment method weights.

### 3. Expected Value Strategy Optimization
- Formulates net financial yields across 7 recovery actions:
  $$EV(\text{action}) = \text{Amount} \times P(\text{success} \mid \text{action}) - \text{Cost}(\text{action})$$
- Evaluates: `RETRY_PAYMENT`, `SEND_RECOVERY_LINK`, `RECONCILE_WEBHOOK`, `ALTERNATE_PAYMENT_METHOD`, `WAIT_AND_RETRY`, and `STOP_RECOVERY`.

### 4. Deterministic Safety Policy Engine
- **Hard Max Retries**: Max 2 automated retries per transaction.
- **Permanent Decline Gate**: Zero automated retries on expired/stolen cards or fraud flags.
- **Duplicate Charge Lockout**: Halts actions if duplicate transaction detected within 60 seconds.
- **Positive Expected Value**: Only actions with $EV > 0$ are deemed policy-eligible.

### 5. What-If Strategy Studio & Campaign Launcher
- Compares strategies side-by-side:
  - *Strategy A: Expected Value Optimized*
  - *Strategy B: Retry All*
  - *Strategy C: High Confidence Only*
  - *Strategy D: Digital Recovery Links Only*
- Simulates yields with zero state changes before committing.

### 6. Bounded Synthetic Execution
- Executes recovery on synthetic test rails with immutable idempotency keys (`REC-{campaignId}-{paymentId}-{action}`).
- Updates order and payment ledgers while tracking measured calibration error.

### 7. AI Recovery Agent with 5-Point Explanations
- Produces grounded justifications:
  1. *Why this payment?*
  2. *Why this action?*
  3. *Why now?*
  4. *Why not another action?*
  5. *Why is it safe?*

---

## 🧪 Benchmark & Automated Test Suite

PulsePay includes 9 automated test suites with 100% pass rates:
- State Reconstruction Engine (`tests/stateEngine.test.js`)
- Incident Aggregation & Clustering (`tests/incidentEngine.test.js`)
- AI Root Cause Investigator (`tests/aiInvestigator.test.js`)
- End-to-End Pipeline (`tests/fullPipeline.test.js`)
- Evidence Engine & Causal Graphs (`tests/evidenceEngine.test.js`)
- Transaction Data Lab & Baselines (`tests/dataLab.test.js`)
- Upgrade Integration Suite (`tests/upgrades.test.js`)
- Scenario Lab Service (`tests/labService.test.js`)
- **AI Revenue Recovery & Policy Engine Suite (`tests/revenueRecovery.test.js`)**

To run the complete test suite:
```bash
cd server
npm test
```

---

## 🌐 Running Locally

1. **Start Backend Server**:
   ```bash
   cd server
   npm run dev
   # Running on http://localhost:5000
   ```

2. **Start ML Python Service**:
   ```bash
   cd ml
   .\venv\Scripts\python -m uvicorn app.main:app --port 8000
   # Running on http://localhost:8000
   ```

3. **Start React Frontend**:
   ```bash
   cd client
   npm run dev
   # Running on http://localhost:5173
   ```

---

## 🔒 Security & Data Provenance Notice

All payment flows generated and processed in PulsePay are **synthetic simulations**. The platform moves zero real money, stores zero real card numbers or credentials, and connects only to simulated sandbox rails.
