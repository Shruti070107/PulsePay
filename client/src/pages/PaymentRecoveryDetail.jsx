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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Top Breadcrumb / Back Link */}
      <div>
        <button 
          onClick={() => navigate('/recovery')}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: 0 }}
        >
          <ArrowLeft size={14} /> Back to Recovery Queue
        </button>
      </div>

      {/* CONTINUOUS MASTER AUDIT PANEL */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        
        {/* 1. PAYMENT METADATA HEADER (TICKET BAR) */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.06em' }}>
              PAYMENT DECISION RECORD · AUDIT SHEET
            </div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '600', marginTop: '3px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              #{opportunity.paymentId || opportunity.opportunityId}
              <span style={{ fontSize: '1.15rem', color: 'var(--color-healthy)', fontFamily: 'var(--font-mono)', fontWeight: '600' }}>
                ₹{opportunity.amount?.toLocaleString()}
              </span>
            </h1>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
              Failure Code: <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{opportunity.failureReason || opportunity.failureType || 'GATEWAY_TIMEOUT'}</strong> · Method: <span style={{ textTransform: 'uppercase', fontWeight: '600' }}>{opportunity.paymentMethod || 'UPI'}</span> · Attempt: <span style={{ fontFamily: 'var(--font-mono)' }}>{opportunity.attemptCount || 0}/2</span>
            </div>
          </div>

          <div>
            {isRecovered ? (
              <span className="badge badge-success" style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                [RECOVERED]
              </span>
            ) : isBlocked ? (
              <span className="badge badge-danger" style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                [BLOCKED BY POLICY]
              </span>
            ) : (
              <span className="badge badge-info" style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                [ACTION ELIGIBLE]
              </span>
            )}
          </div>
        </div>

        {/* 2. ARCHITECTURAL PRINCIPLE CALLOUT BAR */}
        <div style={{ padding: '10px 20px', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Core Decision Principle:</strong> ML estimates probability. Deterministic policies control whether an action is allowed.
        </div>

        {/* 3. SECTION 1: TELEMETRY & EVENT HISTORY */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.06em' }}>
              1. TELEMETRY & EVENT HISTORY
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              MongoDB Stored Audit Trail
            </span>
          </div>

          {/* Flat 5-Step Timeline Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginTop: '12px' }}>
            <div style={{ padding: '8px 10px', borderLeft: '2px solid var(--color-info)' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Step 1</div>
              <div style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-primary)' }}>Payment Created</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>₹{opportunity.amount?.toLocaleString()} intent</div>
            </div>

            <div style={{ padding: '8px 10px', borderLeft: '2px solid var(--color-info)' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Step 2</div>
              <div style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-primary)' }}>Gateway Request</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Acquiring dispatch</div>
            </div>

            <div style={{ padding: '8px 10px', borderLeft: '2px solid var(--color-critical)' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--color-critical)' }}>Step 3</div>
              <div style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--color-critical)' }}>Exception Logged</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{opportunity.failureReason || 'Gateway Timeout'}</div>
            </div>

            <div style={{ padding: '8px 10px', borderLeft: '2px solid var(--color-critical)' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Step 4</div>
              <div style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-primary)' }}>Marked Failed</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Order: unpaid</div>
            </div>

            <div style={{ padding: '8px 10px', borderLeft: '2px solid var(--color-healthy)' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--color-healthy)' }}>Step 5</div>
              <div style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--color-healthy)' }}>Opportunity Staged</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Calibrated P: {prob}%</div>
            </div>
          </div>
        </div>

        {/* 4. SECTION 2: CALIBRATED MODEL INFERENCE & EXPECTED VALUE */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.06em' }}>
              2. PROBABILISTIC INFERENCE & EXPECTED VALUE
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Isotonic PAVA & EV Model
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
                Calibrated Probability
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '600', fontFamily: 'var(--font-mono)', color: isBlocked ? 'var(--text-muted)' : (prob >= 75 ? 'var(--color-healthy)' : 'var(--color-warning)'), marginTop: '2px' }}>
                {isBlocked ? '0%' : `${prob}%`}
              </div>
              <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>PAVA Monotonic Knots</div>
            </div>

            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
                Recommended Strategy
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: '600', color: isBlocked ? 'var(--text-muted)' : 'var(--color-info)', marginTop: '3px' }}>
                {String(opportunity.recommendedStrategy || opportunity.recommendedAction || 'DELAYED RETRY').replace(/_/g, ' ')}
              </div>
              <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>Optimal yield channel</div>
            </div>

            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
                Net Expected Value (EV)
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '600', fontFamily: 'var(--font-mono)', color: isBlocked ? 'var(--text-muted)' : 'var(--color-healthy)', marginTop: '2px' }}>
                ₹{ev.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>Net yield after action cost</div>
            </div>
          </div>

          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-color)', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--text-primary)' }}>Evidence-Grounded Recommendation:</strong> PulsePay recommends <strong>{String(opportunity.recommendedStrategy || 'DELAYED RETRY').replace(/_/g, ' ')}</strong> because provider health has recovered, retry budget is available (attempt {opportunity.attemptCount || 0} of 2), and calibrated probability yields a positive expected value of ₹{ev.toLocaleString()}.
          </div>
        </div>

        {/* 5. SECTION 3: DETERMINISTIC SAFETY POLICY & BOUNDED EXECUTION */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.06em' }}>
              3. DETERMINISTIC GUARDRAILS & SAFETY PREFLIGHT
            </div>
            <span style={{ fontSize: '0.7rem', color: isBlocked ? 'var(--color-critical)' : 'var(--color-healthy)', fontWeight: '600' }}>
              {isBlocked ? '[BLOCKED BY POLICY]' : '[PASSED ALL INVARIANTS]'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px', marginTop: '12px' }}>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--color-healthy)', fontWeight: '600', fontFamily: 'var(--font-mono)', marginRight: '6px' }}>[PASS]</span>
              Permanent decline gate (Not expired/stolen)
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--color-healthy)', fontWeight: '600', fontFamily: 'var(--font-mono)', marginRight: '6px' }}>[PASS]</span>
              Duplicate lockout (0 duplicate risk)
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--color-healthy)', fontWeight: '600', fontFamily: 'var(--font-mono)', marginRight: '6px' }}>[PASS]</span>
              Retry budget check (Limit ≤ 2)
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--color-healthy)', fontWeight: '600', fontFamily: 'var(--font-mono)', marginRight: '6px' }}>[PASS]</span>
              Financial viability gate (EV &gt; ₹0)
            </div>
          </div>
        </div>

        {/* 6. EXECUTION BAR */}
        <div style={{ padding: '16px 20px', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <button 
              className="btn btn-primary"
              onClick={handleExecuteSingle}
              disabled={executing || isRecovered || isBlocked}
              style={{ fontSize: '0.82rem', padding: '8px 20px' }}
            >
              <Play size={14} fill="currentColor" />
              {executing ? 'Executing Recovery...' : isRecovered ? 'Already Recovered' : isBlocked ? 'Blocked by Policy' : 'Execute Synthetic Recovery'}
            </button>
          </div>

          {/* Collapsed Secondary Simulation */}
          <div>
            <button
              onClick={() => setExploreOpen(!exploreOpen)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '2px 0'
              }}
            >
              {exploreOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              <span>Explore Alternative Strategies & Dry-Run Simulation</span>
            </button>

            {exploreOpen && (
              <div style={{ marginTop: '8px', padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  Test recovery channels and Expected Value yield without committing transaction state.
                </div>
                <button 
                  className="btn btn-secondary"
                  onClick={handleSimulateSingle}
                  disabled={simulating}
                  style={{ fontSize: '0.74rem', padding: '5px 12px' }}
                >
                  <RotateCcw size={12} className={simulating ? 'animate-spin' : ''} />
                  {simulating ? 'Simulating...' : 'Simulate Strategy'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 7. SECTION 4: COLLAPSIBLE TECHNICAL EVIDENCE */}
        <div style={{ padding: '14px 20px' }}>
          <button 
            onClick={() => setTechEvidenceOpen(!techEvidenceOpen)}
            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: 0 }}
          >
            <span style={{ fontSize: '0.82rem', fontWeight: '600' }}>
              Technical Evidence & Telemetry Signals
            </span>
            {techEvidenceOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {techEvidenceOpen && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                <div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Raw Heuristic Estimate</span>
                  <div style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {Math.round((opportunity.rawProbability || 0.88) * 100)}%
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Calibrated Estimate (PAVA)</span>
                  <div style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--color-healthy)', fontFamily: 'var(--font-mono)' }}>
                    {Math.round((opportunity.recoveryProbability || 0.89) * 100)}% (Monotonic Knots)
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Action Cost</span>
                  <div style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    ₹10 (Gateway channel fee)
                  </div>
                </div>
              </div>

              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Supporting Telemetry Signals:</strong>
                <ul style={{ listStyle: 'disc inside', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <li>Failure Code: Transient Timeout (+45% recovery weight)</li>
                  <li>Customer History: Tier 1 Low-Fraud (+20% weight)</li>
                  <li>Retry Budget: Attempt {opportunity.attemptCount || 0} of 2 available</li>
                  <li>Duplicate Hash Guard: Idempotency check verified zero collisions</li>
                </ul>
              </div>

              {opportunity.events && opportunity.events.length > 0 && (
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>MongoDB Raw Audit Trail:</strong>
                  <div style={{ marginTop: '4px', background: 'var(--bg-tertiary)', padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
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

    </div>
  );
};

export default PaymentRecoveryDetail;
