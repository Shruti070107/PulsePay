````markdown
<h1 align="center">
  💳 PulsePay
</h1>

<div align="center">

### *Evidence-Driven AI Revenue Recovery & Payment Intelligence Platform*

<br>

> **Recover smarter. Execute safely. Measure every decision.**

<br>

![AI Revenue Recovery](https://img.shields.io/badge/AI-Revenue%20Recovery-2563EB?style=flat&logo=openai&logoColor=white)
![Calibrated ML](https://img.shields.io/badge/ML-Calibrated-7C3AED?style=flat)
![Evidence Driven](https://img.shields.io/badge/Decisioning-Evidence%20Driven-0284C7?style=flat)
![Deterministic Safety](https://img.shields.io/badge/Safety-Deterministic-059669?style=flat)
![Bounded Execution](https://img.shields.io/badge/Execution-Bounded-F59E0B?style=flat)
![Synthetic Benchmark](https://img.shields.io/badge/Data-Synthetic-64748B?style=flat)

![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![Scikit Learn](https://img.shields.io/badge/scikit--learn-F7931E?style=flat&logo=scikit--learn&logoColor=white)

</div>

---

## 🚨 The Problem

A failed payment does **not** automatically mean it should be retried.

A payment can fail because of a temporary gateway issue, an issuer-side problem, insufficient funds, an authentication issue, a permanent decline, a payment-state inconsistency, or other contextual conditions.

Treating every failure the same creates three major problems:

- 💸 **Lost revenue** — genuinely recoverable payments may never be recovered.
- 🔁 **Unnecessary retries** — low-value or permanently failed payments may be retried repeatedly.
- 🛡️ **Execution risk** — aggressive retrying can create duplicate-charge and other safety risks.

Traditional recovery often looks like:

```text
Payment Failed
      ↓
Retry
      ↓
Retry Again
      ↓
Retry Again
````

PulsePay changes the question from:

> **"Should we retry this payment?"**

to:

> **"Is this payment worth recovering, which intervention is best, and is that intervention safe to execute?"**

---

# 💡 What is PulsePay?

**PulsePay** is an AI-powered revenue recovery and payment intelligence platform designed to make payment recovery **evidence-driven, economically aware, and safety-controlled**.

The platform combines:

* 🧠 Machine-learning recovery scoring
* 📊 Probability calibration
* 💰 Expected-value optimization
* 🔀 Counterfactual strategy comparison
* 🛡️ Deterministic safety policies
* 🚀 Bounded recovery execution
* 📋 Evidence-driven explanations
* 🎯 Multi-opportunity Recovery Missions
* 📈 Outcome measurement
* 🧪 Controlled benchmark evaluation
* 🤖 Operations Copilot

Instead of treating AI as an unrestricted executor, PulsePay separates intelligence from execution authority.

```text
                    PAYMENT FAILURE
                           ↓
                  Revenue Risk Detection
                           ↓
                    ML Recovery Score
                           ↓
                 Probability Calibration
                           ↓
                    Expected Value
                           ↓
                 Strategy Comparison
                           ↓
                Deterministic Safety
                     ↙          ↘
                  BLOCK        ALLOW
                    ↓             ↓
                  AUDIT      Bounded Execution
                                  ↓
                              OUTCOME
                                  ↓
                             MEASUREMENT
```

### Core Principle

> **ML estimates probability. Deterministic policies control whether an action is allowed.**

---

# ✨ Core Features

## 🧠 AI-Powered Revenue Recovery

PulsePay uses machine learning to estimate how likely a failed payment opportunity is to be successfully recovered.

The system uses available payment evidence and operational context to generate a recovery probability.

```text
Payment + Failure Context + Telemetry
                  ↓
              ML Scoring
                  ↓
        Raw Recovery Probability
```

The raw probability is not immediately treated as an execution decision.

Instead, it moves through calibration and economic evaluation before the system considers an intervention.

### What the scoring layer provides

* Recovery probability estimation
* Opportunity prioritization
* Revenue-at-risk identification
* Payment-context analysis
* Failure-context analysis
* Recovery opportunity ranking
* Structured decision inputs
* Offline / deterministic fallback behavior

---

## 📊 Probability Calibration

A model saying:

```text
90% Recovery Probability
```

does not automatically mean that roughly 90 out of 100 comparable cases will recover.

If the model is systematically overconfident, using that probability directly for financial decisions can produce poor outcomes.

PulsePay therefore includes an explicit calibration stage.

```text
Raw ML Probability
        ↓
Isotonic Regression / PAVA
        ↓
Calibrated Probability
        ↓
Economic Decisioning
```

### Calibration Method

The authoritative benchmark uses:

**Isotonic Regression / Pool Adjacent Violators Algorithm (PAVA)**

Calibration performance is measured using:

* Expected Calibration Error
* Brier Score

This gives PulsePay a distinction between:

```text
Prediction Quality
        and
Probability Quality
```

---

## 💰 Expected-Value Optimization

Recovery probability alone is not enough.

A recovery action can have a high probability of success and still be economically unattractive.

PulsePay evaluates expected recovery value before execution.

A simplified representation is:

```text
Expected Value
=
Calibrated Recovery Probability
×
Recoverable Amount
−
Action Costs
```

For example:

```text
Recoverable Amount     = ₹10,000
Calibrated Probability = 70%

Expected Recovery
= ₹10,000 × 0.70
= ₹7,000
```

If the action cost is ₹500:

```text
Expected Net Value
= ₹7,000 − ₹500
= ₹6,500
```

If the expected value becomes non-positive:

```text
Expected Value <= 0
        ↓
      BLOCK
```

This makes PulsePay an economic decision system rather than a probability-only model.

---

## 🔀 Counterfactual Strategy Selection

PulsePay does not assume that one intervention is always the best intervention.

Possible strategies can include:

| Strategy                       | Purpose                                             |
| ------------------------------ | --------------------------------------------------- |
| 🔄 **Automated Gateway Retry** | Attempt recovery through the gateway                |
| 🔗 **Customer Recovery Link**  | Provide another recovery path to the customer       |
| 🔁 **Reconciliation**          | Resolve payment-state inconsistencies               |
| 🛑 **Halt Recovery**           | Stop when the opportunity is unsafe or uneconomical |

PulsePay evaluates available strategies using:

* Recovery probability
* Calibrated probability
* Expected value
* Action cost
* Safety state
* Policy constraints

The operator can therefore see not only:

> **Which strategy was selected?**

but also:

> **Why was it selected over the alternatives?**

---

## 🛡️ Deterministic Safety Layer

The safety layer is one of the core architectural components of PulsePay.

The ML system can recommend an action.

It cannot independently authorize that action.

```text
AI Recommendation
       ↓
Safety Policy Engine
       ↓
┌───────────────┐
│  SAFE TO RUN? │
└───────┬───────┘
        ↓
   ┌────┴────┐
   ↓         ↓
 BLOCK      ALLOW
   ↓         ↓
 STOP      EXECUTE
```

### Safety Controls

* 🛑 Permanent decline protection
* 🔁 Retry budget enforcement
* 🛡️ Duplicate charge protection
* 💰 Financial viability gate
* 🚨 Fraud / risk gate
* 🔐 Idempotency protection
* 🚧 Server-side execution limits
* 📋 Action auditing

This prevents:

```text
High Model Confidence
        ≠
Automatic Financial Execution
```

---

## 🚀 Bounded Recovery Execution

Approved recovery actions can be executed in a controlled synthetic environment.

Every action passes through a safety preflight.

```text
Recommendation
      ↓
Policy Validation
      ↓
Safety Preflight
      ↓
Execution Permission
      ↓
Bounded Execution
      ↓
Outcome
```

The backend remains authoritative over execution.

The frontend cannot simply bypass server-side recovery limits.

---

## 🎯 Recovery Mission

Recovery Mission allows multiple recovery opportunities to be processed through a controlled workflow.

Instead of manually investigating one payment at a time, operators can launch a bounded recovery mission.

```text
Recovery Opportunities
          ↓
    Opportunity Scan
          ↓
     Eligibility Check
          ↓
      Safety Policies
          ↓
    Approved Actions
          ↓
    Bounded Execution
          ↓
        Outcomes
```

### Mission Metrics

| Metric                      | Description                         |
| --------------------------- | ----------------------------------- |
| 💰 Revenue at Risk          | Total value considered for recovery |
| 📊 Expected Recovery        | Expected value before execution     |
| 💵 Actual Recovery          | Recovery observed after execution   |
| 🔎 Opportunities Analyzed   | Opportunities evaluated             |
| ⚡ Actions Attempted         | Actions actually attempted          |
| ✅ Successful Actions        | Successful recovery actions         |
| 🛑 Blocked Actions          | Actions rejected by policy          |
| 🚫 Unsafe Actions Prevented | Unsafe actions stopped              |
| 📋 Execution Outcomes       | Final action states                 |

---

## 🔍 Payment Investigation

PulsePay provides a dedicated **Payment Decision Record** for individual recovery opportunities.

Instead of showing an isolated model score, the investigation screen brings together the complete decision context.

### Payment Information

```text
Payment ID
Amount
Payment Status
Failure Code
Timestamp
```

### Decision Intelligence

```text
Raw ML Probability
        ↓
Calibrated Probability
        ↓
Expected Recovery Value
        ↓
Recommended Strategy
```

### Evidence

```text
Payment Context
Failure Context
Telemetry
Historical Signals
Decision Evidence
```

### Safety

```text
Permanent Decline Protection
Retry Budget
Duplicate Charge Protection
Financial Viability
Fraud / Risk Gate
Idempotency
```

### Execution

```text
Execution History
        ↓
Action Status
        ↓
Recovery Outcome
```

The result is an auditable decision record rather than an unexplained AI recommendation.

---

## 🧾 Evidence-Driven Explainability

PulsePay treats explainability as an evidence problem.

A decision should be traceable through the same pipeline that generated it.

```text
Payment
   ↓
Failure Context
   ↓
Telemetry
   ↓
ML Probability
   ↓
Calibration
   ↓
Expected Value
   ↓
Strategy
   ↓
Safety Checks
   ↓
Decision
```

The system is designed not to invent payment evidence simply to make a recommendation sound convincing.

When required information is unavailable, the system can represent it as unavailable.

---

## 🤖 Operations Copilot

PulsePay includes an operations-oriented Copilot for interacting with the platform's existing intelligence.

The Copilot can help operators understand:

* 💰 Revenue-at-risk opportunities
* 🔎 Payment decisions
* 🎯 Recovery outcomes
* 📊 Operational metrics
* 🧪 Benchmark results

The Copilot is not the financial execution authority.

```text
Operations Copilot
        ↓
PulsePay Intelligence
        ↓
Strategy / Policy Layer
        ↓
Bounded Execution
```

---

# 🧭 PulsePay Decision Pipeline

<div align="center">

<pre>
                     PAYMENT FAILURE
                            ↓
                  Revenue Risk Detection
                            ↓
                    Recovery Scoring
                            ↓
                 Probability Calibration
                            ↓
                    Expected Value
                            ↓
                 Strategy Comparison
                            ↓
                Deterministic Safety
                     ↙          ↘
                  BLOCK        ALLOW
                    ↓             ↓
                  AUDIT      Bounded Execution
                                  ↓
                              Outcome
                                  ↓
                             Measurement
</pre>

</div>

### The Seven Stages

| Stage            | Purpose                                          |
| ---------------- | ------------------------------------------------ |
| 🔎 **Detect**    | Identify potential revenue-at-risk opportunities |
| 🧠 **Score**     | Estimate recovery probability                    |
| 📊 **Calibrate** | Improve probability reliability                  |
| 💰 **Optimize**  | Evaluate economic value                          |
| 🛡️ **Protect**  | Apply deterministic safety controls              |
| 🚀 **Execute**   | Perform bounded approved actions                 |
| 📈 **Measure**   | Record actual outcomes                           |

---

# 🏆 Benchmark Results

PulsePay uses a controlled synthetic benchmark to evaluate both recovery effectiveness and execution safety.

<div align="center">

![Net Recovery](https://img.shields.io/badge/Net%20Recovered-%E2%82%B91.41%20Cr-059669?style=for-the-badge)
![Net Value](https://img.shields.io/badge/Net%20Value%20Added-%E2%82%B924.45%20L-2563EB?style=for-the-badge)
![Net Lift](https://img.shields.io/badge/Net%20Lift-+21.0%25-7C3AED?style=for-the-badge)
![Duplicate Charges](https://img.shields.io/badge/Duplicate%20Charges-0-059669?style=for-the-badge)
![Unsafe Prevented](https://img.shields.io/badge/Unsafe%20Actions%20Prevented-317-DC2626?style=for-the-badge)

</div>

<br>

| Metric                      |         PulsePay |  Blind Retry |
| --------------------------- | ---------------: | -----------: |
| 💰 Net Recovered Revenue    | **₹1,40,64,879** | ₹1,16,19,196 |
| 💵 Net Value Added          |   **₹24,45,683** |            — |
| 📈 Net Lift                 |       **+21.0%** |            — |
| 🎯 Recovery Precision       |        **96.0%** |            — |
| 🔎 Recovery Recall          |       **100.0%** |            — |
| 📊 ECE                      |        **14.8%** |        33.7% |
| 📐 Brier Score              |       **0.1483** |       0.2515 |
| 🛡️ Duplicate Charges       |            **0** |          583 |
| 🚫 Unsafe Actions Prevented |          **317** |            0 |

---

# 📐 Benchmark Configuration

The authoritative evaluation uses:

```text
Total Records       : 10,000
Training Records    : 7,000
Evaluation Records  : 3,000
Random Seed         : 20260826
Calibration         : Isotonic Regression / PAVA
```

The dataset is separated into training and evaluation records.

```text
                  10,000 Records
                        ↓
               ┌────────┴────────┐
               ↓                 ↓
          Training Set      Evaluation Set
             7,000               3,000
               ↓                 ↓
        Model / Calibration   Final Evaluation
```

The final benchmark is evaluated on the separate 3,000-record evaluation set.

---

# 📊 Calibration Performance

PulsePay evaluates whether its probability estimates are actually reliable.

| Metric                     | Before Calibration | After Calibration |
| -------------------------- | -----------------: | ----------------: |
| Expected Calibration Error |              33.7% |         **14.8%** |
| Brier Score                |             0.2515 |        **0.1483** |

The active benchmark uses **Isotonic Regression / PAVA**.

The purpose of calibration is to make model probabilities more suitable for downstream economic decisioning.

---

# 🛡️ Safety Performance

PulsePay evaluates safety independently from recovery performance.

### PulsePay

```text
Duplicate Charges       : 0
Unsafe Actions Prevented: 317
```

### Blind Retry

```text
Duplicate Charges       : 583
Unsafe Actions Prevented: 0
```

The goal is not:

> **"Perform as many retries as possible."**

The goal is:

> **"Recover useful revenue while preventing unsafe actions."**

---

# 💰 Economic Performance

PulsePay achieved:

```text
Net Recovered Revenue
₹1,40,64,879
```

The blind retry baseline achieved:

```text
₹1,16,19,196
```

Difference:

```text
₹24,45,683
```

Resulting net lift:

```text
+21.0%
```

This demonstrates the importance of combining recovery probability with economic decisioning.

---

# 🎯 Recovery Quality

PulsePay achieved:

### **96.0% Recovery Precision**

This measures the quality of identified recovery opportunities.

### **100.0% Recovery Recall**

This measures coverage of defined recoverable opportunities in the authoritative evaluation set.

These metrics are evaluated alongside economic performance and safety.

---

# 🆚 PulsePay vs Blind Retry

| Capability                  | Blind Retry | PulsePay |
| --------------------------- | :---------: | :------: |
| Revenue-at-risk detection   |      ❌      |     ✅    |
| Recovery probability        |      ❌      |     ✅    |
| Probability calibration     |      ❌      |     ✅    |
| Expected-value optimization |      ❌      |     ✅    |
| Strategy comparison         |      ❌      |     ✅    |
| Evidence-driven explanation |      ❌      |     ✅    |
| Deterministic safety        |      ❌      |     ✅    |
| Duplicate protection        |      ❌      |     ✅    |
| Retry budgets               |      ❌      |     ✅    |
| Bounded execution           |   Limited   |     ✅    |
| Outcome measurement         |   Limited   |     ✅    |
| Benchmark evaluation        |      ❌      |     ✅    |

### Traditional Approach

```text
Payment Failed
      ↓
Retry
```

### PulsePay Approach

```text
Payment Failed
      ↓
Understand Evidence
      ↓
Estimate Recoverability
      ↓
Calibrate Probability
      ↓
Calculate Expected Value
      ↓
Compare Strategies
      ↓
Apply Safety Policies
      ↓
Execute Within Limits
      ↓
Measure Actual Outcome
```

---

# 🧩 AI vs Deterministic Control

PulsePay intentionally separates probabilistic intelligence from deterministic execution authority.

| Capability                   | AI / ML | Deterministic |
| ---------------------------- | :-----: | :-----------: |
| Recovery probability         |    ✅    |               |
| Probability calibration      |    ✅    |               |
| Expected recovery            |    ✅    |               |
| Strategy ranking             |    ✅    |               |
| Evidence explanation         |    ✅    |               |
| Permanent decline protection |         |       ✅       |
| Duplicate protection         |         |       ✅       |
| Retry budget                 |         |       ✅       |
| Financial viability          |         |       ✅       |
| Fraud / risk gate            |         |       ✅       |
| Idempotency                  |         |       ✅       |
| Execution limits             |         |       ✅       |

This ensures:

```text
Model Confidence
      ≠
Execution Permission
```

---

# 🎨 Premium Fintech UI/UX

PulsePay is designed as a **financial operations console**, not a generic AI dashboard.

### Design Direction

* 🏦 Premium fintech visual language
* 🌑 Deep navy navigation
* ☀️ Clean light workspace
* 🔵 Strong blue primary actions
* 🟢 Semantic success states
* 🟠 Warning states
* 🔴 Safety and error states
* 📊 Dense financial data
* 🔎 Evidence-first decision views
* 📱 Responsive layouts
* 🎯 Clear operational hierarchy
* 🚫 No unnecessary AI-style visual clutter

### Main Application Areas

| Area                           | Purpose                                           |
| ------------------------------ | ------------------------------------------------- |
| 💳 **Revenue Center**          | Monitor revenue at risk and recovery performance  |
| 📋 **Recovery Queue**          | Prioritize and investigate recovery opportunities |
| 🔎 **Payment Investigation**   | Understand individual payment decisions           |
| 🎯 **Recovery Mission**        | Run bounded multi-opportunity recovery            |
| 🧪 **Experiments & Benchmark** | Evaluate recovery and ML performance              |
| 🤖 **Operations Copilot**      | Interact with payment intelligence                |

---

# 💳 Revenue Center

The Revenue Center is the operational command center of PulsePay.

It provides visibility into:

* Total recovered revenue
* Net value added
* Recovery precision
* Revenue at risk
* Action eligibility
* Recovery performance
* Safety and reliability
* Next best recovery opportunity

### Next Best Opportunity

Instead of showing only aggregate numbers, PulsePay surfaces an individual opportunity that can be investigated.

```text
Payment ID
Amount
Failure Code
Recovery Probability
Expected Value
Recommended Action
Safety State
```

This connects the platform's intelligence directly to an operational decision.

---

# 📋 Recovery Queue

The Recovery Queue provides a prioritized view of recovery opportunities.

Operators can inspect:

* Payment ID
* Payment amount
* Failure condition
* Recovery probability
* Expected value
* Recommended strategy
* Eligibility
* Decision state

The queue is designed for investigation and controlled recovery.

It is not intended to encourage blind mass retrying.

---

# 🔎 Payment Decision Record

Payment Investigation provides a structured decision record.

```text
Payment Details
      ↓
Telemetry
      ↓
Raw Probability
      ↓
Calibrated Probability
      ↓
Expected Value
      ↓
Recommended Strategy
      ↓
Evidence
      ↓
Safety Checks
      ↓
Execution History
```

This allows an operator to understand the complete path from payment failure to final action.

---

# 🎯 Recovery Mission

Recovery Mission provides a higher-level operational view of recovery execution.

A mission can show:

```text
Revenue at Risk
Expected Recovery
Actual Recovery
Opportunities Analyzed
Actions Attempted
Successful Actions
Blocked Actions
Unsafe Actions Prevented
```

The interface makes it possible to compare:

```text
Expected Recovery
       vs
Actual Recovery
```

This creates accountability after execution.

---

# 🧪 Experiments & Benchmark

The benchmark workspace provides a dedicated evaluation environment.

It focuses on:

* Economic recovery
* Recovery precision
* Recovery recall
* Probability calibration
* Safety behavior
* Baseline comparison

Live operational data is kept conceptually separate from the authoritative benchmark.

---

# 🌱 Synthetic Demo Environment

PulsePay is designed to be demonstrated without real payment traffic.

The project provides a synthetic demo seed workflow:

```bash
cd server
npm run seed
```

The seed process initializes operational demo data such as:

* Synthetic payment scenarios
* Failed payments
* Recovery opportunities
* Eligible opportunities
* Blocked opportunities
* Historical recovery actions
* Recovery outcomes

This allows the complete application to be demonstrated locally without real customer funds.

---

# 🔄 Complete Recovery Workflow

<div align="center">

<pre>
                       PAYMENT FAILURE
                              ↓
                    Evidence Collection
                              ↓
                  Revenue Risk Detection
                              ↓
                     Recovery Scoring
                              ↓
                  Probability Calibration
                              ↓
                    Expected Value
                              ↓
                  Strategy Comparison
                              ↓
                   Safety Preflight
                              ↓
                    ┌─────────┐
                    │  SAFE?  │
                    └────┬────┘
                       ↙   ↘
                   NO         YES
                   ↓           ↓
                 BLOCK      EXECUTE
                   ↓           ↓
                 AUDIT      OUTCOME
                               ↓
                           MEASURE
</pre>

</div>

---

# 🏗️ System Architecture

```text
                         ┌─────────────────────┐
                         │      React UI       │
                         │      + Vite         │
                         └──────────┬──────────┘
                                    │
                                    ↓
                         ┌─────────────────────┐
                         │   Node + Express    │
                         │      API Layer      │
                         └──────────┬──────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          ↓                         ↓                         ↓
   ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
   │   MongoDB    │          │ ML Service   │          │    Auth      │
   │   Payments   │          │ Python       │          │ JWT + bcrypt │
   └──────────────┘          │ FastAPI      │          └──────────────┘
                             └───────┬──────┘
                                     ↓
                            Recovery Intelligence
                                     │
              ┌──────────────────────┼──────────────────────┐
              ↓                      ↓                      ↓
       Scoring Engine        Strategy Engine        Policy Engine
              │                      │                      │
              └──────────────────────┼──────────────────────┘
                                     ↓
                              Recovery Simulator
                                     ↓
                              Recovery Executor
                                     ↓
                              Outcome Engine
                                     ↓
                                Audit Trail
```

---

# 🧠 ML Architecture

The ML service is separated from the operational backend.

```text
Node.js / Express
        ↓
Recovery Scoring Request
        ↓
Python / FastAPI
        ↓
ML Inference
        ↓
Raw Probability
        ↓
Calibration
        ↓
Calibrated Probability
        ↓
Economic Decisioning
```

This separation keeps machine-learning inference independent from payment execution logic.

---

# 🧱 Core Backend Services

PulsePay uses dedicated services for different parts of the recovery pipeline.

### Revenue Risk Engine

Identifies revenue-at-risk opportunities from payment state and available evidence.

### Recovery Scoring Engine

Produces raw recovery probability estimates.

### Recovery Calibration

Transforms raw model probabilities into calibrated probabilities.

### Recovery Strategy Engine

Compares available recovery interventions using probability and expected value.

### Recovery Policy Engine

Applies deterministic safety and execution policies.

### Recovery Simulator

Provides controlled strategy simulation.

### Recovery Executor

Executes approved synthetic recovery actions.

### Recovery Outcome Engine

Records actual recovery outcomes.

### Recovery Agent

Coordinates the recovery decision workflow.

### Recovery Evaluation Engine

Evaluates recovery and benchmark performance.

---

# 🗃️ Data Model

The recovery lifecycle can be represented as:

```text
                         PAYMENT
                            │
              ┌─────────────┼─────────────┐
              ↓             ↓             ↓
           Amount         Status      Failure Code
                            │
                            ↓
                         Telemetry
                            │
                            ↓
                  RECOVERY OPPORTUNITY
                            │
              ┌─────────────┼─────────────┐
              ↓             ↓             ↓
        Probability     Expected Value  Strategy
                            │
                            ↓
                       Safety State
                            │
                            ↓
                      RECOVERY ACTION
                            │
              ┌─────────────┼─────────────┐
              ↓             ↓             ↓
          Execution       Outcome       Audit
```

This keeps the decision lifecycle traceable from the original payment through execution.

---

# 🔐 Authentication & Security

PulsePay includes application-level authentication.

### Authentication Features

* 👤 User registration
* 🔑 Login
* 🔒 Protected operational routes
* 🎫 JWT authentication
* 🔐 bcrypt password hashing
* 🌐 Environment-based secrets

Passwords are hashed before storage.

Sensitive configuration is expected to be supplied through environment variables.

```text
User
 ↓
Login
 ↓
JWT
 ↓
Protected API
 ↓
Authenticated Session
```

---

# 🛠️ Tech Stack

<div align="center">

| Layer               | Technology                       |
| ------------------- | -------------------------------- |
| 🎨 Frontend         | React + Vite                     |
| 🎨 Styling          | CSS                              |
| ⚙️ Backend          | Node.js + Express                |
| 🗄️ Database        | MongoDB + Mongoose               |
| 🧠 ML Service       | Python + FastAPI                 |
| 📊 Machine Learning | Scikit-Learn                     |
| 📐 Calibration      | Isotonic Regression / PAVA       |
| 🔐 Authentication   | JWT + bcrypt                     |
| 🤖 AI               | Evidence-grounded AI integration |
| 🧪 Simulation       | Controlled Synthetic Recovery    |
| 📈 Evaluation       | Recovery Benchmark Engine        |

</div>

---

# 📁 Project Structure

```text
PulsePay/
│
├── client/
│   ├── src/
│   │   ├── api/
│   │   │   └── index.js
│   │   │
│   │   ├── components/
│   │   │   ├── HowItWorksModal.jsx
│   │   │   └── ...
│   │   │
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── RecoveryQueue.jsx
│   │   │   ├── PaymentRecoveryDetail.jsx
│   │   │   ├── RecoveryMission.jsx
│   │   │   ├── RecoveryBenchmark.jsx
│   │   │   ├── Copilot.jsx
│   │   │   └── ...
│   │   │
│   │   ├── App.jsx
│   │   └── index.css
│   │
│   └── package.json
│
├── server/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   │
│   ├── services/
│   │   ├── recovery/
│   │   │   ├── revenueRiskEngine.js
│   │   │   ├── recoveryScoringEngine.js
│   │   │   ├── recoveryStrategyEngine.js
│   │   │   ├── recoveryPolicyEngine.js
│   │   │   ├── recoverySimulator.js
│   │   │   ├── recoveryExecutor.js
│   │   │   └── recoveryOutcomeEngine.js
│   │   │
│   │   ├── demoSeedService.js
│   │   └── ...
│   │
│   ├── tests/
│   ├── seed.js
│   └── package.json
│
├── ml/
│   └── app/
│
├── docs/
│   └── screenshots/
│
├── .env.example
├── .gitignore
└── README.md
```

---

# 🚀 Getting Started

## 📋 Prerequisites

Before running PulsePay, make sure you have:

* Node.js
* npm
* MongoDB
* Python 3.x
* Modern web browser

---

## ⚙️ Installation

```bash
# 1. Clone the repository
git clone https://github.com/Shruti070107/PulsePay.git

# 2. Enter the project
cd PulsePay

# 3. Install backend dependencies
cd server
npm install

# 4. Install frontend dependencies
cd ../client
npm install
```

---

# 🌱 Seed the Demo Environment

From the server directory:

```bash
cd server
npm run seed
```

The seed process creates the synthetic operational environment required for demonstration.

It initializes:

* Payment scenarios
* Recovery opportunities
* Eligible opportunities
* Blocked opportunities
* Historical actions
* Recovery outcomes

---

# 🔐 Environment Setup

Create the appropriate environment configuration for the backend.

Example:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/pulsepay
JWT_SECRET=your-secret-key
ML_SERVICE_URL=http://127.0.0.1:8000
AI_API_KEY=your-api-key
```

> ⚠️ **Never commit real secrets, API keys, JWT secrets, or production payment credentials.**

---

# ▶️ Running PulsePay

### 1. Start MongoDB

Make sure your local MongoDB instance is running.

### 2. Start the ML Service

```bash
uvicorn app.main:app --reload --port 8000
```

### 3. Seed Demo Data

```bash
cd server
npm run seed
```

### 4. Start the Backend

```bash
npm run dev
```

### 5. Start the Frontend

Open another terminal:

```bash
cd client
npm run dev
```

Then open the local URL displayed by Vite.

---

# 🧪 Testing

PulsePay includes backend tests for the major intelligence and recovery components.

Run:

```bash
cd server
npm test
```

Major test areas include:

```text
✓ Authentication
✓ State Engine
✓ Incident Engine
✓ AI Investigation
✓ Evidence Engine
✓ Data Lab
✓ Lab Service
✓ Revenue Recovery
✓ Recovery Strategy
✓ Recovery Execution
✓ Recovery Benchmark
✓ Recovery Calibration
```

---

# 🏭 Frontend Production Build

To generate the production frontend bundle:

```bash
cd client
npm run build
```

The build verifies that the frontend compiles successfully for production deployment.

---

# 📸 Screenshots

## 💳 Revenue Center

Add the final Revenue Center screenshot:

```text
docs/screenshots/revenue-center.png
```

The screen should demonstrate:

* Revenue at Risk
* Recovery Performance
* Next Best Opportunity
* Recovery KPIs
* Safety metrics

---

## 📋 Recovery Queue

```text
docs/screenshots/recovery-queue.png
```

Demonstrates:

* Recovery opportunities
* Payment amounts
* Recovery probabilities
* Expected values
* Recommended strategies
* Eligibility state

---

## 🔎 Payment Investigation

```text
docs/screenshots/payment-investigation.png
```

Demonstrates:

* Payment Decision Record
* Raw probability
* Calibrated probability
* Expected value
* Evidence
* Strategy comparison
* Safety checks
* Execution history

---

## 🎯 Recovery Mission

```text
docs/screenshots/recovery-mission.png
```

Demonstrates:

* Mission configuration
* Opportunities analyzed
* Expected recovery
* Actual recovery
* Actions attempted
* Successful actions
* Blocked actions
* Safety events

---

## 🧪 Benchmark

```text
docs/screenshots/benchmark.png
```

Demonstrates:

* Net recovery
* Net lift
* Precision
* Recall
* Calibration
* Safety comparison
* Blind Retry baseline

---

# 🧑‍💻 Recommended Demo Flow

For a buildathon presentation, the complete application can be demonstrated in the following order.

### 1️⃣ Login

Start from the authenticated operational environment.

### 2️⃣ Revenue Center

Show the high-level recovery situation.

Focus on:

```text
Revenue at Risk
Recovery Performance
Next Best Opportunity
```

### 3️⃣ Investigate

Open a payment opportunity.

Show:

```text
Raw Probability
        ↓
Calibrated Probability
        ↓
Expected Value
        ↓
Recommended Strategy
```

### 4️⃣ Explain

Show the evidence behind the decision.

### 5️⃣ Compare

Show the alternative strategies and explain why one was selected.

### 6️⃣ Protect

Show the deterministic safety checks.

### 7️⃣ Execute

Run a controlled synthetic recovery.

### 8️⃣ Mission

Run a bounded recovery mission across multiple opportunities.

### 9️⃣ Benchmark

Finish with the measured benchmark results.

```text
₹1.41 Cr Net Recovered
+21.0% Net Lift
₹24.45 L Additional Net Value
0 Duplicate Charges
317 Unsafe Actions Prevented
96.0% Precision
100.0% Recall
```

---

# 🧭 Product Workflow

```text
              PAYMENT FAILURE
                     ↓
             Detect Opportunity
                     ↓
              Score Recovery
                     ↓
               Calibrate
                     ↓
             Calculate EV
                     ↓
          Compare Strategies
                     ↓
            Safety Preflight
                     ↓
              ┌──────┴──────┐
              ↓             ↓
            BLOCK         ALLOW
              ↓             ↓
            Audit       Execute
                            ↓
                         Outcome
                            ↓
                        Measure
```

---

# 💎 Quality Standards

PulsePay is built around production-oriented engineering principles.

### 🧠 Intelligence

* Evidence-driven recovery scoring
* Calibrated probability
* Expected-value optimization
* Counterfactual strategy analysis

### 🛡️ Safety

* Deterministic policy controls
* Duplicate protection
* Retry budgets
* Financial viability gates
* Idempotency
* Server-side execution limits

### 📋 Auditability

* Structured payment decisions
* Evidence records
* Safety checks
* Execution history
* Recovery outcomes

### 🧪 Evaluation

* Fixed benchmark configuration
* Train/evaluation separation
* Economic metrics
* Recovery metrics
* Calibration metrics
* Safety metrics

### 🎨 Product Quality

* Premium fintech UI
* Responsive layouts
* Clear operational hierarchy
* Accessible visual states
* Minimal unnecessary UI
* Backend-authoritative decisions

---

# ⚠️ Failure Handling

PulsePay is designed to fail safely.

### Model Failure

```text
Model Failure
     ↓
Safe Fallback
     ↓
No Unsafe Execution
```

### Policy Failure

```text
Policy Failure
     ↓
BLOCK
     ↓
AUDIT
```

### Execution Failure

```text
Execution Failure
     ↓
Record Outcome
     ↓
Expose Failure
```

### Missing Evidence

```text
Missing Evidence
     ↓
Report Unavailable
```

### Invalid Action

```text
Invalid Action
     ↓
Reject
```

The objective is not to hide failures.

It is to prevent failures from turning into unsafe financial actions.

---

# 🌍 Data & Safety Disclosure

PulsePay uses **synthetic and controlled data** for its buildathon demonstration.

The platform does not require real customer payment credentials or live customer funds.

Recovery actions are executed inside a controlled synthetic environment.

Benchmark results represent controlled evaluation results and should not be interpreted as guarantees of production revenue recovery.

---

# ⚠️ Limitations

PulsePay is a buildathon-scale prototype.

A production deployment would require additional engineering in several areas.

### 💳 Payment Provider Integration

Production deployment would require:

* Provider-specific adapters
* Real payment webhooks
* Provider-specific failure semantics
* Production reconciliation
* Provider-specific recovery policies

### 🧠 ML Operations

Production ML would require:

* Model monitoring
* Calibration monitoring
* Drift detection
* Distribution-shift detection
* Retraining pipelines
* Merchant-specific evaluation

### 🔐 Security

Production deployment would require:

* Stronger authorization
* Role-based access control
* Production secret management
* Infrastructure hardening
* Security monitoring
* Long-term audit retention

### 💰 Financial Controls

Production recovery would require:

* Merchant-level limits
* Approval workflows
* Action-level permissions
* Rollout controls
* Compliance processes

---

# 🔮 Roadmap

## Phase 1 — Current Build

* [x] Revenue Risk Detection
* [x] ML Recovery Scoring
* [x] Probability Calibration
* [x] Expected-Value Optimization
* [x] Counterfactual Strategy Comparison
* [x] Deterministic Safety
* [x] Bounded Recovery Execution
* [x] Payment Investigation
* [x] Recovery Mission
* [x] Benchmark Evaluation
* [x] Authentication
* [x] Operations Copilot
* [x] Synthetic Demo Environment

---

## Phase 2 — Payment Provider Integration

* [ ] Payment-provider adapters
* [ ] Real webhook streams
* [ ] Provider-specific recovery policies
* [ ] Production reconciliation
* [ ] Production execution APIs
* [ ] Provider-specific failure intelligence

---

## Phase 3 — Adaptive Intelligence

* [ ] Merchant-specific calibration
* [ ] Continuous outcome learning
* [ ] Model drift monitoring
* [ ] Distribution-shift detection
* [ ] Adaptive strategy optimization
* [ ] Recovery policy experimentation

---

## Phase 4 — Enterprise Controls

* [ ] Role-based approvals
* [ ] Merchant-level policies
* [ ] Experiment governance
* [ ] Advanced audit retention
* [ ] Compliance workflows
* [ ] Enterprise observability

---

# 🔭 Long-Term Vision

The long-term vision is to build a closed-loop payment recovery intelligence system.

```text
                    PAYMENT EVENTS
                          ↓
                       EVIDENCE
                          ↓
                      PREDICTION
                          ↓
                     CALIBRATION
                          ↓
                    ECONOMIC VALUE
                          ↓
                       STRATEGY
                          ↓
                        SAFETY
                          ↓
                      EXECUTION
                          ↓
                       OUTCOME
                          ↓
                     MEASUREMENT
                          ↓
                       LEARNING
                          │
                          └──────────────┐
                                         ↓
                                Better Decisions
```

The goal is not simply to create a smarter retry button.

The goal is to create a recovery system where:

**predictions inform decisions, decisions are constrained by safety, executions create measurable outcomes, and outcomes improve future recovery intelligence.**

---

# 🏆 Buildathon Positioning

PulsePay is designed for the **AI Revenue Recovery** problem.

The system demonstrates the complete revenue recovery loop:

```text
Revenue at Risk
      ↓
Recovery Probability
      ↓
Probability Calibration
      ↓
Expected Value
      ↓
Intervention Selection
      ↓
Safety Validation
      ↓
Bounded Execution
      ↓
Measured Recovery
```

The benchmark then evaluates whether that intelligence produces measurable economic improvement while maintaining execution safety.

---

# 🎤 One-Minute Pitch

> **Every failed payment is not a retry opportunity.**
>
> PulsePay is an evidence-driven AI revenue recovery platform that determines which failed payments are worth recovering, estimates their recovery probability, calibrates that probability, compares recovery strategies using expected economic value, and applies deterministic safety policies before allowing bounded execution.
>
> On our authoritative 10,000-record synthetic benchmark, PulsePay achieved **₹1.41 crore in net recovered revenue compared with ₹1.16 crore for blind retry**, producing **₹24.45 lakh in additional net value and a 21.0% net lift**.
>
> At the same time, PulsePay recorded **zero duplicate charges** and prevented **317 unsafe actions**.
>
> The core idea is:
>
> **ML estimates probability. Deterministic policies control execution.**

---

# 🧠 The Core Idea

PulsePay can ultimately be summarized as:

```text
Recoverability
      ↓
Probability
      ↓
Calibration
      ↓
Net Expected Value
      ↓
Strategy
      ↓
Safety Invariants
      ↓
Bounded Execution
      ↓
Measured Outcome
```

Or simply:

> **Detect → Score → Calibrate → Optimize → Protect → Execute → Measure**

---

# 🤝 Contributing

Contributions are welcome.

```bash
# Fork the repository

# Create a feature branch
git checkout -b feature-name

# Make your changes

# Commit your changes
git commit -m "Add feature"

# Push the branch
git push origin feature-name

# Open a Pull Request
```

---

# 📄 License

This project is open source.

See `LICENSE` for details.

---

<div align="center">

# 💳 PulsePay

### *Evidence-Driven AI Revenue Recovery*

<br>

💰 **₹1.41 Cr Net Recovered**

📈 **+21.0% Net Lift**

💵 **₹24.45 L Additional Net Value**

🛡️ **0 Duplicate Charges**

🚫 **317 Unsafe Actions Prevented**

🎯 **96.0% Precision**

🔎 **100.0% Recall**

<br>

---

### **Detect smarter · Recover safer · Measure everything**

<br>

Built for the **Razorpay AI Buildathon 2026** 🚀

<br>

**ML estimates probability.
Deterministic policies control execution.**

</div>
```
