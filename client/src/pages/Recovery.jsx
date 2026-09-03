import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getRecoveryOpportunities,
  scanRecoveryOpportunities
} from '../api';
import { useToast } from '../components/Toast';
import { RotateCcw, RefreshCw, Search, Compass, ChevronUp, ChevronDown } from 'lucide-react';

const fmt = (n) => n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—';
const pct = (n) => n != null ? `${Number(n).toFixed(1)}%` : '—';

const statusBadge = (status) => {
  if (!status) return <span className="badge badge-neutral">—</span>;
  const s = String(status).toUpperCase();
  if (s === 'RECOVERED')    return <span className="badge badge-success">Recovered</span>;
  if (s === 'PENDING')      return <span className="badge badge-info">Pending</span>;
  if (s === 'BLOCKED')      return <span className="badge badge-danger">Blocked</span>;
  if (s === 'FAILED')       return <span className="badge badge-danger">Failed</span>;
  if (s === 'IN_PROGRESS')  return <span className="badge badge-warning">In Progress</span>;
  return <span className="badge badge-neutral">{status}</span>;
};

const policyBadge = (status) => {
  if (!status) return null;
  const s = String(status).toUpperCase();
  if (s === 'ELIGIBLE') return <span className="badge badge-success">Eligible</span>;
  if (s === 'BLOCKED')  return <span className="badge badge-danger">Blocked</span>;
  return <span className="badge badge-neutral">{status}</span>;
};

const TABS = [
  { key: 'ALL',          label: 'All' },
  { key: 'ELIGIBLE',     label: 'Eligible' },
  { key: 'PENDING',      label: 'Pending' },
  { key: 'RECOVERED',    label: 'Recovered' },
  { key: 'BLOCKED',      label: 'Blocked' },
];

const SortIcon = ({ col, sort }) => {
  if (sort.col !== col) return <ChevronUp size={12} style={{ opacity: 0.25 }} />;
  return sort.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
};

const Recovery = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [sort, setSort] = useState({ col: 'expectedValue', dir: 'desc' });

  const fetchOpps = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      const res = await getRecoveryOpportunities({ limit: 150 });
      setOpportunities(res.data || []);
    } catch (err) {
      addToast('Unable to load recovery opportunities.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchOpps(); }, []);

  const handleScan = async () => {
    try {
      setRefreshing(true);
      await scanRecoveryOpportunities({ lookbackHours: 72 });
      await fetchOpps(true);
      addToast('Revenue risk scan completed.', 'success');
    } catch (err) {
      addToast('Unable to scan revenue at risk: ' + err.message, 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const cycleSort = (col) => {
    setSort(prev => prev.col === col
      ? { col, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
      : { col, dir: 'desc' }
    );
  };

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return opportunities
      .filter(opp => {
        if (activeTab !== 'ALL') {
          if (activeTab === 'ELIGIBLE' && opp.policyStatus?.toUpperCase() !== 'ELIGIBLE') return false;
          if (activeTab === 'BLOCKED' && opp.policyStatus?.toUpperCase() !== 'BLOCKED') return false;
          if (activeTab === 'RECOVERED' && opp.status?.toUpperCase() !== 'RECOVERED') return false;
          if (activeTab === 'PENDING' && opp.status?.toUpperCase() !== 'PENDING') return false;
        }
        if (!term) return true;
        return (
          opp.paymentId?.toLowerCase().includes(term) ||
          opp.opportunityId?.toLowerCase().includes(term) ||
          opp.failureReason?.toLowerCase().includes(term) ||
          opp.failureType?.toLowerCase().includes(term) ||
          opp.recommendedAction?.toLowerCase().includes(term) ||
          opp.status?.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        const col = sort.col;
        const av = a[col] ?? 0;
        const bv = b[col] ?? 0;
        if (typeof av === 'string') return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
        return sort.dir === 'asc' ? av - bv : bv - av;
      });
  }, [opportunities, activeTab, search, sort]);

  const counts = useMemo(() => ({
    ALL:       opportunities.length,
    ELIGIBLE:  opportunities.filter(o => o.policyStatus?.toUpperCase() === 'ELIGIBLE').length,
    PENDING:   opportunities.filter(o => o.status?.toUpperCase() === 'PENDING').length,
    RECOVERED: opportunities.filter(o => o.status?.toUpperCase() === 'RECOVERED').length,
    BLOCKED:   opportunities.filter(o => o.policyStatus?.toUpperCase() === 'BLOCKED').length,
  }), [opportunities]);

  const ThSort = ({ col, label }) => (
    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => cycleSort(col)}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label} <SortIcon col={col} sort={sort} />
      </span>
    </th>
  );

  return (
    <div className="page-stack">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1>Recovery Queue</h1>
          <p>Ranked by expected recovery value. Investigate any payment to see the full decision record.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => fetchOpps(true)} disabled={refreshing} id="queue-refresh">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button className="btn btn-secondary" onClick={handleScan} disabled={refreshing} id="queue-scan">
            <RotateCcw size={14} />
            Scan Revenue Risk
          </button>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by payment ID, failure, action…"
            style={{ paddingLeft: 32 }}
            id="queue-search"
          />
        </div>
        <div className="tab-group">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              className={`tab-btn${activeTab === key ? ' active' : ''}`}
              onClick={() => setActiveTab(key)}
              id={`tab-${key.toLowerCase()}`}
            >
              {label}
              <span style={{ marginLeft: 4, fontSize: '0.65rem', opacity: 0.75 }}>({counts[key]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────── */}
      <div className="decision-section">
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
            <RefreshCw size={14} className="animate-spin" style={{ marginRight: 6 }} />
            Loading recovery queue…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
            {search ? 'No payments match your search.' : 'No opportunities found. Run a revenue scan to populate the queue.'}
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <ThSort col="paymentId"          label="Payment ID" />
                  <ThSort col="amount"              label="Amount" />
                  <th>Failure</th>
                  <ThSort col="recoveryProbability" label="Probability" />
                  <ThSort col="expectedValue"       label="Expected Value" />
                  <th>Recommended Action</th>
                  <th>Safety</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(opp => {
                  const id = opp.paymentId || opp.opportunityId;
                  return (
                    <tr key={id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/investigation/${id}`)}>
                      <td>
                        <span className="font-mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {id}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                        {fmt(opp.amount)}
                      </td>
                      <td style={{ maxWidth: 160 }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {(opp.failureReason || opp.failureType || '—').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--color-blue)', whiteSpace: 'nowrap' }}>
                        {pct((opp.recoveryProbability ?? 0) * 100)}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--color-success)', whiteSpace: 'nowrap' }}>
                        {fmt(opp.expectedValue)}
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {(opp.recommendedAction || opp.recommendedStrategy || '—').replace(/_/g, ' ')}
                      </td>
                      <td>{policyBadge(opp.policyStatus)}</td>
                      <td>{statusBadge(opp.status)}</td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => { e.stopPropagation(); navigate(`/investigation/${id}`); }}
                          id={`investigate-${id}`}
                        >
                          <Compass size={12} />
                          Investigate
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > 0 && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Showing {filtered.length} of {opportunities.length} opportunities</span>
            <span>Sorted by {sort.col.replace(/([A-Z])/g, ' $1').toLowerCase()} ({sort.dir}ending)</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Recovery;
