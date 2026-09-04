````markdown
<h1 align="center">
  ⚡ PulsePay
</h1>

<div align="center">

### *Evidence-Driven AI Revenue Recovery & Payment Intelligence*

<strong>Don't blindly retry failed payments. Decide when recovery is worth it, which strategy is best, and whether it is safe to execute.</strong>

<br><br>

![AI Revenue Recovery](https://img.shields.io/badge/AI-Revenue%20Recovery-2563EB?style=for-the-badge)
![Calibrated ML](https://img.shields.io/badge/ML-Calibrated%20Probability-059669?style=for-the-badge)
![Safety](https://img.shields.io/badge/Safety-Deterministic%20Guardrails-DC2626?style=for-the-badge)
![Synthetic Data](https://img.shields.io/badge/Data-Synthetic%20%26%20Reproducible-D97706?style=for-the-badge)

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-Frontend-646CFF?style=flat-square&logo=vite)
![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?style=flat-square&logo=node.js)
![Express](https://img.shields.io/badge/Express-API-000000?style=flat-square&logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?style=flat-square&logo=mongodb)
![FastAPI](https://img.shields.io/badge/FastAPI-ML%20Service-009688?style=flat-square&logo=fastapi)
![scikit--learn](https://img.shields.io/badge/scikit--learn-ML-F7931E?style=flat-square&logo=scikit-learn)

</div>

---

# 🚀 Overview

Payment failures are not all equal.

Some are temporary and highly recoverable. Others are permanently declined, have exhausted their retry budget, carry duplicate-charge risk, or are simply not worth another attempt economically.

Traditional recovery often reduces the problem to:

```text
Payment Failed
      ↓
Retry
      ↓
Retry Again
````

PulsePay treats recovery as a **financial decision problem**:

```text
Payment Failure
      ↓
Evidence Collection
      ↓
Recovery Probability
      ↓
Probability Calibration
      ↓
Expected Net Value
      ↓
Strategy Comparison
      ↓
Deterministic Safety Checks
      ↓
Bounded Execution
      ↓
Outcome Measurement
```

The central principle is:

> **ML estimates probability. Deterministic policies control whether an action is allowed.**

---

# 🎯 Problem

Failed payments create revenue leakage, but blindly increasing retry attempts can create new problems:

* unnecessary payment attempts
* additional recovery costs
* repeated failures
* customer friction
* duplicate-charge risk
* unsafe actions
* negative-value recoveries
* poor decision transparency

The real question is not:

> **"Can we retry this payment?"**

It is:

> **"Is this payment worth recovering, which intervention has the highest expected value, and is that action safe?"**

PulsePay is built to answer that question.

---

# 💡 What Makes PulsePay Different?

AI-powered payment recovery and smart retries already exist.

PulsePay does **not** claim to have invented payment recovery.

Its focus is the decision architecture around recovery:

```text
Raw ML Probability
        ↓
Calibration
        ↓
Expected Net Value
        ↓
Strategy Selection
        ↓
Safety Authorization
        ↓
Bounded Execution
        ↓
Measured Outcome
```

### Core differentiators

**1. Prediction ≠ Authorization**

The ML model recommends. The policy engine decides whether execution is permitted.

**2. Probability Calibration**

Raw probabilities are calibrated before being used for economic decisioning.

**3. Expected-Value Optimization**

Recovery is ranked by expected net value rather than probability alone.

**4. Counterfactual Strategy Comparison**

Alternative recovery strategies can be compared before execution.

**5. Explicit "Do Not Act" Logic**

Permanent declines, exhausted retry budgets, duplicate risk, negative EV, and other policy conditions can block execution.

**6. Measurable Safety**

The benchmark evaluates economic recovery alongside duplicate-charge and unsafe-action outcomes.

---

# 🧠 Decision Architecture

```text
                    PAYMENT EVENT
                         │
                         ▼
                ┌─────────────────┐
                │ Revenue Risk    │
                │ Engine          │
                └────────┬────────┘
                         ▼
                ┌─────────────────┐
                │ Recovery ML     │
                │ Raw Probability │
                └────────┬────────┘
                         ▼
                ┌─────────────────┐
                │ Calibration     │
                │ Isotonic / PAVA │
                └────────┬────────┘
                         ▼
                ┌─────────────────┐
                │ Expected Net    │
                │ Value           │
                └────────┬────────┘
                         ▼
                ┌─────────────────┐
                │ Strategy Engine │
                └────────┬────────┘
                         ▼
                ┌─────────────────┐
                │ Safety Policies │
                └────────┬────────┘
                         │
                  ┌──────┴──────┐
                  ▼             ▼
                BLOCK         ALLOW
                  │             │
                  ▼             ▼
                AUDIT        EXECUTE
                                │
                                ▼
                           OUTCOME
```

---

# 🤖 AI / ML Layer

PulsePay uses ML for **probabilistic prediction**, not unrestricted execution.

The model estimates the probability that a recovery intervention will succeed based on payment and contextual signals.

```text
Payment Features
      ↓
Recovery Model
      ↓
Raw Probability
      ↓
Calibration
      ↓
Calibrated Probability
```

The calibrated probability becomes an input to the economic decision layer.

This creates a clean separation:

| Layer          | Responsibility                  |
| -------------- | ------------------------------- |
| ML             | Estimate recovery probability   |
| Calibration    | Improve probability reliability |
| Economics      | Calculate expected value        |
| Strategy       | Select intervention             |
| Policy         | Authorize or block              |
| Executor       | Perform bounded action          |
| Outcome Engine | Measure result                  |

---

# 📐 Probability Calibration

A model can be predictive without producing reliable probabilities.

For example, a prediction of `80%` should represent a population that actually recovers at approximately that rate when the model is well calibrated.

PulsePay therefore calibrates raw probabilities before using them for downstream decisions.

### Active method

**Isotonic Regression / PAVA**

### Authoritative benchmark

```text
Total Records      : 10,000
Training Records   : 7,000
Evaluation Records : 3,000
Seed               : 20260826
```

### Results

| Metric      | Before |      After |
| ----------- | -----: | ---------: |
| ECE         |  33.7% |  **14.8%** |
| Brier Score | 0.2515 | **0.1483** |

Lower values indicate improved probability reliability.

---

# 💰 Expected Net Value

Probability alone is not enough for financial recovery.

PulsePay estimates the economic value of an action.

Conceptually:

```text
Expected Recovery
=
Calibrated Probability
×
Recoverable Amount
```

and:

```text
Expected Net Value
=
Expected Recovery
−
Recovery Costs
−
Relevant Risk Costs
```

This prevents the system from prioritizing an action simply because it has a high predicted probability.

The objective becomes:

> **Maximize safe economic recovery, not retry volume.**

---

# 🧩 Strategy Selection

PulsePay can evaluate multiple recovery strategies.

Examples include:

* Automated Gateway Retry
* Customer Recovery Link
* Alternative Recovery Intervention
* Halt Recovery

Each strategy can be evaluated using:

* calibrated probability
* expected value
* cost
* safety status
* policy eligibility

Example:

```text
Strategy                  Expected Value      Status
─────────────────────────────────────────────────────
Gateway Retry                ₹24,497           SELECTED
Recovery Link                ₹20,744           NOT SELECTED
Halt Recovery                     ₹0           BLOCKED
```

The values depend on the synthetic opportunity being investigated.

The important concept is:

> **PulsePay compares possible actions instead of assuming retry is always optimal.**

---

# 🛡️ Deterministic Safety Layer

The ML model does not have unrestricted execution authority.

Before an action is executed, PulsePay evaluates deterministic safety policies.

### Permanent Decline Protection

Blocks recovery attempts against permanently unrecoverable states.

### Duplicate Charge Protection

Prevents actions that could create duplicate charging conditions.

### Retry Budget

Limits repeated recovery attempts.

### Financial Viability

Blocks actions when expected value is not economically justified.

### Idempotency

Prevents accidental repeated execution.

### Fraud Risk Gate

Can block recovery where risk conditions make automated recovery inappropriate.

The resulting flow is:

```text
ML Recommendation
       ↓
Economic Evaluation
       ↓
Safety Policy
       ↓
ALLOW / BLOCK
```

---

# 🚫 Knowing When Not to Act

A high model probability does not automatically mean "execute."

Example:

```text
Recovery Probability = 97%
Permanent Decline = TRUE
```

Result:

```text
BLOCKED
Reason: Permanent Decline Protection
```

Another:

```text
Recovery Probability = 91%
Expected Value = Negative
```

Result:

```text
BLOCKED
Reason: Financial Viability Gate
```

Another:

```text
Retry Count = Maximum
```

Result:

```text
BLOCKED
Reason: Retry Budget
```

This creates a key PulsePay principle:

> **A good recovery system must know when not to recover.**

---

# 🔎 Evidence-Driven Explainability

PulsePay provides a decision record for recovery opportunities.

Instead of relying on generic AI explanations, the system exposes the evidence and calculations behind the recommendation.

A Payment Investigation can include:

### Payment Details

* Payment ID
* Amount
* Status
* Failure information
* Relevant context

### ML Decision

* Raw probability
* Calibrated probability

### Economic Decision

* Expected recovery
* Expected net value

### Strategy Decision

* Recommended strategy
* Alternative strategies
* Selection status

### Safety Decision

* Safety checks
* Blocked conditions
* Policy reasons

### Execution

* Action status
* Execution history
* Outcome

The operator can therefore trace:

```text
WHAT happened?
      ↓
WHAT evidence was available?
      ↓
WHAT did the model predict?
      ↓
WHAT was the expected value?
      ↓
WHICH strategy was selected?
      ↓
WAS execution allowed?
      ↓
WHAT actually happened?
```

---

# 🔬 Counterfactual Strategy Analysis

PulsePay can expose alternative strategies instead of presenting one opaque recommendation.

For example:

```text
                  Probability     Expected Value

Gateway Retry         92%             ₹24,497
Recovery Link         78%             ₹20,744
Halt Recovery          —                  ₹0
```

This allows an operator to ask:

> **"Why this strategy instead of the alternatives?"**

The backend strategy engine remains the source of truth for the comparison.

---

# ⚙️ Recovery Mission

**Recovery Mission** turns individual decisions into a bounded operational workflow.

A mission can:

1. identify eligible opportunities
2. evaluate recovery decisions
3. apply safety policies
4. execute permitted actions
5. record blocked actions
6. record successful and failed outcomes
7. calculate mission-level results
8. expose an audit trail

The workflow follows:

```text
Scan
 ↓
Analyze
 ↓
Score
 ↓
Calibrate
 ↓
Optimize
 ↓
Protect
 ↓
Execute
 ↓
Measure
```

Mission execution is backend-driven rather than simulated using artificial UI progress.

---

# 📊 Mission Results

A completed Recovery Mission can expose:

* Revenue at Risk
* Expected Recovery
* Actual Recovery
* Actions Attempted
* Successful Actions
* Blocked Actions
* Unsafe Actions Prevented
* Opportunities Analyzed
* Action Breakdown
* Execution Audit

PulsePay separates:

```text
Expected Recovery
```

from:

```text
Actual Recovery
```

so operators can evaluate prediction quality against real execution outcomes.

---

# 📈 Outcome Measurement

PulsePay does not stop after recommending or executing an action.

The complete lifecycle is:

```text
Opportunity
     ↓
Prediction
     ↓
Decision
     ↓
Execution
     ↓
Outcome
     ↓
Measurement
```

This enables measurement of:

* recovery precision
* recovery recall
* net recovery
* net value added
* expected vs actual recovery
* duplicate-charge outcomes
* blocked unsafe actions
* successful and failed executions

---

# 📊 Authoritative Benchmark

PulsePay includes a controlled synthetic benchmark against a **blind retry baseline**.

### Dataset

```text
Total Records      : 10,000
Training Records   : 7,000
Evaluation Records : 3,000
Seed               : 20260826
Calibration        : Isotonic Regression / PAVA
```

The evaluation is out-of-sample.

---

# 🏆 Benchmark Results

| Metric                   |         PulsePay |  Blind Retry |
| ------------------------ | ---------------: | -----------: |
| Net Recovery             | **₹1,40,64,879** | ₹1,16,19,196 |
| Net Value Added          |   **₹24,45,683** |            — |
| Net Lift                 |       **+21.0%** |            — |
| Duplicate Charges        |            **0** |          583 |
| Unsafe Actions Prevented |          **317** |            — |
| Recovery Precision       |        **96.0%** |            — |
| Recovery Recall          |       **100.0%** |            — |

### Revenue at Risk

```text
₹1,54,92,199
```

### Estimated Recoverable Benchmark

```text
₹1,42,58,836
```

### Recovery Rate

```text
90.8%
```

---

# 💵 Economic Impact

PulsePay generated:

```text
₹1,40,64,879
```

in benchmark net recovery.

Blind retry generated:

```text
₹1,16,19,196
```

Difference:

```text
₹24,45,683
```

Resulting in:

```text
+21.0% Net Lift
```

The important comparison is not simply how many attempts were made.

It is:

> **How much additional net value was created by intelligent recovery compared with blind retry?**

---

# 🎯 Recovery Precision & Recall

### Precision

```text
96.0%
```

This measures the quality of selected recovery opportunities under the benchmark definition.

### Recall

```text
100.0%
```

This indicates that the benchmark's recoverable opportunities were retained by the recovery selection process.

Together:

```text
Precision = 96.0%
Recall    = 100.0%
```

---

# 🛡️ Safety Benchmark

PulsePay's benchmark also evaluates safety-related outcomes.

```text
                    PulsePay      Blind Retry

Duplicate Charges       0              583

Unsafe Actions
Prevented              317               —
```

This demonstrates why maximizing retry activity is not an adequate objective.

The goal is:

> **Safe, economically meaningful recovery.**

---

# 🧪 Live Operations vs Benchmark

PulsePay intentionally separates live synthetic operations from benchmark evaluation.

### Live Synthetic Operations

The Revenue Center and Recovery Mission use the current synthetic operational database.

Their values can change after:

* reseeding
* executing recovery actions
* running missions
* changing opportunity state
* recording outcomes

### Authoritative Benchmark

The benchmark represents the controlled:

```text
10,000-record
7,000 / 3,000
out-of-sample
```

evaluation.

Therefore, live dashboard metrics are **not expected to always match benchmark metrics**.

This separation keeps the demonstration honest.

---

# 🖥️ Product Interface

PulsePay is designed as a fintech operations console rather than a generic AI chatbot.

The interface focuses on:

* financial value
* recovery opportunities
* evidence
* decision quality
* safety
* execution
* outcomes

### Main Areas

```text
Revenue Center
      ↓
Recovery Queue
      ↓
Payment Investigation
      ↓
Recovery Mission
      ↓
Experiments & Benchmark
      ↓
Operations Copilot
```

---

# 📊 Revenue Center

The Revenue Center provides the operational overview.

It surfaces:

* Total Recovered
* Net Value Added
* Recovery Precision
* Revenue at Risk
* Action Eligibility
* Next Best Opportunity
* Recovery Performance
* Safety & Reliability

The central question is:

> **What is the highest-value safe recovery opportunity available right now?**

---

# 📋 Recovery Queue

The Recovery Queue provides the actionable recovery opportunities.

Operators can:

* inspect opportunities
* search payments
* filter recovery states
* open investigations
* review decision evidence
* execute permitted synthetic actions

The queue is designed around individual decision quality rather than becoming a generic bulk administration screen.

---

# 🔎 Payment Investigation

Payment Investigation presents a complete **Payment Decision Record**.

```text
Payment Details
      ↓
PulsePay Decision
      ↓
Raw ML Probability
      ↓
Calibrated Probability
      ↓
Expected Recovery Value
      ↓
Recommended Strategy
      ↓
Evidence
      ↓
Alternative Strategies
      ↓
Safety Checks
      ↓
Execution History
```

This provides a traceable explanation of the recovery decision.

---

# 🤝 Operations Copilot

PulsePay includes an Operations Copilot focused on the existing recovery workflow.

It can help operators:

* understand recovery decisions
* interpret operational metrics
* summarize recovery activity
* inspect available context
* navigate PulsePay capabilities

The Copilot is not the authority for financial execution.

Backend policies remain authoritative.

---

# 🔐 Authentication & Security

PulsePay includes protected application functionality with:

* user registration
* login
* authenticated routes
* password hashing
* token-based authentication
* authenticated API requests
* environment-based secrets

Passwords are not stored as plaintext.

Sensitive credentials should be stored in environment variables and excluded from source control.

---

# 🏗️ System Architecture

```text
                    ┌─────────────────────┐
                    │    React + Vite     │
                    │ Operations Console  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Node + Express API │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼─────────────────┐
             ▼                 ▼                 ▼
      ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
      │ Risk & ML   │   │ Strategy &  │   │    Auth     │
      │ Services    │   │ Recovery    │   │  Services   │
      └──────┬──────┘   └──────┬──────┘   └─────────────┘
             │                 │
             └────────┬────────┘
                      ▼
              ┌───────────────┐
              │ Safety +      │
              │ Execution     │
              └───────┬───────┘
                      ▼
              ┌───────────────┐
              │   MongoDB     │
              │ Data + Audit  │
              └───────────────┘
                      ▲
                      │
              ┌───────┴───────┐
              │ FastAPI ML    │
              │ Service       │
              └───────────────┘
```

---

# 🧱 Technology Stack

| Layer          | Technology                 |
| -------------- | -------------------------- |
| Frontend       | React + Vite               |
| Backend        | Node.js + Express          |
| Database       | MongoDB + Mongoose         |
| ML Service     | Python + FastAPI           |
| ML             | scikit-learn               |
| Authentication | Token-based authentication |
| API            | REST                       |
| Data           | Synthetic / reproducible   |

---

# 🧠 Backend Service Flow

The recovery system is divided into domain services:

```text
Revenue Risk Engine
        ↓
Recovery Scoring Engine
        ↓
Calibration
        ↓
Expected Value
        ↓
Recovery Strategy Engine
        ↓
Recovery Policy Engine
        ↓
Recovery Executor
        ↓
Recovery Outcome Engine
        ↓
Benchmark / Evaluation
```

This keeps prediction, decisioning, policy enforcement, execution, and evaluation separate.

---

# 🗃️ Core Data Concepts

Key domain entities include:

```text
User
Payment
RecoveryOpportunity
RecoveryAction
RecoveryCampaign
RecoveryOutcome
```

Supporting services handle:

* telemetry
* investigation
* incidents
* calibration
* benchmark evaluation
* recovery missions
* audit information

---

# 🔁 End-to-End Data Flow

```text
Payment Event
     ↓
Failure Context
     ↓
Revenue Risk Detection
     ↓
Recovery Opportunity
     ↓
ML Scoring
     ↓
Probability Calibration
     ↓
Expected Value
     ↓
Strategy Selection
     ↓
Safety Policies
     ↓
Bounded Execution
     ↓
Outcome
     ↓
Measurement
```

---

# 🌱 Synthetic Demo Environment

PulsePay uses synthetic payment data for demonstration and evaluation.

This enables realistic scenarios without requiring real customer financial information.

The demo environment can represent:

* failed payments
* recoverable failures
* blocked cases
* retry limits
* duplicate-risk scenarios
* successful recoveries
* failed recoveries
* historical actions

No real customer payment data is required.

---

# ⚙️ Installation

## Prerequisites

Install:

* Node.js
* npm
* MongoDB
* Python

---

## Clone

```bash
git clone https://github.com/Shruti070107/PulsePay.git
cd PulsePay
```

---

## Backend

```bash
cd server
npm install
npm run dev
```

Development backend:

```text
http://localhost:5000
```

---

## Seed Demo Data

From `server`:

```bash
npm run seed
```

This prepares the synthetic operational environment used by the dashboard and recovery workflows.

---

## Frontend

Open another terminal:

```bash
cd client
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

# 🧪 Testing

PulsePay includes automated backend coverage for the major system layers.

Validated areas include:

```text
Authentication
State Engine
Incident Engine
AI Investigator
Full Recovery Pipeline
Evidence Engine
Data Lab
Upgrade Services
Lab Services
Revenue Recovery
Recovery Benchmark
Recovery Calibration
```

The frontend production build is also validated separately.

---

# 🎬 Recommended Demo

For a short buildathon presentation:

### 1. Revenue Center

Start with:

* Revenue at Risk
* Net Value Added
* Recovery Precision
* Next Best Opportunity
* Safety metrics

Explain:

> "PulsePay does not retry everything. It prioritizes safe, economically valuable recovery."

### 2. Payment Investigation

Open a payment and show:

```text
Raw Probability
      ↓
Calibrated Probability
      ↓
Expected Value
      ↓
Strategy
      ↓
Safety
```

### 3. Counterfactuals

Show why the selected strategy beat the alternatives.

### 4. Execute

Run the synthetic recovery action and show the resulting outcome.

### 5. Recovery Mission

Run a bounded mission and show:

* opportunities analyzed
* actions attempted
* successful actions
* blocked actions
* actual recovery

### 6. Benchmark

Finish with:

```text
₹1.41 Cr Net Recovery
+21.0% Net Lift
0 Duplicate Charges
317 Unsafe Actions Prevented
96.0% Precision
100.0% Recall
```

---

# 🛠️ Engineering Principles

### Backend Owns Decisions

The frontend displays backend decisions rather than inventing them.

### AI Does Not Own Safety

ML produces probabilities; deterministic policies control execution.

### No Fake Execution

Mission results are based on backend processing rather than artificial progress.

### No Fabricated Metrics

Benchmark numbers come from the controlled evaluation.

### Evidence-Driven Explanations

Missing evidence should be reported as unavailable rather than invented.

### Bounded Automation

Recovery workflows operate within explicit limits.

### Idempotent Execution

Repeated requests should not accidentally create duplicate actions.

---

# 🚨 Failure Handling

PulsePay distinguishes between operational states such as:

```text
No Eligible Opportunity
Prediction Failure
Invalid Strategy
Safety Rejection
Execution Failure
Already Executed
```

The application surfaces human-readable errors rather than exposing raw backend stack traces.

If no opportunity is eligible, the system reports that state instead of fabricating a recovery opportunity.

---

# ⚠️ Limitations

PulsePay is a buildathon prototype, not a production payment platform.

### Synthetic Data

Current benchmark and demonstration data are synthetic.

### Simulated Recovery

Recovery execution is bounded and designed for controlled demonstration.

### Generalization

Benchmark performance does not guarantee equivalent performance across all real payment environments.

### Production Compliance

Real deployment would require additional regulatory, security, contractual, and provider-specific controls.

### Monitoring

Production use would require continuous model, calibration, feature, and system monitoring.

---

# 🏭 Future Roadmap

### Test-Mode Payment Integration

Connect PulsePay to payment-provider sandbox environments.

### Continuous Learning

Use verified recovery outcomes for model improvement.

### Calibration Monitoring

Detect when probability calibration begins to drift.

### Strategy Learning

Improve strategy ranking using observed outcomes.

### Policy Versioning

Track and audit changes to execution policies.

### Production Governance

Add:

* role-based access
* approval workflows
* stronger audit retention
* observability
* policy rollback
* advanced risk controls

---

# 🆚 PulsePay vs Blind Retry

| Capability                  | Blind Retry | PulsePay |
| --------------------------- | :---------: | :------: |
| Detect failure              |      ✅      |     ✅    |
| Recovery prediction         |      ❌      |     ✅    |
| Probability calibration     |      ❌      |     ✅    |
| Expected-value optimization |      ❌      |     ✅    |
| Strategy comparison         |      ❌      |     ✅    |
| Deterministic safety gates  |   Limited   |     ✅    |
| Duplicate protection        |   Limited   |     ✅    |
| Retry budget                |    Basic    |     ✅    |
| Counterfactual analysis     |      ❌      |     ✅    |
| Evidence-backed explanation |      ❌      |     ✅    |
| Bounded recovery workflow   |      ❌      |     ✅    |
| Outcome measurement         |    Basic    |     ✅    |
| Controlled benchmark        |      ❌      |     ✅    |

The difference is not simply:

```text
Rules vs AI
```

It is:

```text
Blind Action
     VS
Evidence-Driven Decision
```

---

# 🌐 Long-Term Vision

The broader vision is to build an intelligent financial decision layer where AI can reason about uncertain outcomes while deterministic systems maintain control over high-impact actions.

The reusable pattern is:

```text
Detect
  ↓
Predict
  ↓
Calibrate
  ↓
Optimize
  ↓
Protect
  ↓
Execute
  ↓
Measure
```

This architecture can extend beyond payment recovery to other financial operations where automated recommendations require strong execution boundaries.

---

# 🎤 60-Second Explanation

> **PulsePay is an evidence-driven AI revenue recovery system for failed payments. Instead of blindly retrying every failure, it estimates recovery probability, calibrates that probability, calculates expected net value, compares alternative recovery strategies, and then passes the recommendation through deterministic safety policies before execution. It records the actual outcome and benchmarks the complete system against blind retry. On a 10,000-record synthetic benchmark with a 7,000/3,000 train-evaluation split, PulsePay achieved ₹1.41 Cr net recovery versus ₹1.16 Cr for blind retry, producing a 21% net lift, with zero duplicate charges and 317 unsafe actions prevented.**

---

# 🏆 Key Results

<div align="center">

| Metric                      |           Result |
| --------------------------- | ---------------: |
| 💰 Net Recovery             | **₹1,40,64,879** |
| 📈 Net Value Added          |   **₹24,45,683** |
| 🚀 Net Lift                 |       **+21.0%** |
| 🎯 Recovery Precision       |        **96.0%** |
| 🔄 Recovery Recall          |       **100.0%** |
| 🛡️ Duplicate Charges       |            **0** |
| 🚫 Unsafe Actions Prevented |          **317** |
| 📐 Post-Calibration ECE     |        **14.8%** |
| 📊 Post-Calibration Brier   |       **0.1483** |

</div>

---

# 🔥 The PulsePay Formula

```text
Recoverability
      ↓
Recovery Probability
      ↓
Calibration
      ↓
Expected Net Value
      ↓
Strategy Optimization
      ↓
Safety Policies
      ↓
Bounded Execution
      ↓
Measured Outcome
```

### In one sentence:

> **Don't just retry the payment. Decide whether recovery is worth doing.**

---

# 🔒 Data & Safety Disclosure

PulsePay uses synthetic data for its buildathon demonstration and benchmark.

The reported benchmark results represent a controlled synthetic evaluation and are not production performance guarantees.

The recovery execution environment is bounded and designed for demonstration.

The architecture intentionally separates probabilistic ML recommendations from deterministic execution controls.

---

<div align="center">

# ⚡ PulsePay

### *Evidence-Driven Recovery*

### *Calibrated Intelligence*

### *Deterministic Control*

<br>

**Detect → Score → Calibrate → Optimize → Protect → Execute → Measure**

<br>

> **ML estimates probability.**
>
> **Deterministic policies control whether an action is allowed.**

<br>

### Built for the Razorpay AI Buildathon 2026 🚀

</div>
```
