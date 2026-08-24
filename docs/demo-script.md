# PulsePay — Upgraded 3-Minute E2E Demo Script

This script walks through demonstrating the upgraded Evidence-Driven platform.

---

### [00:00–00:45] Introduction & Platform Upgrades
* **Action**: Open the **PulsePay Dashboard** (`http://localhost:5173/`).
* **Talking Points**:
  > "I am demonstrating **PulsePay**, an AI-assisted payment incident intelligence system.
  > Today, we have upgraded PulsePay into an **Evidence-Driven AI Payment Incident Intelligence Platform**.
  > Instead of just alerting that an incident occurred, PulsePay now reconstructs what happened, visualizes the causal chain, calculates blast radius metrics, scores confidence deterministically, and provides interactive checklists for operators."

---

### [00:45–01:30] One-Click E2E Demo Mode
* **Action**: Navigate to the **Developer Console**, and click **Activate E2E Demo Mode**. Point out the terminal logs outputting database clearing, seeding, aggregation scans, and Isolation Forest retraining.
* **Talking Points**:
  > "I will activate our integrated E2E Demo Mode.
  > This action safely clears the database, seeds a controlled batch of 27 transactions (including webhook drops and duplicate pairs), executes aggregation scans, and retrains our ML model in the background.
  > Now we are redirected to our refreshed dashboard."

---

### [01:30–02:30] Deep-Dive Incident Intelligence & Causal Graphs
* **Action**: Navigate to the **Incidents** list, and open the first **CAPTURED_ORDER_UNPAID** incident.
* **Talking Points**:
  > "Here, we check the incident workspace.
  > On top, we see the **Blast Radius Exposure** calculations: affected transactions, customers, unique merchants, orders, duration, and failure rates.
  > We see our **Signal Fusion**: deterministic severity matching with ML anomaly outlier weights.
  > The **Causal Graph** visualizes the failure path: Ingest -> Capture -> Webhook Drops -> Mismatch.
  > The **Chronological timeline** compares logical gateway timestamps with arrival logs, pointing out latencies.
  > Under **Confidence Breakdown**, we explain the score mathematically (+25 state mismatch, +20 webhook drops)."

---

### [02:30–03:00] Operator Actions & AI Investigation
* **Action**: Scroll to the **Operator Actions** panel. Change one action dropdown status to **IN PROGRESS**. Then click **Run Investigation** in the AI card.
* **Talking Points**:
  > "Operators can manage resolution tasks inside the checklist, persisting status changes.
  > Finally, we trigger our AI Investigation to get diagnostic advice, root causes, and unknowns.
  > This is PulsePay—helping payment teams trace, explain, and recover from failures safely."
