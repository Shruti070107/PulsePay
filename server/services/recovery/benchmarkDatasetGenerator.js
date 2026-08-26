/**
 * Deterministic Seedable Synthetic Benchmark Dataset Generator
 * Generates reproducible payment streams across 10 canonical failure scenarios.
 * Strictly separates public features from ground-truth evaluation labels.
 */

// Simple, reliable deterministic pseudo-random number generator (Mulberry32)
function createRNG(seed) {
  let s = Math.floor(seed) >>> 0;
  return function next() {
    s |= 0;
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BENCHMARK_SCENARIOS = [
  { id: 'SCENARIO_NORMAL_TRAFFIC', name: 'Normal Traffic', targetRatio: 0.15 },
  { id: 'SCENARIO_GATEWAY_TIMEOUT', name: 'Gateway Timeout', targetRatio: 0.15 },
  { id: 'SCENARIO_TRANSIENT_PROVIDER_FAILURE', name: 'Transient Provider Failure', targetRatio: 0.10 },
  { id: 'SCENARIO_PERMANENT_DECLINE', name: 'Permanent Decline', targetRatio: 0.10 },
  { id: 'SCENARIO_DUPLICATE_PAYMENT_RISK', name: 'Duplicate Payment Risk', targetRatio: 0.08 },
  { id: 'SCENARIO_WEBHOOK_ONLY_FAILURE', name: 'Webhook-Only Failure', targetRatio: 0.12 },
  { id: 'SCENARIO_HIGH_RETRY_STORM', name: 'High Retry Storm', targetRatio: 0.08 },
  { id: 'SCENARIO_PROVIDER_DEGRADATION', name: 'Provider Degradation', targetRatio: 0.08 },
  { id: 'SCENARIO_HIGH_VALUE_TRANSIENT', name: 'High-Value Transient Failure', targetRatio: 0.06 },
  { id: 'SCENARIO_MIXED_COMPOUND_FAILURES', name: 'Mixed Compound Failures', targetRatio: 0.08 },
];

const PROVIDERS = ['razorpay', 'stripe', 'cashfree', 'payu', 'billdesk'];
const PAYMENT_METHODS = ['upi', 'credit_card', 'debit_card', 'netbanking', 'wallet'];
const MERCHANTS = ['merch_flipkart_01', 'merch_swiggy_02', 'merch_zomato_03', 'merch_amazon_04', 'merch_myntra_05'];

/**
 * Generate a deterministic synthetic dataset of N records with given seed.
 */
function generateBenchmarkDataset(options = {}) {
  const {
    datasetSize = 10000,
    seed = 20260826,
    evaluationSplitRatio = 0.30,
  } = options;

  const rng = createRNG(seed);
  const records = [];
  const baseTimestamp = new Date('2026-08-25T00:00:00.000Z').getTime();

  // Helper pickers
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const randInt = (min, max) => Math.floor(rng() * (max - min + 1)) + min;
  const randFloat = (min, max) => min + rng() * (max - min);

  // Generate records distributed across the 10 scenarios
  for (let i = 0; i < datasetSize; i++) {
    // Select scenario deterministically based on targetRatio distribution
    const roll = rng();
    let accumulated = 0;
    let scenario = BENCHMARK_SCENARIOS[0];
    for (const sc of BENCHMARK_SCENARIOS) {
      accumulated += sc.targetRatio;
      if (roll <= accumulated) {
        scenario = sc;
        break;
      }
    }

    const paymentIndex = i + 1;
    const paymentId = `pay_bench_${seed.toString().slice(-4)}_${String(paymentIndex).padStart(6, '0')}`;
    const merchantId = pick(MERCHANTS);
    const customerId = `cust_${randInt(1000, 9999)}`;
    const orderId = `order_${paymentId.replace('pay_', '')}`;
    const paymentMethod = pick(PAYMENT_METHODS);
    const provider = pick(PROVIDERS);
    const timeOffsetMs = (i * 120000) + randInt(0, 30000);
    const timestamp = new Date(baseTimestamp + timeOffsetMs);

    let amount = randInt(250, 4500);
    let failureType = 'GATEWAY_TIMEOUT';
    let attemptCount = 0;
    let providerHealth = 'HEALTHY';
    let latencyMs = randInt(150, 600);
    let webhookStatus = 'NONE';
    let historicalRecoverySignal = 'MODERATE';

    // Ground Truth variables (Evaluated independently of Agent decisions)
    let groundTruthRecoverable = true;
    let groundTruthRecoveryProbability = 0.85;
    let optimalStrategy = 'RETRY';
    let isDuplicateRisk = false;
    let isPermanentDecline = false;
    let webhookDeliveredToGateway = false;
    let softDeclineRequiresNewMethod = false;

    // Apply Scenario-specific physics & independent ground-truth outcomes
    switch (scenario.id) {
      case 'SCENARIO_NORMAL_TRAFFIC':
        failureType = 'NONE';
        groundTruthRecoverable = true;
        groundTruthRecoveryProbability = 1.0;
        optimalStrategy = 'NO_ACTION';
        break;

      case 'SCENARIO_GATEWAY_TIMEOUT':
        failureType = 'GATEWAY_TIMEOUT';
        latencyMs = randInt(8500, 15000);
        historicalRecoverySignal = 'STRONG';
        groundTruthRecoverable = true;
        groundTruthRecoveryProbability = 0.88;
        optimalStrategy = 'RETRY';
        break;

      case 'SCENARIO_TRANSIENT_PROVIDER_FAILURE':
        failureType = 'PROVIDER_503_UNAVAILABLE';
        providerHealth = 'DEGRADED';
        latencyMs = randInt(4000, 9000);
        historicalRecoverySignal = 'STRONG';
        groundTruthRecoverable = true;
        groundTruthRecoveryProbability = 0.82;
        optimalStrategy = 'DELAYED_RETRY';
        break;

      case 'SCENARIO_PERMANENT_DECLINE':
        failureType = pick(['CARD_EXPIRED', 'FRAUD_SUSPECTED', 'INVALID_ACCOUNT', 'STOLEN_CARD']);
        isPermanentDecline = true;
        historicalRecoverySignal = 'ZERO';
        groundTruthRecoverable = false;
        groundTruthRecoveryProbability = 0.02;
        optimalStrategy = 'NO_ACTION';
        break;

      case 'SCENARIO_DUPLICATE_PAYMENT_RISK':
        failureType = 'DUPLICATE_PAYMENT_RISK';
        isDuplicateRisk = true;
        attemptCount = 1;
        historicalRecoverySignal = 'ZERO';
        groundTruthRecoverable = false; // Retrying would duplicate charge
        groundTruthRecoveryProbability = 0.0;
        optimalStrategy = 'NO_ACTION';
        break;

      case 'SCENARIO_WEBHOOK_ONLY_FAILURE':
        failureType = 'WEBHOOK_DELIVERY_FAILURE';
        webhookStatus = 'FAILED';
        webhookDeliveredToGateway = true; // Gateway captured funds, merchant dropped webhook
        historicalRecoverySignal = 'STRONG';
        groundTruthRecoverable = true;
        groundTruthRecoveryProbability = 0.99;
        optimalStrategy = 'RECONCILIATION';
        break;

      case 'SCENARIO_HIGH_RETRY_STORM':
        failureType = 'MAX_RETRIES_EXCEEDED';
        attemptCount = randInt(2, 4);
        historicalRecoverySignal = 'WEAK';
        groundTruthRecoverable = true; // Recoverable via customer payment link, not automated retry
        groundTruthRecoveryProbability = 0.45;
        optimalStrategy = 'PAYMENT_LINK';
        break;

      case 'SCENARIO_PROVIDER_DEGRADATION':
        failureType = 'PROVIDER_ERROR_SPIKE';
        providerHealth = 'DEGRADED';
        historicalRecoverySignal = 'MODERATE';
        groundTruthRecoverable = true;
        groundTruthRecoveryProbability = 0.78;
        optimalStrategy = 'ALTERNATE_ROUTE';
        break;

      case 'SCENARIO_HIGH_VALUE_TRANSIENT':
        amount = randInt(25000, 95000);
        failureType = 'GATEWAY_TIMEOUT';
        latencyMs = randInt(6000, 12000);
        historicalRecoverySignal = 'STRONG';
        groundTruthRecoverable = true;
        groundTruthRecoveryProbability = 0.86;
        optimalStrategy = 'RETRY';
        break;

      case 'SCENARIO_MIXED_COMPOUND_FAILURES':
        failureType = pick(['INSUFFICIENT_FUNDS', 'AUTH_DECLINE', 'CUSTOMER_ABANDONED']);
        softDeclineRequiresNewMethod = true;
        historicalRecoverySignal = 'MODERATE';
        groundTruthRecoverable = true;
        groundTruthRecoveryProbability = 0.42;
        optimalStrategy = 'PAYMENT_LINK';
        break;

      default:
        break;
    }

    // Determine 70/30 train vs evaluation split deterministically
    // First (1 - evaluationSplitRatio) are TRAIN, remaining are EVALUATION
    const isEval = i >= Math.floor(datasetSize * (1 - evaluationSplitRatio));
    const split = isEval ? 'EVALUATION' : 'TRAIN';

    records.push({
      paymentId,
      split,
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      merchantId,
      customerId,
      orderId,
      amount,
      currency: 'INR',
      provider,
      paymentMethod,
      failureType,
      attemptCount,
      timestamp,
      providerHealth,
      customerHistory: {
        lifetimeSuccessfulTransactions: randInt(1, 45),
        fraudRiskTier: isPermanentDecline ? 'HIGH' : randFloat(0, 1) < 0.1 ? 'MEDIUM' : 'LOW',
      },
      latencyMs,
      webhookStatus,
      historicalRecoverySignal,

      // Isolated Ground Truth for post-decision benchmark scoring
      groundTruth: {
        recoverable: groundTruthRecoverable,
        recoveryProbability: groundTruthRecoveryProbability,
        optimalStrategy,
        isDuplicateRisk,
        isPermanentDecline,
        webhookDeliveredToGateway,
        softDeclineRequiresNewMethod,
      },
    });
  }

  return records;
}

module.exports = {
  BENCHMARK_SCENARIOS,
  generateBenchmarkDataset,
};
