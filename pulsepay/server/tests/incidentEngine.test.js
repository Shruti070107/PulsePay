const assert = require('assert');
const { calculateSimilarityScore, groupSignalsIntoIncidents } = require('../services/incident/correlationEngine');
const { analyzeImpact } = require('../services/incident/impactAnalyzer');
const { mapStateToIncidentType } = require('../services/incident/incidentAggregator');

// Color helpers for terminal logging
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const red = (text) => `\x1b[31m${text}\x1b[0m`;

const runIncidentTests = () => {
  console.log('Running PulsePay Incident Engine Tests...\n');
  let passedCount = 0;
  let failedCount = 0;

  const test = (name, fn) => {
    try {
      fn();
      console.log(`  ${green('✔')} ${name} - ${green('PASSED')}`);
      passedCount++;
    } catch (err) {
      console.error(`  ${red('✘')} ${name} - ${red('FAILED')}`);
      console.error(err);
      failedCount++;
    }
  };

  // Test 1: Similarity Score Weights
  test('Similarity Scoring Logic', () => {
    const t0 = new Date('2026-08-22T10:00:00Z');
    const t1 = new Date('2026-08-22T10:02:00Z'); // 2 minutes difference (120 seconds)

    const s1 = {
      paymentId: 'pay_1',
      customerId: 'cust_A',
      merchantId: 'merch_1',
      type: 'AMBIGUOUS',
      timestamp: t0,
      amount: 1000,
      failureCode: '500',
      endpoint: 'https://merchant.com/webhook'
    };

    const s2 = {
      paymentId: 'pay_2',
      customerId: 'cust_B',
      merchantId: 'merch_1', // Match (20)
      type: 'AMBIGUOUS',     // Match (20)
      timestamp: t1,         // Match proximity: 120s diff (score = 40 * (1 - 120/600) = 32)
      amount: 2000,
      failureCode: '500',    // Match (10)
      endpoint: 'https://merchant.com/webhook' // Match (10)
    };

    const score = calculateSimilarityScore(s1, s2);
    // Expected score: 20 (merchant) + 20 (type) + 32 (time proximity) + 10 (failureCode) + 10 (endpoint) = 92
    assert.strictEqual(score, 92);
  });

  // Test 2: Leader-Follower Clustering/Grouping
  test('Clustering Grouping Algorithm', () => {
    const t0 = new Date('2026-08-22T10:00:00Z');
    const t1 = new Date('2026-08-22T10:01:00Z'); // 1 min diff

    const signals = [
      // Merchant 1, Webhook failure (should group together)
      { paymentId: 'pay_1', customerId: 'c1', merchantId: 'm1', type: 'AMBIGUOUS', timestamp: t0, amount: 500 },
      { paymentId: 'pay_2', customerId: 'c2', merchantId: 'm1', type: 'AMBIGUOUS', timestamp: t1, amount: 600 },
      
      // Merchant 2, Refund Failure (should form separate group)
      { paymentId: 'pay_3', customerId: 'c3', merchantId: 'm2', type: 'REFUND_ANOMALY', timestamp: t0, amount: 2000 }
    ];

    const groups = groupSignalsIntoIncidents(signals, 70);
    
    assert.strictEqual(groups.length, 2);
    assert.strictEqual(groups[0].length, 2); // pay_1 & pay_2
    assert.strictEqual(groups[1].length, 1); // pay_3
    assert.deepStrictEqual(groups[0].map(s => s.paymentId), ['pay_1', 'pay_2']);
    assert.deepStrictEqual(groups[1].map(s => s.paymentId), ['pay_3']);
  });

  // Test 3: Impact Analysis Metrics & Severity
  test('Financial Impact & Severity Calculations', () => {
    const t0 = new Date('2026-08-22T10:00:00Z');
    const t1 = new Date('2026-08-22T10:05:00Z');

    const group = [
      { paymentId: 'pay_1', customerId: 'c1', merchantId: 'm1', type: 'AMBIGUOUS', timestamp: t0, amount: 1500, evidence: ['E1', 'E2'] },
      { paymentId: 'pay_2', customerId: 'c1', merchantId: 'm1', type: 'AMBIGUOUS', timestamp: t1, amount: 1500, evidence: ['E2', 'E3'] }
    ];

    const impact = analyzeImpact(group);

    assert.strictEqual(impact.affectedTransactions, 2);
    assert.strictEqual(impact.affectedAmount, 3000);
    assert.strictEqual(impact.affectedCustomers, 1); // same customer
    assert.strictEqual(impact.severity, 'MEDIUM');   // amount >= 2000, count < 10
    assert.strictEqual(impact.recoverableAmount, 3000); // AMBIGUOUS amount is recoverable
    assert.deepStrictEqual(impact.evidence, ['E1', 'E2', 'E3']);
  });

  // Test 4: Enum Schema Mapping
  test('State Type Mongoose Schema Mapping', () => {
    assert.strictEqual(mapStateToIncidentType('AMBIGUOUS', 'FAILED'), 'WEBHOOK_FAILURE');
    assert.strictEqual(mapStateToIncidentType('AMBIGUOUS', 'DELIVERED'), 'CAPTURED_ORDER_UNPAID');
    assert.strictEqual(mapStateToIncidentType('DUPLICATE_RISK', 'NONE'), 'DUPLICATE_PAYMENT_RISK');
    assert.strictEqual(mapStateToIncidentType('EVENT_ORDER_ANOMALY', 'NONE'), 'OUT_OF_ORDER_EVENTS');
    assert.strictEqual(mapStateToIncidentType('REFUND_ANOMALY', 'NONE'), 'REFUND_INCONSISTENCY');
    assert.strictEqual(mapStateToIncidentType('LATE_AUTHORIZATION', 'NONE'), 'LATE_AUTHORIZATION');
  });

  // Summary
  console.log(`\nTests finished: ${green(`${passedCount} passed`)}, ${failedCount > 0 ? red(`${failedCount} failed`) : '0 failed'}`);
  if (failedCount > 0) {
    process.exit(1);
  }
};

runIncidentTests();
