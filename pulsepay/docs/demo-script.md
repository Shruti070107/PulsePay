# PulsePay 3-Minute Live Demo Script

## 1. Executive Setup

Open the PulsePay Web Application at `http://localhost:5173`.

---

## 2. Walkthrough Steps

### Step 1: Revenue Recovery Command Center (`/`)
1. Point to **Revenue at Risk** (e.g. `₹48,500`), **Estimated Recoverable** (`₹36,200`), and **Recovery Rate**.
2. Explain the **Next Best Recovery Opportunity** card:
   - "PulsePay identifies the highest-yield failed payment, calculates its recovery probability and expected value, and selects the safest recovery strategy."
3. Highlight the **AI Recovery Agent Briefing** panel with transparent action breakdowns (Retries vs Recovery Links vs Webhook Reconciliations vs Safety Blocked items).
4. Click **"Run Recovery Demo"** to see live end-to-end multi-scenario failure ingestion, simulation, and synthetic execution.

### Step 2: Ranked Recovery Opportunities Queue (`/recovery`)
1. Navigate to `/recovery`.
2. Demonstrate multi-filter controls: filter by **Policy Status (Eligible vs Blocked)** or **Classification (Recoverable vs Non-Recoverable)**.
3. Show how the Expected Value ($EV$) column ranks transactions by net financial yield rather than raw payment volume.
4. Click **"Analyze →"** on any high-value candidate.

### Step 3: Payment Recovery Deep-Dive (`/recovery/:paymentId`)
1. Walk through the **5-Point Evidence-Grounded Explanation**:
   - *Why this payment?*
   - *Why this action?*
   - *Why now?*
   - *Why not another action?*
   - *Why is it safe?*
2. Point out the **Interactive Recovery Causal Explanation Graph** (Ingestion $\to$ Failure Code $\to$ ML Score $\to$ Policy Gate $\to$ Action $\to$ Expected Yield).
3. Review the **Safety Policy Verification Checklist** ($\checkmark$ Retry limit $\le 2$, $\checkmark$ Non-duplicate, $\checkmark$ Positive EV).
4. Click **"Execute Test Recovery"** to demonstrate idempotent synthetic recovery.

### Step 4: Campaigns & Strategy What-If Studio (`/campaigns`)
1. Navigate to `/campaigns`.
2. Inspect the **Side-by-Side What-If Strategy Comparison Matrix**:
   - Strategy A: Expected Value Optimized
   - Strategy B: Retry All
   - Strategy C: High Confidence Only
   - Strategy D: Digital Recovery Links Only
3. Compare the net yields, action breakdowns, and policy blocked items.
4. Review the **Historical Campaign Scorecards** showing Expected vs Actual recovered amounts.

### Step 5: Developer Console & Benchmark Suite (`/dev`)
1. Navigate to `/dev`.
2. Click **"Run Benchmark Suite"** to verify 100% policy compliance, 0 hallucinations, and 0 policy violations across 6 canonical test scenarios.
