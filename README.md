# PulsePay — Evidence-Driven AI Payment Incident Intelligence Platform

PulsePay is an AI-assisted payment incident intelligence system designed for merchant and payment operations. It reconstructs ambiguous transaction states from raw event timelines, compiles structured evidence facts, correlates related anomalies, scores confidence breakdowns, and provides operator recovery checklists with visual root cause causal graphs.

## Core Problem
In digital commerce, processing flows are distributed across gateways, webhook systems, and order databases. When these systems disagree (e.g. gateway captures funds but the webhook drops, leaving the merchant order status marked as "unpaid"), human operators must manually reconcile logs, which is slow and costly.

## Solution
PulsePay acts as an intelligence layer above transaction streams. It:
1. **Reconstructs Transaction States**: Chronologically processes events to resolve out-of-order, duplicate, and late syncs.
2. **Builds Structured Evidence Checklist**: Collects transaction parameters, HTTP errors, retry counts, latency checks, and ML outlier scores.
3. **Correlates Anomalies**: Clusters related anomalies using a Leader-Follower model to reduce alert fatigue.
4. **Calculates Blast Radius**: Computes total amounts at risk, failure rates, duration logs, and customer counts.
5. **Provides Causal Root Cause Graphs**: Generates step-by-step visual chain transitions.
6. **AI Diagnostics Reasoning**: Leverages Gemini (with safe mock fallbacks) to output summaries, factual tables, recommendations, and information gaps.
7. **Operator action center**: Persists status changes (TODO, IN PROGRESS, etc.) for operational checks.

---

## Architecture

```text
  +-------------------------------------------------------------+
  |                   Payment Ingestion Pipeline                |
  +-------------------------------------------------------------+
                                 │
                                 ▼
                    +──────────────────────────+
                    |    State Reconstruction  |
                    +──────────────────────────+
                                 │
                                 ▼
                    +──────────────────────────+
                    |     Evidence Engine      |
                    +──────────────────────────+
                                 │
                   ┌─────────────┴─────────────┐
                   ▼                           ▼
        +─────────────────────+     +─────────────────────+
        |   Blast Radius      |     |  Confidence Factors |
        |   Exposure Metrics  |     |  Scoring Breakdown  |
        +─────────────────────+     +─────────────────────+
                   └─────────────┬─────────────┘
                                 │
                                 ▼
                    +──────────────────────────+
                    |   Incident Correlation   |
                    +──────────────────────────+
                                 │
                   ┌─────────────┴─────────────┐
                   ▼                           ▼
        +─────────────────────+     +─────────────────────+
        |   Causal Graphs     |     |   Isolation Forest  |
        |   Visual Chain      |     |   ML Anomaly Model  |
        +─────────────────────+     +─────────────────────+
                   └─────────────┬─────────────┘
                                 │
                                 ▼
                    +──────────────────────────+
                    |   AI Root Cause Engine   |
                    +──────────────────────────+
                                 │
                                 ▼
                    +──────────────────────────+
                    |    Operator Action Center|
                    +──────────────────────────+
```

## AI Safety & Boundaries
- **Advisory Only**: The AI engine is strictly decision-support. It does **not** possess database mutation permissions or code blocks to execute refunds, initiate retries, or move money.
- **Sanitized Inputs**: Strips credentials, CVVs, and PANs before forwarding metadata to LLM providers.

## Installation & Running Locally

### Prerequisites
- Node.js (v18+)
- MongoDB (running on `mongodb://127.0.0.1:27017/pulsepay`)
- Python (v3.11)

### Setup & Launch
1. **Express Backend API**:
   ```bash
   cd server
   npm install
   npm run dev
   ```
2. **React Operations Dashboard**:
   ```bash
   cd client
   npm install
   npm run dev
   ```
3. **Python ML Service**:
   ```bash
   cd ml
   py -3.11 -m venv venv
   .\venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --port 8000
   ```

---

## 3-Minute Demo Sequence
1. Navigate to the **Developer Console** in the sidebar.
2. Click **Activate E2E Demo Mode** in the header. (Logs will output as the system clears database entries, seeds 27 synthetic transactions, runs correlation aggregators, and trains the ML isolation forest).
3. Wait for automatic redirection to the **Dashboard** page showing the operational metrics.
4. Go to **Incidents** list and open the first incident (e.g. `INC-XXXXXX`).
5. Inspect the upgraded details view:
   * **Blast Radius**: Exposure grids (Merchants, failure rate, duration, ML flags).
   * **Logical vs Arrival Ingestion Traces**: Visual chronological sequences comparing logical timestamps to arrival logs.
   * **Causal Root Cause Graph**: Step-by-step CSS arrow flows.
   * **Evidence Checklist**: Type severity fact tables.
   * **Confidence Breakdown**: Factor weights (+25 state mismatch, +20 failures).
   * **Operator action checklist**: dropdown status changes.
6. Click **Run Investigation** in the AI card to generate root-cause advisor findings.

## Testing
Run all 29 tests (State Engine, Incident Engine, AI sanitizers, E2E integrations, and Evidence Engine timeline assertions) using:
```bash
cd server
npm test
```
*(All 29 checks are fully passing).*
