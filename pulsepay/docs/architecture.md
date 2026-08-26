# PulsePay Architecture & Evidence Design

This document details the software design, microservice interaction, and evidence-driven data boundaries of the PulsePay platform.

---

## 1. High-Level Pipeline Data Flow

```text
[ Simulator Event Generator / API Ingest ]
                    │
                    ▼
[ State Reconstruction Engine ] (Resolves chronologically & arrivals)
                    │
                    ▼
[ Evidence Engine ] (Builds facts checklist & maps out-of-order latency)
                    │
                    ▼
[ ML Anomaly Outlier Model ] (Isolation Forest calculates decision flags)
                    │
                    ▼
[ Incident Correlation ] (Clusters matching merchant/webhook windows)
                    │
                    ▼
[ Blast Radius & Confidence Resolver ] (Calculates metrics & score weights)
                    │
                    ▼
[ AI Diagnostics Advisor ] (LLM structures root causes & uncertainties)
                    │
                    ▼
[ Operator Actions Checklist ] (State-persisted dashboard checklist)
```

---

## 2. Evidence Engine Design

The Evidence Engine (`server/services/incident/evidenceEngine.js`) compiles data from multiple collections:
- **Chronological Timeline**: Queries `PaymentEvent` and `WebhookEvent` matching the incident transaction set, sorting them logically, and comparing:
  `delaySeconds = receivedAt - eventTimestamp`
  If delays are > 5 seconds, or logical order is violated, it highlights them.
- **Evidence Checklist**: Generates type-severity facts (e.g. `PAYMENT_CAPTURED`, `ORDER_UNPAID`, `WEBHOOK_FAILURE`, `OUT_OF_ORDER_EVENT`).
- **Causal Root Cause Graph**: Monospace state maps defining transition sequences (e.g. Ingest -> Capture -> Webhook Drops -> Unpaid Order).
- **Confidence Breakdown**: score breakdown based on:
  - State consistency mismatch (captured and unpaid): +25
  - Repeated webhook failures: +20
  - Multiple correlated transactions: +15
  - Duplicate checkout clicks: +15
  - Late Auth syncs: +10
  - Missing webhook telemetry: -15
- **Operator Action checklists**: Instantiates list items linking to evidence.

---

## 3. Persistent Operator Checklist State
- Statuses: `TODO`, `IN_PROGRESS`, `DONE`, `DISMISSED`.
- Persisted inside the Mongoose collection on change events by triggering `PATCH /api/incidents/:id/actions`.

---

## 4. Security & Data Boundaries
- **Advisory Only**: AI has zero execution permissions to charge/refund/retry.
- **Sanitization**: Strips PANs, CVVs, and keys before external AI calls.
