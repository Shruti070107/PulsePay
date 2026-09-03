import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getRecoveryMetrics,
  getRecoveryOpportunities,
  getLatestBenchmark,
  scanRecoveryOpportunities,
  runRecoveryMission,
  simulateRecovery,
} from '../api';
import { useToast } from '../components/Toast';
import {
  ShieldCheck, ArrowRight, RotateCcw, RefreshCw, Play,
  CheckCircle2, XCircle, AlertTriangle, Compass, TrendingUp
} from 'lucide-react';

const fmt = (n) => {
  if (n == null) return '—';
  return `₹${Number(n).toLocaleString('en-IN')}`;
};

const pct = (n) => n != null ? `${Number(n).toFixed(1)}%` : '—';

const SAFETY_GATES = [
  'Duplicate charge protection',
  'Retry budget enforcement',
  'Idempotency guarantee',
  'Financial viability gate',
  'Permanent decline protection',
];

const statusBadge = (status) => {
  if (!status) return <span className="badge badge-neutral">—</span>;
  const s = String(status).toUpperCase();
  if (s === 'RECOVERED') return <span className="badge badge-success">RECOVERED</span>;
  if (s === 'PENDING')   return <span className="badge badge-info">PENDING</span>;
  if (s === 'BLOCKED')   return <span className="badge badge-danger">BLOCKED</span>;
  return <span className="badge badge-neutral">{status}</span>;
};

const policyBadge = (status) => {
  if (!status) return null;
  const s = String(status).toUpperCase();
  if (s === 'ELIGIBLE') return <span className="badge badge-success">ELIGIBLE</span>;
  if (s === 'BLOCKED')  return <span className="badge badge-danger">BLOCKED</span>;
  return <span className="badge badge-neutral">{status}</span>;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [metrics, setMetrics] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [benchmark, setBenchmark] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [missionRunning, setMissionRunning] = useState(false);
  const [missionResult, setMissionResult] = useState(null);
  const [nboSimulating, setNboSimulating] = useState(false);

  const fetchData = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else if (!metrics) setLoading(true);
      const [metricsRes, oppsRes, benchRes] = await Promise.all([
        getRecoveryMetrics().catch(() => ({ success: true, data: {} })),
        getRecoveryOpportunities({ limit: 8 }).catch(() => ({ success: true, data: [] })),
        getLatestBenchmark().catch(() => ({ success: true, data: null })),
      ]);
      setMetrics(metricsRes.data || {});
      setOpportunities(oppsRes.data || []);
      setBenchmark(benchRes.data || null);
    } catch {
      addToast('Unable to load recovery metrics. Please refresh.', 'warning');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, []);

  const handleScan = async () => {
    try {
      setRefreshing(true);
      await scanRecoveryOpportunities({ lookbackHours: 72 });
      await fetchData(true);
      addToast('Revenue risk scan completed.', 'success');
    } catch (err) {
      addToast('Unable to complete revenue scan: ' + err.message, 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleRunMission = async () => {
    try {
      setMissionRunning(true);
      const res = await runRecoveryMission({ limit: 50 });
      setMissionResult(res.data);
      await fetchData(true);
      addToast(`Recovery Mission completed. Recovered ${fmt(res.data?.actualRecovery || 0)}.`, 'success');
    } catch (err) {
      addToast('Recovery Mission could not be completed: ' + err.message, 'error');
    } finally {
      setMissionRunning(false);
    }
  };

  const handleNboSimulate = async () => {
    if (!nbo) return;
    try {
      setNboSimulating(true);
      const res = await simulateRecovery({ opportunityIds: [nbo.opportunityId || nbo.paymentId] });
      addToast(`Simulation complete. Expected recovery ${fmt(res.data?.expectedRecoveredAmount)}.`, 'info');
    } catch (err) {
      addToast(`Recovery simulation could not be completed: ${err.message}`, 'error');
    } finally {
      setNboSimulating(false);
    }
  };

  const nbo = metrics?.nextBestOpportunity;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
        <RefreshCw size={16} className="animate-spin" style={{ marginRight: 8 }} />
        Loading Revenue Center…
      </div>
    );
  }

  return (
    <div className="page-stack">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1>Revenue Center</h1>
          <p>Real-time revenue recovery operations</p>
        </div>
        <div className="page-header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            id="dashboard-refresh"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleScan}
            disabled={refreshing}
            id="dashboard-scan"
          >
            <RotateCcw size={14} />
            Scan Revenue Risk
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/mission')}
            id="dashboard-mission"
          >
            <Play size={14} />
            Recovery Mission
          </button>
        </div>
      </div>

      {/* ── KPI Ribbon ──────────────────────────────────────── */}
      <div className="kpi-ribbon">
        <div className="kpi-cell kpi-success">
          <div className="kpi-label">Total Recovered</div>
          <div className="kpi-value">{metrics ? fmt(metrics.actualRecovered) : 'Loading…'}</div>
          <div className="kpi-sub">Net revenue recovered</div>
        </div>
        <div className="kpi-cell kpi-blue">
          <div className="kpi-label">Net Value Added</div>
          <div className="kpi-value">
            {benchmark?.baselineComparison?.netImprovementAmount != null
              ? fmt(benchmark.baselineComparison.netImprovementAmount)
              : 'No benchmark data'}
          </div>
          <div className="kpi-sub">vs. blind retry baseline</div>
        </div>
        <div className="kpi-cell">
          <div className="kpi-label">Recovery Precision</div>
          <div className="kpi-value" style={{ color: 'var(--color-success)' }}>
            {benchmark?.recoveryPrecision != null
              ? pct(benchmark.recoveryPrecision)
              : 'No benchmark data'}
          </div>
          <div className="kpi-sub">No false charges</div>
        </div>
        <div className="kpi-cell kpi-warning">
          <div className="kpi-label">Revenue at Risk</div>
          <div className="kpi-value">{metrics ? fmt(metrics.totalRevenueAtRisk) : 'Loading…'}</div>
          <div className="kpi-sub">Across failed payments</div>
        </div>
        <div className="kpi-cell">
          <div className="kpi-label">Action Eligible</div>
          <div className="kpi-value">
            {metrics ? metrics.eligibleOpportunityCount : 'Loading…'}
          </div>
          <div className="kpi-sub">Opportunities in queue</div>
        </div>
      </div>

      {/* ── Next Best Opportunity ────────────────────────────── */}
      {nbo ? (
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>NEXT BEST OPPORTUNITY</div>
          <div className="nbo-card">
            <div className="nbo-header">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="font-mono" style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {nbo.paymentId}
                  </span>
                  {policyBadge(nbo.policyStatus)}
                  {statusBadge(nbo.status)}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {nbo.failureReason || nbo.failureType || 'Unknown failure'}
                </span>
              </div>
            </div>

            <div className="nbo-body">
              <div>
                <div className="nbo-metric-label">Amount at Risk</div>
                <div className="nbo-metric-value">{fmt(nbo.amount)}</div>
              </div>
              <div>
                <div className="nbo-metric-label">Calibrated Recovery Probability</div>
                <div className="nbo-metric-value" style={{ color: 'var(--color-blue)' }}>
                  {pct((nbo.recoveryProbability ?? 0) * 100)}
                </div>
              </div>
              <div>
                <div className="nbo-metric-label">Expected Recovery Value</div>
                <div className="nbo-metric-value" style={{ color: 'var(--color-success)' }}>
                  {fmt(nbo.expectedValue ?? nbo.estimatedRecoverableAmount)}
                </div>
              </div>
            </div>

            <div className="nbo-actions">
              <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Recommended:
                </span>
                <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>
                  {(nbo.recommendedAction || nbo.recommendedStrategy || '—').replace(/_/g, ' ')}
                </span>
                <span className={nbo.policyStatus === 'BLOCKED' ? 'badge badge-danger' : 'badge badge-success'}>
                  {nbo.policyStatus === 'BLOCKED' ? (nbo.blockedReason || 'Action blocked') : 'Safety checks clear'}
                </span>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                id="nbo-simulate"
                onClick={handleNboSimulate}
                disabled={nboSimulating}
              >
                {nboSimulating ? 'Simulating…' : 'Simulate Recovery'}
              </button>
              <button
                className="btn btn-primary btn-sm"
                id="nbo-investigate"
                onClick={() => navigate(`/investigation/${nbo.paymentId}`)}
              >
                Investigate Payment
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '24px', background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RotateCcw size={20} style={{ marginBottom: 8 }} />
          <div>No active recovery opportunities. Run a revenue scan to detect failed payments.</div>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={handleScan} id="nbo-scan-btn">
            Scan Revenue Risk
          </button>
        </div>
      )}

      {/* ── Recovery Performance + Safety ────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Performance summary */}
        <div className="decision-section">
          <div className="decision-section-header">
            <span className="section-heading">
              <TrendingUp size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Recovery Performance
            </span>
            {benchmark && (
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/experiments')} id="view-benchmark">
                View Benchmark <ArrowRight size={12} />
              </button>
            )}
          </div>
          <div className="decision-section-body" style={{ padding: '0' }}>
            {[
              { label: 'Benchmark Net Recovery', value: benchmark ? fmt(benchmark.netRecoveredRevenue) : 'No benchmark data', sub: 'PulsePay calibrated' },
              { label: 'Blind Retry Baseline', value: benchmark ? fmt(benchmark.baselineComparison?.blindRetryNetRecovery) : 'No benchmark data' },
              { label: 'Net Lift over Baseline', value: benchmark ? `+${Number(benchmark.baselineComparison?.netImprovementPercentage || 0).toFixed(1)}%` : 'No benchmark data', highlight: 'success' },
              { label: 'Duplicate Charges', value: benchmark ? benchmark.calibrationComparison?.duplicateChargesAfter : 'No benchmark data', highlight: 'success' },
              { label: 'Unsafe Actions Prevented', value: benchmark ? benchmark.unsafeActionsPrevented : 'No benchmark data', highlight: 'blue' },
            ].map(({ label, value, sub, highlight }) => (
              <div key={label} className="policy-row" style={{ padding: '10px 20px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>{label}</span>
                <span style={{
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  color: highlight === 'success' ? 'var(--color-success)' : highlight === 'blue' ? 'var(--color-blue)' : 'var(--text-primary)',
                }}>
                  {value}{sub && <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>{sub}</span>}
                </span>
              </div>
            ))}
          </div>
          {benchmark && (
            <div className="performance-chart" aria-label="PulsePay and blind retry benchmark comparison">
              <div className="performance-bar-row"><span>PulsePay</span><div><i style={{ width: `${Math.min(100, (benchmark.netRecoveredRevenue / Math.max(benchmark.netRecoveredRevenue, benchmark.baselineComparison?.blindRetryNetRecovery || 1)) * 100)}%` }} /></div><strong>{fmt(benchmark.netRecoveredRevenue)}</strong></div>
              <div className="performance-bar-row"><span>Blind Retry</span><div><i className="baseline" style={{ width: `${Math.min(100, (benchmark.baselineComparison?.blindRetryNetRecovery / Math.max(benchmark.netRecoveredRevenue, benchmark.baselineComparison?.blindRetryNetRecovery || 1)) * 100)}%` }} /></div><strong>{fmt(benchmark.baselineComparison?.blindRetryNetRecovery)}</strong></div>
            </div>
          )}
        </div>

        {/* Safety gates */}
        <div className="decision-section">
          <div className="decision-section-header">
            <span className="section-heading">
              <ShieldCheck size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Safety &amp; Reliability
            </span>
            <span className="badge badge-success">All Active</span>
          </div>
          <div className="decision-section-body" style={{ padding: '0' }}>
            {SAFETY_GATES.map(gate => (
              <div key={gate} className="evidence-item" style={{ padding: '10px 20px' }}>
                <CheckCircle2 size={15} className="evidence-icon-pass" />
                <span style={{ fontSize: '0.84rem' }}>{gate}</span>
              </div>
            ))}
            <div style={{ padding: '10px 20px 14px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Backend safety controls are authoritative. Frontend cannot override.
            </div>
          </div>
        </div>
      </div>

      {/* ── Recovery Queue Preview ───────────────────────────── */}
      {opportunities.length > 0 && (
        <div className="decision-section">
          <div className="decision-section-header">
            <span className="section-heading">Recovery Queue</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/recovery')} id="view-all-queue">
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Amount</th>
                  <th>Failure</th>
                  <th>Probability</th>
                  <th>Expected Value</th>
                  <th>Action</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {opportunities.slice(0, 6).map(opp => (
                  <tr key={opp.paymentId || opp.opportunityId} style={{ cursor: 'pointer' }} onClick={() => navigate(`/investigation/${opp.paymentId || opp.opportunityId}`)}>
                    <td>
                      <span className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {opp.paymentId || opp.opportunityId}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{fmt(opp.amount)}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ fontSize: '0.78rem' }}>{(opp.failureReason || opp.failureType || '—').replace(/_/g, ' ')}</span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--color-blue)' }}>
                      {pct((opp.recoveryProbability ?? 0) * 100)}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--color-success)' }}>{fmt(opp.expectedValue)}</td>
                    <td>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {(opp.recommendedAction || opp.recommendedStrategy || '—').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>{statusBadge(opp.status)}</td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => { e.stopPropagation(); navigate(`/investigation/${opp.paymentId || opp.opportunityId}`); }}
                      >
                        <Compass size={12} />
                        Investigate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Mission Result Banner ────────────────────────────── */}
      {missionResult && (
        <div style={{ background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <CheckCircle2 size={16} color="var(--color-success)" />
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-success)' }}>Recovery Mission Completed</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
            {[
              { label: 'Actual Recovery', value: fmt(missionResult.actualRecovery) },
              { label: 'Actions Attempted', value: missionResult.actionsAttempted ?? '—' },
              { label: 'Actions Successful', value: missionResult.actionsSuccessful ?? '—' },
              { label: 'Unsafe Prevented', value: missionResult.unsafeActionsPrevented ?? missionResult.actionsBlocked ?? '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-success)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
