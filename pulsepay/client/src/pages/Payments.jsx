import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPayments } from '../api';
import { Search, RefreshCw } from 'lucide-react';

const Payments = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await getPayments();
      setPayments(res.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch payments data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const filtered = payments.filter(pay => {
    const term = searchTerm.toLowerCase();
    return (
      pay.paymentId.toLowerCase().includes(term) ||
      (pay.customerId && pay.customerId.toLowerCase().includes(term)) ||
      (pay.merchantId && pay.merchantId.toLowerCase().includes(term))
    );
  });

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Transaction Registry</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Comprehensive transaction status database and event logs</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchPayments}>
          <RefreshCw size={16} /> Refresh Table
        </button>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-tertiary)', padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
          <Search size={18} style={{ color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search by Payment ID, Customer ID, or Merchant ID..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%', fontFamily: 'var(--font-sans)', fontSize: '0.95rem' }}
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>Querying transaction records...</div>
        ) : error ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-critical)' }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No transaction records match the search parameters.
          </div>
        ) : (
          <div className="table-container">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '14px 18px' }}>Payment ID</th>
                  <th>Amount</th>
                  <th>Payment State</th>
                  <th>Order State</th>
                  <th>Webhook State</th>
                  <th>Overall State</th>
                  <th style={{ paddingRight: '18px' }}>Created At</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(pay => {
                  return (
                    <tr 
                      key={pay.paymentId}
                      onClick={() => navigate(`/payments/${pay.paymentId}`)}
                      style={{ 
                        cursor: 'pointer', 
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background-color 0.15s ease'
                      }}
                      className="table-row-hover"
                    >
                      <td style={{ padding: '14px 18px', color: 'var(--color-info)', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
                        {pay.paymentId}
                      </td>
                      <td style={{ fontWeight: 'bold' }}>₹{pay.amount.toLocaleString()}</td>
                      <td>
                        <span className="badge badge-medium" style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                          {pay.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem' }}>
                          {pay.orderId ? 'MAPPED' : 'UNMAPPED'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem' }}>
                          {pay.webhookCount ? `${pay.webhookCount} attempts` : 'No webhook'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${pay.status === 'failed' ? 'badge-critical' : 'badge-low'}`}>
                          {pay.status === 'captured' ? 'HEALTHY' : pay.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingRight: '18px' }}>
                        {new Date(pay.createdAt).toLocaleString()}
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

export default Payments;
