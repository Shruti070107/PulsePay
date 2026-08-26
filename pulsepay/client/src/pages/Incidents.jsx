import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIncidents } from '../api';
import { ShieldAlert, RefreshCw, Filter, ArrowUpDown } from 'lucide-react';

const Incidents = () => {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  
  // Sorting
  const [sortBy, setSortBy] = useState('latest');

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const res = await getIncidents();
      setIncidents(res.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to load incidents list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  // Filter logic
  let filtered = incidents.filter(inc => {
    const statusMatch = !statusFilter || inc.status === statusFilter;
    const severityMatch = !severityFilter || inc.severity === severityFilter;
    const typeMatch = !typeFilter || inc.type === typeFilter;
    return statusMatch && severityMatch && typeMatch;
  });

  // Sort logic
  filtered.sort((a, b) => {
    if (sortBy === 'latest') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    if (sortBy === 'amount') {
      return b.affectedAmount - a.affectedAmount;
    }
    if (sortBy === 'severity') {
      const weight = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      return (weight[b.severity] || 0) - (weight[a.severity] || 0);
    }
    if (sortBy === 'confidence') {
      const aConf = a.confidenceBreakdown?.score || 95;
      const bConf = b.confidenceBreakdown?.score || 95;
      return bConf - aConf;
    }
    return 0;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Incident Registry</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Correlated payment mismatches, webhook failures, and gateway anomalies</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchIncidents}>
          <RefreshCw size={16} /> Reload Registry
        </button>
      </div>

      {/* Registry Filter Panel */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <Filter size={16} />
            <strong style={{ letterSpacing: '0.05em' }}>FILTERS:</strong>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600' }}>STATUS</span>
            <select className="select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600' }}>SEVERITY</span>
            <select className="select" value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
              <option value="">All Severities</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600' }}>INCIDENT TYPE</span>
            <select className="select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              <option value="CAPTURED_ORDER_UNPAID">Captured Order Unpaid</option>
              <option value="DUPLICATE_PAYMENT_RISK">Duplicate Payment Risk</option>
              <option value="WEBHOOK_FAILURE">Webhook Failure</option>
              <option value="OUT_OF_ORDER_EVENTS">Out Of Order Events</option>
              <option value="REFUND_INCONSISTENCY">Refund Inconsistency</option>
              <option value="LATE_AUTHORIZATION">Late Authorization</option>
              <option value="STATISTICALLY_ANOMALOUS">Statistically Anomalous</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginLeft: 'auto' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ArrowUpDown size={12} /> SORT BY
            </span>
            <select className="select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="latest">Latest Logged</option>
              <option value="amount">Risk Size (Amount)</option>
              <option value="severity">Priority Level (Severity)</option>
              <option value="confidence">Confidence Score</option>
            </select>
          </div>
        </div>
      </div>

      {/* Registry Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading registry records...</div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-critical)' }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No incidents match active filtering criteria.
          </div>
        ) : (
          <div className="table-container">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '14px 18px' }}>Incident ID</th>
                  <th>Incident Type</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Affected Txns</th>
                  <th>Confidence</th>
                  <th>Risk Amount</th>
                  <th>First Logged</th>
                  <th style={{ paddingRight: '18px' }}>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inc => {
                  const conf = inc.confidenceBreakdown?.score || 95;
                  return (
                    <tr 
                      key={inc.incidentId}
                      onClick={() => navigate(`/incidents/${inc.incidentId}`)}
                      style={{ 
                        cursor: 'pointer', 
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background-color 0.15s ease'
                      }}
                      className="table-row-hover"
                    >
                      <td style={{ padding: '14px 18px', fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: 'var(--color-info)' }}>
                        {inc.incidentId}
                      </td>
                      <td>{inc.type.replace(/_/g, ' ')}</td>
                      <td>
                        <span className={`badge badge-${inc.severity.toLowerCase()}`}>{inc.severity}</span>
                      </td>
                      <td>
                        <span className={`badge badge-${inc.status}`}>{inc.status.toUpperCase()}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>{inc.affectedTransactions}</td>
                      <td>{conf}%</td>
                      <td style={{ fontWeight: 'bold' }}>₹{inc.affectedAmount.toLocaleString()}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(inc.createdAt).toLocaleString()}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingRight: '18px' }}>
                        {new Date(inc.updatedAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Incidents;
