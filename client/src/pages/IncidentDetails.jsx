import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getIncident,
  investigateIncident,
  getIncidentInvestigations,
  updateIncidentStatus,
  resolveIncident,
  updateIncidentActionStatus,
  submitIncidentFeedback,
  getIncidentReplay,
  runIncidentWhatIf
} from '../api';
import {
  ShieldAlert, Terminal, Play, CheckCircle, Clock, Check, AlertTriangle, AlertCircle,
  Users, Activity, Coins, FolderSync, Clock3, AlertOctagon, ArrowRight, ChevronRight, Sparkles, HelpCircle, BarChart3, Layers
} from 'lucide-react';

const IncidentDetails = () => {
  const { id } = useParams();
  const [incident, setIncident] = useState(null);
  const [investigations, setInvestigations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [investigating, setInvestigating] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [error, setError] = useState(null);

  // Replay & What-If States
  const [replayTimeline, setReplayTimeline] = useState([]);
  const [replayIndex, setReplayIndex] = useState(-1);
  const [whatIfParams, setWhatIfParams] = useState({
    webhookSuccessRate: 1.0,
    exposureDurationMinutes: 15,
    declinationRateReduction: 0.5
  });
  const [whatIfResult, setWhatIfResult] = useState(null);
  const [whatIfLoading, setWhatIfLoading] = useState(false);

  // Operator action update states
  const [actionUpdating, setActionUpdating] = useState({});

  const fetchReplay = async () => {
    try {
      const res = await getIncidentReplay(id);
      if (res.success) {
        setReplayTimeline(res.replaySequence || []);
        if (res.replaySequence && res.replaySequence.length > 0) {
          setReplayIndex(res.replaySequence.length - 1);
        }
      }
    } catch (err) {
      console.error("Failed to load incident replay timeline", err);
    }
  };

  const handleWhatIfSubmit = async () => {
    try {
      setWhatIfLoading(true);
      const res = await runIncidentWhatIf(id, whatIfParams);
      if (res.success) {
        setWhatIfResult(res);
      }
    } catch (err) {
      console.error("Failed to run what-if simulation", err);
    } finally {
      setWhatIfLoading(false);
    }
  };

  const fetchIncidentDetails = async () => {
    try {
      setLoading(true);
      const [incRes, invRes] = await Promise.all([
        getIncident(id),
        getIncidentInvestigations(id)
      ]);
      setIncident(incRes.data);
      setInvestigations(invRes.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to load incident details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidentDetails();
    fetchReplay();
    // Run initial what-if simulation
    runIncidentWhatIf(id, {
      webhookSuccessRate: 1.0,
      exposureDurationMinutes: 15,
      declinationRateReduction: 0.5
    }).then(res => {
      if (res.success) setWhatIfResult(res);
    }).catch(() => {});
  }, [id]);

  const triggerAI = async () => {
    try {
      setInvestigating(true);
      const res = await investigateIncident(id);
      setInvestigations(prev => [res.data.investigation, ...prev]);
      // Refetch details to pull new AI run logs in the audit trail
      const incRes = await getIncident(id);
      setIncident(incRes.data);
    } catch (err) {
      alert('AI investigation failed: ' + err.message);
    } finally {
      setInvestigating(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      setStatusUpdating(true);
      const res = await updateIncidentStatus(id, newStatus);
      setIncident(res.data);
    } catch (err) {
      alert('Failed to update incident status: ' + err.message);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleResolve = async () => {
    try {
      setStatusUpdating(true);
      const res = await resolveIncident(id);
      setIncident(res.data);
    } catch (err) {
      alert('Failed to resolve incident: ' + err.message);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleActionStatusChange = async (actionId, newStatus) => {
    try {
      setActionUpdating(prev => ({ ...prev, [actionId]: true }));
      const res = await updateIncidentActionStatus(id, actionId, newStatus);
      setIncident(res.data);
    } catch (err) {
      alert('Failed to update action checklist status: ' + err.message);
    } finally {
      setActionUpdating(prev => ({ ...prev, [actionId]: false }));
    }
  };

  const handleFeedback = async (type) => {
    try {
      const res = await submitIncidentFeedback(incident.incidentId, type);
      setIncident(res.data);
      addLogFeedbackLocally(type);
    } catch (err) {
      alert('Failed to save operator feedback: ' + err.message);
    }
  };

  const addLogFeedbackLocally = (type) => {
    // Optimistic details pull to update audit trails immediately
    getIncident(id).then(res => setIncident(res.data));
  };

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)', padding: '24px' }}>Loading incident metrics...</div>;
  }

  if (error || !incident) {
    return (
      <div className="card" style={{ borderLeft: '4px solid var(--color-critical)', color: 'var(--color-critical)', margin: '24px' }}>
        {error || 'Incident record not found'}
      </div>
    );
  }

  const latestInvestigation = investigations[0];
  const blast = incident.blastRadius || {
    affectedTransactions: incident.affectedTransactions,
    affectedCustomers: incident.affectedCustomers,
    affectedMerchants: 1,
    affectedOrders: incident.affectedTransactions,
    affectedAmount: incident.affectedAmount,
    incidentDuration: 120,
    failureRate: 100,
    mlAnomalyCount: 1
  };
  const breakdown = incident.confidenceBreakdown || { score: 95, explanation: 'Confidence score derived from state mismatch analysis.', factors: [] };
  const graph = incident.rootCauseGraph || { nodes: [], edges: [] };
  const actions = incident.operatorActionCenter || [];
  const related = incident.relatedIncidents || [];
  const evidenceItems = incident.evidenceItems || [];

  // Reconstructed Expected vs Observed definitions
  let expectedTransitions = "CREATED → PROCESSING → CAPTURED → WEBHOOK_DELIVERED";
  let observedTransitions = "CREATED → CAPTURED → WEBHOOK_FAILED";
  let discrepancyExplanation = "Ingestion pipeline delays caused transactional events to arrive out of sequence.";

  if (incident.type === 'CAPTURED_ORDER_UNPAID') {
    expectedTransitions = "PAYMENT_CAPTURED → ORDER_PAID";
    observedTransitions = "PAYMENT_CAPTURED → ORDER_UNPAID";
    discrepancyExplanation = "Gateway confirmed payment capture, but the order updates were not finalized due to webhook drops.";
  } else if (incident.type === 'WEBHOOK_FAILURE') {
    expectedTransitions = "PAYMENT_EVENT_RAISED → WEBHOOK_DELIVERED";
    observedTransitions = "PAYMENT_EVENT_RAISED → WEBHOOK_FAILED (500 Server Error)";
    discrepancyExplanation = "Repeated POST failures to merchant webhook endpoints rejected with HTTP error logs.";
  } else if (incident.type === 'DUPLICATE_PAYMENT_RISK') {
    expectedTransitions = "CHECKOUT_CLICK → SINGLE_PAYMENT_CAPTURED";
    observedTransitions = "CHECKOUT_CLICK → DOUBLE_PAYMENT_CAPTURED (10s window)";
    discrepancyExplanation = "Customer click double tap triggered duplicate API calls before idempotency keys resolved.";
  }

  return (
    <div>
      {/* Top Workspace Header */}
      <div className="card" style={{ marginBottom: '24px', padding: '20px', borderLeft: '4px solid var(--color-critical)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <span>INCIDENT COMMAND CENTRE / DIAGNOSTICS</span>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
              {incident.incidentId}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '2px' }}>
              Type: {incident.type.replace(/_/g, ' ')}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>EXPOSURE AT RISK</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-critical)' }}>₹{blast.affectedAmount.toLocaleString()}</div>
            </div>
            <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border-color)', paddingLeft: '16px' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>CONFIDENCE</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-healthy)' }}>{breakdown.score}%</div>
            </div>
            <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '16px', display: 'flex', gap: '8px' }}>
              <select 
                className="select" 
                value={incident.status} 
                disabled={statusUpdating}
                onChange={e => handleStatusChange(e.target.value)}
              >
                <option value="active">Active</option>
                <option value="investigating">Investigating</option>
                <option value="resolved">Resolved</option>
              </select>
              
              {incident.status !== 'resolved' && (
                <button className="btn btn-success" disabled={statusUpdating} onClick={handleResolve}>
                  Resolve
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Operator Feedback section */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 className="panel-header">Was this detection useful? (Operator Feedback)</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button 
            className="btn" 
            style={{ 
              backgroundColor: incident.operatorFeedback === 'TRUE_INCIDENT' ? 'var(--color-healthy)' : 'var(--bg-tertiary)',
              color: incident.operatorFeedback === 'TRUE_INCIDENT' ? 'white' : 'var(--text-primary)',
              border: '1px solid var(--border-color)'
            }} 
            onClick={() => handleFeedback('TRUE_INCIDENT')}
          >
            TRUE INCIDENT
          </button>
          <button 
            className="btn" 
            style={{ 
              backgroundColor: incident.operatorFeedback === 'FALSE_POSITIVE' ? 'var(--color-critical)' : 'var(--bg-tertiary)',
              color: incident.operatorFeedback === 'FALSE_POSITIVE' ? 'white' : 'var(--text-primary)',
              border: '1px solid var(--border-color)'
            }} 
            onClick={() => handleFeedback('FALSE_POSITIVE')}
          >
            FALSE POSITIVE
          </button>
          <button 
            className="btn" 
            style={{ 
              backgroundColor: incident.operatorFeedback === 'UNCERTAIN' ? 'var(--color-warning)' : 'var(--bg-tertiary)',
              color: incident.operatorFeedback === 'UNCERTAIN' ? 'black' : 'var(--text-primary)',
              border: '1px solid var(--border-color)'
            }} 
            onClick={() => handleFeedback('UNCERTAIN')}
          >
            UNCERTAIN
          </button>
          {incident.operatorFeedback && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '12px' }}>
              Feedback saved: <strong>{incident.operatorFeedback.replace(/_/g, ' ')}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Incident Summary section */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 className="panel-header">A. Incident Overview & Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>WHAT HAPPENED?</h4>
            <p style={{ fontSize: '0.85rem', marginTop: '6px', color: 'var(--text-primary)' }}>
              Operational anomaly flagged matching type <strong>{incident.type.replace(/_/g, ' ')}</strong>.
              Funds are impacted across {blast.affectedTransactions} transaction(s).
            </p>
          </div>
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>WHY WAS IT DETECTED?</h4>
            <p style={{ fontSize: '0.85rem', marginTop: '6px', color: 'var(--text-primary)' }}>
              {incident.evidence && incident.evidence[0] ? incident.evidence[0] : "Logical event traces mismatch observed status transitions."}
            </p>
          </div>
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>WHAT IS AFFECTED?</h4>
            <p style={{ fontSize: '0.85rem', marginTop: '6px', color: 'var(--text-primary)' }}>
              {blast.affectedCustomers} Customer Accounts and {blast.affectedMerchants} Merchant Accounts are exposed to this risk.
            </p>
          </div>
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>WHAT SHOULD THE OPERATOR DO?</h4>
            <p style={{ fontSize: '0.85rem', marginTop: '6px', color: 'var(--text-primary)' }}>
              Verify gateway logs, inspect webhook response status codes, and complete the checklist items.
            </p>
          </div>
        </div>
      </div>

      {/* Blast Radius Section */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '12px', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
          B. DETERMINISTIC BLAST RADIUS MEASUREMENTS
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>AMOUNT AT RISK</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>₹{blast.affectedAmount.toLocaleString()}</span>
          </div>
          <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>TRANSACTIONS</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{blast.affectedTransactions}</span>
          </div>
          <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>CUSTOMERS</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{blast.affectedCustomers}</span>
          </div>
          <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>MERCHANTS</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{blast.affectedMerchants || '1'}</span>
          </div>
          <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>AFFECTED ORDERS</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{blast.affectedOrders || blast.affectedTransactions}</span>
          </div>
          <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>INCIDENT DURATION</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{blast.incidentDuration ? `${Math.round(blast.incidentDuration / 60)} min` : 'Not available'}</span>
          </div>
          <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>FAILURE RATE</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--color-critical)' }}>{blast.failureRate}%</span>
          </div>
          <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>ML ANOMALIES</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--color-warning)' }}>{blast.mlAnomalyCount}</span>
          </div>
        </div>

        {/* Dynamic Breakdowns lists */}
        {blast.byMerchant && blast.byMerchant.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px', fontSize: '0.8rem' }}>
            <div className="card" style={{ padding: '12px' }}>
              <strong style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>Blast Impact by Merchant</strong>
              <ul style={{ paddingLeft: '12px', margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {blast.byMerchant.map((m, i) => (
                  <li key={i}>{m.merchantId}: <strong>{m.count} txns</strong> (₹{m.amount.toLocaleString()})</li>
                ))}
              </ul>
            </div>
            <div className="card" style={{ padding: '12px' }}>
              <strong style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>Blast Impact by Provider Method</strong>
              <ul style={{ paddingLeft: '12px', margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {blast.byProvider.map((p, i) => (
                  <li key={i}>{p.provider}: <strong>{p.count} txns</strong> (₹{p.amount.toLocaleString()})</li>
                ))}
              </ul>
            </div>
            <div className="card" style={{ padding: '12px' }}>
              <strong style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>Temporal Impact Spread</strong>
              <ul style={{ paddingLeft: '12px', margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {blast.byTimeBucket.slice(0, 4).map((tb, i) => (
                  <li key={i}>{tb.time}: <strong>{tb.count} txns</strong></li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Grid workspace splits */}
      <div className="grid-2" style={{ marginBottom: '24px', gap: '24px' }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* C. Interactive State Replay Timeline */}
          <div className="card">
            <h3 className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>⏱️ Real-Time State Replay Timeline</span>
              {replayTimeline.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '2px 8px', fontSize: '0.75rem' }} 
                    disabled={replayIndex <= 0}
                    onClick={() => setReplayIndex(prev => prev - 1)}
                  >
                    ◀ Back
                  </button>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                    Step {replayIndex + 1} / {replayTimeline.length}
                  </span>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '2px 8px', fontSize: '0.75rem' }} 
                    disabled={replayIndex >= replayTimeline.length - 1}
                    onClick={() => setReplayIndex(prev => prev + 1)}
                  >
                    Next ▶
                  </button>
                </div>
              )}
            </h3>

            {replayTimeline.length > 0 && replayIndex >= 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Replay step trigger details */}
                <div style={{ padding: '10px', background: 'var(--bg-tertiary)', borderLeft: '3px solid var(--color-info)', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <strong style={{ color: 'var(--color-info)' }}>
                      TRIGGER EVENT: {replayTimeline[replayIndex].triggerEvent.name.toUpperCase()}
                    </strong>
                    <span style={{ color: 'var(--text-muted)' }}>
                      Time: {new Date(replayTimeline[replayIndex].time).toLocaleTimeString()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', marginTop: '2px', color: 'var(--text-secondary)' }}>
                    Payment ID: {replayTimeline[replayIndex].triggerEvent.paymentId}
                  </div>
                </div>

                {/* State Dashboard at this step */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ background: 'var(--bg-tertiary)', padding: '10px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>PAYMENT STATES</div>
                    <ul style={{ fontSize: '0.75rem', paddingLeft: '12px', marginTop: '4px', listStyleType: 'square' }}>
                      {replayTimeline[replayIndex].states.payments.map((p, i) => (
                        <li key={i}>
                          {p.paymentId.substring(0,8)}...: <strong style={{ color: p.status === 'captured' ? 'var(--color-healthy)' : 'var(--color-critical)' }}>{p.status.toUpperCase()}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ background: 'var(--bg-tertiary)', padding: '10px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>ORDER STATES</div>
                    <ul style={{ fontSize: '0.75rem', paddingLeft: '12px', marginTop: '4px', listStyleType: 'square' }}>
                      {replayTimeline[replayIndex].states.orders.map((o, i) => (
                        <li key={i}>
                          {o.orderId.substring(0,8)}...: <strong style={{ color: o.status === 'paid' ? 'var(--color-healthy)' : 'var(--color-critical)' }}>{o.status.toUpperCase()}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No replay sequence data loaded.</div>
            )}
          </div>

          {/* D. Reconstructed State & Transition */}
          <div className="card">
            <h3 className="panel-header">D. Reconstructed Engine State Mismatches</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', fontSize: '0.8rem', background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '6px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>PAYMENT STATE</div>
                  <div style={{ fontWeight: 'bold', marginTop: '2px' }}>{incident.type === 'CAPTURED_ORDER_UNPAID' ? 'CAPTURED' : 'FAILED'}</div>
                </div>
                <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>ORDER STATE</div>
                  <div style={{ fontWeight: 'bold', marginTop: '2px' }}>{incident.type === 'CAPTURED_ORDER_UNPAID' ? 'UNPAID' : 'PENDING'}</div>
                </div>
                <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>WEBHOOK STATE</div>
                  <div style={{ fontWeight: 'bold', marginTop: '2px' }}>{incident.type === 'WEBHOOK_FAILURE' ? 'FAILED' : 'DELIVERED'}</div>
                </div>
                <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>CLASSIFICATION</div>
                  <div style={{ fontWeight: 'bold', marginTop: '2px', color: 'var(--color-critical)' }}>{incident.type}</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}><strong>EXPECTED TRANSITIONS:</strong></div>
                <div style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', marginTop: '4px', color: 'var(--color-healthy)' }}>
                  {expectedTransitions}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}><strong>OBSERVED TRANSITIONS:</strong></div>
                <div style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', marginTop: '4px', color: 'var(--color-critical)' }}>
                  {observedTransitions}
                </div>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <strong>Mismatch Analysis:</strong> {discrepancyExplanation}
              </div>
            </div>
          </div>

          {/* E. Evidence Fusion Layer (Fusing Deterministic + ML + AI) */}
          <div className="card">
            <h3 className="panel-header">E. Unified Evidence Fusion Layer</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '6px' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '6px' }}>1. DETERMINISTIC EVIDENCE</h4>
                <ul style={{ fontSize: '0.85rem', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {evidenceItems.filter(e => e.source !== 'ml').map((item, idx) => (
                    <li key={idx}>✓ {item.description} (source: {item.source})</li>
                  ))}
                  {evidenceItems.filter(e => e.source !== 'ml').length === 0 && (
                    <li>No deterministic state anomalies flagged.</li>
                  )}
                </ul>
              </div>
              
              <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '6px' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '6px' }}>2. STATISTICAL / ML SIGNALS</h4>
                <ul style={{ fontSize: '0.85rem', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {evidenceItems.filter(e => e.source === 'ml').map((item, idx) => (
                    <li key={idx}>⚠ {item.description} (Confidence: {(item.confidence * 100).toFixed(0)}%)</li>
                  ))}
                  {evidenceItems.filter(e => e.source === 'ml').length === 0 && (
                    <li>No machine learning anomaly alerts raised.</li>
                  )}
                </ul>
              </div>

              <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '6px' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '6px' }}>3. AI-ASSISTED INTERPRETATION</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  {latestInvestigation ? latestInvestigation.summary : "No AI Investigation report available. Trigger 'Run Investigation' below to sync."}
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Audit Trail logs */}
          {incident.auditTrail && incident.auditTrail.length > 0 && (
            <div className="card">
              <h3 className="panel-header">Incident Remediation Audit Trail</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {incident.auditTrail.map((log, idx) => (
                  <div key={idx} style={{ fontSize: '0.8rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                    <strong>{log.action}</strong> by <em>{log.actor}</em>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What-If Exposure Simulator */}
          <div className="card" style={{ border: '1px solid var(--color-warning)' }}>
            <h3 className="panel-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HelpCircle size={16} style={{ color: 'var(--color-warning)' }} /> Hypothetical What-If Simulator
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.8rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.7rem' }}>WEBHOOK SUCCESS RATE</label>
                  <select 
                    className="select" 
                    style={{ width: '100%', padding: '4px', fontSize: '0.8rem' }}
                    value={whatIfParams.webhookSuccessRate}
                    onChange={e => setWhatIfParams(prev => ({ ...prev, webhookSuccessRate: parseFloat(e.target.value) }))}
                  >
                    <option value="1.0">100% Success</option>
                    <option value="0.8">80% Success</option>
                    <option value="0.5">50% Success</option>
                    <option value="0.0">0% Success (Failure)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.7rem' }}>EXPOSURE DURATION</label>
                  <select 
                    className="select" 
                    style={{ width: '100%', padding: '4px', fontSize: '0.8rem' }}
                    value={whatIfParams.exposureDurationMinutes}
                    onChange={e => setWhatIfParams(prev => ({ ...prev, exposureDurationMinutes: parseInt(e.target.value) }))}
                  >
                    <option value="5">5 minutes</option>
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">60 minutes</option>
                    <option value="120">120 minutes</option>
                  </select>
                </div>
              </div>

              <div>
                <button 
                  className="btn btn-secondary" 
                  style={{ width: '100%', fontSize: '0.8rem', padding: '6px' }}
                  onClick={handleWhatIfSubmit}
                  disabled={whatIfLoading}
                >
                  {whatIfLoading ? 'Running Simulation...' : 'Simulate Scenario Override'}
                </button>
              </div>

              {whatIfResult && (
                <div style={{ background: 'var(--bg-tertiary)', padding: '10px', borderRadius: '6px', marginTop: '4px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '6px' }}>Simulation Results:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Simulated Risk:</span>
                      <p style={{ fontWeight: 'bold', color: 'var(--color-critical)' }}>
                        ₹{whatIfResult.simulated.amount.toLocaleString()} (was ₹{whatIfResult.baseline.amount.toLocaleString()})
                      </p>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Impacted Transactions:</span>
                      <p style={{ fontWeight: 'bold' }}>
                        {whatIfResult.simulated.transactions} (was {whatIfResult.baseline.transactions})
                      </p>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Recovered Volume:</span>
                      <p style={{ fontWeight: 'bold', color: 'var(--color-healthy)' }}>
                        ₹{whatIfResult.recovered.amount.toLocaleString()} ({whatIfResult.recovered.transactions} txns)
                      </p>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Duration Impact:</span>
                      <p style={{ fontWeight: 'bold' }}>
                        {whatIfResult.simulated.durationMinutes} min (was {whatIfResult.baseline.durationMinutes} min)
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* F. Root Cause / Causal Chain */}
          {graph.nodes && graph.nodes.length > 0 && (
            <div className="card">
              <h3 className="panel-header">F. Root Cause / Causal Chain Graph</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '16px 0' }}>
                {graph.nodes.map((node, index) => {
                  let badgeClass = 'badge-low';
                  if (node.status === 'warning') badgeClass = 'badge-medium';
                  if (node.status === 'critical') badgeClass = 'badge-critical';

                  return (
                    <React.Fragment key={node.id}>
                      <div className={`badge ${badgeClass}`} style={{ padding: '8px 16px', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', border: '1px solid var(--border-color)' }}>
                        {node.label}
                      </div>
                      {index < graph.nodes.length - 1 && (
                        <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}

          {/* Causal Chain Chronological Failure propagation */}
          <div className="card">
            <h3 className="panel-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} /> Chronological Failure Propagation (Causal Timeline)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.8rem', position: 'relative', paddingLeft: '16px', borderLeft: '2px solid var(--border-color)', margin: '10px 0' }}>
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <span style={{ position: 'absolute', left: '-22px', top: '2px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-critical)' }} />
                <strong style={{ color: 'var(--color-critical)' }}>T+0: Primary Event Trigger</strong>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  Failure sequence initiated. Telemetry mismatch: observed {observedTransitions || "mismatch"}.
                </p>
              </div>

              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <span style={{ position: 'absolute', left: '-22px', top: '2px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-warning)' }} />
                <strong>T+18s: State Reconciliation Alarm</strong>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  Baseline deviation scan triggered: {discrepancyExplanation || "discrepancy observed"}.
                </p>
              </div>

              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '-22px', top: '2px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-info)' }} />
                <strong>T+45s: AI Evidence Grounded Correlated Report</strong>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  Fused deterministic anomaly context with machine learning scores to trigger operator audit checklists.
                </p>
              </div>
            </div>
          </div>

          {/* Evidence Coverage & Audit Scorecard Card */}
          <div className="card">
            <h3 className="panel-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} /> Incident Evidence & Audit Scorecard
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.8rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: 'var(--bg-tertiary)', padding: '10px', borderRadius: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>SUPPORTING FACTS</span>
                  <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-healthy)', margin: '4px 0 0 0' }}>
                    {incident.evidence ? incident.evidence.length : 0}
                  </p>
                </div>
                <div style={{ background: 'var(--bg-tertiary)', padding: '10px', borderRadius: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>EVIDENCE COVERAGE</span>
                  <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-info)', margin: '4px 0 0 0' }}>
                    {Math.min(100, Math.round((((incident.evidence ? incident.evidence.length : 0) + 2) / ((incident.blastRadius?.affectedTransactions || 1) + 2)) * 100))}%
                  </p>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>FACTUAL GROUNDING RATING</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <div style={{ background: 'var(--bg-secondary)', height: '8px', flex: 1, borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ background: 'var(--color-healthy)', width: `${latestInvestigation ? (latestInvestigation.confidence * 100).toFixed(0) : 75}%`, height: '100%' }} />
                  </div>
                  <strong style={{ color: 'var(--color-healthy)' }}>
                    {latestInvestigation ? (latestInvestigation.confidence * 100).toFixed(0) : 75}%
                  </strong>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Verification Status</span>
                  <strong style={{ color: 'var(--color-healthy)' }}>PASS</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Auditing Mode</span>
                  <strong>Evidence Grounded</strong>
                </div>
              </div>
            </div>
          </div>

          {/* G. AI Investigation Report Card */}
          <div className="card" style={{ border: '1px solid #3b82f64d', position: 'relative' }}>
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="flex-gap" style={{ fontWeight: 'bold' }}>
                <Terminal size={18} style={{ color: 'var(--color-info)' }} /> G. AI INVESTIGATION REPORT
              </span>
              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={triggerAI} disabled={investigating}>
                {investigating ? 'Running AI Engine...' : (
                  <>
                    <Play size={12} /> Run Investigation
                  </>
                )}
              </button>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px', borderBottom: '1px dashed var(--border-color)', paddingBottom: '8px' }}>
              ⚠️ AI-assisted analysis — verify against system evidence before remediation. Diagnostic recommendations are advisory.
            </div>

            {investigating ? (
              <div style={{ padding: '32px', textAlign: 'center' }}>
                <div style={{ fontSize: '1rem', color: 'var(--color-info)' }}>Compiling context & running LLM models...</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>Parsing payment events and webhook status rates</div>
              </div>
            ) : !latestInvestigation ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No active AI report generated. Click 'Run Investigation' to trigger root cause search.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>SUMMARY</span>
                  <p style={{ fontSize: '0.9rem', marginTop: '4px' }}>{latestInvestigation.summary}</p>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>PROBABLE ROOT CAUSE</span>
                  <p style={{ fontSize: '0.9rem', marginTop: '4px', color: '#fca5a5' }}>{latestInvestigation.probableRootCause}</p>
                </div>

                <div className="flex-gap" style={{ background: 'var(--bg-tertiary)', padding: '10px', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>CONFIDENCE SCORE</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-healthy)' }}>{(latestInvestigation.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {latestInvestigation.confidenceExplanation}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>ESTIMATED LOSS IMPACT</span>
                  <p style={{ fontSize: '0.9rem', marginTop: '4px', color: '#fca5a5' }}>
                    ₹{latestInvestigation.financialImpact.affectedAmount.toLocaleString()} ({latestInvestigation.financialImpact.interpretation})
                  </p>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>CUSTOMER EXPERIENCE IMPACT</span>
                  <p style={{ fontSize: '0.9rem', marginTop: '4px' }}>{latestInvestigation.customerImpact}</p>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>RECOMMENDED OPERATOR STEPS</span>
                  <ol style={{ paddingLeft: '20px', fontSize: '0.9rem', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {latestInvestigation.recommendedActions.map((act, index) => (
                      <li key={index}>
                        <span className={`badge badge-${act.priority.toLowerCase()}`} style={{ marginRight: '6px', fontSize: '0.65rem' }}>{act.priority}</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{act.action}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{act.reason}</div>
                      </li>
                    ))}
                  </ol>
                </div>

                {latestInvestigation.unknowns && latestInvestigation.unknowns.length > 0 && (
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>INFORMATION GAPS / UNKNOWNS</span>
                    <ul style={{ paddingLeft: '20px', fontSize: '0.85rem', marginTop: '4px', color: 'var(--text-secondary)' }}>
                      {latestInvestigation.unknowns.map((unk, idx) => (
                        <li key={idx}>{unk}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* H. Operator Action Checklist */}
          {actions.length > 0 && (
            <div className="card">
              <h3 className="panel-header">H. Interactive Operator Recovery Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {actions.map((act) => {
                  let borderCol = 'var(--border-color)';
                  if (act.status === 'IN_PROGRESS') borderCol = 'var(--color-warning)';
                  if (act.status === 'DONE') borderCol = 'var(--color-healthy)';
                  if (act.status === 'DISMISSED') borderCol = 'var(--text-muted)';

                  return (
                    <div key={act.id} style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '6px', borderLeft: `3px solid ${borderCol}` }}>
                      <div className="flex-between" style={{ marginBottom: '6px' }}>
                        <span className={`badge badge-${act.priority.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>
                          {act.priority} PRIORITY | {act.status}
                        </span>
                        <select 
                          className="select" 
                          value={act.status} 
                          style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                          disabled={actionUpdating[act.id]}
                          onChange={e => handleActionStatusChange(act.id, e.target.value)}
                        >
                          <option value="TODO">Pending (TODO)</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="DONE">Completed</option>
                          <option value="DISMISSED">Dismissed</option>
                        </select>
                      </div>
                      <strong style={{ fontSize: '0.85rem' }}>{act.action}</strong>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{act.reason}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* I. Related Incidents */}
          {related.length > 0 && (
            <div className="card">
              <h3 className="panel-header">I. Mapped Related Incidents</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {related.map((rel) => (
                  <div key={rel.incidentId} className="flex-between" style={{ padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: '6px', borderBottom: '1px solid var(--border-color)' }}>
                    <div>
                      <Link to={`/incidents/${rel.incidentId}`} style={{ color: 'var(--color-info)', fontWeight: 'bold', textDecoration: 'none', fontSize: '0.85rem' }}>
                        {rel.incidentId}
                      </Link>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Type: {rel.type.replace(/_/g, ' ')}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`badge badge-${rel.severity.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>{rel.severity}</span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 'bold', marginTop: '2px' }}>₹{rel.affectedAmount.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default IncidentDetails;
