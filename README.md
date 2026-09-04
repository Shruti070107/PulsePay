# ⚡ PulsePay

<p align="center">
  <strong>Evidence-Driven AI Revenue Recovery & Payment Intelligence</strong>
</p>

<p align="center">
  <em>Recover more revenue without blindly increasing retry volume.</em>
</p>

<p align="center">
  <a href="#overview">Overview</a> ·
  <a href="#how-it-works">How It Works</a> ·
  <a href="#benchmark">Benchmark</a> ·
  <a href="#demo">Demo</a> ·
  <a href="#setup">Setup</a>
</p>

<p align="center">
  <a href="#core-intelligence"><img src="https://img.shields.io/badge/AI-Revenue%20Recovery-2563EB?style=for-the-badge" alt="AI Revenue Recovery"></a>
  <a href="#probability-calibration"><img src="https://img.shields.io/badge/ML-Calibrated-059669?style=for-the-badge" alt="Calibrated ML"></a>
  <a href="#expected-value"><img src="https://img.shields.io/badge/Optimization-Economic%20Value-D97706?style=for-the-badge" alt="Economic Optimization"></a>
  <a href="#safety-and-execution"><img src="https://img.shields.io/badge/Safety-Deterministic-DC2626?style=for-the-badge" alt="Deterministic Safety"></a>
  <a href="#safety-and-execution"><img src="https://img.shields.io/badge/Execution-Bounded-0284C7?style=for-the-badge" alt="Bounded Execution"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-Frontend-61DAFB?logo=react&logoColor=111827" alt="React">
  <img src="https://img.shields.io/badge/Vite-Build-646CFF?logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Node.js-Backend-339933?logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Express-API-000000?logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/MongoDB-Data-47A248?logo=mongodb&logoColor=white" alt="MongoDB">
  <img src="https://img.shields.io/badge/FastAPI-ML%20Service-009688?logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/scikit--learn-Calibration-F7931E?logo=scikit-learn&logoColor=white" alt="scikit-learn">
</p>

<br>

<p align="center">
  <strong>Measured benchmark outcomes</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/₹1.41%20Cr-Net%20Recovery-2563EB?style=for-the-badge" alt="₹1.41 Cr net recovery">
  <img src="https://img.shields.io/badge/+21.0%25-Net%20Lift-059669?style=for-the-badge" alt="+21.0% net lift">
  <img src="https://img.shields.io/badge/₹24.45%20L-Incremental%20Value-D97706?style=for-the-badge" alt="₹24.45 L incremental value">
  <img src="https://img.shields.io/badge/0-Duplicate%20Charges-059669?style=for-the-badge" alt="0 duplicate charges">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/317-Unsafe%20Actions%20Prevented-DC2626?style=for-the-badge" alt="317 unsafe actions prevented">
  <img src="https://img.shields.io/badge/96.0%25-Recovery%20Precision-0284C7?style=for-the-badge" alt="96.0% recovery precision">
  <img src="https://img.shields.io/badge/100.0%25-Recovery%20Recall-0284C7?style=for-the-badge" alt="100.0% recovery recall">
  <img src="https://img.shields.io/badge/14.8%25-ECE-64748B?style=for-the-badge" alt="14.8% ECE">
</p>

---

## The idea in 30 seconds

A failed payment does **not** automatically mean lost revenue.

The hard problem is deciding:

> **What should happen next, why is it valuable, and is it safe to execute?**

PulsePay treats payment recovery as a **decision optimization problem**, not a retry queue.

It combines machine-learning probability, probability calibration, expected-value analysis, counterfactual strategy comparison, deterministic safety policies, bounded execution, and outcome measurement.

```text
Payment Failure
      ↓
Revenue Risk Detection
      ↓
Raw ML Probability
      ↓
Probability Calibration
      ↓
Expected Net Value
      ↓
Strategy Comparison
      ↓
Deterministic Safety Gates
      ↓
Bounded Execution
      ↓
Measured Outcome
```

> **ML estimates probability. Deterministic policies control whether an action is allowed.**

---

## Benchmark at a glance

| Metric | PulsePay |
|---|---:|
| Net recovery | **₹1,40,64,879** |
| Incremental net value | **₹24,45,683** |
| Net lift vs blind retry | **+21.0%** |
| Recovery precision | **96.0%** |
| Recovery recall | **100.0%** |
| Duplicate charges | **0** |
| Unsafe actions prevented | **317** |
| Evaluation records | **3,000** |

**Baseline:** blind retry produced **₹1,16,19,196** net recovery on the same authoritative benchmark.

> These results come from a controlled synthetic benchmark and should not be interpreted as production performance.

---

# Table of Contents

- [Overview](#overview)
- [The Problem](#the-problem)
- [Why Blind Retry Is Not Enough](#why-blind-retry-is-not-enough)
- [How It Works](#how-it-works)
- [Core Intelligence](#core-intelligence)
  - [Revenue Risk Detection](#revenue-risk-detection)
  - [Recovery Scoring](#recovery-scoring)
  - [Probability Calibration](#probability-calibration)
  - [Expected Value](#expected-value)
  - [Strategy Selection](#strategy-selection)
- [Safety and Execution](#safety-and-execution)
- [AI vs Deterministic Control](#ai-vs-deterministic-control)
- [Explainability and Decision Trace](#explainability-and-decision-trace)
- [Product Experience](#product-experience)
  - [Revenue Center](#revenue-center)
  - [Recovery Queue](#recovery-queue)
  - [Payment Investigation](#payment-investigation)
  - [Recovery Mission](#recovery-mission)
  - [Experiments and Benchmark](#experiments-and-benchmark)
  - [Operations Copilot](#operations-copilot)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [ML Architecture](#ml-architecture)
- [Data Model](#data-model)
- [Authentication and Security](#authentication-and-security)
- [Benchmark](#benchmark)
- [Benchmark Methodology](#benchmark-methodology)
- [Benchmark Results](#benchmark-results)
- [Economic Results](#economic-results)
- [Calibration Results](#calibration-results)
- [Safety Results](#safety-results)
- [Live Operations vs Benchmark](#live-operations-vs-benchmark)
- [Demo](#demo)
- [Setup](#setup)
- [Environment Configuration](#environment-configuration)
- [Running PulsePay](#running-pulsepay)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Engineering Principles](#engineering-principles)
- [Limitations](#limitations)
- [Production Considerations](#production-considerations)
- [Roadmap](#roadmap)
- [Why PulsePay](#why-pulsepay)
- [Final Takeaway](#final-takeaway)

---

# Overview

PulsePay is an **evidence-driven AI revenue recovery system** for failed payments.

Instead of treating every failed payment as an automatic retry candidate, PulsePay evaluates the payment as a decision:

```text
Can it be recovered?
        ↓
How likely is recovery?
        ↓
How reliable is that probability?
        ↓
Which action has the best expected value?
        ↓
Is that action safe and allowed?
        ↓
What happened after execution?
```

The result is a closed decision loop:

**Detect → Score → Calibrate → Optimize → Protect → Execute → Measure**

The architecture deliberately separates probabilistic intelligence from deterministic financial controls.

---

# The Problem

Failed payments create revenue leakage, but recovery attempts are not free.

A recovery action can have:

- a probability of success,
- a recoverable amount,
- an execution cost,
- customer-experience implications,
- duplicate-charge risk,
- retry limits,
- payment-state constraints,
- and policy restrictions.

A simple recovery system might do this:

```text
Payment Failed
      ↓
Retry
      ↓
Retry Again
      ↓
Notify Customer
```

That can increase recovery attempts without necessarily maximizing **net recovered value**.

PulsePay asks a more useful question:

> **Which action should be taken for this payment, given its probability, economics, alternatives, and safety constraints?**

---

# Why Blind Retry Is Not Enough

Blind retry assumes that more attempts are a reasonable proxy for more recovery.

PulsePay treats recovery differently:

| Blind Retry | PulsePay |
|---|---|
| Retry failed payments | Evaluate recoverability |
| Fixed or repetitive action | Compare candidate strategies |
| Raw confidence | Calibrated probability |
| Retry-centric | Economic-value-centric |
| Action after prediction | Policy authorization after prediction |
| Limited controls | Explicit deterministic safety gates |
| More attempts | Bounded execution |
| Measure activity | Measure recovery outcomes |

The benchmark is therefore not designed merely to show that PulsePay can execute retries.

It asks whether a decision-oriented approach can produce **more net value while preventing unsafe actions**.

---

# How It Works

PulsePay's core pipeline is:

```text
┌──────────────────────────┐
│     Payment Failure      │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│ Revenue Risk Detection   │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│ Raw ML Recovery          │
│ Probability              │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│ Probability Calibration  │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│ Expected Net Value       │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│ Strategy Ranking &       │
│ Counterfactual Analysis  │
└────────────┬─────────────┘
             ↓
      ┌──────┴──────┐
      ↓             ↓
┌───────────┐  ┌────────────┐
│  Safety   │  │   Block    │
│   Gates   │  │  + Audit   │
└─────┬─────┘  └────────────┘
      ↓
┌──────────────────────────┐
│ Bounded Execution        │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│ Outcome Measurement      │
└──────────────────────────┘
```

The key design boundary is:

```text
Probabilistic layer
        ↓
"How likely / how valuable?"
        ↓
Deterministic policy layer
        ↓
"Is this action allowed?"
        ↓
Execution layer
```

---

# Core Intelligence

## Revenue Risk Detection

PulsePay scans payment telemetry to identify opportunities where failed payments may represent recoverable revenue.

An opportunity can carry:

- payment ID,
- amount,
- failure information,
- payment context,
- recovery probability,
- calibrated probability,
- expected value,
- recommended strategy,
- policy state,
- evidence,
- execution state.

The detection layer feeds the downstream decision engines rather than directly executing actions.

---

## Recovery Scoring

The recovery scoring layer estimates the likelihood that an opportunity can be recovered.

The important distinction is between:

```text
Raw ML probability
```

and:

```text
Calibrated probability
```

The raw score is useful for ranking, but a probability should also be evaluated for how well it corresponds to observed outcomes.

---

## Probability Calibration

PulsePay's active benchmark calibration method is:

> **Isotonic Regression / PAVA**

Conceptually:

```text
Raw Model Output
       ↓
Calibration Function
       ↓
Calibrated Probability
```

This matters because a model can be good at ranking payments while still being overconfident or underconfident.

PulsePay evaluates calibration using:

- Expected Calibration Error (ECE)
- Brier Score

The benchmark uses an out-of-sample evaluation set.

---

## Expected Value

Recovery probability alone does not determine the best action.

PulsePay combines probability with economic context to estimate expected net value.

Conceptually:

```text
Expected Value
≈
Calibrated Probability
×
Recoverable Amount
−
Relevant Action Costs
```

The actual decision is handled by the recovery economic/strategy layer.

This creates an important behavior:

> A lower-probability action can be preferable if it produces higher expected net value.

And the reverse is also true:

> A high-probability action can still be rejected if its economics or policy constraints are unfavorable.

---

## Strategy Selection

PulsePay evaluates candidate recovery strategies rather than assuming retry is always the answer.

A decision can be represented as:

```text
Strategy A
High probability
Positive EV
Allowed
      │
      ├─────────────── Selected
      │
Strategy B
Moderate probability
Lower EV
Allowed
      │
      └─────────────── Not selected

Strategy C
Negative / zero EV
Blocked
```

The strategy engine provides the economic comparison.

The policy engine retains final authorization authority.

---

# Safety and Execution

Financial automation requires stronger controls than a typical recommendation system.

PulsePay therefore applies deterministic safety checks before execution.

## Duplicate Charge Protection

The execution path prevents recovery workflows from blindly creating duplicate charges.

In the authoritative benchmark:

- PulsePay: **0 duplicate charges**
- Blind retry: **583 duplicate charges**

---

## Retry Budget

Recovery attempts are bounded.

A payment should not remain in an uncontrolled retry loop simply because the model continues to produce a favorable score.

---

## Permanent Decline Protection

Certain payment states should not be repeatedly retried.

The deterministic policy layer can block such actions before execution.

---

## Financial Viability Gate

If an action is not economically viable, it should not be executed solely because its probability is high.

Conceptually:

```text
Expected Value ≤ 0
        ↓
      BLOCK
```

---

## Idempotency

Recovery execution includes controls intended to prevent repeated execution of the same action.

---

## Bounded Execution

Recovery missions enforce server-side execution limits.

The frontend cannot simply decide to execute an unlimited number of actions.

This makes the automation boundary explicit:

```text
Decision
   ↓
Policy
   ↓
Server-side limit
   ↓
Execution
   ↓
Audit
```

---

# AI vs Deterministic Control

PulsePay intentionally does not give a generative AI model unrestricted authority over financial execution.

| Layer | Purpose | Control |
|---|---|---|
| Recovery scoring | Estimate probability | Probabilistic |
| Calibration | Improve probability reliability | Statistical |
| Expected value | Estimate economic value | Economic model |
| Strategy engine | Compare actions | Optimization |
| Permanent-decline protection | Prevent prohibited action | Deterministic |
| Duplicate protection | Prevent duplicate charge | Deterministic |
| Retry budget | Limit attempts | Deterministic |
| Financial viability | Reject negative-value action | Deterministic |
| Idempotency | Prevent repeated execution | Deterministic |
| Evidence grounding | Keep explanations evidence-based | Deterministic |

This is the core safety philosophy:

> **The model recommends. The policy layer authorizes.**

---

# Explainability and Decision Trace

PulsePay is designed to make the path from payment evidence to action inspectable.

For an individual payment, the decision trace is:

```text
Payment
  ↓
Observed Telemetry
  ↓
Raw ML Probability
  ↓
Calibrated Probability
  ↓
Expected Value
  ↓
Candidate Strategies
  ↓
Selected Strategy
  ↓
Safety Checks
  ↓
Execution
  ↓
Outcome
```

The explanation layer distinguishes between:

**Evidence** — observed payment/telemetry facts.

**Model inference** — probabilistic output.

**Economic reasoning** — expected-value calculations.

**Policy decision** — deterministic allow/block result.

This prevents the explanation layer from inventing unsupported reasons.

---

# Product Experience

## Revenue Center

The operational overview provides a concise view of:

- total recovered revenue,
- net value added,
- recovery precision,
- revenue at risk,
- eligible opportunities,
- next best opportunity,
- recovery performance,
- safety and reliability.

The **Next Best Opportunity** section connects the dashboard directly to an actionable decision.

---

## Recovery Queue

The Recovery Queue provides a prioritized operational view of recovery opportunities.

Operators can inspect:

- payment context,
- recommended strategy,
- expected value,
- policy state,
- and investigation details.

The queue is intentionally focused on individual decisions rather than turning recovery into a bulk-action checklist.

---

## Payment Investigation

Payment Investigation presents a **Payment Decision Record**.

It brings together:

```text
Payment Details
      ↓
Telemetry
      ↓
PulsePay Decision
      ↓
Raw Probability
      ↓
Calibrated Probability
      ↓
Expected Recovery Value
      ↓
Recommended Strategy
      ↓
Alternative Strategies
      ↓
Safety Checks
      ↓
Execution History
```

This is the primary surface for understanding *why* PulsePay made a particular decision.

---

## Recovery Mission

Recovery Mission closes the loop between analysis and execution.

A mission:

1. scans available opportunities,
2. evaluates them,
3. applies strategy logic,
4. applies safety gates,
5. executes authorized actions,
6. records outcomes,
7. summarizes economic performance.

Mission reporting can include:

- revenue at risk,
- expected recovery,
- actual recovery,
- actions attempted,
- successful actions,
- blocked actions,
- unsafe actions prevented,
- action-level outcomes.

The mission uses backend workflow state rather than artificial progress timers.

---

## Experiments and Benchmark

The benchmark surface is intentionally separate from operational demo data.

It provides visibility into:

- benchmark configuration,
- methodology,
- baseline comparison,
- economic performance,
- recovery metrics,
- calibration,
- safety results.

This makes the evaluation easier to inspect and reproduce.

---

## Operations Copilot

Operations Copilot provides a natural-language operational layer over PulsePay's existing capabilities.

It is intended to help operators inspect recovery information and understand system state without replacing the deterministic decision pipeline.

The copilot does not become the authority for financial execution.

---

# Architecture

PulsePay uses a full-stack architecture with a dedicated ML service.

```text
                         ┌─────────────────────┐
                         │    React / Vite     │
                         │   Operations UI     │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   Node / Express    │
                         │   API + Controllers │
                         └──────┬────────┬─────┘
                                │        │
                    ┌───────────┘        └────────────┐
                    ▼                                 ▼
          ┌──────────────────┐              ┌──────────────────┐
          │     MongoDB      │              │   FastAPI / ML   │
          │ Payments         │              │ Scoring / ML     │
          │ Opportunities    │              │ Inference        │
          │ Actions / Audit  │              └──────────────────┘
          └──────────────────┘
```

The backend separates:

```text
Controllers
    ↓
Domain Services
    ↓
Decision Engines
    ↓
Policy / Safety
    ↓
Execution
    ↓
Outcome
    ↓
Persistence
```

This prevents critical decision logic from being buried inside HTTP controllers.

---

# Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React |
| Build | Vite |
| Backend | Node.js + Express |
| Database | MongoDB |
| ML service | FastAPI |
| ML / calibration | Python + scikit-learn |
| Authentication | JWT + bcrypt |
| Testing | Jest / backend test suites |
| Styling | Custom CSS design system |

---

# ML Architecture

The ML and decisioning flow is intentionally modular.

```text
Payment Features
      ↓
Revenue Risk / Recovery Scoring
      ↓
Raw Probability
      ↓
Isotonic Calibration
      ↓
Calibrated Probability
      ↓
Expected Value
      ↓
Strategy Evaluation
      ↓
Safety Policy
```

The probabilistic stages answer:

> **What is likely to happen?**

The economic layer answers:

> **What is likely to be valuable?**

The policy layer answers:

> **What is allowed to happen?**

The execution layer answers:

> **What actually happened?**

---

# Data Model

Major operational entities include:

```text
User
Payment
RecoveryOpportunity
RecoveryAction
RecoveryCampaign
```

Supporting services manage:

- revenue-risk detection,
- scoring,
- calibration,
- strategy selection,
- policy evaluation,
- simulation,
- execution,
- outcomes,
- benchmarking,
- and evaluation.

The architecture keeps prediction, decisioning, authorization, execution, and measurement as separate concerns.

---

# Authentication and Security

PulsePay includes application authentication for its operational interface.

Authentication supports:

- registration,
- login,
- password hashing,
- JWT-based authentication,
- protected API requests,
- protected operational routes.

Passwords are hashed with bcrypt rather than stored as plaintext.

Secrets such as JWT configuration are supplied through environment variables.

The project uses synthetic data and does not require real payment credentials.

---

# Benchmark

The authoritative benchmark contains:

```text
10,000 synthetic records

Training:    7,000
Evaluation:  3,000

Seed:        20260826
```

The evaluation is out-of-sample relative to the training split.

The benchmark evaluates both **economic performance** and **decision quality**.

---

# Benchmark Methodology

The benchmark measures:

### Economic performance
- net recovery,
- incremental net value,
- net lift.

### Recovery quality
- precision,
- recall.

### Probability quality
- Expected Calibration Error,
- Brier Score.

### Safety
- duplicate charges,
- unsafe actions prevented.

The active calibration benchmark uses:

> **Isotonic Regression / PAVA**

The benchmark should be interpreted as a controlled synthetic evaluation of the architecture, not as a guarantee of production outcomes.

---

# Benchmark Results

## Economic

| Metric | PulsePay | Blind Retry |
|---|---:|---:|
| Net recovery | **₹1,40,64,879** | ₹1,16,19,196 |
| Incremental net value | **₹24,45,683** | — |
| Net lift | **+21.0%** | — |

## Recovery quality

| Metric | PulsePay |
|---|---:|
| Recovery precision | **96.0%** |
| Recovery recall | **100.0%** |

## Safety

| Metric | PulsePay | Blind Retry |
|---|---:|---:|
| Duplicate charges | **0** | 583 |
| Unsafe actions prevented | **317** | — |

---

# Economic Results

The benchmark's central comparison is:

```text
Blind Retry
₹1,16,19,196
       │
       │ +₹24,45,683
       ▼
PulsePay
₹1,40,64,879
```

That corresponds to:

> **+21.0% net lift**

The important metric is not the number of recovery attempts.

It is:

> **incremental net recovery under safety constraints.**

---

# Calibration Results

| Metric | Before | After |
|---|---:|---:|
| ECE | 0.337 | **0.148** |
| Brier Score | 0.2515 | **0.1483** |

ECE improved from:

```text
33.7%
  ↓
14.8%
```

This is why PulsePay does not simply display raw model confidence as if it were automatically reliable.

Calibration is treated as a measurable part of the decision pipeline.

---

# Safety Results

The authoritative benchmark recorded:

```text
PulsePay duplicate charges:       0
Blind retry duplicate charges:  583

Unsafe actions prevented:       317
```

This supports the design principle that:

> **More recovery attempts are not automatically better recovery.**

A recovery system must also control the actions it is willing to take.

---

# Live Operations vs Benchmark

PulsePay maintains a deliberate separation between its live synthetic operational environment and the authoritative benchmark.

### Live synthetic operations

Used to demonstrate:

- opportunity scanning,
- investigation,
- strategy evaluation,
- recovery missions,
- synthetic execution,
- outcome recording.

### Authoritative benchmark

Used to report:

- 10,000-record dataset,
- 7,000 / 3,000 split,
- economic results,
- precision and recall,
- calibration,
- safety metrics.

This prevents changing demo state from being confused with fixed benchmark results.

---

# Demo

A clean demonstration follows the decision itself.

## 1. Sign in

Use the normal authentication flow.

## 2. Revenue Center

Start with:

- Revenue at Risk
- Recovery Performance
- Next Best Opportunity
- Net Value Added
- Safety metrics

Introduce the thesis:

> **"PulsePay doesn't optimize for retry volume. It optimizes for safe expected recovery value."**

## 3. Investigate a payment

Open an opportunity and show:

```text
Raw ML Probability
        ↓
Calibrated Probability
        ↓
Expected Recovery Value
        ↓
Recommended Strategy
        ↓
Safety Checks
```

## 4. Compare strategies

Show the alternative strategy analysis.

Explain that PulsePay is choosing between candidate actions rather than automatically retrying.

## 5. Execute a synthetic recovery

Execute an authorized action and show the resulting outcome/history.

## 6. Run a Recovery Mission

Show:

- revenue at risk,
- expected recovery,
- actual recovery,
- actions attempted,
- successful actions,
- blocked actions,
- unsafe actions prevented.

## 7. Finish with the benchmark

Close on:

```text
₹1.41 Cr net recovery
₹24.45 lakh incremental value
+21.0% net lift
0 duplicate charges
317 unsafe actions prevented
96% precision
100% recall
```

Then:

> **"We don't measure success by retry volume. We measure incremental net recovery under safety constraints."**

---

# Setup

## Prerequisites

Install:

- Node.js
- npm
- MongoDB
- Python 3.x

Check Node:

```bash
node --version
npm --version
```

Check Python:

```bash
python --version
```

The default development database is:

```text
mongodb://127.0.0.1:27017/pulsepay
```

Make sure MongoDB is running before starting the backend.

---

# Environment Configuration

Configure the backend environment with the required values.

Example development configuration:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/pulsepay
JWT_SECRET=your-development-secret
```

If external AI integration is enabled, configure the relevant provider key through environment variables.

Do not commit secrets to Git.

---

# Running PulsePay

The repository contains independent frontend and backend applications.

## Terminal 1 — Backend

```bash
cd server
npm install
npm run seed
npm run dev
```

Backend:

```text
http://localhost:5000
```

The seed command prepares the synthetic operational environment for the demo.

## Terminal 2 — Frontend

```bash
cd client
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

Open the frontend URL in your browser.

---

# Testing

## Backend

```bash
cd server
npm test
```

The test suite covers major areas including:

- authentication,
- state handling,
- incident intelligence,
- evidence processing,
- recovery workflows,
- scoring,
- strategy selection,
- execution,
- benchmark evaluation,
- calibration,
- simulation/lab services.

## Frontend build

```bash
cd client
npm run build
```

The production build should complete successfully.

---

# Project Structure

```text
PulsePay/
│
├── client/
│   └── src/
│       ├── api/
│       ├── components/
│       ├── pages/
│       ├── App.jsx
│       └── index.css
│
├── server/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── services/
│   │   ├── recovery/
│   │   ├── benchmark/
│   │   ├── calibration/
│   │   └── ...
│   ├── tests/
│   ├── seed.js
│   └── package.json
│
└── README.md
```

---

# Engineering Principles

### 1. Prediction is not authorization

A model score should not automatically become permission to execute a financial action.

### 2. Optimize value, not activity

A higher retry count is not inherently better.

### 3. Measure uncertainty

Probability calibration is evaluated rather than assumed.

### 4. Keep critical safety deterministic

Financial constraints should remain enforceable independently of generative model behavior.

### 5. Make decisions auditable

The path from evidence to outcome should be inspectable.

### 6. Bound automation

Automated workflows should have explicit server-side limits.

### 7. Measure outcomes

A recovery strategy should ultimately be judged by observed economic results.

---

# Limitations

PulsePay is a controlled engineering prototype and synthetic benchmark, not a production payment-recovery platform.

## Synthetic data

The benchmark uses synthetic records.

Therefore, benchmark performance does not establish production performance.

A production deployment would require validation against real merchant-specific payment distributions.

## Distribution shift

Payment behavior can change across:

- merchants,
- countries,
- payment methods,
- issuers,
- gateways,
- customer cohorts,
- subscription types.

Production systems would need continuous monitoring.

## Calibration drift

A calibrated model can become miscalibrated when the underlying population changes.

A production system would need:

- calibration monitoring,
- drift detection,
- periodic recalibration,
- cohort-level evaluation,
- model versioning.

## Payment-provider integration

The current execution environment is synthetic.

Production integration would require provider-specific handling for:

- authentication,
- idempotency,
- webhooks,
- reconciliation,
- rate limits,
- failure semantics,
- compliance.

---

# Production Considerations

A production implementation would require additional infrastructure around the core decision layer.

### Provider adapters

Gateway-specific behavior should be isolated behind provider adapters.

### Reconciliation

Executed recovery actions should be reconciled against payment-provider and ledger state.

### Observability

Production monitoring should include:

- recovery rate,
- incremental recovery,
- calibration drift,
- strategy performance,
- blocked-action rate,
- duplicate incidents,
- model degradation.

### Human escalation

High-value, ambiguous, or exceptional cases may require human review.

### Model governance

Production ML should use:

- versioned models,
- feature monitoring,
- calibration monitoring,
- evaluation datasets,
- rollback mechanisms,
- audit trails.

---

# Roadmap

## Phase 1 — Real-world validation

Evaluate the decision pipeline on validated merchant/payment-provider data.

## Phase 2 — Adaptive strategy learning

Learn strategy performance across merchant, payment-method, and failure cohorts.

## Phase 3 — Continuous experimentation

Evaluate recovery strategies through controlled experiments.

## Phase 4 — Advanced risk controls

Expand protection against fraud, abuse, and operational failure modes.

## Phase 5 — Decision API

Expose PulsePay as an infrastructure decision layer that can sit on top of existing payment systems.

The long-term direction is not to replace payment infrastructure.

It is to provide an intelligent, measurable decision layer around revenue recovery.

---

# Business Potential

The underlying problem exists anywhere recurring or transactional payments can fail and revenue can be recovered.

Potential use cases include:

- SaaS subscriptions
- e-commerce
- digital subscriptions
- marketplaces
- recurring billing
- healthcare billing
- fintech platforms
- payment infrastructure

PulsePay can be thought of as a **revenue-recovery decision layer** that could eventually sit between payment events and existing recovery infrastructure.

A future commercial model could take several forms:

### SaaS

A merchant-facing recovery optimization platform.

### Performance-based pricing

Pricing based on incremental recovered value.

### Decision API

An infrastructure service that exposes recovery scoring, strategy selection, and policy decisions to existing payment systems.

The common value proposition is:

> **Recover more revenue without blindly increasing recovery attempts.**

---

# Long-Term Vision

The long-term vision for PulsePay is not simply to make retries smarter.

It is to build a general decision layer for **financial recovery workflows**.

The same architecture can evolve toward decisions involving:

```text
Payment Recovery
      ↓
Subscription Recovery
      ↓
Receivables
      ↓
Collections
      ↓
Reconciliation Exceptions
      ↓
Other Revenue Leakage
```

The underlying pattern remains the same:

```text
Detect
  ↓
Estimate
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

That makes the architecture extensible beyond one payment failure workflow.

---

# Closing Perspective

PulsePay started with a simple question:

> **What if a failed payment were treated as a decision problem rather than a retry trigger?**

The answer is a recovery system that combines prediction with calibration, economics with strategy selection, and automation with deterministic safety.

The benchmark shows measurable value under a controlled synthetic distribution. More importantly, the architecture provides a foundation for building recovery workflows that are **explainable, bounded, and outcome-driven**.

The long-term goal is simple:

> **Turn revenue recovery from blind activity into measurable decision intelligence.**

---

## ⭐ Support the Project

If you find PulsePay interesting:

- ⭐ **Star the repository**
- 🍴 **Fork the project**
- 💡 **Suggest improvements**
- 🛠️ **Contribute new recovery strategies or evaluation ideas**
- 📊 **Experiment with the benchmark and share findings**

Every contribution helps push the project toward better, safer, and more measurable financial automation.

<p align="center">

### ⚡ PulsePay

<strong>Evidence-Driven AI Revenue Recovery</strong>

<br>

<em>Recover intelligently · Execute safely · Measure what matters</em>

<br><br>

<img src="https://img.shields.io/badge/Net%20Recovery-₹1.41%20Cr-059669?style=for-the-badge" alt="Net Recovery">
<img src="https://img.shields.io/badge/Net%20Lift-+21.0%25-2563EB?style=for-the-badge" alt="Net Lift">
<img src="https://img.shields.io/badge/Duplicate%20Charges-0-059669?style=for-the-badge" alt="Zero Duplicate Charges">

<br><br>

<sub>Built around one principle: better recovery decisions create better outcomes.</sub>

</p>
