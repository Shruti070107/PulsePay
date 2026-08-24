# Technical Interview Preparation Notes (Evidence-Driven Upgrade)

This document maps interview questions to our upgraded evidence-driven engineering designs.

---

### 1. Why did you upgrade PulsePay to be "evidence-driven"?
Because simply reporting that an incident occurred isn't actionable for operations. Teams need to know *what* evidence supports the conclusion, *when* and *where* delays occurred in the ingestion flow, and the *blast radius* of affected systems. The upgrade introduces chronological delay tracing, causal flow graphs, structured evidence fact checklists, and score weight factors.

### 2. How does the Chronological Timeline trace out-of-order latency?
We compare the logical gateway creation time (`eventTimestamp`) with the actual database write time (`receivedAt`). If the write time violates chronological sequence relative to previous events, or if the arrival offset is high (e.g. > 5 seconds), the engine flags the event.

### 3. How is root cause confidence mathematically scored?
We avoid arbitrary LLM confidence percentages. Instead, the Evidence Engine calculates confidence score deterministically:
- Base: 50.
- State consistency mismatch (captured payment, unpaid order): +25.
- Repeated failures logged: +20.
- Multiple transactions correlated: +15.
- Duplicate clicks: +15.
- Missing telemetry: -15.
- Clamp bounds: `[10, 99]`.

### 4. How do you construct the Causal Root Cause Graph?
We construct node-link causals mapping the logical transition of gateway states. If webhook drops are logged, the chain maps `Captured -> Webhook Failed -> Order Unpaid -> State Mismatch`.

### 5. How are operator tasks persisted?
チェックリスト status is managed by the operator via status dropdowns (`TODO`, `IN_PROGRESS`, `DONE`, `DISMISSED`) which triggers `PATCH /api/incidents/:id/actions` to persist the state in Mongoose.
