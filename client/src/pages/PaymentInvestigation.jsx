import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRecoveryOpportunities } from '../api';
import { useToast } from '../components/Toast';
import {
  Compass, Search, RefreshCw, ChevronRight, ShieldCheck,
  CheckCircle2, XCircle, AlertTriangle, ArrowRight
} from 'lucide-react';

const fmt = (n) => n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—';
const fmtDt = (d) => d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—';

const statusBadge = (status) => {
  if (!status) return <span className="badge badge-neutral">—</span>;
  const s = String(status).toUpperCase();
  if (s === 'RECOVERED')   return <span className="badge badge-success">Recovered</span>;
  if (s === 'PENDING')     return <span className="badge badge-info">Pending</span>;
  if (s === 'BLOCKED')     return <span className="badge badge-danger">Blocked</span>;
  if (s === 'FAILED')      return <span className="badge badge-danger">Failed</span>;
  if (s === 'IN_PROGRESS') return <span className="badge badge-warning">In Progress</span>;
  return <span className="badge badge-neutral">{status}</span>;
};

const decisionBadge = (action, policyStatus) => {
  const isBlocked = String(policyStatus).toUpperCase() === 'BLOCKED';
  if (isBlocked) {
    return (
      <span className="badge badge-danger" title="Blocked by safety policy">
        Halt Recovery
      </span>
    );
  }
  if (!action) return <span className="badge badge-neutral">—</span>;
  const formatted = action.replace(/_/g, ' ');
  return (
    <span className="badge badge-blue">
      {formatted}
    </span>
  );
};

const TABS = [
  { key: 'ALL',       label: 'All Payments' },
  { key: 'ELIGIBLE',  label: 'Eligible for Recovery' },
  { key: 'PENDING',   label: 'Pending Action' },
  { key: 'RECOVERED', label: 'Recovered' },
  { key: 'BLOCKED',   label: 'Policy Blocked' },
];

const PaymentInvestigation = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');

  const fetchRecords = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      const res = await getRecoveryOpportunities({ limit: 150 });
      setOpportunities(res.data || []);
    } catch (err) {
      addToast('Unable to load payment investigation records.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return opportunities.filter(opp => {
      // Tab filtering
      if (activeTab === 'ELIGIBLE' && opp.policyStatus?.toUpperCase() !== 'ELIGIBLE') return false;
      if (activeTab === 'BLOCKED' && opp.policyStatus?.toUpperCase() !== 'BLOCKED') return false;
      if (activeTab === 'RECOVERED' && opp.status?.toUpperCase() !== 'RECOVERED') return false;
      if (activeTab === 'PENDING' && opp.status?.toUpperCase() !== 'PENDING') return false;

      // Text search filtering
      if (!term) return true;
      const paymentId = (opp.paymentId || '').toLowerCase();
      const oppId = (opp.opportunityId || '').toLowerCase();
      const failure = (opp.failureReason || opp.failureType || '').toLowerCase();
      const provider = (opp.provider || '').toLowerCase();
      const customer = (opp.customerId || '').toLowerCase();
      const order = (opp.orderId || '').toLowerCase();
      const action = (opp.recommendedAction || opp.recommendedStrategy || '').toLowerCase();

      return (
        paymentId.includes(term) ||
        oppId.includes(term) ||
        failure.includes(term) ||
        provider.includes(term) ||
        customer.includes(term) ||
        order.includes(term) ||
        action.includes(term)
      );
    });
  }, [opportunities, search, activeTab]);

  // Status breakdown metrics
  const counts = useMemo(() => {
    const total = opportunities.length;
    const eligible = opportunities.filter(o => o.policyStatus?.toUpperCase() === 'ELIGIBLE').length;
    const blocked = opportunities.filter(o => o.policyStatus?.toUpperCase() === 'BLOCKED').length;
    const recovered = opportunities.filter(o => o.status?.toUpperCase() === 'RECOVERED').length;
    return { total, eligible, blocked, recovered };
  }, [opportunities]);

  return (
    <div className="page-stack">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1>Payment Investigation</h1>
          <p>
            Inspect individual payment recovery decisions, calibrated probability models, and safety policy preflight outcomes.
          </p>
        </div>
        <div className="page-header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => fetchRecords(true)}
            disabled={refreshing || loading}
            id="refresh-investigation-btn"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh Records'}
          </button>
        </div>
      </div>

      {/* ── Quick KPI Strip ────────────────────────────────────────── */}
      <div className="kpi-ribbon">
        <div className="kpi-cell">
          <div className="kpi-label">Active Records</div>
          <div className="kpi-value">{counts.total}</div>
          <div className="kpi-sub">Evaluated payments</div>
        </div>
        <div className="kpi-cell">
          <div className="kpi-label">Eligible for Recovery</div>
          <div className="kpi-value" style={{ color: 'var(--color-success)' }}>{counts.eligible}</div>
          <div className="kpi-sub">Passed all safety gates</div>
        </div>
        <div className="kpi-cell">
          <div className="kpi-label">Safety Blocked</div>
          <div className="kpi-value" style={{ color: 'var(--color-danger)' }}>{counts.blocked}</div>
          <div className="kpi-sub">Protected by guardrails</div>
        </div>
        <div className="kpi-cell">
          <div className="kpi-label">Recovered Payments</div>
          <div className="kpi-value" style={{ color: 'var(--color-blue)' }}>{counts.recovered}</div>
          <div className="kpi-sub">Successfully reconciled</div>
        </div>
      </div>

      {/* ── Filter Tabs & Search Bar ───────────────────────────────── */}
      <div className="decision-section">
        <div className="recovery-controls">
          <div className="tab-group">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="search-box">
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by Payment ID, Failure Code, Provider…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search payment records"
            />
          </div>
        </div>

        {/* ── Payment Records Table ──────────────────────────────────── */}
        <div className="table-container">
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 10px', display: 'block', color: 'var(--color-blue)' }} />
              Querying payment investigation records…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Compass size={28} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
              No payment records match the current filter or search criteria.
            </div>
          ) : (
            <table className="investigation-table">
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Amount</th>
                  <th>Failure Code</th>
                  <th>Provider</th>
                  <th>Status</th>
                  <th>Recovery Decision</th>
                  <th>Created At</th>
                  <th style={{ width: '40px' }} aria-label="Action"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(opp => {
                  const targetId = opp.paymentId || opp.opportunityId;
                  const failureReason = opp.failureReason || opp.failureType || '—';
                  const action = opp.recommendedAction || opp.recommendedStrategy || '—';

                  return (
                    <tr
                      key={targetId}
                      onClick={() => navigate(`/investigation/${targetId}`)}
                      style={{ cursor: 'pointer' }}
                      className="clickable-row"
                    >
                      <td>
                        <span className="font-mono" style={{ fontWeight: 600, color: 'var(--color-blue)' }}>
                          {opp.paymentId || targetId}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {fmt(opp.amount)}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {failureReason.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.78rem' }}>
                          {opp.provider || '—'}
                        </span>
                      </td>
                      <td>
                        {statusBadge(opp.status)}
                      </td>
                      <td>
                        {decisionBadge(action, opp.policyStatus)}
                      </td>
                      <td>
                        <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {fmtDt(opp.createdAt || opp.failureTimestamp)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '16px' }}>
                        <ChevronRight size={15} style={{ color: 'var(--text-muted)' }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentInvestigation;
