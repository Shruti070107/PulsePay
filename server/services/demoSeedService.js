const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Payment = require('../models/Payment');
const PaymentEvent = require('../models/PaymentEvent');
const Order = require('../models/Order');
const WebhookEvent = require('../models/WebhookEvent');
const Incident = require('../models/Incident');
const Investigation = require('../models/Investigation');
const RecoveryOpportunity = require('../models/RecoveryOpportunity');
const RecoveryAction = require('../models/RecoveryAction');
const RecoveryCampaign = require('../models/RecoveryCampaign');
const RecoveryBenchmark = require('../models/RecoveryBenchmark');
const simulatorService = require('./simulatorService');
const { scanRevenueAtRisk } = require('./recovery/revenueRiskEngine');
const { executeRecoveryBatch } = require('./recovery/recoveryExecutor');
const { runRecoveryBenchmark } = require('./recovery/recoveryBenchmarkEngine');
const { runIncidentDetectionAndAggregation } = require('./incident/incidentAggregator');
const { generateEventId, generateCustomerId, generateMerchantId, randomId } = require('../utils/idGenerator');

const DEMO_EMAIL = 'ops@pulsepay.internal';
const DEMO_PASSWORD = 'demo12345';

/**
 * Populates a complete, realistic synthetic demo dataset using existing services and generators.
 * Demonstrates:
 * - recoverable payment (gateway timeout / processing abandonment)
 * - retryable failure (provider degradation)
 * - webhook / reconciliation case (captured order unpaid)
 * - blocked / permanent decline case (card expired)
 * - duplicate-risk case (duplicate charge protection)
 * - positive expected-value case
 * - non-positive expected-value case (micro-transaction EV <= 0)
 * - successful recovery (reconciled webhook action)
 * - failed recovery (failed retry action)
 */
const seedDemoData = async (options = {}) => {
  const { quiet = false } = options;
  const log = (...args) => { if (!quiet) console.log(...args); };

  log('[PulsePay Seed] Initializing synthetic demo dataset...');

  // 1. Ensure Demo User Exists
  const existingUser = await User.findOne({ email: DEMO_EMAIL });
  if (!existingUser) {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    await User.create({
      name: 'Demo Operator',
      email: DEMO_EMAIL,
      passwordHash,
    });
    log(`[PulsePay Seed] Created demo operator user (${DEMO_EMAIL})`);
  }

  // 2. Clear transactional test collections
  await Promise.all([
    Payment.deleteMany({}),
    PaymentEvent.deleteMany({}),
    Order.deleteMany({}),
    WebhookEvent.deleteMany({}),
    Incident.deleteMany({}),
    Investigation.deleteMany({}),
    RecoveryOpportunity.deleteMany({}),
    RecoveryAction.deleteMany({}),
    RecoveryCampaign.deleteMany({}),
  ]);
  log('[PulsePay Seed] Cleared previous transactional demo records.');

  // 3. Populate realistic scenarios using existing simulatorService generators
  // A. 5 Gateway Timeout / Processing Abandonment Failures (Transient / Recoverable / Positive EV)
  for (let i = 0; i < 5; i++) {
    // Generate with timestamp 20-40 min in the past so isStuckProcessing is reliably true
    const pastTime = new Date(Date.now() - (20 + i * 5) * 60 * 1000);
    const data = simulatorService.generateGatewayTimeout(undefined, { now: pastTime });
    await simulatorService.saveScenarioData(data);
  }

  // B. 4 Webhook Outages (Captured Order Unpaid / 100% Reconcilable / Positive EV)
  for (let i = 0; i < 4; i++) {
    const data = simulatorService.generateWebhookOutage();
    await simulatorService.saveScenarioData(data);
  }

  // C. 3 Permanent Declines (Card Expired / Blocked by Permanent Failure Gate)
  for (let i = 0; i < 3; i++) {
    const data = simulatorService.generatePermanentDecline();
    await simulatorService.saveScenarioData(data);
  }

  // D. 2 Duplicate Payments (Blocked by Duplicate Charge Protection)
  for (let i = 0; i < 2; i++) {
    const data = simulatorService.generateDuplicate();
    // Ensure the duplicate payment attempt has status: 'failed' and DUPLICATE_PAYMENT error code
    data.payments[1].status = 'failed';
    data.payments[1].errorMessage = 'DUPLICATE_PAYMENT';
    data.events.push({
      eventId: generateEventId(),
      paymentId: data.payments[1].paymentId,
      type: 'payment.failed',
      eventType: 'payment.failed',
      source: 'gateway',
      status: 'failed',
      timestamp: new Date(),
      eventTimestamp: new Date(),
      receivedAt: new Date(),
      merchantId: data.payments[1].merchantId,
      customerId: data.payments[1].customerId,
      orderId: data.payments[1].orderId,
      amount: data.payments[1].amount,
      currency: data.payments[1].currency,
      metadata: {
        errorCode: 'DUPLICATE_PAYMENT',
        message: 'Duplicate transaction detected within idempotency window',
      },
    });
    await simulatorService.saveScenarioData(data);
  }

  // E. 3 Soft Declines (Recoverable via Recovery Link / Positive EV)
  for (let i = 0; i < 3; i++) {
    const data = simulatorService.generateHighDeclineRate();
    await simulatorService.saveScenarioData(data);
  }

  // F. 3 Provider Degradations (Transient timeout, retryCount = 0, retryable)
  for (let i = 0; i < 3; i++) {
    const data = simulatorService.generateProviderDegradation();
    await simulatorService.saveScenarioData(data);
  }

  // G. 1 Micro-transaction with Non-Positive Expected Value (EV <= 0)
  const lowValueData = simulatorService.generateGatewayTimeout({
    amount: 3,
    currency: 'INR',
    paymentMethod: 'upi',
    customerId: generateCustomerId(),
    merchantId: generateMerchantId(),
  }, { now: new Date(Date.now() - 30 * 60 * 1000) });
  lowValueData.payment.amount = 3;
  lowValueData.order.amount = 3;
  lowValueData.events.forEach(e => { e.amount = 3; });
  await simulatorService.saveScenarioData(lowValueData);

  // H. 8 Normal Baseline Transactions
  for (let i = 0; i < 8; i++) {
    const data = simulatorService.generateNormal();
    await simulatorService.saveScenarioData(data);
  }

  log('[PulsePay Seed] Ingested synthetic payment scenarios.');

  // 4. Run Incident Aggregation
  await runIncidentDetectionAndAggregation(24);
  log('[PulsePay Seed] Correlated telemetry into incidents.');

  // 5. Scan Revenue at Risk to populate RecoveryOpportunity records
  const scanResult = await scanRevenueAtRisk({ lookbackHours: 72, limit: 100 });
  log(`[PulsePay Seed] Scanned ${scanResult.totalOpportunities} opportunities (Eligible: ${scanResult.eligibleCount}, Blocked: ${scanResult.blockedCount}, Revenue at Risk: ₹${scanResult.totalRevenueAtRisk.toLocaleString()})`);

  // 6. Demonstrate historical execution consistency:
  // Execute a bounded seed execution (1 successful recovery, 1 blocked action, 1 failed action)
  const opportunities = await RecoveryOpportunity.find().sort({ expectedValue: -1 });

  // A. Successful recovery: Pick one eligible webhook reconciliation opportunity
  const reconOpp = opportunities.find(o => o.recommendedAction === 'RECONCILE_WEBHOOK' && o.policyStatus === 'ELIGIBLE');
  if (reconOpp) {
    await executeRecoveryBatch({
      opportunityIds: [reconOpp.opportunityId],
      campaignId: 'CAMP-HISTORICAL-01',
      batchId: `RB-INIT-${Date.now()}`,
    });
  }

  // B. Blocked action: Pick one permanent decline opportunity
  const blockedOpp = opportunities.find(o => o.failureReason === 'CARD_EXPIRED');
  if (blockedOpp) {
    await executeRecoveryBatch({
      opportunityIds: [blockedOpp.opportunityId],
      campaignId: 'CAMP-HISTORICAL-01',
      batchId: `RB-INIT-${Date.now()}`,
    });
  }

  // C. Failed recovery: Pick one remaining eligible opportunity and record a failed retry action
  const failCandidate = await RecoveryOpportunity.findOne({
    status: 'PENDING',
    policyStatus: 'ELIGIBLE',
    opportunityId: { $ne: reconOpp ? reconOpp.opportunityId : '' },
  });
  if (failCandidate) {
    const actionId = `ACT-${randomId(8).toUpperCase()}`;
    await RecoveryAction.create({
      recoveryActionId: actionId,
      idempotencyKey: `idemp_${failCandidate.paymentId}_failed_seed`,
      batchId: `RB-INIT-${Date.now()}`,
      campaignId: 'CAMP-HISTORICAL-01',
      paymentId: failCandidate.paymentId,
      opportunityId: failCandidate.opportunityId,
      action: failCandidate.recommendedAction || 'RETRY_PAYMENT',
      previousState: 'failed',
      newState: 'failed',
      amount: failCandidate.amount,
      recoveredAmount: 0,
      result: 'FAILED',
      reason: 'Downstream network timeout during recovery execution.',
      policyDecision: {
        allowed: true,
        ruleEvaluated: 'SAFETY_POLICY_CHECK',
        reason: 'Policy preflight passed.',
      },
    });
    failCandidate.status = 'FAILED';
    failCandidate.retryCount = (failCandidate.retryCount || 0) + 1;
    await failCandidate.save();
  }

  // Create historical campaign record for execution history
  const seedActions = await RecoveryAction.find();
  const recoveredActions = seedActions.filter(a => a.result === 'RECOVERED');
  const failedActions = seedActions.filter(a => a.result === 'FAILED');
  const blockedActions = seedActions.filter(a => a.result === 'BLOCKED');

  await RecoveryCampaign.create({
    campaignId: 'CAMP-HISTORICAL-01',
    name: 'PulsePay Seed Baseline Campaign',
    description: 'Initial seed execution baseline verifying recovery outcomes.',
    targetScenario: 'MIXED_OPERATIONAL_FAILURES',
    mode: 'TEST_EXECUTION',
    status: 'COMPLETED',
    strategySelected: 'OPTIMIZED_EXPECTED_VALUE',
    targetedCount: seedActions.length,
    revenueAtRisk: scanResult.totalRevenueAtRisk,
    eligibleRevenue: scanResult.estimatedRecoverableAmount,
    expectedRecovery: recoveredActions.reduce((s, a) => s + a.amount, 0),
    actualRecovered: recoveredActions.reduce((s, a) => s + (a.recoveredAmount || a.amount), 0),
    actualFailed: failedActions.reduce((s, a) => s + a.amount, 0),
    blockedAmount: blockedActions.reduce((s, a) => s + a.amount, 0),
    recoveryRate: scanResult.totalRevenueAtRisk > 0 
      ? Math.round((recoveredActions.reduce((s, a) => s + (a.recoveredAmount || a.amount), 0) / scanResult.totalRevenueAtRisk) * 1000) / 10 
      : 0,
    expectedVsActual: 100,
    actionsBreakdown: {
      retryCount: 0,
      recoveryLinkCount: 0,
      webhookReconcileCount: recoveredActions.length,
      blockedCount: blockedActions.length,
    },
    learningMetrics: {
      calibrationError: 0,
      recoveredTransactions: recoveredActions.length,
    },
    executedAt: new Date(),
  });

  // 7. Ensure Authoritative Benchmark Exists
  const benchmarkExists = await RecoveryBenchmark.findOne({ status: 'COMPLETED' });
  if (!benchmarkExists) {
    log('[PulsePay Seed] Generating authoritative 10,000 synthetic transaction benchmark (seed: 20260826)...');
    await runRecoveryBenchmark({ datasetSize: 10000, seed: 20260826 });
    log('[PulsePay Seed] Authoritative benchmark persisted.');
  }

  const pendingCount = await RecoveryOpportunity.countDocuments({ status: 'PENDING' });
  const pendingEligible = await RecoveryOpportunity.countDocuments({ status: 'PENDING', policyStatus: 'ELIGIBLE' });
  const pendingBlocked = await RecoveryOpportunity.countDocuments({ status: 'PENDING', policyStatus: 'BLOCKED' });

  log(`[PulsePay Seed] Demo dataset ready:`);
  log(`  - Total Opportunities: ${scanResult.totalOpportunities}`);
  log(`  - Pending for Recovery Mission: ${pendingCount} (${pendingEligible} eligible, ${pendingBlocked} blocked)`);
  log(`  - Executed Historical Actions: ${seedActions.length} (${recoveredActions.length} recovered, ${blockedActions.length} blocked, ${failedActions.length} failed)`);
  log(`  - Benchmark: Authoritative 10k dataset available.`);

  return {
    success: true,
    totalOpportunities: scanResult.totalOpportunities,
    pendingCount,
    pendingEligible,
    pendingBlocked,
    historicalActions: seedActions.length,
    recoveredCount: recoveredActions.length,
    blockedCount: blockedActions.length,
    failedCount: failedActions.length,
  };
};

module.exports = {
  seedDemoData,
  DEMO_EMAIL,
  DEMO_PASSWORD,
};
