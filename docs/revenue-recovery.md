# PulsePay AI Revenue Recovery Architecture

## 1. Overview & Core Philosophy

In high-volume payment processing, **payment failures represent immediate revenue leakage**. However, traditional payment infrastructure handles failures with simplistic retry policies (e.g. exponential backoff on all errors) or leaves them entirely unaddressed.

**PulsePay transforms payment failure handling into an Evidence-Driven Revenue Recovery Engine**:
1. **Identifies Revenue at Risk**: Continuously scans transaction states, failed intents, uncaptured authorizations, and orphaned webhook deliveries.
2. **Estimates Real Recoverability**: Combines statistical failure taxonomy, retry fatigue decay, and time degradation into calibrated recovery probabilities $P(\text{recovery})$.
3. **Calculates Expected Value**: Compares net financial yields across recovery actions:
   $$EV(\text{action}) = \text{Amount} \times P(\text{success} \mid \text{action}) - \text{Cost}(\text{action})$$
4. **Enforces Strict Deterministic Safety Policies**: Zero automated actions on permanent card declines, duplicate charges, or exceeded retry limits.
5. **Provides What-If Simulation**: Simulates recovery outcomes with zero side effects before any test action is triggered.
6. **Bounded Synthetic Execution**: Executes safe recovery actions in a controlled, idempotent environment.
7. **Empirically Measures Outcomes**: Evaluates actual recovered revenue, recovery rate, and probabilistic calibration error.

---

## 2. Recovery Taxonomy & Failure Signatures

| Failure Code | Recoverability Class | Default Strategy | Net Yield Profile | Safety Guard |
| :--- | :--- | :--- | :--- | :--- |
| `GATEWAY_TIMEOUT` | High (`80% - 90%`) | `RETRY_PAYMENT` | Maximum EV | Max 2 retries |
| `WEBHOOK_DELIVERY_FAILURE` | Critical (`95% - 99%`) | `RECONCILE_WEBHOOK` | 100% salvage, ₹0 cost | Verifies captured status |
| `INSUFFICIENT_FUNDS` | Moderate (`35% - 45%`) | `SEND_RECOVERY_LINK` | High salvage via UPI/NetBanking | No repeated card retry |
| `NETWORK_DISRUPTION` | High (`75% - 85%`) | `WAIT_AND_RETRY` | Cooldown avoids stampedes | 60s cooldown |
| `CARD_EXPIRED` | Non-Recoverable (`< 5%`) | `STOP_RECOVERY` | Prevents unnecessary fees | Blocked by policy |
| `DUPLICATE_PAYMENT_RISK` | Blocked (`0%`) | `STOP_RECOVERY` | Prevents double billing | Duplicate window check |

---

## 3. Mathematical Models & Expected Value

### 3.1 Probability Scoring Formula

$$P(\text{recovery}) = P_{\text{baseline}}(\text{failureReason}) \times (1 - 0.25 \times \text{retryCount}) \times \exp\left(-\frac{\Delta t}{720}\right) \times M_{\text{method}}$$

Where:
- $P_{\text{baseline}}$: Empirical historical recovery rate for the failure signature.
- $\text{retryCount}$: Count of prior failed attempts (decay penalty of 25% per prior retry).
- $\Delta t$: Elapsed time in minutes since failure event (half-life of 720 minutes).
- $M_{\text{method}}$: Method-specific modifier (e.g. UPI vs Debit Card).

### 3.2 Expected Value Formula

$$EV(\text{action}) = \text{Amount} \times P(\text{success} \mid \text{action}) - \text{Cost}(\text{action})$$

Action costs and success factors are transparently modeled:
- `RETRY_PAYMENT`: Cost = ₹2 (Gateway attempt fee), $P_{\text{success}} = P(\text{recovery})$.
- `SEND_RECOVERY_LINK`: Cost = ₹5 (SMS / WhatsApp notification), $P_{\text{success}} = P(\text{recovery}) \times 0.85$.
- `RECONCILE_WEBHOOK`: Cost = ₹0 (Internal sync), $P_{\text{success}} = 0.98$.
- `ALTERNATE_PAYMENT_METHOD`: Cost = ₹4, $P_{\text{success}} = P(\text{recovery}) \times 0.75$.

---

## 4. Deterministic Safety Policy Engine

PulsePay strictly separates **AI reasoning** from **deterministic safety enforcement**:
1. **Rule 1: Maximum Retries Ceiling**: Max 2 automated retries per transaction. Additional attempts require explicit customer authorization via recovery link.
2. **Rule 2: Permanent Decline Lockout**: Permanent failure codes (`CARD_EXPIRED`, `FRAUD_SUSPECTED`, `STOLEN_CARD`, `INVALID_CARD_NUMBER`) immediately block automated retry strategies.
3. **Rule 3: Duplicate Charge Protection**: If a matching transaction exists within the deduplication window (60s), recovery is halted to protect the customer from double debit.
4. **Rule 4: Non-Negative Expected Value**: Only actions with $EV > 0$ are deemed policy-eligible.

---

## 5. End-to-End Execution & Idempotency

All recovery actions execute with an immutable idempotency key:
$$\text{IdempotencyKey} = \text{REC}-\{\text{campaignId}\}-\{\text{paymentId}\}-\{\text{action}\}$$

If an execution is triggered multiple times, the idempotency ledger automatically detects prior execution and skips redundant operations, guaranteeing zero accidental double charges.
