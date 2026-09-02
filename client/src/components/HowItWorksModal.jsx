import React from 'react';
import { 
  X, ShieldCheck, Database, Cpu, Scale, Target, 
  HelpCircle, ArrowRight, CheckCircle2, AlertTriangle, Sparkles, Activity
} from 'lucide-react';

const HowItWorksModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(9, 13, 22, 0.85)',
        backdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflowY: 'auto'
      }}
      onClick={onClose}
    >
      <div 
        className="card"
        style={{
          width: '100%',
          maxWidth: '820px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-hover)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          padding: '28px',
          position: 'relative'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: 'var(--radius-xs)',
            transition: 'color 0.15s ease'
          }}
          title="Close modal"
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '18px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ padding: '8px', borderRadius: 'var(--radius-sm)', background: 'var(--color-info-bg)', color: 'var(--color-info)' }}>
            <Activity size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              How PulsePay Works
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              A 7-step overview of how PulsePay identifies, estimates, and safely recovers revenue.
            </p>
          </div>
        </div>

        {/* 7-Step Workflow Narrative */}
        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Step 1 */}
          <div style={{ padding: '14px 16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-critical)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="badge badge-danger" style={{ fontSize: '0.68rem', padding: '2px 7px' }}>1. DETECT</span>
              <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Find failed payments with revenue at risk</strong>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
              PulsePay automatically scans unresolved or failed transactions (e.g. gateway timeouts, webhook dropouts, acquirer 503s).
            </p>
          </div>

          {/* Step 2 */}
          <div style={{ padding: '14px 16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-warning)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="badge badge-warning" style={{ fontSize: '0.68rem', padding: '2px 7px' }}>2. SCORE</span>
              <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Estimate probability that recovery could succeed</strong>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
              Separates recoverable transient errors from permanent declines and computes an initial recovery probability from failure signals.
            </p>
          </div>

          {/* Step 3 */}
          <div style={{ padding: '14px 16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-info)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="badge badge-info" style={{ fontSize: '0.68rem', padding: '2px 7px' }}>3. CALIBRATE</span>
              <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Correct probability to match observed outcomes</strong>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
              Applies out-of-sample Isotonic Regression (PAVA) so predicted probabilities reflect true empirical recovery frequencies (ECE: 33.7% → 14.8%).
            </p>
          </div>

          {/* Step 4 */}
          <div style={{ padding: '14px 16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-info)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="badge badge-info" style={{ fontSize: '0.68rem', padding: '2px 7px' }}>4. OPTIMIZE</span>
              <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Calculate Expected Value for candidate strategies</strong>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
              Ranks possible recovery channels (delayed retry, alternate routing, webhook reconciliation, payment link) to maximize net Expected Value.
            </p>
          </div>

          {/* Step 5 */}
          <div style={{ padding: '14px 16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-healthy)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="badge badge-success" style={{ fontSize: '0.68rem', padding: '2px 7px' }}>5. PROTECT</span>
              <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Apply deterministic safety policies</strong>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
              Deterministic code guardrails strictly enforce single-execution idempotency, prevent duplicate charges (0 duplicates), and block permanent declines.
            </p>
          </div>

          {/* Step 6 */}
          <div style={{ padding: '14px 16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-healthy)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="badge badge-success" style={{ fontSize: '0.68rem', padding: '2px 7px' }}>6. EXECUTE</span>
              <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Run bounded, authorized synthetic actions</strong>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
              Safely executes bounded recovery in Simulation Mode against synthetic ground-truth physics without moving real funds.
            </p>
          </div>

          {/* Step 7 */}
          <div style={{ padding: '14px 16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-healthy)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="badge badge-success" style={{ fontSize: '0.68rem', padding: '2px 7px' }}>7. MEASURE</span>
              <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Compare outcomes against blind retry</strong>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
              Audits the full event lifecycle in MongoDB and measures realized net recovery against naive baseline (+21.0% net lift).
            </p>
          </div>

        </div>

        {/* Goal Summary */}
        <div style={{ padding: '14px 18px', borderRadius: 'var(--radius-md)', background: 'var(--color-healthy-bg)', border: '1px solid var(--color-healthy-border)', marginTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-healthy)', fontWeight: '700', fontSize: '0.85rem' }}>
            <CheckCircle2 size={16} />
            <span>PulsePay's Primary Goal</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginTop: '4px' }}>
            Recover more legitimate revenue while avoiding unsafe payment actions, fee waste, and customer friction.
          </p>
        </div>

        {/* Technology Behind the Decision Section */}
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
            Technology Behind the Decision
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            
            <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                <Database size={14} style={{ color: 'var(--color-info)' }} />
                <span>MongoDB</span>
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                Stores immutable payment events and recovery history so PulsePay can reconstruct the complete lifecycle timeline.
              </p>
            </div>

            <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                <Cpu size={14} style={{ color: 'var(--color-info)' }} />
                <span>ML Recovery Scoring</span>
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                Estimates the probability that a failed payment can be recovered based on failure codes, provider health, and customer history.
              </p>
            </div>

            <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', fontSize: '0.82rem', color: 'var(--color-info)' }}>
                <Scale size={14} style={{ color: 'var(--color-info)' }} />
                <span>Probability Calibration (PAVA)</span>
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                Uses Isotonic Regression (PAVA) so probability estimates accurately reflect real empirical success rates.
              </p>
            </div>

            <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', fontSize: '0.82rem', color: 'var(--color-info)' }}>
                <Target size={14} style={{ color: 'var(--color-info)' }} />
                <span>Expected Value (EV)</span>
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                Calculates whether recovery is financially worthwhile by weighing expected revenue against gateway action costs.
              </p>
            </div>

            <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', fontSize: '0.82rem', color: 'var(--color-healthy)' }}>
                <ShieldCheck size={14} />
                <span>Deterministic Safety Policy</span>
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                Authoritative code rules that block duplicate charges, prevent retry storms, and enforce idempotent locks.
              </p>
            </div>

            <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', fontSize: '0.82rem', color: 'var(--color-warning)' }}>
                <Sparkles size={14} />
                <span>AI Recovery Explanation</span>
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                Generates plain-English summaries explaining why a strategy was chosen using grounded evidence already in the system.
              </p>
            </div>

          </div>

          <div style={{ marginTop: '12px', padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Key Architecture Principle:</strong> The <em>Decision Engine</em> (ML scoring, EV calculation, and safety gates) makes all recovery decisions deterministically. The <em>AI Agent</em> provides grounded explanations of decisions already made.
          </div>
        </div>

        {/* Current Limitations Section */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Current Limitations & Scope
          </h4>
          <ul style={{ listStyle: 'disc inside', fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <li><strong>Synthetic Data Sandbox:</strong> All transactions are generated from deterministic synthetic benchmark models for safety.</li>
            <li><strong>No Real Money Movement:</strong> No live banking APIs, card rails, or customer payment methods are charged.</li>
            <li><strong>Probabilistic Estimates:</strong> Recovery probabilities are mathematical projections based on historical simulations, not guarantees.</li>
          </ul>
        </div>

      </div>
    </div>
  );
};

export default HowItWorksModal;
