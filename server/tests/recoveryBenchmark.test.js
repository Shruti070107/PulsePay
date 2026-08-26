const assert = require('assert');
const mongoose = require('mongoose');
const { generateBenchmarkDataset, BENCHMARK_SCENARIOS } = require('../services/recovery/benchmarkDatasetGenerator');
const { evaluatePaymentRecovery, executeAgainstGroundTruth, runRecoveryBenchmark } = require('../services/recovery/recoveryBenchmarkEngine');
const RecoveryBenchmark = require('../models/RecoveryBenchmark');
const RecoveryBenchmarkResult = require('../models/RecoveryBenchmarkResult');

const runTests = async () => {
  console.log('\n==================================================');
  console.log('Running PulsePay Recovery Benchmark & Outcome Lab Tests...');
  console.log('==================================================\n');

  // Test 1: Dataset Determinism & Reproducibility
  console.log('1. Testing Dataset Determinism & Reproducibility...');
  {
    const ds1 = generateBenchmarkDataset({ datasetSize: 100, seed: 20260826 });
    const ds2 = generateBenchmarkDataset({ datasetSize: 100, seed: 20260826 });
    const ds3 = generateBenchmarkDataset({ datasetSize: 100, seed: 99999999 });

    assert.strictEqual(ds1.length, 100);
    assert.strictEqual(ds2.length, 100);
    assert.deepStrictEqual(ds1[0].paymentId, ds2[0].paymentId, 'Same seed must generate identical payment IDs');
    assert.deepStrictEqual(ds1[50].amount, ds2[50].amount, 'Same seed must generate identical amounts');
    assert.deepStrictEqual(ds1[99].failureType, ds2[99].failureType, 'Same seed must generate identical failure types');

    assert.notStrictEqual(ds1[0].paymentId, ds3[0].paymentId, 'Different seeds must generate distinct datasets');
    console.log('  ✔ Dataset Determinism & Seed Reproducibility - PASSED');
  }

  // Test 2: Ground-Truth Isolation
  console.log('\n2. Testing Ground-Truth Isolation & Non-Peeking...');
  {
    const sampleRecord = {
      amount: 2500,
      failureType: 'GATEWAY_TIMEOUT',
      attemptCount: 0,
      providerHealth: 'HEALTHY',
      customerHistory: { fraudRiskTier: 'LOW' },
      latencyMs: 9000,
      webhookStatus: 'NONE',
      historicalRecoverySignal: 'STRONG',
      paymentMethod: 'upi',
    };

    // Evaluate without groundTruth object
    const decision = evaluatePaymentRecovery(sampleRecord);
    assert.ok(decision.recoveryProbability >= 0.80, 'Must calculate probability using only public features');
    assert.strictEqual(decision.recommendedStrategy, 'RETRY');
    assert.strictEqual(decision.policyDecision, 'ELIGIBLE');
    assert.ok(decision.expectedValue > 2000);
    assert.ok(decision.explanations.whyThisPayment.length > 0);

    console.log('  ✔ Ground-Truth Isolation & Clean Decision Boundary - PASSED');
  }

  // Test 3: Controlled Scenario Coverage & 70/30 Split
  console.log('\n3. Testing 10 Controlled Scenarios & Train/Eval Split...');
  {
    const dataset = generateBenchmarkDataset({ datasetSize: 1000, seed: 20260826, evaluationSplitRatio: 0.30 });
    const trainRecords = dataset.filter(r => r.split === 'TRAIN');
    const evalRecords = dataset.filter(r => r.split === 'EVALUATION');

    assert.strictEqual(trainRecords.length, 700, 'Must have exactly 70% training records');
    assert.strictEqual(evalRecords.length, 300, 'Must have exactly 30% evaluation records');

    const scenarioIdsInDataset = new Set(dataset.map(r => r.scenarioId));
    assert.strictEqual(scenarioIdsInDataset.size, 10, 'All 10 canonical scenarios must be present in dataset');
    BENCHMARK_SCENARIOS.forEach(s => {
      assert.ok(scenarioIdsInDataset.has(s.id), `Scenario ${s.id} must be generated`);
    });

    console.log('  ✔ 10 Controlled Scenarios & Exact 70/30 Split - PASSED');
  }

  // Test 4: Deterministic Policy Enforcement (Permanent Decline & Duplicate Lockout)
  console.log('\n4. Testing Safety Policies (Permanent Decline & Duplicate Lockout)...');
  {
    const permanentRec = {
      amount: 4999,
      failureType: 'CARD_EXPIRED',
      attemptCount: 0,
      providerHealth: 'HEALTHY',
    };
    const permDecision = evaluatePaymentRecovery(permanentRec);
    assert.strictEqual(permDecision.policyDecision, 'BLOCKED');
    assert.strictEqual(permDecision.recommendedStrategy, 'NO_ACTION');
    assert.ok(permDecision.blockedReasons.some(r => r.includes('PERMANENT_DECLINE')));

    const duplicateRec = {
      amount: 1299,
      failureType: 'DUPLICATE_PAYMENT_RISK',
      attemptCount: 1,
      providerHealth: 'HEALTHY',
    };
    const dupDecision = evaluatePaymentRecovery(duplicateRec);
    assert.strictEqual(dupDecision.policyDecision, 'BLOCKED');
    assert.ok(dupDecision.blockedReasons.some(r => r.includes('DUPLICATE_CHARGE_RISK')));

    console.log('  ✔ Deterministic Safety Policy Gates - PASSED');
  }

  // Test 5: Synthetic Execution & Naive Baseline Comparison Logic
  console.log('\n5. Testing Synthetic Execution & Naive Baseline Execution...');
  {
    // Test Transient Gateway Timeout
    const transientRecord = {
      paymentId: 'pay_test_01',
      amount: 1500,
      failureType: 'GATEWAY_TIMEOUT',
      groundTruth: {
        recoverable: true,
        recoveryProbability: 0.88,
        optimalStrategy: 'RETRY',
        isDuplicateRisk: false,
        isPermanentDecline: false,
      },
    };
    const decision = {
      recommendedStrategy: 'RETRY',
      policyDecision: 'ELIGIBLE',
      estimatedActionCost: 2,
    };
    const execRes = executeAgainstGroundTruth(transientRecord, decision);

    assert.strictEqual(execRes.pulsePay.success, true);
    assert.strictEqual(execRes.pulsePay.amountRecovered, 1500);
    assert.strictEqual(execRes.pulsePay.costIncurred, 2);
    assert.strictEqual(execRes.pulsePay.netYield, 1498);

    // Test Duplicate Risk (PulsePay blocks vs Naive Baseline double charges)
    const dupRecord = {
      paymentId: 'pay_test_dup',
      amount: 2000,
      failureType: 'DUPLICATE_PAYMENT_RISK',
      groundTruth: {
        recoverable: false,
        recoveryProbability: 0.0,
        optimalStrategy: 'NO_ACTION',
        isDuplicateRisk: true,
        isPermanentDecline: false,
      },
    };
    const dupDec = {
      recommendedStrategy: 'NO_ACTION',
      policyDecision: 'BLOCKED',
      estimatedActionCost: 0,
    };
    const dupExecRes = executeAgainstGroundTruth(dupRecord, dupDec);

    assert.strictEqual(dupExecRes.pulsePay.success, false);
    assert.strictEqual(dupExecRes.pulsePay.costIncurred, 0, 'PulsePay incurs ₹0 cost on blocked actions');
    assert.strictEqual(dupExecRes.blindRetry.isDuplicateCharge, true, 'Blind retry triggers catastrophic duplicate charge');

    console.log('  ✔ Synthetic Execution & Baseline Comparison Physics - PASSED');
  }

  // Database Integration & Benchmark Persistence (if MongoDB connected)
  const isMongoConnected = mongoose.connection.readyState === 1;
  if (isMongoConnected) {
    console.log('\n6. Running End-to-End Benchmark Execution (1,000 synthetic records)...');
    
    // Clean old benchmark test records
    await Promise.all([
      RecoveryBenchmark.deleteMany({ benchmarkId: /^BENCH-TEST/ }),
      RecoveryBenchmarkResult.deleteMany({ benchmarkId: /^BENCH-TEST/ }),
    ]);

    const benchmarkResult = await runRecoveryBenchmark({
      datasetSize: 1000,
      seed: 20260826,
      evaluationSplitRatio: 0.30,
      name: 'Test Synthetic Recovery Benchmark Run',
    });

    assert.strictEqual(benchmarkResult.success, true);
    assert.strictEqual(benchmarkResult.datasetSize, 1000);
    assert.strictEqual(benchmarkResult.trainingCount, 700);
    assert.strictEqual(benchmarkResult.evaluationCount, 300);

    const m = benchmarkResult.metrics;
    assert.ok(m.totalAmountAtRisk > 0, 'Total amount at risk must be positive');
    assert.ok(m.actualRecovery > 0, 'Actual recovery must be positive');
    assert.ok(m.recoveryRate > 0, 'Recovery rate must be positive');
    assert.ok(m.recoveryPrecision >= 80, 'Precision should be high');
    assert.ok(m.calibrationError < 20, 'Calibration error should be bounded');
    assert.ok(m.unsafeActionsPrevented > 0, 'Unsafe actions must be prevented');
    assert.ok(m.duplicateActionsPrevented > 0, 'Duplicate actions must be prevented');

    // Verify Baseline Comparison (PulsePay vs Naive Blind Retry)
    const baseComp = benchmarkResult.baselineComparison;
    assert.ok(baseComp.pulsePayNetRecovery > baseComp.blindRetryNetRecovery, 'PulsePay net recovery must outperform blind retry');
    assert.ok(baseComp.netImprovementAmount > 0, 'Net improvement amount must be positive');
    assert.ok(baseComp.unsafeChargesAvoided > 0, 'Must record unsafe charges avoided');

    // Verify Calibration Buckets (10 buckets)
    assert.strictEqual(benchmarkResult.calibrationBuckets.length, 10, 'Must have exactly 10 calibration buckets');

    // Verify Strategy Scorecards
    assert.ok(benchmarkResult.strategyScorecards.length >= 5, 'Must score at least 5 strategies');

    // Verify Scenario Scorecards
    assert.strictEqual(benchmarkResult.scenarioScorecards.length, 10, 'Must score all 10 canonical scenarios');

    // Verify Persistence in MongoDB
    const fetchedDoc = await RecoveryBenchmark.findOne({ benchmarkId: benchmarkResult.benchmarkId }).lean();
    assert.ok(fetchedDoc, 'Benchmark document must be persisted to MongoDB');
    assert.strictEqual(fetchedDoc.datasetSize, 1000);
    assert.strictEqual(fetchedDoc.status, 'COMPLETED');

    console.log('  ✔ Full 1,000 Benchmark Pipeline & Baseline Outperformance - PASSED');
  }

  console.log('\n==================================================');
  console.log('All Recovery Benchmark Tests Passed Successfully!');
  console.log('==================================================\n');
};

// Auto-run if executed directly
if (require.main === module) {
  const connectDB = require('../config/db');
  connectDB().then(async () => {
    try {
      await runTests();
      process.exit(0);
    } catch (err) {
      console.error('\n❌ Test failure encountered:', err);
      process.exit(1);
    }
  });
}

module.exports = { runTests };
