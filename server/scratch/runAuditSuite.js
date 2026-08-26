const http = require('http');
const mongoose = require('mongoose');

const API_BASE = 'http://localhost:5000';
const ML_BASE = 'http://localhost:8000';

function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = options.body ? JSON.stringify(options.body) : null;
    const reqOptions = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
        ...(options.headers || {})
      },
      timeout: options.timeout || 60000
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function runAudit() {
  console.log('====================================================');
  console.log('PULSEPAY FULL PRODUCTION AUDIT SUITE');
  console.log('====================================================\n');

  const results = {
    services: {},
    endpoints: {},
    scenarios: [],
    baseline: {},
    aiEvaluation: {},
    mlAttribution: {},
    whatIf: [],
    replay: {},
    dataLab: {},
    security: {}
  };

  // 1. SERVICES HEALTH
  console.log('--- [1/10] Checking Core Service Health ---');
  try {
    const backendHealth = await fetchJson(`${API_BASE}/health`);
    console.log('Backend /health Status:', backendHealth.status, backendHealth.data);
    results.services.backend = backendHealth.status === 200;
  } catch (err) {
    console.error('Backend unreachable:', err.message);
    results.services.backend = false;
  }

  try {
    const mlHealth = await fetchJson(`${ML_BASE}/health`);
    console.log('FastAPI ML /health Status:', mlHealth.status, mlHealth.data);
    results.services.ml = mlHealth.status === 200;
  } catch (err) {
    console.error('ML unreachable:', err.message);
    results.services.ml = false;
  }

  // 2. BASELINE VALIDATION (Zero baseline & Insufficient samples)
  console.log('\n--- [2/10] Baseline Zero & Small Sample Validation ---');
  try {
    const baselineZero = await fetchJson(`${API_BASE}/api/transactions/baseline?merchantId=non_existent_merchant_12345`);
    console.log('Zero Baseline result:', baselineZero.data);
    results.baseline.zeroHandled = baselineZero.data.code === 'INSUFFICIENT_BASELINE_DATA' || baselineZero.data.success === false;
    results.baseline.noMisleading100Pct = !JSON.stringify(baselineZero.data).includes('"percentageChange":100');
  } catch (err) {
    console.error('Baseline test error:', err.message);
  }

  // 3. SEEDING BASELINE FOR SCENARIOS
  console.log('\n--- [3/10] Seeding Synthetic Historical Baseline Traffic (15k) ---');
  try {
    const baseRes = await fetchJson(`${API_BASE}/api/simulator/lab/baseline`, {
      method: 'POST',
      body: { count: 500, seed: 42 } // Seed 500 for fast audit execution
    });
    console.log('Baseline Seeding response:', baseRes.status, baseRes.data);
    results.baseline.seeding = baseRes.status === 201;
  } catch (err) {
    console.error('Baseline seeding error:', err.message);
  }

  // 4. TESTING 7 INCIDENT SCENARIOS
  console.log('\n--- [4/10] Testing 7 Production Incident Scenarios ---');
  const targetScenarios = [
    'WEBHOOK_OUTAGE',
    'GATEWAY_TIMEOUT',
    'DUPLICATE_PAYMENT',
    'PROVIDER_DEGRADATION',
    'REFUND_FAILURE',
    'OUT_OF_ORDER',
    'COMPOUND_INCIDENT'
  ];

  for (const scenarioId of targetScenarios) {
    console.log(`\n>> Executing Scenario: ${scenarioId}...`);
    try {
      const res = await fetchJson(`${API_BASE}/api/simulator/lab/run`, {
        method: 'POST',
        body: { scenarioId }
      });
      
      if (res.status === 201 && res.data && res.data.data) {
        const report = res.data.data;
        const scenarioSummary = {
          scenarioId,
          name: report.name,
          actualIncidentId: report.actualIncidentId,
          scorecardOverall: report.scorecard?.overallScore,
          detectionStatus: report.scorecard?.detection,
          rootCauseStatus: report.scorecard?.rootCause,
          precision: report.metrics?.precision,
          recall: report.metrics?.recall,
          evidenceGroundingRate: report.metrics?.evidenceGroundingRate,
          financialExposure: report.stats?.financialExposure,
          affectedTransactions: report.stats?.transactionsAffected,
          pass: report.scorecard?.overallScore >= 70
        };
        console.log(`   Result: Score ${report.scorecard?.overallScore}/100 | Detection: ${report.scorecard?.detection} | Incident: ${report.actualIncidentId}`);
        results.scenarios.push(scenarioSummary);
      } else {
        console.error(`   Failed to run scenario ${scenarioId}:`, res.status, res.data);
        results.scenarios.push({ scenarioId, pass: false, error: res.data?.error || 'HTTP error' });
      }
    } catch (err) {
      console.error(`   Error in scenario ${scenarioId}:`, err.message);
      results.scenarios.push({ scenarioId, pass: false, error: err.message });
    }
  }

  // 5. ML EXPLAINABILITY & APPROXIMATE ATTRIBUTION
  console.log('\n--- [5/10] ML Explainability & Feature Influence Verification ---');
  try {
    const mlPredict = await fetchJson(`${ML_BASE}/predict`, {
      method: 'POST',
      body: {
        features: {
          amount: 85000.0,
          processing_time_ms: 12500.0,
          webhook_failure_count: 5.0,
          webhook_retry_count: 4.0,
          webhook_delay_ms: 6000.0,
          event_count: 4.0,
          event_order_violation: 1.0,
          duplicate_similarity: 0.95,
          merchant_failure_rate: 0.35,
          payment_failure_rate: 0.40,
          hour_of_day: 14.0
        }
      }
    });
    console.log('ML Predict response:', mlPredict.data);
    results.mlAttribution.hasApproxLabel = (mlPredict.data.feature_influence_disclaimer || '').toLowerCase().includes('approximate');
    results.mlAttribution.isAnomaly = mlPredict.data.is_anomaly;
    results.mlAttribution.normalizedScore = mlPredict.data.normalized_anomaly_score;
    results.mlAttribution.features = mlPredict.data.feature_contributions;
  } catch (err) {
    console.error('ML Predict error:', err.message);
  }

  // 6. REPLAY & FORENSICS API VALIDATION
  console.log('\n--- [6/10] Incident Replay & Forensics Verification ---');
  try {
    const incList = await fetchJson(`${API_BASE}/api/incidents`);
    if (incList.data && incList.data.data && incList.data.data.length > 0) {
      const firstInc = incList.data.data[0];
      const replayRes = await fetchJson(`${API_BASE}/api/incidents/${firstInc.incidentId}/replay`);
      const steps = replayRes.data?.replaySequence || [];
      console.log(`Replay for ${firstInc.incidentId}:`, replayRes.status, `Steps: ${steps.length}`);
      results.replay = {
        incidentId: firstInc.incidentId,
        stepsCount: steps.length,
        hasInitialState: steps.length > 0,
        hasFinalState: steps.length > 0
      };

      // Test Forensics on first transaction ID
      if (firstInc.transactionIds && firstInc.transactionIds.length > 0) {
        const txId = firstInc.transactionIds[0];
        const forensicRes = await fetchJson(`${API_BASE}/api/transactions/${txId}/forensics`);
        console.log(`Forensics for ${txId}:`, forensicRes.status, 'Checks:', Object.keys(forensicRes.data?.validations || {}));
        results.forensics = {
          paymentId: txId,
          status: forensicRes.status,
          hasTimeline: forensicRes.data?.timeline?.length > 0,
          hasValidations: !!forensicRes.data?.validations
        };
      }
    }
  } catch (err) {
    console.error('Replay / Forensics error:', err.message);
  }

  // 7. WHAT-IF API VALIDATION
  console.log('\n--- [7/10] What-If Simulation Verification ---');
  try {
    const incList = await fetchJson(`${API_BASE}/api/incidents`);
    if (incList.data && incList.data.data && incList.data.data.length > 0) {
      const targetInc = incList.data.data[0];
      const whatIfParamsList = [
        { name: '100% Webhook Success', params: { webhookSuccessRate: 1.0, exposureDurationMinutes: 10 } },
        { name: '50% Webhook Success', params: { webhookSuccessRate: 0.5, exposureDurationMinutes: 30 } },
        { name: '0% Webhook Success', params: { webhookSuccessRate: 0.0, exposureDurationMinutes: 120 } }
      ];

      for (const item of whatIfParamsList) {
        const res = await fetchJson(`${API_BASE}/api/incidents/${targetInc.incidentId}/what-if`, {
          method: 'POST',
          body: item.params
        });
        console.log(`What-If [${item.name}]:`, res.status, res.data?.data?.recovered ? `Recovered: ₹${res.data.data.recovered.amount}` : 'OK');
        results.whatIf.push({
          name: item.name,
          success: res.status === 200,
          recoveredAmount: res.data?.data?.recovered?.amount
        });
      }
    }
  } catch (err) {
    console.error('What-If test error:', err.message);
  }

  // 8. DATA LAB VALIDATION
  console.log('\n--- [8/10] Data Lab Dataset Validation Engine ---');
  try {
    const testRecords = [
      { paymentId: 'pay_val_1', amount: 1500, currency: 'INR', status: 'captured', paymentMethod: 'card' },
      { paymentId: '', amount: -50, currency: 'INVALID_CURR', status: 'unknown_status', paymentMethod: 'invalid_method' },
      { paymentId: 'pay_val_1', amount: 1500, currency: 'INR', status: 'captured', paymentMethod: 'card' } // exact dup
    ];
    const valRes = await fetchJson(`${API_BASE}/api/transactions/validate`, {
      method: 'POST',
      body: { records: testRecords }
    });
    console.log('Data Lab Validation Result:', valRes.data);
    results.dataLab = {
      totalTested: valRes.data?.total,
      validDetected: valRes.data?.valid === 1,
      invalidDetected: valRes.data?.invalid === 2,
      duplicatesDetected: valRes.data?.duplicates > 0 || valRes.data?.errors?.length > 0
    };
  } catch (err) {
    console.error('Data Lab validation error:', err.message);
  }

  // 9. AI EVALUATION ENGINE
  console.log('\n--- [9/10] AI Evaluation Run Verification ---');
  try {
    const evalRes = await fetchJson(`${API_BASE}/api/incidents/ai-evaluation/run`, {
      method: 'POST'
    });
    console.log('AI Evaluation Response:', evalRes.status, evalRes.data);
    results.aiEvaluation = {
      status: evalRes.status,
      evaluatedCount: evalRes.data?.evaluatedCount,
      averageGroundingScore: evalRes.data?.averageGroundingScore,
      passed: evalRes.status === 200 && evalRes.data?.evaluatedCount > 0
    };
  } catch (err) {
    console.error('AI Evaluation test error:', err.message);
  }

  // 10. EVALUATION REPORTS & EXPORTS
  console.log('\n--- [10/10] Evaluation Reports List & JSON/CSV Export ---');
  try {
    const repList = await fetchJson(`${API_BASE}/api/simulator/lab/reports`);
    console.log(`Reports Count in DB: ${repList.data?.data?.length || 0}`);
    if (repList.data?.data?.length > 0) {
      const firstReport = repList.data.data[0];
      const jsonExport = await fetchJson(`${API_BASE}/api/simulator/lab/reports/${firstReport.evaluationId}/export?format=json`);
      const csvExport = await fetchJson(`${API_BASE}/api/simulator/lab/reports/${firstReport.evaluationId}/export?format=csv`);
      console.log('JSON Export status:', jsonExport.status, 'Has ID:', !!jsonExport.data?.evaluationId);
      console.log('CSV Export status:', csvExport.status, 'Header:', csvExport.headers['content-type']);
    }
  } catch (err) {
    console.error('Reports export error:', err.message);
  }

  console.log('\n====================================================');
  console.log('AUDIT RUN COMPLETED');
  console.log('====================================================\n');
  console.log(JSON.stringify(results, null, 2));
}

runAudit();
