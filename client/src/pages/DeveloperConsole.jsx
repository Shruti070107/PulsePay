import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  triggerSimulation, 
  triggerIncidentDetection, 
  triggerMLTrain, 
  triggerDemoMode,
  validateDataset,
  importDataset,
  ingestReplayEvent,
  getLabScenarios,
  triggerLabBaseline,
  runLabScenario,
  getLabReports,
  runRecoveryDemo,
  evaluateRecovery
} from '../api';
import { 
  ShieldAlert, Cpu, Trash2, Sparkles, Upload, Play, Pause, Square, Download, CheckCircle, XCircle, AlertTriangle, HelpCircle, RefreshCw, FileText, Target, Coins, RotateCcw
} from 'lucide-react';

const DEMO_DATASETS = {
  NORMAL_TRANSACTIONS: [
    { paymentId: 'pay_norm_01', customerId: 'cust_101', merchantId: 'merchant_a', amount: 1200, currency: 'INR', status: 'success', paymentMethod: 'upi', timestamp: new Date(Date.now() - 3600000).toISOString() },
    { paymentId: 'pay_norm_02', customerId: 'cust_102', merchantId: 'merchant_b', amount: 3500, currency: 'INR', status: 'success', paymentMethod: 'card', timestamp: new Date(Date.now() - 3000000).toISOString() },
    { paymentId: 'pay_norm_03', customerId: 'cust_103', merchantId: 'merchant_a', amount: 800, currency: 'INR', status: 'success', paymentMethod: 'netbanking', timestamp: new Date(Date.now() - 2400000).toISOString() }
  ],
  WEBHOOK_FAILURE_CLUSTER: [
    { paymentId: 'pay_wh_fail_01', customerId: 'cust_201', merchantId: 'merchant_c', amount: 5000, currency: 'INR', status: 'success', paymentMethod: 'card', timestamp: new Date(Date.now() - 500000).toISOString() },
    { paymentId: 'pay_wh_fail_02', customerId: 'cust_202', merchantId: 'merchant_c', amount: 4800, currency: 'INR', status: 'success', paymentMethod: 'card', timestamp: new Date(Date.now() - 400000).toISOString() },
    { paymentId: 'pay_wh_fail_03', customerId: 'cust_203', merchantId: 'merchant_c', amount: 5200, currency: 'INR', status: 'success', paymentMethod: 'card', timestamp: new Date(Date.now() - 300000).toISOString() }
  ],
  DUPLICATE_PAYMENT_CLUSTER: [
    { paymentId: 'pay_dup_click_01', customerId: 'cust_301', merchantId: 'merchant_d', amount: 2500, currency: 'INR', status: 'success', paymentMethod: 'upi', timestamp: new Date().toISOString() },
    { paymentId: 'pay_dup_click_02', customerId: 'cust_301', merchantId: 'merchant_d', amount: 2500, currency: 'INR', status: 'success', paymentMethod: 'upi', timestamp: new Date(Date.now() + 5000).toISOString() }
  ]
};

const DeveloperConsole = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(1);
  const [logs, setLogs] = useState([]);

  // Data Lab state variables
  const [pastedJson, setPastedJson] = useState('');
  const [parsedRecords, setParsedRecords] = useState([]);
  const [validationReport, setValidationReport] = useState(null);
  
  // Payment Scenario Lab & Evaluation States
  const [labScenarios, setLabScenarios] = useState([]);
  const [selectedLabScenario, setSelectedLabScenario] = useState('WEBHOOK_OUTAGE');
  const [labReports, setLabReports] = useState([]);
  const [labLoading, setLabLoading] = useState(false);
  const [demoStep, setDemoStep] = useState(0); 
  const [demoStatusText, setDemoStatusText] = useState('');
  const [baselineLoading, setBaselineLoading] = useState(false);

  // Revenue Recovery Demo & Benchmark States
  const [recoveryDemoLoading, setRecoveryDemoLoading] = useState(false);
  const [recoveryDemoResult, setRecoveryDemoResult] = useState(null);
  const [recoveryEvalLoading, setRecoveryEvalLoading] = useState(false);
  const [recoveryEvalResult, setRecoveryEvalResult] = useState(null);

  const handleRunFullRecoveryDemo = async () => {
    try {
      setRecoveryDemoLoading(true);
      addLog('Triggering 1-Click Revenue Recovery Demo Runner...', 'info');
      addLog('Ingesting multi-scenario synthetic failures (Timeouts, Webhooks, Declines, Duplicates)...', 'info');
      const res = await runRecoveryDemo();
      setRecoveryDemoResult(res.data);
      addLog(`[SUCCESS] Recovery Demo Finished! Salvaged ₹${res.data.actualRecovered.toLocaleString()} (${res.data.recoveryRate}% Recovery Rate).`, 'success');
    } catch (err) {
      addLog(`Recovery Demo failed: ${err.message}`, 'critical');
    } finally {
      setRecoveryDemoLoading(false);
    }
  };

  const handleRunRecoveryBenchmark = async () => {
    try {
      setRecoveryEvalLoading(true);
      addLog('Running Recovery Engine Benchmark Suite across 6 canonical failure scenarios...', 'info');
      const res = await evaluateRecovery();
      setRecoveryEvalResult(res.data);
      addLog(`[SUCCESS] Benchmark Complete: ${res.data.accuracyRate}% Accuracy, ${res.data.policyViolations} Policy Violations.`, 'success');
    } catch (err) {
      addLog(`Recovery Benchmark failed: ${err.message}`, 'critical');
    } finally {
      setRecoveryEvalLoading(false);
    }
  };

  const fetchLabData = async () => {
    try {
      const [scenRes, repRes] = await Promise.all([
        getLabScenarios(),
        getLabReports()
      ]);
      setLabScenarios(scenRes.data || []);
      setLabReports(repRes.data || []);
    } catch (err) {
      console.error("Failed to load scenario lab metadata", err);
    }
  };

  useEffect(() => {
    fetchLabData();
  }, []);

  const handleGenerateHistoricalBaseline = async () => {
    try {
      setBaselineLoading(true);
      addLog('Triggering Seeded Historical Normal Traffic Generator...', 'info');
      addLog('DATA ORIGIN: SYNTHETIC SIMULATION - generating 15,000 transactions...', 'info');
      
      const res = await triggerLabBaseline(15000, 42);
      addLog(`[SUCCESS] Seeding complete. Generated ${res.count} historical payments (Origin: ${res.origin}).`, 'success');
      await fetchLabData();
    } catch (err) {
      addLog(`Failed to generate baseline traffic: ${err.message}`, 'critical');
    } finally {
      setBaselineLoading(false);
    }
  };

  const handleRunLabDemo = async () => {
    try {
      setLabLoading(true);
      setDemoStep(1);
      setDemoStatusText('STEP 1/10: Resetting Sandbox Database Collections...');
      addLog('Starting Reproducible Production Incident Demo...', 'info');
      await new Promise(r => setTimeout(r, 600));

      setDemoStep(2);
      setDemoStatusText('STEP 2/10: Generating Seeded Normal Baseline Traffic...');
      addLog('Seeding baseline normal traffic...', 'info');
      await new Promise(r => setTimeout(r, 600));

      setDemoStep(4);
      setDemoStatusText(`STEP 4/10: Injecting Scenario: ${selectedLabScenario}...`);
      addLog(`Injecting failure sequence parameters for: ${selectedLabScenario}`, 'warning');
      await new Promise(r => setTimeout(r, 600));

      setDemoStep(6);
      setDemoStatusText('STEP 6/10: Running PulsePay State Reconstruction Pipeline...');
      addLog('Reconstructing logical payment/order/webhook timeline states...', 'info');
      await new Promise(r => setTimeout(r, 600));

      setDemoStep(8);
      setDemoStatusText('STEP 8/10: Running Evidence Fusion & Incident Correlation...');
      addLog('Running deterministic checks, baseline z-scores, and grouping...', 'info');
      
      const runRes = await runLabScenario(selectedLabScenario);
      await new Promise(r => setTimeout(r, 600));

      setDemoStep(9);
      setDemoStatusText('STEP 9/10: Running AI Investigator Auditing & Factual Grounding...');
      addLog('Evaluating AI hypothesis, fact grounding, and evidence coverage...', 'success');
      await new Promise(r => setTimeout(r, 600));

      setDemoStep(10);
      setDemoStatusText('STEP 10/10: Scenario Lab Evaluation Complete!');
      addLog(`[SUCCESS] Lab completed. Produced incident ID: ${runRes.data.actualIncidentId || 'N/A'}. Scorecard Rating: ${runRes.data.scorecard.overallScore}/100`, 'success');
      
      await fetchLabData();
    } catch (err) {
      addLog(`Scenario Lab demo failed: ${err.message}`, 'critical');
      setDemoStatusText('Demo Run Failed.');
    } finally {
      setLabLoading(false);
      setTimeout(() => setDemoStep(0), 4000);
    }
  };
  
  // Custom Dataset Generator settings
  const [genCount, setGenCount] = useState(10);
  const [genFailRate, setGenFailRate] = useState(10); // in percent
  
  // Replay Player State variables
  const [replayState, setReplayState] = useState('STOPPED'); // STOPPED, PLAYING, PAUSED
  const [replaySpeed, setReplaySpeed] = useState(1); // 0.5, 1, 2, 5, 10
  const [currentReplayIndex, setCurrentReplayIndex] = useState(0);
  
  // Replay failure modifiers (toggles)
  const [delayWebhook, setDelayWebhook] = useState(false);
  const [dropWebhook, setDropWebhook] = useState(false);

  const replayTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    };
  }, []);

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] [${type.toUpperCase()}] ${msg}`, ...prev]);
  };

  const handleSimulate = async (scenario) => {
    try {
      setLoading(true);
      addLog(`[SIMULATION STARTED] Scenario: ${scenario} | Volume: ${count}`, 'info');
      addLog('1. Triggering payment simulation scenario sequence...', 'info');
      const res = await triggerSimulation(scenario, count);
      addLog(`2. Events Generated: Mapped payment IDs: ${res.paymentsCreated.join(', ')}`, 'success');
      addLog('3. Events Ingested: MongoDB record arrays updated.', 'success');
      
      addLog('4. Ingestion Sync: Running Anomaly scan & Incident correlation engine...', 'info');
      const det = await triggerIncidentDetection();
      addLog(`5. Evidence Engine & Outliers scan finished. Incidents correlated: ${det.incidentsDetected}`, 'success');
    } catch (err) {
      addLog(`Simulation / ingestion workflow failed: ${err.message}`, 'critical');
    } finally {
      setLoading(false);
    }
  };

  const handleDetect = async () => {
    try {
      setLoading(true);
      addLog('Triggering manual Anomaly & Incident correlation aggregation scan...', 'info');
      const res = await triggerIncidentDetection();
      addLog(`[SUCCESS] Scan complete. Processed transactions: ${res.transactionsProcessed}. Correlated new incidents: ${res.incidentsDetected}.`, 'success');
    } catch (err) {
      addLog(`Incident scan failed: ${err.message}`, 'critical');
    } finally {
      setLoading(false);
    }
  };

  const handleTrain = async () => {
    try {
      setLoading(true);
      addLog('Triggering unsupervised Isolation Forest ML training...', 'info');
      const res = await triggerMLTrain();
      const stats = res.data.metrics;
      addLog(`[SUCCESS] ML Model retrained. Dataset samples: ${stats.total_samples}. Anomalies isolated: ${stats.anomalies_detected}.`, 'success');
    } catch (err) {
      addLog(`ML Model training failed: ${err.message}`, 'critical');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    try {
      setLoading(true);
      addLog('Activating E2E Demo Mode...', 'info');
      addLog('1. Safely clearing all previous payments, webhooks, incidents, and investigations...', 'info');
      addLog('2. Ingesting controlled transaction batch (normal streams + webhook outages + duplicate click pairs + latency bursts)...', 'info');
      const res = await triggerDemoMode();
      addLog(`[SUCCESS] ${res.message}`, 'success');
      addLog('3. Aggregator finished. ML retrained. Redirecting to operations dashboard...', 'success');
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      addLog(`Demo Mode activation failed: ${err.message}`, 'critical');
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------------------
  // DATA LAB METHODS
  // ----------------------------------------------------------------

  const parseCSV = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const records = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      const rec = {};
      headers.forEach((h, idx) => {
        rec[h] = values[idx];
      });
      records.push(rec);
    }
    return records;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target.result;
      let records = [];
      try {
        if (file.name.endsWith('.json')) {
          records = JSON.parse(text);
        } else if (file.name.endsWith('.csv')) {
          records = parseCSV(text);
        }
        setParsedRecords(records);
        addLog(`File loaded successfully: ${file.name} (${records.length} records parsed)`, 'info');
        handleValidate(records);
      } catch (err) {
        addLog(`Failed to parse file: ${err.message}`, 'critical');
      }
    };
    reader.readAsText(file);
  };

  const handlePasteJson = () => {
    try {
      const records = JSON.parse(pastedJson);
      const arr = Array.isArray(records) ? records : [records];
      setParsedRecords(arr);
      addLog(`Pasted JSON successfully parsed: ${arr.length} records.`, 'info');
      handleValidate(arr);
    } catch (err) {
      addLog(`Invalid JSON pasted: ${err.message}`, 'critical');
    }
  };

  const handleValidate = async (records = parsedRecords) => {
    try {
      setLoading(true);
      const res = await validateDataset(records);
      setValidationReport(res);
      addLog(`Validation complete: ${res.valid} valid, ${res.invalid} invalid, ${res.duplicates} duplicates.`, 'success');
    } catch (err) {
      addLog(`Validation request failed: ${err.message}`, 'critical');
    } finally {
      setLoading(false);
    }
  };

  const handleImportValid = async () => {
    try {
      setLoading(true);
      // Filter valid ones locally for ingestion
      const validRecords = parsedRecords.filter((_, idx) => {
        if (!validationReport) return true;
        return !validationReport.errors.some(e => e.row === idx + 1);
      });

      addLog(`Importing ${validRecords.length} valid records into transaction log...`, 'info');
      const res = await importDataset(validRecords);
      addLog(`[SUCCESS] Ingested and correlated successfully.`, 'success');
      setValidationReport(null);
      setParsedRecords([]);
      setPastedJson('');
    } catch (err) {
      addLog(`Bulk import failed: ${err.message}`, 'critical');
    } finally {
      setLoading(false);
    }
  };

  const generateRealisticDataset = () => {
    const list = [];
    const methods = ['card', 'upi', 'netbanking', 'wallet'];
    const merchants = ['merchant_x', 'merchant_y', 'merchant_z'];
    
    for (let i = 0; i < genCount; i++) {
      const paymentId = `pay_gen_${Math.random().toString(36).substr(2, 9)}`;
      const isFailed = Math.random() * 100 < genFailRate;
      list.push({
        paymentId,
        customerId: `cust_${Math.floor(Math.random() * 50) + 100}`,
        merchantId: merchants[Math.floor(Math.random() * merchants.length)],
        amount: Math.floor(Math.random() * 4000) + 500,
        currency: 'INR',
        status: isFailed ? 'failed' : 'success',
        paymentMethod: methods[Math.floor(Math.random() * methods.length)],
        timestamp: new Date(Date.now() - i * 120000).toISOString()
      });
    }
    setParsedRecords(list);
    addLog(`Generated realistic test dataset with ${list.length} records.`, 'info');
    handleValidate(list);
  };

  const loadDemoDataset = (key) => {
    const dataset = DEMO_DATASETS[key];
    if (dataset) {
      setParsedRecords(dataset);
      addLog(`Built-in DEMO Dataset loaded: ${key}`, 'info');
      handleValidate(dataset);
    }
  };

  // ----------------------------------------------------------------
  // SRE REPLAY PLAYER
  // ----------------------------------------------------------------

  const startReplay = () => {
    if (parsedRecords.length === 0) {
      addLog('No records loaded for replay streaming.', 'critical');
      return;
    }
    setReplayState('PLAYING');
    addLog('SRE Replay Stream Ingestion: STARTING...', 'info');

    if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    
    const intervalMs = Math.round(3000 / replaySpeed);
    
    replayTimerRef.current = setInterval(async () => {
      setCurrentReplayIndex(prevIndex => {
        if (prevIndex >= parsedRecords.length) {
          clearInterval(replayTimerRef.current);
          setReplayState('STOPPED');
          addLog('Replay stream finished: Ingested all records.', 'success');
          return 0;
        }

        const record = parsedRecords[prevIndex];
        
        // Ingest the event details dynamically
        const eventBody = {
          eventType: 'payment.created',
          paymentId: record.paymentId,
          amount: record.amount,
          customerId: record.customerId,
          merchantId: record.merchantId,
          status: 'created',
          timestamp: record.timestamp,
          isWebhook: false
        };

        ingestReplayEvent(eventBody).then(() => {
          addLog(`Replayed event: [payment.created] for transaction ID ${record.paymentId}`, 'info');
          
          // Inject Authorize & Capture after simulated delays
          setTimeout(() => {
            ingestReplayEvent({
              ...eventBody,
              eventType: 'payment.captured',
              status: record.status
            }).then(() => {
              addLog(`Replayed event: [payment.captured] | Status: ${record.status}`, 'info');
            });
          }, 800);

          // Webhook delay/drop overrides
          if (!dropWebhook) {
            setTimeout(() => {
              ingestReplayEvent({
                ...eventBody,
                isWebhook: true,
                webhookStatus: delayWebhook ? 'retrying' : 'delivered'
              }).then(() => {
                addLog(`Replayed webhook delivery | Status: ${delayWebhook ? 'RETRYING' : 'DELIVERED'}`, 'info');
              });
            }, delayWebhook ? 3000 : 1500);
          } else {
            addLog(`Failure Injection: Webhook dropped for transaction ${record.paymentId}`, 'warning');
          }

        }).catch(err => {
          addLog(`Failed to ingest event: ${err.message}`, 'critical');
        });

        return prevIndex + 1;
      });
    }, intervalMs);
  };

  const pauseReplay = () => {
    setReplayState('PAUSED');
    if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    addLog('SRE Replay Stream Ingestion: PAUSED.', 'info');
  };

  const stopReplay = () => {
    setReplayState('STOPPED');
    setCurrentReplayIndex(0);
    if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    addLog('SRE Replay Stream Ingestion: STOPPED & RESET.', 'info');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '700', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Scenario Lab
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Synthetic traffic generator, transaction data lab, and failure scenario replay studio.
          </p>
        </div>
        <button 
          className="btn btn-success" 
          onClick={handleDemo} 
          disabled={loading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <Sparkles size={14} /> Activate E2E Demo Mode
        </button>
      </div>

      <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '6px', padding: '12px', marginBottom: '24px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        ⚠️ <strong>SYNTHETIC DEMONSTRATION DATA WARNING:</strong> All transaction flows generated in this sandbox are synthetic simulations. Under no circumstances are payment attempts mapped to real financial gateways or card networks.
      </div>

      {/* AI REVENUE RECOVERY DEMO & BENCHMARK PANEL */}
      <div className="card" style={{ marginBottom: '24px', padding: '18px', border: '1px solid var(--color-success-border)', background: 'var(--color-success-bg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} style={{ color: 'var(--color-healthy)' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                1-Click AI Revenue Recovery Live Demo & Benchmark Runner
              </h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Ingests 30 synthetic transactions across 5 failure scenarios, computes Expected Value, verifies safety gates, and executes test recoveries.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="btn btn-secondary" 
              onClick={handleRunRecoveryBenchmark}
              disabled={recoveryEvalLoading}
              style={{ padding: '7px 14px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Target size={14} />
              {recoveryEvalLoading ? 'Evaluating...' : 'Run Benchmark Suite'}
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleRunFullRecoveryDemo}
              disabled={recoveryDemoLoading}
              style={{ 
                padding: '7px 16px', 
                fontSize: '0.8rem', 
                backgroundColor: 'var(--color-healthy)', 
                color: '#000', 
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Play size={14} fill="currentColor" />
              {recoveryDemoLoading ? 'Running Demo Pipeline...' : 'Run Live Revenue Recovery Demo'}
            </button>
          </div>
        </div>

        {/* Live Demo Results Summary */}
        {recoveryDemoResult && (
          <div style={{ padding: '14px', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--color-healthy)', marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <strong style={{ fontSize: '0.85rem', color: 'var(--color-healthy)' }}>
                ✔ Live Revenue Recovery Demo Completed (Campaign: {recoveryDemoResult.campaignId})
              </strong>
              <span className="badge badge-low" style={{ fontSize: '0.7rem' }}>
                AI Grounding: {recoveryDemoResult.aiGroundedScore}%
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', fontSize: '0.78rem' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Revenue at Risk</span>
                <p style={{ fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'var(--color-critical)', fontSize: '1rem' }}>
                  ₹{recoveryDemoResult.revenueAtRisk.toLocaleString()}
                </p>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Expected Yield</span>
                <p style={{ fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'var(--color-info)', fontSize: '1rem' }}>
                  ₹{recoveryDemoResult.expectedRecovery.toLocaleString()}
                </p>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Actual Recovered</span>
                <p style={{ fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'var(--color-healthy)', fontSize: '1rem' }}>
                  ₹{recoveryDemoResult.actualRecovered.toLocaleString()}
                </p>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Recovery Rate</span>
                <p style={{ fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontSize: '1rem' }}>
                  {recoveryDemoResult.recoveryRate}%
                </p>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Actions Blocked</span>
                <p style={{ fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'var(--color-warning)', fontSize: '1rem' }}>
                  {recoveryDemoResult.actionsBlocked} safety gates
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
              <strong>AI Agent Summary: </strong> {recoveryDemoResult.agentSummary}
            </p>
          </div>
        )}

        {/* Benchmark Results Summary */}
        {recoveryEvalResult && (
          <div style={{ padding: '14px', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--color-info)', marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong style={{ fontSize: '0.85rem', color: 'var(--color-info)' }}>
                ✔ Recovery Benchmark Evaluation Report
              </strong>
              <span className="badge badge-low" style={{ fontSize: '0.7rem' }}>
                Overall Score: {recoveryEvalResult.overallScore}%
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', fontSize: '0.78rem' }}>
              <div><span>Scenarios Tested:</span> <strong>{recoveryEvalResult.scenariosTested}</strong></div>
              <div><span>Accuracy Rate:</span> <strong style={{ color: 'var(--color-healthy)' }}>{recoveryEvalResult.accuracyRate}%</strong></div>
              <div><span>Policy Violations:</span> <strong style={{ color: recoveryEvalResult.policyViolations === 0 ? 'var(--color-healthy)' : 'var(--color-critical)' }}>{recoveryEvalResult.policyViolations}</strong></div>
              <div><span>Hallucinations:</span> <strong style={{ color: 'var(--color-healthy)' }}>{recoveryEvalResult.hallucinations}</strong></div>
            </div>
          </div>
        )}
      </div>

      {/* Visual Diagnostic pipeline */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'bold', letterSpacing: '0.05em', marginBottom: '12px' }}>
          SANDBOX TRANSACTION DIAGNOSTIC FLOW
        </h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-around', gap: '8px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
          <div style={{ padding: '6px 12px', background: loading ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
            External Transaction Data
          </div>
          <span style={{ color: 'var(--text-muted)' }}>→</span>
          <div style={{ padding: '6px 12px', background: loading ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
            Ingestion & Validation
          </div>
          <span style={{ color: 'var(--text-muted)' }}>→</span>
          <div style={{ padding: '6px 12px', background: loading ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
            Normalization Layer
          </div>
          <span style={{ color: 'var(--text-muted)' }}>→</span>
          <div style={{ padding: '6px 12px', background: loading ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
            Reconstructed State
          </div>
          <span style={{ color: 'var(--text-muted)' }}>→</span>
          <div style={{ padding: '6px 12px', background: loading ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
            Anomaly Detection
          </div>
          <span style={{ color: 'var(--text-muted)' }}>→</span>
          <div style={{ padding: '6px 12px', background: loading ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
            Incident Correlation
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '24px', gap: '24px' }}>
        
        {/* Left Column: Transaction Data Lab Importers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="card">
            <h3 className="panel-header">1. Import External Transaction Datasets</h3>
            
            {/* Demo dataset loader */}
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>LOAD BUILT-IN DEMO DATASET</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => loadDemoDataset('NORMAL_TRANSACTIONS')}>
                  Normal Transactions
                </button>
                <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => loadDemoDataset('WEBHOOK_FAILURE_CLUSTER')}>
                  Webhook failures
                </button>
                <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => loadDemoDataset('DUPLICATE_PAYMENT_CLUSTER')}>
                  Duplicate payments
                </button>
              </div>
            </div>

            {/* Custom generator */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>REALISTIC DATASET GENERATOR</span>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>VOLUME</label>
                  <input type="number" className="input" style={{ width: '80px' }} value={genCount} onChange={e => setGenCount(Math.max(1, parseInt(e.target.value) || 1))} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>FAILURE RATE (%)</label>
                  <input type="number" className="input" style={{ width: '80px' }} value={genFailRate} onChange={e => setGenFailRate(Math.max(0, parseInt(e.target.value) || 0))} />
                </div>
                <button className="btn btn-secondary" style={{ marginTop: '16px' }} onClick={generateRealisticDataset}>
                  Generate Dataset
                </button>
              </div>
            </div>

            {/* CSV / JSON File Input */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>UPLOAD CSV / JSON</span>
              <div style={{ marginTop: '8px' }}>
                <input type="file" accept=".csv,.json" onChange={handleFileUpload} />
              </div>
            </div>

            {/* Paste Area */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>PASTE JSON DATASET</span>
              <textarea 
                className="input" 
                rows="4" 
                placeholder='[{"paymentId":"pay_01", "amount": 1000, "status": "success", "customerId": "c1", "merchantId": "m1", "paymentMethod": "card"}]'
                value={pastedJson}
                onChange={e => setPastedJson(e.target.value)}
                style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', marginTop: '8px' }}
              />
              <button className="btn btn-secondary" style={{ marginTop: '10px' }} onClick={handlePasteJson}>
                Parse Pasted JSON
              </button>
            </div>
          </div>

          {/* Validation Report Widget */}
          {validationReport && (
            <div className="card">
              <h3 className="panel-header">Data Quality Validation Report</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', textAlign: 'center', marginBottom: '16px' }}>
                <div style={{ background: 'var(--bg-tertiary)', padding: '10px', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>TOTAL</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{validationReport.total}</div>
                </div>
                <div style={{ background: 'var(--bg-tertiary)', padding: '10px', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>VALID</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-healthy)' }}>{validationReport.valid}</div>
                </div>
                <div style={{ background: 'var(--bg-tertiary)', padding: '10px', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>INVALID</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-critical)' }}>{validationReport.invalid}</div>
                </div>
                <div style={{ background: 'var(--bg-tertiary)', padding: '10px', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>DUPLICATES</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-warning)' }}>{validationReport.duplicates}</div>
                </div>
              </div>

              {validationReport.errors && validationReport.errors.length > 0 && (
                <div style={{ maxHeight: '150px', overflowY: 'auto', marginBottom: '16px', background: 'var(--bg-tertiary)', padding: '10px', borderRadius: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-critical)' }}>VAL ERRORS:</span>
                  <ul style={{ fontSize: '0.75rem', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                    {validationReport.errors.map((err, idx) => (
                      <li key={idx}>
                        Row {err.row} | <strong>{err.field}</strong>: {err.problem} (Correction: {err.correction})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-success" onClick={handleImportValid}>
                  Import Valid Records
                </button>
                <button className="btn btn-secondary" onClick={() => { setValidationReport(null); setParsedRecords([]); }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Event Stream Replay */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="card">
            <h3 className="panel-header">2. Stream Replay Controller</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Replay transaction sequences with simulated delays and SRE error injections.
            </p>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
              {replayState !== 'PLAYING' ? (
                <button className="btn btn-success" onClick={startReplay}>
                  <Play size={14} /> {replayState === 'PAUSED' ? 'Resume' : 'Start Stream'}
                </button>
              ) : (
                <button className="btn btn-secondary" onClick={pauseReplay}>
                  <Pause size={14} /> Pause
                </button>
              )}
              
              <button className="btn btn-secondary" onClick={stopReplay}>
                <Square size={14} /> Stop
              </button>
            </div>

            {/* Playback Settings */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px', background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '6px' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>REPLAY SPEED MULTIPLIER</label>
                <select className="select" style={{ width: '100%', marginTop: '4px' }} value={replaySpeed} onChange={e => setReplaySpeed(Number(e.target.value))}>
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1.0x</option>
                  <option value={2}>2.0x</option>
                  <option value={5}>5.0x</option>
                  <option value={10}>10.0x</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>REPLAY STATUS INDEX</label>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginTop: '4px' }}>
                  {currentReplayIndex} / {parsedRecords.length} records
                </div>
              </div>
            </div>

            {/* Failure Injections Toggles */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>REALISTIC FAILURE INJECTIONS</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                  <input type="checkbox" checked={delayWebhook} onChange={e => setDelayWebhook(e.target.checked)} />
                  Delay webhook delivery status (retries latencyburst)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                  <input type="checkbox" checked={dropWebhook} onChange={e => setDropWebhook(e.target.checked)} />
                  Drop Webhook completely (causes Captured-Unpaid State mismatches)
                </label>
              </div>
            </div>
          </div>
              {/* Incident Scenario Lab Widget */}
          <div className="card" style={{ border: '1px solid var(--color-info)' }}>
            <h3 className="panel-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} style={{ color: 'var(--color-info)' }} /> Payment Incident Scenario Lab
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Execute a controlled simulation of specific payment failure modes to test and evaluate the telemetry detection, state reconstruction, and AI grounding report generation.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>SELECT SCENARIO TEMPLATE</label>
                <select 
                  className="select" 
                  style={{ width: '100%', marginTop: '4px', padding: '6px' }}
                  value={selectedLabScenario}
                  onChange={e => setSelectedLabScenario(e.target.value)}
                  disabled={labLoading}
                >
                  {labScenarios.map(sc => (
                    <option key={sc.scenarioId} value={sc.scenarioId}>
                      {sc.name} ({sc.severity})
                    </option>
                  ))}
                </select>
              </div>

              {selectedLabScenario && labScenarios.length > 0 && (
                <div style={{ fontSize: '0.75rem', background: 'var(--bg-tertiary)', padding: '10px', borderRadius: '4px', borderLeft: '3px solid var(--color-info)' }}>
                  <strong>Description:</strong> {labScenarios.find(s => s.scenarioId === selectedLabScenario)?.description}
                  <div style={{ marginTop: '6px' }}>
                    <strong>Expected Signals:</strong> {labScenarios.find(s => s.scenarioId === selectedLabScenario)?.expectedSignals.join(', ') || 'None'}
                  </div>
                </div>
              )}

              {demoStep > 0 && (
                <div style={{ background: 'var(--bg-tertiary)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '4px' }}>
                    <span>Simulation Progress</span>
                    <span>{demoStep * 10}%</span>
                  </div>
                  <div style={{ background: 'black', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ background: 'var(--color-info)', width: `${demoStep * 10}%`, height: '100%', transition: 'width 0.3s ease' }} />
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                    {demoStatusText}
                  </div>
                </div>
              )}

              <button 
                className="btn btn-success" 
                onClick={handleRunLabDemo} 
                disabled={labLoading}
                style={{ width: '100%', justifyContent: 'center', background: 'var(--color-info)' }}
              >
                {labLoading ? 'Executing Scenario Lab...' : 'Run Scenario Lab & Evaluate'}
              </button>
            </div>
          </div>

          {/* Historical Baseline Seeder Panel */}
          <div className="card">
            <h3 className="panel-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={16} /> Synthetic Historical Data Generator
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Establish a robust baseline by generating 15,000 historical transactions spanning the last 7 days.
            </p>
            <button 
              className="btn btn-secondary" 
              onClick={handleGenerateHistoricalBaseline}
              disabled={baselineLoading}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {baselineLoading ? 'Generating 15,000 payments...' : 'Generate 15k Historical Payments'}
            </button>
          </div>

          {/* Data Provenance Panel */}
          <div className="card">
            <h3 className="panel-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HelpCircle size={16} /> Data Provenance Summary
            </h3>
            <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Source Env</span>
                <strong style={{ color: 'var(--color-warning)' }}>SYNTHETIC SIMULATION</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Banking Connection</span>
                <strong>None (Sandbox Mock)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Payment Credentials</span>
                <strong>None (Cleaned/No Secrets)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Reports Logged</span>
                <strong>{labReports.length} Evaluation Run(s)</strong>
              </div>
            </div>
          </div>

          {/* Aggregator controller */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 className="panel-header">Incident Ingestion & Model Control</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button className="btn btn-success" onClick={handleDetect} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                <ShieldAlert size={18} /> Trigger Incident Aggregator Scan
              </button>
              <button className="btn" onClick={handleTrain} disabled={loading} style={{ width: '100%', backgroundColor: 'var(--color-info)', justifyContent: 'center' }}>
                <Cpu size={18} /> Retrain Isolation Forest Model
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Terminal logs */}
      <div className="card">
        <div className="flex-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '12px' }}>
          <span style={{ fontWeight: 'bold' }}>Pipeline Console Logs</span>
          <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => setLogs([])}>
            <Trash2 size={12} /> Clear Logs
          </button>
        </div>
        <div style={{ height: '200px', overflowY: 'auto', background: 'black', padding: '12px', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
          {logs.length === 0 ? (
            <span style={{ color: 'var(--text-muted)' }}>Console idle. Trigger actions above to inspect logs.</span>
          ) : (
            logs.map((log, index) => {
              let color = 'white';
              if (log.includes('[SUCCESS]')) color = 'var(--color-healthy)';
              if (log.includes('[CRITICAL]')) color = 'var(--color-critical)';
              if (log.includes('[WARNING]')) color = 'var(--color-warning)';
              return <div key={index} style={{ color, marginBottom: '4px' }}>{log}</div>;
            })
          )}
        </div>
      </div>

      {/* Evaluation Reports Log Panel */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h3 className="panel-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={16} /> Lab Evaluation Reports History
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Chronological record of completed simulation lab scenarios, including true/false alerts checks, AI grounding scores, and export templates.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '8px' }}>EVAL ID</th>
                <th style={{ padding: '8px' }}>SCENARIO</th>
                <th style={{ padding: '8px' }}>RATING SCORE</th>
                <th style={{ padding: '8px' }}>PRECISION</th>
                <th style={{ padding: '8px' }}>RECALL</th>
                <th style={{ padding: '8px' }}>GROUNDING</th>
                <th style={{ padding: '8px' }}>AI MODE</th>
                <th style={{ padding: '8px' }}>EXPORTS</th>
              </tr>
            </thead>
            <tbody>
              {labReports.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No scenario evaluation reports logged. Run a Scenario Lab simulation above to populate.
                  </td>
                </tr>
              ) : (
                labReports.map((rep, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{rep.evaluationId}</td>
                    <td style={{ padding: '8px' }}>{rep.name}</td>
                    <td style={{ padding: '8px' }}>
                      <span className="badge badge-medium" style={{ background: rep.scorecard.overallScore > 80 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: rep.scorecard.overallScore > 80 ? 'var(--color-healthy)' : 'var(--color-warning)' }}>
                        {rep.scorecard.overallScore} / 100
                      </span>
                    </td>
                    <td style={{ padding: '8px' }}>{rep.metrics.precision}%</td>
                    <td style={{ padding: '8px' }}>{rep.metrics.recall}%</td>
                    <td style={{ padding: '8px' }}>{rep.metrics.evidenceGroundingRate}%</td>
                    <td style={{ padding: '8px', fontSize: '0.75rem' }}>{rep.aiMode}</td>
                    <td style={{ padding: '8px' }}>
                      <a href={`/api/simulator/lab/reports/${rep.evaluationId}/export?format=json`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '2px 6px', fontSize: '0.7rem', marginRight: '6px' }}>
                        JSON
                      </a>
                      <a href={`/api/simulator/lab/reports/${rep.evaluationId}/export?format=csv`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '2px 6px', fontSize: '0.7rem' }}>
                        CSV
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DeveloperConsole;
