import React, { useState } from 'react';
import { runRecoveryMission } from '../api';
import { useToast } from '../components/Toast';
import {
  Play, CheckCircle2, XCircle, ShieldCheck, RotateCcw,
  AlertTriangle, TrendingUp, Target, RefreshCw
} from 'lucide-react';

const fmt = (n) => n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—';

const MISSION_STEPS = [
  { id: 1, label: 'Scanning failed payment streams for revenue at risk' },
  { id: 2, label: 'Scoring opportunities with calibrated ML probabilities' },
  { id: 3, label: 'Calculating expected recovery value for each opportunity' },
  { id: 4, label: 'Ranking strategies by highest net expected value' },
  { id: 5, label: 'Running deterministic safety preflight checks' },
  { id: 6, label: 'Executing permitted synthetic recovery actions' },
  { id: 7, label: 'Recording outcomes and audit trail' },
];

const SAFETY_CHECKS = [
  { label: 'Duplicate charge protection', desc: 'No payment retried if a duplicate charge has been detected' },
  { label: 'Retry budget enforcement', desc: 'Respects max retry count policy per payment' },
  { label: 'Idempotency guarantee', desc: 'Each payment ID executed at most once per mission' },
  { label: 'Financial viability gate', desc: 'Only actions with positive expected value proceed' },
  { label: 'Permanent decline protection', desc: 'Card-expired and fraud-flagged payments are never retried' },
];

const RecoveryMission = () => {
  const { addToast } = useToast();
  const [phase, setPhase] = useState('IDLE'); // IDLE | PREFLIGHT | RUNNING | DONE | ERROR
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [limit, setLimit] = useState(50);

  const runMission = async () => {
    try {
      setPhase('PREFLIGHT');
      setPhase('RUNNING');

      const res = await runRecoveryMission({ limit });
      setCurrentStep(MISSION_STEPS.length);
      setResult(res.data);
      setPhase('DONE');
    } catch (err) {
      setErrorMsg(err.message || 'Recovery Mission could not be completed.');
      setPhase('ERROR');
    }
  };

  const reset = () => {
    setPhase('IDLE');
    setCurrentStep(0);
    setResult(null);
    setErrorMsg('');
  };

  return (
    <div className="page-stack">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1>Recovery Mission</h1>
          <p>Bounded agentic workflow: detect, score, calibrate, rank, safeguard, execute, measure.</p>
        </div>
        {phase === 'DONE' && (
          <button className="btn btn-secondary" onClick={reset} id="mission-reset">
            <RotateCcw size={14} /> New Mission
          </button>
        )}
      </div>

      {/* ── IDLE State ─────────────────────────────────────── */}
      {phase === 'IDLE' && (
        <>
          {/* Mission Configuration */}
          <div className="decision-section">
            <div className="decision-section-header">
              <span className="section-heading">Mission Configuration</span>
            </div>
            <div className="decision-section-body">
              <div style={{ maxWidth: 280 }}>
                <label className="auth-field-label" htmlFor="mission-limit">
                  Max Opportunities to Process
                </label>
                <input
                  id="mission-limit"
                  type="number"
                  min={1}
                  max={100}
                  value={limit}
                  onChange={e => setLimit(Math.min(100, Math.max(1, Number(e.target.value))))}
                  style={{ width: '100%', marginTop: 4 }}
                />
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>1–100 opportunities per mission</div>
              </div>
            </div>
          </div>

          {/* Product story steps */}
          <div className="decision-section">
            <div className="decision-section-header">
              <span className="section-heading">Mission Workflow</span>
              <span className="badge badge-neutral">7 steps</span>
            </div>
            <div className="decision-section-body" style={{ padding: 0 }}>
              {MISSION_STEPS.map((step, idx) => (
                <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: idx < MISSION_STEPS.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--subtle)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0 }}>
                    {step.id}
                  </div>
                  <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>{step.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Safety preflight preview */}
          <div className="decision-section">
            <div className="decision-section-header">
              <span className="section-heading">
                <ShieldCheck size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                Safety Preflight — Always Runs Before Execution
              </span>
              <span className="badge badge-neutral">5 gates enforced at execution</span>
            </div>
            <div className="decision-section-body" style={{ padding: 0 }}>
              {SAFETY_CHECKS.map((check, i) => (
                <div key={i} className="evidence-item" style={{ padding: '10px 20px' }}>
                  <ShieldCheck size={15} className="evidence-icon-pass" />
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.84rem' }}>{check.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{check.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <button
              className="btn btn-primary btn-lg"
              onClick={runMission}
              id="mission-start"
              style={{ width: '100%' }}
            >
              <Play size={16} />
              Start Recovery Mission
            </button>
          </div>
        </>
      )}

      {/* ── PREFLIGHT State ────────────────────────────────── */}
      {phase === 'PREFLIGHT' && (
        <div className="decision-section">
          <div className="decision-section-header">
            <span className="section-heading">
              <ShieldCheck size={15} style={{ marginRight: 6 }} />
              Safety Preflight
            </span>
          </div>
          <div className="decision-section-body" style={{ padding: 0 }}>
            {SAFETY_CHECKS.map((check, i) => (
              <div key={i} className="preflight-row" style={{ padding: '10px 20px' }}>
                <RefreshCw size={14} className="animate-spin" style={{ color: 'var(--color-blue)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.84rem' }}>{check.label}</span>
              </div>
            ))}
            <div style={{ padding: '14px 20px', fontSize: '0.82rem', color: 'var(--color-blue)', fontWeight: 600 }}>
              Backend preflight is required before the mission can execute.
            </div>
          </div>
        </div>
      )}

      {/* ── RUNNING State ──────────────────────────────────── */}
      {phase === 'RUNNING' && (
        <div className="decision-section">
          <div className="decision-section-header">
            <span className="section-heading">
              <RefreshCw size={15} className="animate-spin" style={{ marginRight: 6 }} />
              Mission Authorized — Backend Pipeline Running
            </span>
            <span className="badge badge-blue">Running</span>
          </div>
          <div className="decision-section-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {MISSION_STEPS.map((step, idx) => {
              const done    = idx + 1 < currentStep;
              const active  = idx + 1 === currentStep;
              const pending = idx + 1 > currentStep;
              return (
                <div
                  key={step.id}
                  className={`mission-step ${active ? 'active' : done ? 'done' : ''}`}
                  style={{ opacity: pending ? 0.4 : 1 }}
                >
                  {done
                    ? <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                    : active
                    ? <RefreshCw size={15} className="animate-spin" style={{ flexShrink: 0 }} />
                    : <div style={{ width: 15, height: 15, borderRadius: '50%', border: '1px solid currentColor', flexShrink: 0 }} />}
                  <span>{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ERROR State ────────────────────────────────────── */}
      {phase === 'ERROR' && (
        <div style={{ padding: '20px 24px', background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <XCircle size={16} color="var(--color-danger)" />
            <span style={{ fontWeight: 600, color: 'var(--color-danger)' }}>Mission Failed</span>
          </div>
          <p style={{ fontSize: '0.84rem', color: 'var(--color-danger)' }}>{errorMsg}</p>
          <button className="btn btn-secondary btn-sm" onClick={reset} style={{ marginTop: 12 }}>Try Again</button>
        </div>
      )}

      {/* ── DONE State — Mission Report ─────────────────────── */}
      {phase === 'DONE' && result && (
        <>
          {/* Safety confirmation */}
          <div style={{ padding: '14px 20px', background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={16} color="var(--color-success)" />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--color-success)' }}>Mission Completed — Safety Controls Enforced</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', marginTop: 2, opacity: 0.8 }}>
                All safety gates were applied before every execution. Backend policies remain authoritative.
              </div>
            </div>
          </div>

          {/* Mission KPI grid */}
          <div className="decision-section">
            <div className="decision-section-header">
              <span className="section-heading">Mission Report</span>
              <span className="badge badge-success">Completed</span>
            </div>
            <div className="mission-kpi-grid" style={{ borderRadius: 0, border: 'none', borderTop: '1px solid var(--border-color)' }}>
              {[
                { label: 'Revenue at Risk',     value: fmt(result.revenueAtRisk),         sub: 'Total identified' },
                { label: 'Expected Recovery',   value: fmt(result.expectedRecovery),      sub: 'Pre-execution EV' },
                { label: 'Actual Recovery',     value: fmt(result.actualRecovery),        sub: 'Post-execution', highlight: 'success' },
                { label: 'Actions Attempted',   value: result.actionsAttempted ?? '—' },
                { label: 'Actions Successful',  value: result.actionsSuccessful ?? '—',  highlight: 'success' },
                { label: 'Actions Blocked',     value: result.actionsBlocked ?? '—',     highlight: 'danger' },
                { label: 'Eligible',            value: result.eligible ?? '—' },
                { label: 'Analyzed',            value: result.analyzed ?? '—' },
                { label: 'Unsafe Prevented',    value: result.unsafeActionsPrevented ?? result.actionsBlocked ?? '—', highlight: 'blue' },
              ].map(({ label, value, sub, highlight }) => (
                <div key={label} className="mission-kpi-cell">
                  <div className="kpi-label">{label}</div>
                  <div style={{
                    fontSize: '1.35rem', fontWeight: 700, marginTop: 4,
                    color: highlight === 'success' ? 'var(--color-success)'
                         : highlight === 'danger'  ? 'var(--color-danger)'
                         : highlight === 'blue'    ? 'var(--color-blue)'
                         : 'var(--text-primary)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {value}
                  </div>
                  {sub && <div className="kpi-sub">{sub}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Execution breakdown from simulation */}
          {result.simulation?.actionsBreakdown && Object.keys(result.simulation.actionsBreakdown).length > 0 && (
            <div className="decision-section">
              <div className="decision-section-header">
                <span className="section-heading">Action Breakdown</span>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Strategy</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(result.simulation.actionsBreakdown).map(([action, count]) => (
                      <tr key={action}>
                        <td style={{ fontWeight: 500 }}>{action.replace(/_/g, ' ')}</td>
                        <td>{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="decision-section">
            <div className="decision-section-header">
              <span className="section-heading">Mission Decision Audit</span>
              <span className="badge badge-neutral">Backend results</span>
            </div>
            <div className="table-container">
              <table>
                <thead><tr><th>Payment</th><th>Amount</th><th>Strategy</th><th>Probability</th><th>Expected recovery</th><th>Safety</th><th>Outcome</th></tr></thead>
                <tbody>
                  {(result.simulation?.simulatedOpportunities || []).slice(0, limit).map((item) => {
                    const action = (result.execution?.actions || []).find(entry => entry.paymentId === item.paymentId);
                    return <tr key={item.opportunityId || item.paymentId}>
                      <td className="font-mono">{item.paymentId}</td>
                      <td>{fmt(item.amount)}</td>
                      <td>{String(item.action || 'Not available').replace(/_/g, ' ')}</td>
                      <td>{item.expectedSuccessRate == null ? 'Not available' : `${Math.round(item.expectedSuccessRate * 100)}%`}</td>
                      <td>{item.simulatedRecovered == null ? 'Not available' : fmt(item.simulatedRecovered)}</td>
                      <td>{item.simulatedOutcome === 'BLOCKED' ? <span className="badge badge-danger">Blocked</span> : <span className="badge badge-success">Permitted</span>}</td>
                      <td>{action?.result ? String(action.result).replace(/_/g, ' ') : item.simulatedOutcome || 'Not available'}</td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RecoveryMission;
