# PulsePay Security, Safety & Synthetic Rails Governance

## 1. Synthetic Data & Zero Financial Risk Guarantee

PulsePay operates strictly on **synthetic payment events and simulated bank rails**.
- **No Real Cardholder Data (PAN/CVV)**: The platform never stores, ingests, or moves real payment cards or bank account numbers.
- **Zero Real Money Movement**: All recovery executions update synthetic database ledgers in a local sandbox environment.
- **No Secrets Exposure**: Hardcoded credentials and authorization tokens are strictly forbidden.

---

## 2. Deterministic Safety Boundaries

To prevent systemic risk or erroneous automated actions:
1. **Idempotency Locks**: Every recovery attempt is keyed by `REC-{campaignId}-{paymentId}-{action}`, preventing duplicate execution.
2. **Ceiling Limits**: Max automated retry limits are enforced at the code level, independent of any AI prompt.
3. **Double Charge Prevention**: Transactions flagged with duplicate signatures within the 60-second correlation window are strictly locked against automated retries.
4. **Sanitized Prompt Ingestion**: All data passed to the AI investigation layer is stripped of sensitive tokens and internal topology details.
