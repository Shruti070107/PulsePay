const assert = require('assert');
const mongoose = require('mongoose');
const { calculateRecoveryProbability, FAILURE_REASON_PROBABILITIES } = require('../services/recovery/recoveryScoringEngine');
const { determineRecoveryStrategy } = require('../services/recovery/recoveryStrategyEngine');
const { evaluateRecoveryPolicies } = require('../services/recovery/recoveryPolicyEngine');
const { simulateRecoveryBatch } = require('../services/recovery/recoverySimulator');
const { executeRecoveryBatch } = require('../services/recovery/recoveryExecutor');
const { calculateRecoveryOutcomes } = require('../services/recovery/recoveryOutcomeEngine');
const { buildDeterministicAgentReport } = require('../services/recovery/recoveryAgent');
const { runRecoveryEvaluation } = require('../services/recovery/recoveryEvaluationEngine');
const { scanRevenueAtRisk } = require('../services/recovery/revenueRiskEngine');
const { runFullRevenueRecoveryDemo } = require('../services/recovery/recoveryDemoService');

const RecoveryOpportunity = require('../models/RecoveryOpportunity');
const RecoveryAction = require('../models/RecoveryAction');
const RecoveryCampaign = require('../models/RecoveryCampaign');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const PaymentEvent = require('../models/PaymentEvent');
const WebhookEvent = require('../models/WebhookEvent');

const runTests = async () => {
  console.log('\n==================================================');
  console.log('Running PulsePay AI Revenue Recovery Engine Tests...');
  console.log('==================================================\n');

  // Test 1: Recovery Scoring Engine - Probability & Decay Calculations
  console.log('1. Testing Recovery Scoring Engine...');
  {
    const freshTimeout = calculateRecoveryProbability({
      amount: 1499,
      failureReason: 'GATEWAY_TIMEOUT',
      retryCount: 0,
      timeSinceFailureMinutes: 5,
      paymentMethod: 'upi',
    });

    assert.ok(freshTimeout.recoveryProbability >= 0.80, 'Fresh gateway timeout should have high probability');
    assert.strictEqual(freshTimeout.classification, 'RECOVERABLE');
    assert.ok(freshTimeout.featureInfluence.length >= 4, 'Should include feature influence breakdown');

    // Test retry decay
    const retriedTimeout = calculateRecoveryProbability({
      amount: 1499,
      failureReason: 'GATEWAY_TIMEOUT',
      retryCount: 2,
      timeSinceFailureMinutes: 60,
      paymentMethod: 'upi',
    });
    assert.ok(retriedTimeout.recoveryProbability < freshTimeout.recoveryProbability, 'Retry count and time should decay probability');

    // Test permanent failure
    const permanentFail = calculateRecoveryProbability({
      amount: 4999,
      failureReason: 'CARD_EXPIRED',
      retryCount: 0,
    });
    assert.ok(permanentFail.recoveryProbability <= 0.10, 'Permanent card expired should have very low probability');
    assert.strictEqual(permanentFail.classification, 'NON_RECOVERABLE');

    console.log('  ✔ Recovery Scoring & Feature Attribution - PASSED');
  }

  // Test 2: Strategy Engine & Expected Value Calculation
  console.log('\n2. Testing Recovery Strategy Engine (Expected Value Optimization)...');
  {
    const strategyForTimeout = determineRecoveryStrategy({
      amount: 2000,
      recoveryProbability: 0.85,
      failureReason: 'GATEWAY_TIMEOUT',
    });
    assert.strictEqual(strategyForTimeout.recommendedAction, 'RETRY_PAYMENT');
    assert.ok(strategyForTimeout.expectedValue > 1500, 'EV should reflect recoverable yield minus cost');
    assert.ok(strategyForTimeout.whyThisAction.length > 0, 'Must include explanation why action was selected');
    assert.ok(strategyForTimeout.whyNotAnother.length > 0, 'Must include explanation why other actions were rejected');

    const strategyForWebhook = determineRecoveryStrategy({
      amount: 5000,
      recoveryProbability: 0.95,
      isCapturedOrderUnpaid: true,
      hasWebhookFailure: true,
    });
    assert.strictEqual(strategyForWebhook.recommendedAction, 'RECONCILE_WEBHOOK');

    const strategyForPermanent = determineRecoveryStrategy({
      amount: 1000,
      recoveryProbability: 0.05,
      failureReason: 'FRAUD_SUSPECTED',
    });
    assert.strictEqual(strategyForPermanent.recommendedAction, 'STOP_RECOVERY');
    assert.strictEqual(strategyForPermanent.expectedValue, 0);

    console.log('  ✔ Expected Value & Strategy Selection - PASSED');
  }

  // Test 3: Safety / Policy Engine Deterministic Rules
  console.log('\n3. Testing Recovery Safety & Policy Engine...');
  {
    // Rule: Allow safe retry
    const safeCheck = evaluateRecoveryPolicies({
      paymentId: 'PAY-SAFE-01',
      amount: 500,
      failureReason: 'NETWORK_TIMEOUT',
      retryCount: 0,
      expectedValue: 400,
      recommendedAction: 'RETRY_PAYMENT',
    });
    assert.strictEqual(safeCheck.allowed, true, 'Safe transient payment should be allowed');
    assert.strictEqual(safeCheck.blocked, false);

    // Rule: Block permanent decline
    const permanentCheck = evaluateRecoveryPolicies({
      paymentId: 'PAY-BLOCKED-01',
      amount: 5000,
      failureReason: 'CARD_EXPIRED',
      retryCount: 0,
      expectedValue: 100,
      recommendedAction: 'RETRY_PAYMENT',
    });
    assert.strictEqual(permanentCheck.allowed, false, 'Permanent decline should be blocked');
    assert.strictEqual(permanentCheck.blocked, true);
    assert.ok(permanentCheck.reason.includes('Permanent failure signature'));

    // Rule: Max retry limit exceeded
    const retryExceededCheck = evaluateRecoveryPolicies({
      paymentId: 'PAY-BLOCKED-02',
      amount: 1000,
      failureReason: 'GATEWAY_TIMEOUT',
      retryCount: 3,
      expectedValue: 500,
      recommendedAction: 'RETRY_PAYMENT',
    });
    assert.strictEqual(retryExceededCheck.allowed, false, 'Exceeded retries should be blocked');
    assert.strictEqual(retryExceededCheck.blocked, true);

    // Rule: Negative Expected Value
    const negEvCheck = evaluateRecoveryPolicies({
      paymentId: 'PAY-BLOCKED-03',
      amount: 10,
      failureReason: 'GATEWAY_TIMEOUT',
      retryCount: 0,
      expectedValue: -2,
      recommendedAction: 'RETRY_PAYMENT',
    });
    assert.strictEqual(negEvCheck.allowed, false, 'Negative EV must be blocked');

    console.log('  ✔ Safety Policy Gates & Guardrails - PASSED');
  }

  // Test 4: AI Agent Report Deterministic Synthesis
  console.log('\n4. Testing AI Recovery Agent Grounding & Schema...');
  {
    const mockOpportunities = [
      {
        opportunityId: 'OPP-01',
        amount: 2500,
        failureReason: 'GATEWAY_TIMEOUT',
        recoverabilityClassification: 'RECOVERABLE',
        expectedValue: 2100,
        recommendedAction: 'RETRY_PAYMENT',
      },
      {
        opportunityId: 'OPP-02',
        amount: 4000,
        failureReason: 'WEBHOOK_TIMEOUT',
        recoverabilityClassification: 'RECOVERABLE',
        expectedValue: 3990,
        recommendedAction: 'RECONCILE_WEBHOOK',
      },
    ];

    const agentReport = buildDeterministicAgentReport(mockOpportunities);
    assert.strictEqual(agentReport.status, 'COMPLETED');
    assert.ok(agentReport.summary.length > 20);
    assert.ok(agentReport.reasoning.length >= 3);
    assert.ok(agentReport.citations.length >= 2);
    assert.ok(agentReport.confidence >= 90);

    console.log('  ✔ AI Agent Grounding & Structured Schema - PASSED');
  }

  // Test 5: Recovery Evaluation Metric Suite
  console.log('\n5. Testing Recovery Evaluation & Benchmark Engine...');
  {
    const evalReport = await runRecoveryEvaluation();
    assert.strictEqual(evalReport.policyViolations, 0, 'Zero policy violations permitted');
    assert.ok(evalReport.accuracyRate >= 90, 'Accuracy rate should be >= 90%');
    assert.strictEqual(evalReport.hallucinations, 0, 'Zero hallucinations allowed');
    assert.ok(evalReport.overallScore >= 90, 'Overall benchmark score should be >= 90%');

    console.log('  ✔ Benchmark Evaluation (Accuracy & Policy Compliance) - PASSED');
  }

  // Database Integration Tests (if MongoDB connected)
  const isMongoConnected = mongoose.connection.readyState === 1;
  if (isMongoConnected) {
    console.log('\n6. Running End-to-End Recovery Database Integration & Demo Test...');
    
    // Clean test records
    await Promise.all([
      RecoveryOpportunity.deleteMany({ opportunityId: /^OPP-TEST/ }),
      RecoveryAction.deleteMany({ campaignId: /^CAMP-TEST/ }),
      RecoveryCampaign.deleteMany({ campaignId: /^CAMP-TEST/ }),
    ]);

    // Test 6a: Ingest test opportunities & run scan
    const testPaymentId = `pay_test_${Date.now()}`;
    await Payment.create({
      paymentId: testPaymentId,
      orderId: `order_test_${Date.now()}`,
      amount: 3499,
      currency: 'INR',
      customerId: 'cust_test_01',
      merchantId: 'merch_test_01',
      paymentMethod: 'upi',
      status: 'failed',
    });

    await PaymentEvent.create({
      eventId: `ev_test_${Date.now()}`,
      paymentId: testPaymentId,
      type: 'payment.failed',
      source: 'gateway',
      status: 'failed',
      metadata: { errorCode: 'GATEWAY_TIMEOUT' },
    });

    const scanRes = await scanRevenueAtRisk({ lookbackHours: 1, limit: 10 });
    assert.ok(scanRes.totalRevenueAtRisk >= 3499, 'Scan should detect newly failed payment');

    // Test 6b: Simulation
    const simRes = await simulateRecoveryBatch({
      opportunityIds: [`OPP-${testPaymentId.replace(/^pay_/, '')}`],
      strategyOverride: 'OPTIMIZED',
    });
    assert.strictEqual(simRes.transactionsTargeted, 1);
    assert.ok(simRes.expectedRecoveredAmount > 0);

    // Test 6c: Bounded Execution
    const execRes = await executeRecoveryBatch({
      opportunityIds: [`OPP-${testPaymentId.replace(/^pay_/, '')}`],
      campaignId: 'CAMP-TEST-01',
    });
    assert.strictEqual(execRes.totalTargeted, 1);
    assert.ok(execRes.recoveredCount + execRes.failedCount + execRes.blockedCount === 1);

    // Test 6d: Idempotency Verification
    const repeatExecRes = await executeRecoveryBatch({
      opportunityIds: [`OPP-${testPaymentId.replace(/^pay_/, '')}`],
      campaignId: 'CAMP-TEST-01',
    });
    assert.strictEqual(repeatExecRes.skippedCount, 1, 'Duplicate execution must be skipped by idempotency guard');

    // Test 6e: Safety-Policy Blocked Recovery Verification
    const blockedPaymentId = `pay_test_blocked_${Date.now()}`;
    await Payment.create({
      paymentId: blockedPaymentId,
      orderId: `order_blocked_${Date.now()}`,
      amount: 4999,
      currency: 'INR',
      customerId: 'cust_test_02',
      merchantId: 'merch_test_01',
      paymentMethod: 'card',
      status: 'failed',
    });
    await PaymentEvent.create({
      eventId: `ev_blocked_${Date.now()}`,
      paymentId: blockedPaymentId,
      type: 'payment.failed',
      source: 'gateway',
      status: 'failed',
      metadata: { errorCode: 'CARD_EXPIRED' },
    });
    const blockedExecRes = await executeRecoveryBatch({
      paymentId: blockedPaymentId,
      campaignId: 'CAMP-TEST-02',
    });
    assert.strictEqual(blockedExecRes.status, 'BLOCKED', 'Permanent decline must return status BLOCKED');
    assert.ok(blockedExecRes.reason.includes('Action is STOP_RECOVERY') || blockedExecRes.reason.includes('Permanent failure'));

    // Test 6f: Outcome Engine Measurements
    const outcomes = await calculateRecoveryOutcomes('CAMP-TEST-01');
    assert.ok(outcomes.totalRevenueAtRisk >= 3499);

    // Test 6g: Full 1-Click Recovery Demo Runner
    const demoRes = await runFullRevenueRecoveryDemo();
    assert.strictEqual(demoRes.success, true);
    assert.ok(demoRes.actualRecovered > 0, 'Successful demo must increase actual recovered revenue');
    assert.ok(demoRes.recoveryRate > 0);
    assert.ok(demoRes.transactionsRecovered > 0);

    console.log('  ✔ Full Recovery Integration, Execution, Idempotency & Demo - PASSED');
  }

  console.log('\n==================================================');
  console.log('All PulsePay Revenue Recovery Tests Passed Successfully!');
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
