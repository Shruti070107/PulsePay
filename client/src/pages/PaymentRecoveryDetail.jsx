import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getRecoveryOpportunity,
  getRecoveryOpportunities,
  executeRecovery,
  simulateRecovery,
  compareStrategies,
} from '../api';
import { useToast } from '../components/Toast';
import {
  CheckCircle2, XCircle, ArrowLeft, ShieldCheck, Play,
  RotateCcw, RefreshCw, Info, TrendingUp, AlertTriangle
} from 'lucide-react';

const fmt  = (n) => n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—';
const pct  = (n) => n != null ? `${Number(n).toFixed(1)}%` : '—';
const fmtDt = (d) => d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const POLICY_LABELS = {
  PERMANENT_FAILURE_GATE:    'Permanent Decline Protection',
  MAX_RETRY_LIMIT:           'Retry Budget',
  DUPLICATE_CHARGE_PROTECTION: 'Duplicate Charge Protection',
  MAX_AMOUNT_CEILING:        'Financial Viability Gate',
  POSITIVE_EXPECTED_VALUE:   'Positive Expected Value',
  FRAUD_RISK_GATE:           'Fraud Risk Gate',
  RECOVERY_ELIGIBILITY:      'Recovery Eligibility',
};

const SectionHeader = ({ title, icon: Icon, badge }) => (
  <div className="decision-section-header">
    <span className="section-heading">
      {Icon && <Icon size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />}
      {title}
    </span>
    {badge}
  </div>
);

const PaymentRecoveryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [opportunity, setOpportunity] = useState(null);
  const [strategies, setStrategies] = useState(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [error, setError] = useState(null);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      let targetId = id;
      if (!targetId) {
        const oppsRes = await getRecoveryOpportunities({ limit: 1 });
        if (oppsRes.data?.length > 0) targetId = oppsRes.data[0].paymentId || oppsRes.data[0].opportunityId;
      }
      if (!targetId) { setError('No active payment opportunities found to investigate.'); return; }

      const res = await getRecoveryOpportunity(targetId);
      const opp = res.data;
      setOpportunity(opp);
      setError(null);

      // Fetch counterfactual strategies
      try {
        const strat = await compareStrategies({
          opportunityId: opp.opportunityId || opp.paymentId,
          paymentId: opp.paymentId,
          amount: opp.amount,
          recoveryProbability: opp.recoveryProbability,
          failureReason: opp.failureReason || opp.failureType,
          paymentMethod: opp.paymentMethod,
          retryCount: opp.retryCount || 0,
          expectedValue: opp.expectedValue,
        });
        setStrategies(strat.data);
      } catch {
        // Non-critical — investigation still works without strategies
      }
    } catch (err) {
      setError(err.message || 'Unable to load recovery details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDetail(); }, [id]);

  const handleExecute = async () => {
    if (!opportunity) return;
    try {
      setExecuting(true);
      const res = await executeRecovery({
        opportunityIds: [opportunity.opportunityId || opportunity.paymentId],
        paymentId: opportunity.paymentId,
      });
      const data = res.data || res;
      if (data.status === 'BLOCKED' || data.success === false) {
        addToast(`Action Blocked by Safety Policy: ${data.reason || 'Execution halted by deterministic policy gate.'}`, 'blocked');
      } else if (data.status === 'SKIPPED') {
        addToast(`Recovery Skipped: ${data.reason || 'Duplicate execution prevented by idempotency guard.'}`, 'warning');
      } else {
        const recoveredAmt = data.recoveredAmount || (data.actions?.[0]?.result === 'RECOVERED' ? opportunity.amount : 0);
        addToast(`Synthetic Recovery executed. Recovered ${fmt(recoveredAmt)}.`, 'success');
      }
      await fetchDetail();
    } catch (err) {
      addToast('Execution could not be completed: ' + err.message, 'error');
    } finally {
      setExecuting(false);
    }
  };

  const handleSimulate = async () => {
    if (!opportunity) return;
    try {
      setSimulating(true);
      const res = await simulateRecovery({ opportunityIds: [opportunity.opportunityId || opportunity.paymentId] });
      setSimResult(res.data);
      addToast('Recovery simulation completed.', 'info');
    } catch (err) {
      addToast('Recovery simulation could not be completed: ' + err.message, 'error');
    } finally {
      setSimulating(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
      <RefreshCw size={16} className="animate-spin" style={{ marginRight: 8 }} /> Loading payment record…
    </div>
  );

  if (error) return (
    <div style={{ padding: 32 }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/investigation')} style={{ marginBottom: 16 }}>
        <ArrowLeft size={14} /> Back to Payment Investigation
      </button>
      <div style={{ padding: '20px 24px', background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', borderRadius: 'var(--radius-lg)', color: 'var(--color-danger)', fontSize: '0.84rem' }}>
        {error}
      </div>
    </div>
  );

  if (!opportunity) return null;

  const opp = opportunity;
  const evidence = opp.decisionEvidence || opp.reasons || [];
  const policyChecks = opp.policyChecks || [];
  const events = opp.events || [];
  const actions = opp.actions || [];
  const isBlocked = opp.policyStatus?.toUpperCase() === 'BLOCKED';

  return (
    <div className="page-stack">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="page-header">
        <div style={{ minWidth: 0 }}>
          <div style={{ marginBottom: 6 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/investigation')} style={{ padding: '4px 0', color: 'var(--text-muted)' }}>
              <ArrowLeft size={13} /> Payment Investigation
            </button>
          </div>
          <h1>Payment Decision Record</h1>
          <p style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            <span className="font-mono" style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{opp.paymentId}</span>
            {opp.policyStatus?.toUpperCase() === 'ELIGIBLE'
              ? <span className="badge badge-success">Eligible</span>
              : <span className="badge badge-danger">Blocked</span>}
            {opp.status?.toUpperCase() === 'RECOVERED'
              ? <span className="badge badge-success">Recovered</span>
              : <span className="badge badge-info">{opp.status || 'Pending'}</span>}
          </p>
        </div>
        <div className="page-header-actions" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handleSimulate} disabled={simulating} id="simulate-btn">
            <Play size={13} className={simulating ? 'animate-spin' : ''} />
            {simulating ? 'Simulating…' : 'Simulate Recovery'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleExecute}
            disabled={executing || isBlocked}
            id="execute-btn"
            title={isBlocked ? 'Blocked by safety policy' : 'Execute synthetic recovery'}
          >
            <RotateCcw size={13} className={executing ? 'animate-spin' : ''} />
            {executing ? 'Executing…' : 'Execute Synthetic Recovery'}
          </button>
        </div>
      </div>

      {/* ── Payment Metadata ─────────────────────────────────── */}
      <div className="decision-section">
        <SectionHeader title="Payment Details" icon={Info} />
        <div className="decision-section-body">
          <div className="payment-details-grid">
            {[
              { label: 'Payment ID',       value: opp.paymentId,                          mono: true },
              { label: 'Amount',           value: fmt(opp.amount),                        bold: true },
              { label: 'Failure Reason',   value: (opp.failureReason || opp.failureType || '—').replace(/_/g, ' '), danger: true },
              { label: 'Payment Method',   value: opp.paymentMethod || '—' },
              { label: 'Provider',         value: opp.provider || '—' },
              { label: 'Currency',         value: opp.currency || 'INR' },
              { label: 'Customer ID',      value: opp.customerId || '—',    mono: true },
              { label: 'Order ID',         value: opp.orderId || '—',       mono: true },
              { label: 'Merchant ID',      value: opp.merchantId || '—',    mono: true },
            ].map(({ label, value, mono, bold, danger }) => (
              <div key={label} className="payment-detail-item">
                <div className="kpi-label" style={{ marginBottom: 3 }}>{label}</div>
                <div className={`payment-detail-value ${mono ? 'font-mono' : ''}`} style={{ fontWeight: bold ? 700 : 500, color: danger ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <hr className="divider" />

      {/* ── Payment Lifecycle ──────────────────────────────────── */}
      {events.length > 0 && (
        <div className="decision-section">
          <SectionHeader title="Payment Lifecycle" />
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>State</th>
                  <th>Timestamp</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{ev.eventType || ev.type || '—'}</td>
                    <td><span className="badge badge-neutral">{ev.state || ev.status || '—'}</span></td>
                    <td><span className="font-mono" style={{ fontSize: '0.75rem' }}>{fmtDt(ev.timestamp || ev.createdAt)}</span></td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: 280 }}>{ev.message || ev.details || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <hr className="divider" />

      {/* ── PulsePay Decision ──────────────────────────────────── */}
      <div className="decision-section">
        <SectionHeader title="PulsePay Decision" icon={TrendingUp} />
        <div className="decision-section-body">
          <div className="decision-metrics-grid">
            <div className="decision-metric-item">
              <div className="kpi-label" style={{ marginBottom: 4 }}>Raw ML Probability</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {opp.rawProbability == null ? 'Not available' : pct(opp.rawProbability * 100)}
              </div>
              <div className="kpi-sub">Uncalibrated</div>
            </div>
            <div className="decision-metric-item">
              <div className="kpi-label" style={{ marginBottom: 4 }}>Calibrated Probability</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-blue)' }}>
                {opp.recoveryProbability == null ? 'Not available' : pct(opp.recoveryProbability * 100)}
              </div>
              <div className="kpi-sub">Isotonic Regression</div>
            </div>
            <div className="decision-metric-item">
              <div className="kpi-label" style={{ marginBottom: 4 }}>Expected Recovery Value</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-success)' }}>
                {fmt(opp.expectedValue ?? opp.estimatedRecoverableAmount)}
              </div>
              <div className="kpi-sub">EV = P(recovery) × Amount − Cost</div>
            </div>
          </div>
          <div style={{ marginTop: 20, padding: '14px 16px', background: 'var(--color-blue-bg)', border: '1px solid var(--color-blue-border)', borderRadius: 'var(--radius-md)' }}>
            <div className="kpi-label" style={{ marginBottom: 4 }}>Recommended Action</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-blue)' }}>
              {(opp.recommendedAction || opp.recommendedStrategy || '—').replace(/_/g, ' ')}
            </div>
          </div>
        </div>
      </div>

      <hr className="divider" />

      {/* ── Why This Decision? ─────────────────────────────────── */}
      <div className="decision-section">
        <SectionHeader
          title="Why This Decision?"
          badge={<span className="eyebrow">Decision Evidence</span>}
        />
        <div className="decision-section-body">
          {evidence.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem', fontStyle: 'italic' }}>
              Evidence unavailable for this record.
            </div>
          ) : (
            <div className="mission-preflight">
              {evidence.map((item, i) => {
                const text = typeof item === 'string' ? item : (item.reason || item.message || JSON.stringify(item));
                const isNegative = text.toLowerCase().includes('block') || text.toLowerCase().includes('fail') || text.toLowerCase().includes('permanent');
                return (
                  <div key={i} className="evidence-item">
                    {isNegative
                      ? <XCircle size={15} className="evidence-icon-fail" />
                      : <CheckCircle2 size={15} className="evidence-icon-pass" />}
                    <span>{text}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <hr className="divider" />

      {/* ── Alternative Strategies (Counterfactual) ─────────────── */}
      <div className="decision-section">
        <SectionHeader
          title="Alternative Strategies"
          icon={TrendingUp}
          badge={<span className="badge badge-neutral">Counterfactual</span>}
        />
        <div style={{ padding: '0' }}>
          {!strategies ? (
            <div style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
              Strategy comparison unavailable.
            </div>
          ) : (
            <>
              {strategies.whySelected && (
                <div style={{ padding: '12px 20px', background: 'var(--color-blue-bg)', borderBottom: '1px solid var(--color-blue-border)', fontSize: '0.82rem', color: 'var(--color-blue)' }}>
                  <strong>Why {(strategies.selectedStrategyName || strategies.selectedStrategy || '').replace(/_/g, ' ')}?</strong>{' '}
                  {strategies.whySelected}
                </div>
              )}
              <div className="table-container">
                <table className="strategy-table">
                  <thead>
                    <tr>
                      <th>Strategy</th>
                      <th>Expected Value</th>
                      <th>Recovery Probability</th>
                      <th>Cost</th>
                      <th>Safety</th>
                      <th>Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(strategies.strategies || []).map(s => (
                      <tr
                        key={s.action}
                        className={s.selected ? 'strategy-selected' : s.safetyStatus === 'BLOCKED' ? 'strategy-blocked' : ''}
                      >
                        <td>
                          <div style={{ fontWeight: s.selected ? 700 : 500, color: 'var(--text-primary)' }}>
                            {s.name}
                          </div>
                          {s.safetyStatus === 'BLOCKED' && s.blockedReason && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--color-danger)', marginTop: 2 }}>
                              {s.blockedReason}
                            </div>
                          )}
                        </td>
                        <td style={{ fontWeight: 600, color: s.selected ? 'var(--color-success)' : 'var(--text-primary)' }}>
                          {fmt(s.expectedValue)}
                        </td>
                        <td style={{ color: 'var(--color-blue)' }}>
                          {pct((s.successProbability ?? 0) * 100)}
                        </td>
                        <td>{s.cost != null ? `₹${s.cost}` : '—'}</td>
                        <td>
                          {s.safetyStatus === 'PERMITTED'
                            ? <span className="badge badge-success">Permitted</span>
                            : <span className="badge badge-danger">Blocked</span>}
                        </td>
                        <td>
                          {s.selected
                            ? <span className="badge badge-blue">✓ Selected</span>
                            : <span className="badge badge-neutral">Not Selected</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      <hr className="divider" />

      {/* ── Deterministic Safety Preflight ────────────────────── */}
      <div className="decision-section">
        <SectionHeader
          title="Safety Checks"
          icon={ShieldCheck}
          badge={
            policyChecks.length > 0
              ? (policyChecks.every(c => c.passed)
                  ? <span className="badge badge-success">All Passed</span>
                  : <span className="badge badge-danger">Blocked</span>)
              : null
          }
        />
        <div className="decision-section-body" style={{ padding: 0 }}>
          {policyChecks.length === 0 ? (
            <div style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
              Safety policy data not available for this record.
            </div>
          ) : (
            <div style={{ padding: '0 20px' }}>
              {policyChecks.map((check, i) => (
                <div key={i} className="policy-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {check.passed
                      ? <CheckCircle2 size={15} color="var(--color-success)" />
                      : <XCircle size={15} color="var(--color-danger)" />}
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {POLICY_LABELS[check.rule] || check.rule}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 1 }}>
                        {check.details}
                      </div>
                    </div>
                  </div>
                  <span className={`badge ${check.passed ? 'badge-success' : 'badge-danger'}`}>
                    {check.passed ? 'Passed' : 'Blocked'}
                  </span>
                </div>
              ))}
              <div style={{ padding: '10px 0 14px', fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                Safety policy is enforced by backend services. Frontend cannot override.
              </div>
            </div>
          )}
        </div>
      </div>

      <hr className="divider" />

      {/* ── Recovery Actions History ─────────────────────────── */}
      {actions.length > 0 && (
        <div className="decision-section">
          <SectionHeader title="Execution History" />
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Action ID</th>
                  <th>Strategy</th>
                  <th>Result</th>
                  <th>Amount</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((a, i) => (
                  <tr key={i}>
                    <td><span className="font-mono" style={{ fontSize: '0.75rem' }}>{a.recoveryActionId || a.actionId || '—'}</span></td>
                    <td style={{ fontSize: '0.82rem' }}>{(a.strategy || a.action || '—').replace(/_/g, ' ')}</td>
                    <td>
                      {a.result === 'RECOVERED'
                        ? <span className="badge badge-success">Recovered</span>
                        : a.result === 'BLOCKED'
                        ? <span className="badge badge-danger">Blocked</span>
                        : <span className="badge badge-neutral">{a.result || '—'}</span>}
                    </td>
                    <td>{a.amount != null ? fmt(a.amount) : '—'}</td>
                    <td><span className="font-mono" style={{ fontSize: '0.75rem' }}>{fmtDt(a.timestamp || a.createdAt)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Simulation Result ────────────────────────────────── */}
      {simResult && (
        <div style={{ padding: '16px 20px', background: 'var(--color-info-bg)', border: '1px solid var(--color-info-border)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--color-info)', marginBottom: 8 }}>
            Simulation Result
          </div>
          <div className="simulation-metrics-grid">
            <div className="decision-metric-item">
              <div className="kpi-label">Expected Recovery</div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: 3 }}>{fmt(simResult.expectedRecoveredAmount)}</div>
            </div>
            <div className="decision-metric-item">
              <div className="kpi-label">Opportunities Targeted</div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: 3 }}>{simResult.transactionsTargeted ?? '—'}</div>
            </div>
            <div className="decision-metric-item">
              <div className="kpi-label">Policy Blocked</div>
              <div style={{ fontWeight: 700, color: 'var(--color-danger)', marginTop: 3 }}>{simResult.policyBlockedCount ?? '—'}</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PaymentRecoveryDetail;
