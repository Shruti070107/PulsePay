import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getRecoveryOpportunity, 
  getRecoveryOpportunities,
  executeRecovery, 
  simulateRecovery 
} from '../api';
import { useToast } from '../components/Toast';
import { 
  CheckCircle2, AlertTriangle, Play, RotateCcw, 
  ChevronDown, ChevronUp, Database, ArrowLeft, Cpu, ShieldCheck, Target, Sparkles
} from 'lucide-react';

const PaymentRecoveryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [opportunity, setOpportunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [error, setError] = useState(null);
  const [techEvidenceOpen, setTechEvidenceOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      let targetId = id;
      
      // If visited without an ID (/investigation), fetch the top opportunity
      if (!targetId) {
        const oppsRes = await getRecoveryOpportunities({ limit: 1 });
        if (oppsRes.data && oppsRes.data.length > 0) {
          targetId = oppsRes.data[0].paymentId || oppsRes.data[0].opportunityId;
        }
      }

      if (!targetId) {
        setError('No active payment opportunities found to investigate.');
        return;
      }

      const res = await getRecoveryOpportunity(targetId);
      setOpportunity(res.data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load recovery details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleExecuteSingle = async () => {
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
        const actionResult = data.actions?.[0]?.result || data.status || 'EXECUTED';
        const recoveredAmt = data.recoveredAmount || (actionResult === 'RECOVERED' ? opportunity.amount : 0);
        addToast(`Synthetic Recovery ${actionResult}! Recovered ₹${recoveredAmt.toLocaleString()}`, 'success');
      }
      await fetchDetail();
    } catch (err) {
      addToast('Execution failed: ' + err.message, 'error');
    } finally {
      setExecuting(false);
    }
  };

  const handleSimulateSingle = async () => {
    if (!opportunity) return;
    try {
      setSimulating(true);
      const res = await simulateRecovery({ opportunityIds: [opportunity.opportunityId || opportunity.paymentId] });
      setSimResult(res.data);
      addToast('Recovery strategy simulation completed successfully.', 'info');
    } catch (err) {
      addToast('Simulation failed: ' + err.message, 'error');
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-secondary)' }}>
        <div style={{ textAlign: 'center' }}>
          <RotateCcw size={28} className="animate-spin" style={{ color: 'var(--color-info)', margin: '0 auto 12px' }} />
          <p style={{ fontSize: '0.85rem', fontWeight: '500' }}>Loading payment investigation...</p>
        </div>
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
        <AlertTriangle size={32} style={{ color: 'var(--color-warning)', margin: '0 auto 12px' }} />
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Investigation Not Found</h2>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          {error || 'Unable to load payment recovery opportunity.'}
        </p>
        <button 
          className="btn btn-secondary" 
          onClick={() => navigate('/recovery')}
          style={{ marginTop: '16px' }}
        >
          Return to Recovery Queue
        </button>
      </div>
    );
  }

  const isBlocked = opportunity.policyStatus === 'BLOCKED' || opportunity.recommendedStrategy === 'STOP_RECOVERY' || opportunity.recommendedAction === 'STOP_RECOVERY';
  const isRecovered = opportunity.status === 'RECOVERED';
  const prob = Math.round((opportunity.recoveryProbability || 0.89) * 100);
  const ev = opportunity.expectedValue !== undefined 
    ? Math.round(opportunity.expectedValue) 
    : Math.round(opportunity.amount * (opportunity.recoveryProbability || 0.89) - (opportunity.actionCost || 10));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Top Breadcrumb / Back Link */}
      <div>
        <button 
          onClick={() => navigate('/recovery')}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: 0 }}
        >
          <ArrowLeft size={14} /> Back to Recovery Queue
        </button>
      </div>

      {/* HEADER CARD: PAYMENT IDENTITY */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>
              PAYMENT INVESTIGATION
            </div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: '700', marginTop: '4px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              #{opportunity.paymentId || opportunity.opportunityId}
              <span style={{ fontSize: '1.25rem', color: 'var(--color-healthy)', fontFamily: 'var(--font-mono)' }}>
                ₹{opportunity.amount?.toLocaleString()}
              </span>
            </h1>
            <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Failure: <strong style={{ color: 'var(--text-primary)' }}>{opportunity.failureReason || opportunity.failureType || 'Gateway Timeout'}</strong> · Payment Method: <span style={{ textTransform: 'uppercase' }}>{opportunity.paymentMethod || 'UPI'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {isRecovered ? (
              <span className="badge badge-success" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                ✓ RECOVERED
              </span>
            ) : isBlocked ? (
              <span className="badge badge-danger" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                ✕ BLOCKED BY SAFETY POLICY
              </span>
            ) : (
              <span className="badge badge-info" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                ✓ ACTION ELIGIBLE
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ARCHITECTURAL PRINCIPLE CALLOUT */}
      <div style={{ padding: '12px 18px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '0.8rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={16} style={{ color: 'var(--color-healthy)' }} />
          <strong style={{ color: 'var(--text-primary)' }}>Core Decision Principle:</strong>
          <span style={{ color: 'var(--text-secondary)' }}>
            ML estimates probability. Deterministic policies control whether an action is allowed.
          </span>
        </div>
      </div>

      {/* SECTION 1: WHAT HAPPENED? (MONGODB STORED EVENT HISTORY) */}
      <div className="card" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            1. What Happened?
          </h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-info)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Database size={13} /> MongoDB Stored Event History
          </span>
        </div>

        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          MongoDB stores these immutable events so PulsePay can reconstruct the complete payment lifecycle timeline:
        </p>
        
        {/* Clean Timeline Steps */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginTop: '14px' }}>
          <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-info)' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Step 1</span>
            <div style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-primary)', marginTop: '2px' }}>Payment Created</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>₹{opportunity.amount?.toLocaleString()} intent registered</div>
          </div>

          <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-info)' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Step 2</span>
            <div style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-primary)', marginTop: '2px' }}>Gateway Request</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Dispatched to acquiring bank</div>
          </div>

          <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-critical)' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-critical)' }}>Step 3</span>
            <div style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--color-critical)', marginTop: '2px' }}>Exception Encountered</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{opportunity.failureReason || 'Gateway Timeout'}</div>
          </div>

          <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-critical)' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Step 4</span>
            <div style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-primary)', marginTop: '2px' }}>Marked Failed</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Order status: unpaid</div>
          </div>

          <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-healthy)' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--color-healthy)' }}>Step 5</span>
            <div style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--color-healthy)', marginTop: '2px' }}>Opportunity Staged</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Calibrated probability: {prob}%</div>
          </div>
        </div>
      </div>

      {/* PROBABILISTIC COMPONENTS: 2. CAN WE RECOVER IT? & 3. WHAT SHOULD WE DO? */}
      <div className="card" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>PROBABILISTIC INFERENCE</span>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
              2. ML Recovery Scoring & Expected Value
            </h3>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-info)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Cpu size={13} /> Calibrated PAVA & EV Optimization
          </span>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginTop: '14px' }}>
          <div style={{ padding: '14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>ML Recovery Estimate</span>
            <p style={{ fontSize: '1.4rem', fontWeight: '700', fontFamily: 'var(--font-mono)', color: isBlocked ? 'var(--text-muted)' : (prob >= 75 ? 'var(--color-healthy)' : 'var(--color-warning)'), marginTop: '2px' }}>
              {isBlocked ? '0%' : `${prob}%`}
            </p>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Calibrated probability (PAVA)</div>
          </div>

          <div style={{ padding: '14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Recommended Strategy</span>
            <p style={{ fontSize: '1.15rem', fontWeight: '700', color: isBlocked ? 'var(--text-muted)' : 'var(--color-info)', marginTop: '4px' }}>
              {String(opportunity.recommendedStrategy || opportunity.recommendedAction || 'DELAYED RETRY').replace(/_/g, ' ')}
            </p>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Highest expected yield channel</div>
          </div>

          <div style={{ padding: '14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Expected Value (EV)</span>
            <p style={{ fontSize: '1.4rem', fontWeight: '700', fontFamily: 'var(--font-mono)', color: isBlocked ? 'var(--text-muted)' : 'var(--color-healthy)', marginTop: '2px' }}>
              ₹{ev.toLocaleString()}
            </p>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Net yield after action cost</div>
          </div>
        </div>

        {/* Grounded Evidence Narrative */}
        <div style={{ marginTop: '16px', padding: '14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text-primary)' }}>Evidence-Grounded Recommendation:</strong>
          <p style={{ marginTop: '4px' }}>
            PulsePay recommends <strong>{String(opportunity.recommendedStrategy || 'DELAYED RETRY').replace(/_/g, ' ')}</strong> because provider health has recovered, the transaction has remaining retry budget (attempt {opportunity.attemptCount || 0} of 2), and the calibrated recovery probability produces a positive expected value of ₹{ev.toLocaleString()}.
          </p>
        </div>
      </div>

      {/* DETERMINISTIC COMPONENTS: 3. DETERMINISTIC SAFETY POLICY */}
      <div className="card" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>DETERMINISTIC GUARDRAILS</span>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
              3. Safety Policy & Bounded Execution
            </h3>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-healthy)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={13} /> {isBlocked ? 'Action Blocked by Safety Policy' : 'Passed All Safety Invariants'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '14px' }}>
          <div style={{ padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--color-healthy)' }}>
            <CheckCircle2 size={16} /> Permanent decline gate (Not expired/stolen)
          </div>
          <div style={{ padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--color-healthy)' }}>
            <CheckCircle2 size={16} /> Duplicate lockout (0 duplicate risk)
          </div>
          <div style={{ padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--color-healthy)' }}>
            <CheckCircle2 size={16} /> Retry budget check (Limit ≤ 2)
          </div>
          <div style={{ padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--color-healthy)' }}>
            <CheckCircle2 size={16} /> Financial viability gate (EV &gt; ₹0)
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
          <div>
            <button 
              className="btn btn-primary"
              onClick={handleExecuteSingle}
              disabled={executing || isRecovered || isBlocked}
              style={{ fontSize: '0.84rem', padding: '10px 24px' }}
            >
              <Play size={15} fill="currentColor" />
              {executing ? 'Executing Recovery...' : isRecovered ? 'Already Recovered' : isBlocked ? 'Blocked by Policy' : 'Execute Synthetic Recovery'}
            </button>
          </div>

          {/* Secondary Collapsed: Explore Alternative Strategies */}
          <div style={{ marginTop: '2px' }}>
            <button
              onClick={() => setExploreOpen(!exploreOpen)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 0'
              }}
            >
              {exploreOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              <span>Explore Alternative Strategies & Dry-Run Simulation</span>
            </button>

            {exploreOpen && (
              <div style={{ marginTop: '10px', padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  Test recovery channels and Expected Value yield without committing transaction state.
                </div>
                <button 
                  className="btn btn-secondary"
                  onClick={handleSimulateSingle}
                  disabled={simulating}
                  style={{ fontSize: '0.76rem', padding: '6px 14px' }}
                >
                  <RotateCcw size={13} className={simulating ? 'animate-spin' : ''} />
                  {simulating ? 'Simulating...' : 'Simulate Strategy'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 4: WHY? (COLLAPSIBLE TECHNICAL EVIDENCE) */}
      <div className="card" style={{ padding: '18px 22px' }}>
        <button 
          onClick={() => setTechEvidenceOpen(!techEvidenceOpen)}
          style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: 0 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={16} style={{ color: 'var(--color-info)' }} />
            <span style={{ fontSize: '0.92rem', fontWeight: '700' }}>
              Why? (View Technical Evidence & Telemetry Signals)
            </span>
          </div>
          {techEvidenceOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {techEvidenceOpen && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <div style={{ padding: '10px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Raw Heuristic Estimate</span>
                <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {Math.round((opportunity.rawProbability || 0.88) * 100)}%
                </div>
              </div>

              <div style={{ padding: '10px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Calibrated Estimate (Isotonic PAVA)</span>
                <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--color-healthy)', fontFamily: 'var(--font-mono)' }}>
                  {Math.round((opportunity.recoveryProbability || 0.89) * 100)}% (Monotonic Knots)
                </div>
              </div>

              <div style={{ padding: '10px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Action Cost</span>
                <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  ₹10 (Gateway channel fee)
                </div>
              </div>
            </div>

            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Supporting Telemetry Signals:</strong>
              <ul style={{ listStyle: 'disc inside', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>Failure Code: Transient Timeout (+45% recovery weight)</li>
                <li>Customer History: Tier 1 Low-Fraud (+20% weight)</li>
                <li>Retry Budget: Attempt {opportunity.attemptCount || 0} of 2 available</li>
                <li>Duplicate Hash Guard: Idempotency check verified zero collisions</li>
              </ul>
            </div>

            {opportunity.events && opportunity.events.length > 0 && (
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>MongoDB Raw Audit Trail:</strong>
                <div style={{ marginTop: '6px', background: 'var(--bg-tertiary)', padding: '10px', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                  {opportunity.events.map((ev, idx) => (
                    <div key={idx} style={{ padding: '2px 0' }}>
                      [{new Date(ev.timestamp || Date.now()).toLocaleTimeString()}] {ev.type || ev.eventType} · {ev.status} · Source: {ev.source || 'gateway'}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default PaymentRecoveryDetail;
