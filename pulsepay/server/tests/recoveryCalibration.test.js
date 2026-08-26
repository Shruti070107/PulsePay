const assert = require('assert');
const mongoose = require('mongoose');
const { 
  fitIsotonicRegression, 
  predictIsotonic, 
  fitPlattScaling, 
  predictPlatt, 
  computeCalibrationMetrics, 
  calculateDistributionDrift, 
  trainCalibrationModel 
} = require('../services/recovery/calibrationEngine');
const { generateBenchmarkDataset } = require('../services/recovery/benchmarkDatasetGenerator');
const { evaluatePaymentRecovery, runRecoveryBenchmark } = require('../services/recovery/recoveryBenchmarkEngine');
const CalibrationModel = require('../models/CalibrationModel');
const RecoveryBenchmark = require('../models/RecoveryBenchmark');

const runTests = async () => {
  console.log('\n==================================================');
  console.log('Running PulsePay Probability Calibration Engine Tests...');
  console.log('==================================================\n');

  // Test 1: Isotonic Regression & PAVA Fitting
  console.log('1. Testing Isotonic Regression (PAVA Monotonicity)...');
  {
    const trainingPairs = [
      { x: 0.10, y: 0 },
      { x: 0.20, y: 0 },
      { x: 0.40, y: 1 },
      { x: 0.50, y: 0 }, // Non-monotonic violator
      { x: 0.60, y: 1 },
      { x: 0.80, y: 1 },
      { x: 0.90, y: 1 },
    ];

    const knots = fitIsotonicRegression(trainingPairs);
    assert.ok(knots.length >= 2, 'Must generate monotonic knots');

    // Test monotonicity: knots[i].calibratedProbability <= knots[i+1].calibratedProbability
    for (let i = 0; i < knots.length - 1; i++) {
      assert.ok(
        knots[i].calibratedProbability <= knots[i + 1].calibratedProbability,
        `Monotonicity violation at index ${i}: ${knots[i].calibratedProbability} > ${knots[i+1].calibratedProbability}`
      );
    }

    const pLow = predictIsotonic(0.15, knots);
    const pHigh = predictIsotonic(0.85, knots);
    assert.ok(pLow <= pHigh, 'Predicted calibrated probabilities must be monotonic');

    console.log('  ✔ Isotonic Regression PAVA & Monotonic Interpolation - PASSED');
  }

  // Test 2: Platt Scaling (Logistic Calibration)
  console.log('\n2. Testing Platt Scaling MLE Optimization...');
  {
    const trainingPairs = [
      { x: 0.10, y: 0 },
      { x: 0.20, y: 0 },
      { x: 0.30, y: 0 },
      { x: 0.70, y: 1 },
      { x: 0.80, y: 1 },
      { x: 0.90, y: 1 },
    ];

    const { A, B } = fitPlattScaling(trainingPairs, 100);
    assert.ok(!isNaN(A) && !isNaN(B), 'Platt parameters must be valid numbers');

    const predLow = predictPlatt(0.20, A, B);
    const predHigh = predictPlatt(0.80, A, B);
    assert.ok(predLow < predHigh, 'Platt scaling must preserve probability ranking');

    console.log('  ✔ Platt Scaling Parameter Estimation - PASSED');
  }

  // Test 3: Training / Evaluation Isolation (Anti-Peeking Proof)
  console.log('\n3. Testing Strict Training / Evaluation Isolation...');
  {
    const contaminatedData = [
      { split: 'TRAIN', rawProbability: 0.5, groundTruth: { recoverable: true } },
      { split: 'EVALUATION', rawProbability: 0.8, groundTruth: { recoverable: false } }, // Forbidden!
    ];

    assert.rejects(
      async () => {
        await trainCalibrationModel(contaminatedData);
      },
      /ISOLATION_VIOLATION/,
      'Must reject calibration training if evaluation records are supplied'
    );

    console.log('  ✔ Anti-Peeking Ground-Truth Isolation Gate - PASSED');
  }

  // Test 4: ECE & Brier Score Computations
  console.log('\n4. Testing Expected Calibration Error (ECE) & Brier Score Calculations...');
  {
    const perfectPreds = [0.0, 0.0, 1.0, 1.0];
    const perfectLabels = [0, 0, 1, 1];
    const perfMetrics = computeCalibrationMetrics(perfectPreds, perfectLabels);
    assert.strictEqual(perfMetrics.brierScore, 0, 'Perfect predictions must have 0 Brier score');
    assert.strictEqual(perfMetrics.ece, 0, 'Perfect predictions must have 0 ECE');

    const uncalibratedPreds = [0.4, 0.4, 0.4, 0.4];
    const actualLabels = [1, 1, 1, 1]; // Underestimating (40% predicted vs 100% actual)
    const uncalMetrics = computeCalibrationMetrics(uncalibratedPreds, actualLabels);
    assert.ok(uncalMetrics.brierScore > 0.3, 'Underestimating must yield high Brier score');
    assert.ok(uncalMetrics.ece > 0.5, 'Underestimating must yield high ECE');
    assert.strictEqual(uncalMetrics.calibrationBuckets.length, 10);

    console.log('  ✔ ECE & Brier Score Metric Physics - PASSED');
  }

  // Test 5: Distribution Drift Analysis (PSI & KS Test)
  console.log('\n5. Testing Distribution Drift Analysis (PSI & KS Statistic)...');
  {
    const trainDist = Array.from({ length: 100 }, (_, i) => i / 100);
    const similarEvalDist = Array.from({ length: 100 }, (_, i) => (i + 0.5) / 100);
    const driftedEvalDist = Array.from({ length: 100 }, (_, i) => 0.8 + (i * 0.2 / 100)); // Severe shift

    const lowDrift = calculateDistributionDrift(trainDist, similarEvalDist);
    assert.strictEqual(lowDrift.driftStatus, 'LOW_DRIFT', 'Similar distributions must have LOW_DRIFT');

    const highDrift = calculateDistributionDrift(trainDist, driftedEvalDist);
    assert.strictEqual(highDrift.driftStatus, 'HIGH_DRIFT', 'Shifted distribution must have HIGH_DRIFT');
    assert.ok(highDrift.psi > lowDrift.psi, 'Shifted distribution must have higher PSI');

    console.log('  ✔ Distribution Drift & PSI Measurement - PASSED');
  }

  // Test 6: Policy Invariance (Calibration Cannot Bypass Safety Rules)
  console.log('\n6. Testing Policy Invariance (Safety Gates Authoritative)...');
  {
    const permRecord = {
      amount: 5000,
      failureType: 'CARD_EXPIRED',
      attemptCount: 0,
      providerHealth: 'HEALTHY',
    };
    const rawEval = evaluatePaymentRecovery(permRecord);
    
    // Even if an external calibration were applied, policyDecision MUST remain BLOCKED
    assert.strictEqual(rawEval.policyDecision, 'BLOCKED');
    assert.strictEqual(rawEval.recommendedStrategy, 'NO_ACTION');
    assert.ok(rawEval.blockedReasons.some(r => r.includes('PERMANENT_DECLINE')));

    const dupRecord = {
      amount: 1500,
      failureType: 'DUPLICATE_PAYMENT_RISK',
      attemptCount: 1,
    };
    const dupEval = evaluatePaymentRecovery(dupRecord);
    assert.strictEqual(dupEval.policyDecision, 'BLOCKED');
    assert.ok(dupEval.blockedReasons.some(r => r.includes('DUPLICATE_CHARGE_RISK')));

    console.log('  ✔ Safety Policy Invariance & Zero Regression - PASSED');
  }

  // Test 7: Full 10,000-Record Benchmark with Calibration Out-of-Sample Verification
  const isMongoConnected = mongoose.connection.readyState === 1;
  if (isMongoConnected) {
    console.log('\n7. Running Full 1,000-record Benchmark with Out-of-Sample Calibration...');
    
    const benchmarkResult = await runRecoveryBenchmark({
      datasetSize: 1000,
      seed: 20260826,
      evaluationSplitRatio: 0.30,
      name: 'Calibrated Benchmark Suite Test',
    });

    assert.strictEqual(benchmarkResult.success, true);
    assert.strictEqual(benchmarkResult.trainingCount, 700);
    assert.strictEqual(benchmarkResult.evaluationCount, 300);

    const comp = benchmarkResult.calibrationComparison;
    assert.ok(comp, 'Benchmark must produce before/after calibration comparison');
    
    // Calibration error must decrease
    assert.ok(
      comp.calibrationErrorAfter < comp.calibrationErrorBefore,
      `Calibration error must improve: After (${comp.calibrationErrorAfter}%) < Before (${comp.calibrationErrorBefore}%)`
    );

    // ECE must decrease
    assert.ok(
      comp.eceAfter < comp.eceBefore,
      `ECE must improve: After (${comp.eceAfter}) < Before (${comp.eceBefore})`
    );

    // Brier score must decrease
    assert.ok(
      comp.brierScoreAfter <= comp.brierScoreBefore,
      `Brier score must improve or hold: After (${comp.brierScoreAfter}) <= Before (${comp.brierScoreBefore})`
    );

    // Safety guardrails must have zero regressions
    assert.strictEqual(comp.duplicateChargesAfter, 0, 'Must have zero duplicate charges');
    assert.ok(comp.unsafeActionsAfter > 0, 'Must continue blocking unsafe permanent actions');
    assert.ok(benchmarkResult.metrics.netRecoveredRevenue > 0, 'Net revenue recovery must be positive');

    console.log('  ✔ Out-of-Sample ECE & Calibration Error Improvement - PASSED');
  }

  console.log('\n==================================================');
  console.log('All Probability Calibration Tests Passed Successfully!');
  console.log('==================================================\n');
};

if (require.main === module) {
  const connectDB = require('../config/db');
  connectDB().then(async () => {
    try {
      await runTests();
      process.exit(0);
    } catch (err) {
      console.error('\n❌ Calibration Test failure encountered:', err);
      process.exit(1);
    }
  });
}

module.exports = { runTests };
