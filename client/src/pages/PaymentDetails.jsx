import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPaymentDetails, getPaymentState, getPaymentTimeline, apiFetch } from '../api';
import { ShieldAlert, CreditCard, Clock, Activity, CheckCircle, ArrowLeft, ArrowRight, XCircle } from 'lucide-react';

const PaymentDetails = () => {
  const { id } = useParams();
  const [payment, setPayment] = useState(null);
  const [reconState, setReconState] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [mlScore, setMlScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPaymentData = async () => {
    try {
      setLoading(true);
      const [detailsRes, stateRes, timelineRes] = await Promise.all([
        getPaymentDetails(id),
        getPaymentState(id),
        getPaymentTimeline(id)
      ]);
      setPayment(detailsRes.data);
      setReconState(stateRes);
      setTimeline(timelineRes.data || []);
      
      // Fetch ML score
      try {
        const mlRes = await apiFetch(`/api/ml/payments/${id}/anomaly`);
        if (mlRes.ok) {
          const mlData = await mlRes.json();
          setMlScore(mlData.prediction);
        }
      } catch (mlErr) {
        console.warn('ML Service offline during payment view', mlErr);
      }

      setError(null);
    } catch (err) {
      setError('Failed to load transaction details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentData();
  }, [id]);

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)', padding: '24px' }}>Loading transaction logs...</div>;
  }

  if (error || !payment) {
    return (
      <div className="card" style={{ borderLeft: '4px solid var(--color-critical)', color: 'var(--color-critical)', margin: '24px' }}>
        {error || 'Transaction record not found'}
      </div>
    );
  }

  // Parse lifecycle flags
  const hasCreated = timeline.some(t => t.eventType === 'payment.created');
  const hasAuthorized = timeline.some(t => t.eventType === 'payment.authorized');
  const hasCaptured = timeline.some(t => t.eventType === 'payment.captured');
  const hasFailed = timeline.some(t => t.eventType === 'payment.failed');
  const hasWebhook = reconState && reconState.webhookState !== 'UNKNOWN';
  const webhookSuccess = reconState && reconState.webhookState === 'DELIVERED';

  return (
    <div>
      <Link to="/payments" style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontSize: '0.9rem' }}>
        <ArrowLeft size={16} /> Back to Transaction Registry
      </Link>

      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <div>
          <div className="flex-gap">
            <CreditCard size={24} style={{ color: 'var(--color-info)' }} />
            <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{payment.paymentId}</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Ingested: {new Date(payment.createdAt).toLocaleString()}</p>
        </div>
      </div>

      {/* Payment Lifecycle Trace */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'bold', letterSpacing: '0.05em', marginBottom: '16px' }}>
          PAYMENT GATEWAY LIFECYCLE PATH
        </h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-around', gap: '12px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {hasCreated ? <CheckCircle size={16} style={{ color: 'var(--color-healthy)' }} /> : <Clock size={16} style={{ color: 'var(--text-muted)' }} />}
            <span style={{ fontSize: '0.85rem', fontWeight: hasCreated ? 'bold' : 'normal' }}>CREATED</span>
          </div>
          
          <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {hasAuthorized ? <CheckCircle size={16} style={{ color: 'var(--color-healthy)' }} /> : <Clock size={16} style={{ color: 'var(--text-muted)' }} />}
            <span style={{ fontSize: '0.85rem', fontWeight: hasAuthorized ? 'bold' : 'normal' }}>AUTHORIZED</span>
          </div>

          <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {hasCaptured ? (
              <CheckCircle size={16} style={{ color: 'var(--color-healthy)' }} />
            ) : hasFailed ? (
              <XCircle size={16} style={{ color: 'var(--color-critical)' }} />
            ) : (
              <Clock size={16} style={{ color: 'var(--text-muted)' }} />
            )}
            <span style={{ fontSize: '0.85rem', fontWeight: hasCaptured || hasFailed ? 'bold' : 'normal', color: hasFailed ? 'var(--color-critical)' : 'inherit' }}>
              {hasFailed ? 'FAILED' : 'CAPTURED'}
            </span>
          </div>

          <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {webhookSuccess ? (
              <CheckCircle size={16} style={{ color: 'var(--color-healthy)' }} />
            ) : hasWebhook ? (
              <XCircle size={16} style={{ color: 'var(--color-critical)' }} />
            ) : (
              <Clock size={16} style={{ color: 'var(--text-muted)' }} />
            )}
            <span style={{ fontSize: '0.85rem', fontWeight: hasWebhook ? 'bold' : 'normal', color: hasWebhook && !webhookSuccess ? 'var(--color-critical)' : 'inherit' }}>
              WEBHOOK STATUS
            </span>
          </div>

          <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className={`badge badge-${payment.status === 'captured' ? 'healthy' : 'critical'}`} style={{ padding: '4px 10px' }}>
              {payment.status.toUpperCase()} (FINAL)
            </span>
          </div>
        </div>
      </div>

      {/* Workspace Grids */}
      <div className="grid-2" style={{ marginBottom: '24px' }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Metadata */}
          <div className="card">
            <h3 className="panel-header">Transaction Parameters</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.9rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>AMOUNT</span>
                <p style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>₹{payment.amount} {payment.currency}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>PAYMENT METHOD</span>
                <p>{payment.paymentMethod.toUpperCase()}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>MERCHANT ID</span>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{payment.merchantId}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>CUSTOMER ID</span>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{payment.customerId}</p>
              </div>
            </div>
          </div>

          {/* Reconstructed State Engine Results */}
          {reconState && (
            <div className="card">
              <h3 className="panel-header">Reconstructed State Engine</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: 'var(--bg-tertiary)', padding: '10px', borderRadius: '4px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>PAYMENT ENGINE STATE</span>
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--color-healthy)', marginTop: '2px' }}>
                    {reconState.paymentState}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-tertiary)', padding: '10px', borderRadius: '4px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>MERCHANT ORDER STATE</span>
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: reconState.orderState === 'PAID' ? 'var(--color-healthy)' : 'var(--color-warning)', marginTop: '2px' }}>
                    {reconState.orderState}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-tertiary)', padding: '10px', borderRadius: '4px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>WEBHOOK STATE</span>
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: webhookSuccess ? 'var(--color-healthy)' : 'var(--color-critical)', marginTop: '2px' }}>
                    {reconState.webhookState} (retries: {reconState.webhookRetryCount})
                  </div>
                </div>
                <div style={{ background: 'var(--bg-tertiary)', padding: '10px', borderRadius: '4px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>OVERALL CLASSIFICATION</span>
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: reconState.overallState === 'HEALTHY' ? 'var(--color-healthy)' : 'var(--color-critical)', marginTop: '2px' }}>
                    {reconState.overallState}
                  </div>
                </div>
              </div>

              {/* State Anomalies Alerts */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {reconState.outOfOrderDetected && (
                  <div className="badge badge-warning" style={{ display: 'flex', padding: '10px', gap: '8px' }}>
                    <ShieldAlert size={14} /> Out of Order Ingestion Detected
                  </div>
                )}
                {reconState.duplicateEventsDetected && (
                  <div className="badge badge-warning" style={{ display: 'flex', padding: '10px', gap: '8px' }}>
                    <ShieldAlert size={14} /> Duplicate Gateway Events Blocked
                  </div>
                )}
                {reconState.invalidTransitionDetected && (
                  <div className="badge badge-critical" style={{ display: 'flex', padding: '10px', gap: '8px' }}>
                    <ShieldAlert size={14} /> Invalid State Transition Prevented
                  </div>
                )}
                {reconState.lateAuthorizationDetected && (
                  <div className="badge badge-low" style={{ display: 'flex', padding: '10px', gap: '8px' }}>
                    <CheckCircle size={14} /> Late Authorization Synchronized
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Machine Learning Outlier Score */}
          <div className="card">
            <h3 className="panel-header">Unsupervised Isolation Forest Analysis</h3>
            {mlScore ? (
              <div>
                <div className="flex-between">
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>STATISTICAL ANOMALY SCORE</span>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: mlScore.is_anomaly ? 'var(--color-critical)' : 'var(--color-healthy)' }}>
                      {(mlScore.normalized_anomaly_score * 100).toFixed(0)}%
                    </p>
                  </div>
                  <span className={`badge badge-${mlScore.is_anomaly ? 'critical' : 'low'}`} style={{ padding: '6px 12px' }}>
                    {mlScore.is_anomaly ? 'ANOMALY DETECTED' : 'NORMAL FOOTPRINT'}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                  Raw Decision Score: {mlScore.raw_score.toFixed(4)}. Coded weights evaluate amount deviations and ingest timing gaps.
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                ML Service is offline. Default fallbacks active.
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Visual Timeline */}
        <div className="card">
          <h3 className="panel-header">Chronological Event Timeline</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {timeline.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                No events recorded.
              </div>
            ) : (
              timeline.map((event, idx) => {
                const eventDate = new Date(event.eventTimestamp);
                const receivedDate = new Date(event.receivedAt);
                const delayMs = Math.abs(receivedDate - eventDate);
                const isOutOfOrder = idx > 0 && new Date(timeline[idx - 1].eventTimestamp) > eventDate;

                return (
                  <div key={idx} className="timeline-item" style={{ borderLeftColor: isOutOfOrder ? 'var(--color-critical)' : 'var(--border-color)' }}>
                    <div className="timeline-dot" style={{ backgroundColor: isOutOfOrder ? 'var(--color-critical)' : 'var(--color-info)' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ fontSize: '0.9rem', color: isOutOfOrder ? 'var(--color-critical)' : 'var(--text-primary)' }}>
                          {event.eventType} {isOutOfOrder && '(Ingested Out-of-Order)'}
                        </strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          Source: {event.source.toUpperCase()} | Status: {event.status.toUpperCase()}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Event Time: {eventDate.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Received Time: {receivedDate.toLocaleString()}
                        </div>
                      </div>
                      {delayMs > 2000 && (
                        <span className="badge badge-medium" style={{ fontSize: '0.7rem' }}>
                          Delay: {(delayMs / 1000).toFixed(1)}s
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentDetails;
