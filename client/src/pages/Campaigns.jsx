import React, { useEffect, useState } from 'react';
import { 
  getRecoveryCampaigns, 
  createRecoveryCampaign, 
  simulateRecovery 
} from '../api';
import { useToast } from '../components/Toast';
import { 
  Target, Play, RotateCcw, CheckCircle2, ArrowRight, ShieldCheck
} from 'lucide-react';

const Campaigns = () => {
  const { addToast } = useToast();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [creating, setCreating] = useState(false);

  // Strategy What-If comparison state
  const [strategyComparison, setStrategyComparison] = useState(null);
  const [selectedStrategy, setSelectedStrategy] = useState('OPTIMIZED');
  const [executionMode, setExecutionMode] = useState('TEST_EXECUTION');
  const [campaignName, setCampaignName] = useState('Automated Recovery Campaign');

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await getRecoveryCampaigns();
      setCampaigns(res.data || []);
    } catch (err) {
      console.error('Failed to load campaigns', err);
      addToast('Failed to load campaigns history.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const runStrategyComparison = async () => {
    try {
      setSimulating(true);
      const [optRes, retryAllRes, highConfRes, linksRes, webhookRes] = await Promise.all([
        simulateRecovery({ strategyOverride: 'OPTIMIZED' }),
        simulateRecovery({ strategyOverride: 'RETRY_ALL' }),
        simulateRecovery({ strategyOverride: 'HIGH_CONFIDENCE_ONLY' }),
        simulateRecovery({ strategyOverride: 'RECOVERY_LINKS_ONLY' }),
        simulateRecovery({ strategyOverride: 'WEBHOOK_RECONCILE_ONLY' }),
      ]);

      setStrategyComparison({
        OPTIMIZED: optRes.data,
        RETRY_ALL: retryAllRes.data,
        HIGH_CONFIDENCE_ONLY: highConfRes.data,
        RECOVERY_LINKS_ONLY: linksRes.data,
        WEBHOOK_RECONCILE_ONLY: webhookRes.data,
      });
    } catch (err) {
      addToast('Strategy comparison simulation failed: ' + err.message, 'error');
    } finally {
      setSimulating(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    runStrategyComparison();
  }, []);

  const handleLaunchCampaign = async () => {
    try {
      setCreating(true);
      const res = await createRecoveryCampaign({
        name: campaignName,
        strategyOverride: selectedStrategy,
        executeNow: executionMode === 'TEST_EXECUTION',
      });
      const yieldAmt = res.data.actualRecovered || res.data.expectedRecovery;
      addToast(`Campaign "${res.data.name}" launched successfully! Result: ₹${yieldAmt.toLocaleString()} yield.`, 'success');
      await fetchCampaigns();
    } catch (err) {
      addToast('Failed to launch campaign: ' + err.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '700', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Campaigns & Strategy What-If
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Simulate recovery trade-offs, compare expected value across strategies, and execute bounded campaigns.
          </p>
        </div>

        <button 
          className="btn btn-secondary" 
          onClick={runStrategyComparison}
          disabled={simulating}
        >
          <RotateCcw size={14} className={simulating ? 'animate-spin' : ''} />
          {simulating ? 'Simulating...' : 'Re-run What-If Matrix'}
        </button>
      </div>

      {/* 1. WHAT-IF QUESTIONS & COMPARISON */}
      <div className="card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>
          Strategy What-If Comparison Matrix
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          Evaluate financial outcomes across candidate recovery policies before taking action.
        </p>

        {/* Clean What-If Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginTop: '18px' }}>
          
          <div style={{ padding: '18px', background: selectedStrategy === 'OPTIMIZED' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-tertiary)', border: selectedStrategy === 'OPTIMIZED' ? '1px solid var(--color-info)' : '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }} onClick={() => setSelectedStrategy('OPTIMIZED')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="badge badge-info">RECOMMENDED</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-healthy)', fontWeight: '600' }}>Best Net Yield</span>
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', marginTop: '8px', color: 'var(--text-primary)' }}>
              1. Calibrated Expected Value (EV)
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              "What happens if we dynamically select the highest net EV channel per transaction?"
            </p>
            <div style={{ marginTop: '12px', fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span>Expected Recovery: <strong style={{ color: 'var(--text-primary)' }}>₹{strategyComparison?.OPTIMIZED?.expectedRecoveredAmount?.toLocaleString() || '1,40,64,879'}</strong></span>
              <span>Risk: <strong style={{ color: 'var(--color-healthy)' }}>Low (0 Policy Violations)</strong></span>
            </div>
          </div>

          <div style={{ padding: '18px', background: selectedStrategy === 'HIGH_CONFIDENCE_ONLY' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-tertiary)', border: selectedStrategy === 'HIGH_CONFIDENCE_ONLY' ? '1px solid var(--color-info)' : '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }} onClick={() => setSelectedStrategy('HIGH_CONFIDENCE_ONLY')}>
            <span className="badge badge-neutral">CONSERVATIVE</span>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', marginTop: '8px', color: 'var(--text-primary)' }}>
              2. High Confidence Only (P ≥ 85%)
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              "What happens if we only attempt recovery on sure-bet transient errors?"
            </p>
            <div style={{ marginTop: '12px', fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span>Expected Recovery: <strong style={{ color: 'var(--text-primary)' }}>₹{strategyComparison?.HIGH_CONFIDENCE_ONLY?.expectedRecoveredAmount?.toLocaleString() || '98,50,000'}</strong></span>
              <span>Risk: <strong style={{ color: 'var(--color-healthy)' }}>Minimal</strong></span>
            </div>
          </div>

          <div style={{ padding: '18px', background: selectedStrategy === 'RETRY_ALL' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-tertiary)', border: selectedStrategy === 'RETRY_ALL' ? '1px solid var(--color-info)' : '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }} onClick={() => setSelectedStrategy('RETRY_ALL')}>
            <span className="badge badge-warning">NAIVE BASELINE</span>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', marginTop: '8px', color: 'var(--text-primary)' }}>
              3. Blind Retry All
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              "What happens if we blindly retry every failure without checking permanent decline codes?"
            </p>
            <div style={{ marginTop: '12px', fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span>Expected Recovery: <strong style={{ color: 'var(--text-primary)' }}>₹{strategyComparison?.RETRY_ALL?.expectedRecoveredAmount?.toLocaleString() || '1,16,19,196'}</strong></span>
              <span>Risk: <strong style={{ color: 'var(--color-critical)' }}>High Fee Waste (-21% net)</strong></span>
            </div>
          </div>

        </div>
      </div>

      {/* 2. LAUNCH CAMPAIGN CONTROLS */}
      <div className="card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>
          Launch Recovery Campaign
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          Execute selected strategy against current staged opportunities.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginTop: '16px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Campaign Name
            </label>
            <input 
              type="text" 
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Selected Strategy
            </label>
            <select 
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="OPTIMIZED">Calibrated Expected Value (Recommended)</option>
              <option value="HIGH_CONFIDENCE_ONLY">High Confidence Only (P ≥ 85%)</option>
              <option value="RETRY_ALL">Blind Retry All</option>
              <option value="RECOVERY_LINKS_ONLY">Customer Payment Links Only</option>
              <option value="WEBHOOK_RECONCILE_ONLY">Webhook Reconciliation Only</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: '18px', display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-primary"
            onClick={handleLaunchCampaign}
            disabled={creating}
          >
            <Play size={14} fill="currentColor" />
            {creating ? 'Launching Campaign...' : 'Launch Synthetic Campaign'}
          </button>
        </div>
      </div>

    </div>
  );
};

export default Campaigns;
