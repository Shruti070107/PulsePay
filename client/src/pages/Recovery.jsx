import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getRecoveryOpportunities, 
  simulateRecovery, 
  executeRecovery, 
  scanRecoveryOpportunities 
} from '../api';
import { useToast } from '../components/Toast';
import { 
  RotateCcw, RefreshCw, Search, Play, Compass, ArrowUpDown
} from 'lucide-react';

const Recovery = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [executing, setExecuting] = useState(false);
  
  // Search, Filter, Sort
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, HIGH_RECOVERY, WEBHOOK_SYNC, BLOCKED, RECOVERED
  const [selectedIds, setSelectedIds] = useState([]);

  const fetchOpps = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const res = await getRecoveryOpportunities({ limit: 100 });
      setOpportunities(res.data || []);
    } catch (err) {
      console.error('Failed to load recovery opportunities', err);
      addToast('Failed to load recovery queue items.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOpps();
  }, []);

  const handleScan = async () => {
    try {
      setRefreshing(true);
      await scanRecoveryOpportunities({ lookbackHours: 72 });
      await fetchOpps(true);
      addToast('Revenue risk scan completed.', 'success');
    } catch (err) {
      addToast('Failed to scan revenue at risk: ' + err.message, 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredOpps.map(o => o.opportunityId || o.paymentId));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleExecuteSelected = async () => {
    if (selectedIds.length === 0) return;
    try {
      setExecuting(true);
      const res = await executeRecovery({ opportunityIds: selectedIds });
      const count = res.data?.totalExecuted || selectedIds.length;
      addToast(`Executed recovery for ${count} payment(s).`, 'success');
      setSelectedIds([]);
      await fetchOpps(true);
    } catch (err) {
      addToast('Execution failed: ' + err.message, 'error');
    } finally {
      setExecuting(false);
    }
  };

  // Filter & Sort Pipeline (Sorted by Expected Value descending by default)
  const filteredOpps = useMemo(() => {
    return opportunities
      .filter(opp => {
        // Search
        const term = search.toLowerCase();
        const matchesSearch = 
          !search ||
          opp.paymentId?.toLowerCase().includes(term) ||
          opp.opportunityId?.toLowerCase().includes(term) ||
          opp.failureReason?.toLowerCase().includes(term) ||
          opp.recommendedStrategy?.toLowerCase().includes(term);

        if (!matchesSearch) return false;

        // Tab Filter
        if (activeTab === 'HIGH_RECOVERY') {
          return (opp.expectedValue || (opp.amount * 0.8)) >= 2000 && opp.policyStatus === 'ELIGIBLE';
        }
        if (activeTab === 'WEBHOOK_SYNC') {
          return opp.recommendedStrategy === 'RECONCILE_WEBHOOK' || opp.recommendedAction === 'RECONCILE_WEBHOOK';
        }
        if (activeTab === 'BLOCKED') {
          return opp.policyStatus === 'BLOCKED' || opp.recommendedStrategy === 'STOP_RECOVERY';
        }
        if (activeTab === 'RECOVERED') {
          return opp.status === 'RECOVERED';
        }

        return true;
      })
      .sort((a, b) => {
        const evA = a.expectedValue || (a.amount * (a.recoveryProbability || 0.8) - 10);
        const evB = b.expectedValue || (b.amount * (b.recoveryProbability || 0.8) - 10);
        return evB - evA;
      });
  }, [opportunities, search, activeTab]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '700', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Recovery Queue
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Show me payments worth recovering, prioritized by Expected Value (EV).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary" 
            onClick={handleScan}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Scan Risk
          </button>

          {selectedIds.length > 0 && (
            <button 
              className="btn btn-primary"
              onClick={handleExecuteSelected}
              disabled={executing}
            >
              <Play size={14} fill="currentColor" />
              {executing ? 'Executing...' : `Recover Selected (${selectedIds.length})`}
            </button>
          )}
        </div>
      </div>

      {/* 2. OPERATIONAL FILTERS & SEARCH */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        
        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          {[
            { key: 'ALL', label: 'All Opportunities' },
            { key: 'HIGH_RECOVERY', label: 'High EV (≥ ₹2k)' },
            { key: 'WEBHOOK_SYNC', label: 'Webhook Sync' },
            { key: 'BLOCKED', label: 'Blocked by Policy' },
            { key: 'RECOVERED', label: 'Recovered' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: activeTab === tab.key ? 'var(--color-info)' : 'transparent',
                color: activeTab === tab.key ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                fontWeight: activeTab === tab.key ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', minWidth: '240px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search payment ID, reason..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: '32px' }}
          />
        </div>

      </div>

      {/* 3. TABLE */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll}
                    checked={filteredOpps.length > 0 && selectedIds.length === filteredOpps.length}
                  />
                </th>
                <th>Payment ID</th>
                <th>Failure Reason</th>
                <th>Recommended Action</th>
                <th>Recovery Probability</th>
                <th>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Expected Value</span>
                    <ArrowUpDown size={12} style={{ color: 'var(--color-info)' }} />
                  </div>
                </th>
                <th>Safety Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <RotateCcw size={24} className="animate-spin" style={{ margin: '0 auto 10px', color: 'var(--color-info)' }} />
                    <div>Loading recovery queue...</div>
                  </td>
                </tr>
              ) : filteredOpps.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No matching recovery opportunities found. Click "Scan Risk" to scan recent failed payments.
                  </td>
                </tr>
              ) : (
                filteredOpps.map(opp => {
                  const id = opp.opportunityId || opp.paymentId;
                  const isBlocked = opp.policyStatus === 'BLOCKED' || opp.recommendedStrategy === 'STOP_RECOVERY' || opp.recommendedAction === 'STOP_RECOVERY';
                  const isRecovered = opp.status === 'RECOVERED';
                  const prob = Math.round((opp.recoveryProbability || 0.85) * 100);
                  const isSelected = selectedIds.includes(id);

                  return (
                    <tr key={id} style={{ backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.05)' : 'transparent' }}>
                      <td>
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => handleSelectOne(id)}
                          disabled={isBlocked || isRecovered}
                        />
                      </td>
                      <td>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                          #{opp.paymentId || opp.opportunityId}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          ₹{opp.amount?.toLocaleString()}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {opp.failureReason || opp.failureType || 'Gateway Timeout'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: '600', color: isBlocked ? 'var(--text-muted)' : 'var(--color-info)' }}>
                          {String(opp.recommendedStrategy || opp.recommendedAction || 'DELAYED_RETRY').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600', color: isBlocked ? 'var(--text-muted)' : (prob >= 75 ? 'var(--color-healthy)' : 'var(--color-warning)') }}>
                          {isBlocked ? '—' : `${prob}%`}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600', color: isBlocked ? 'var(--text-muted)' : 'var(--color-healthy)' }}>
                          ₹{(opp.expectedValue || (opp.amount * 0.85 - 10)).toLocaleString()}
                        </span>
                      </td>
                      <td>
                        {isRecovered ? (
                          <span className="badge badge-success">Recovered</span>
                        ) : isBlocked ? (
                          <span className="badge badge-danger">Blocked by Safety Policy</span>
                        ) : (
                          <span className="badge badge-info">✓ Eligible</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="btn btn-secondary"
                          onClick={() => navigate(`/investigation/${opp.paymentId || opp.opportunityId}`)}
                          style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                        >
                          Investigate
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default Recovery;
