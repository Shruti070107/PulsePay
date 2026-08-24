const assert = require('assert');
const {
  buildConfidenceBreakdown,
  buildRootCauseGraph,
  buildOperatorActionCenter
} = require('../services/incident/evidenceEngine');

console.log('Running PulsePay Evidence Engine Tests...\n');

// 1. Mock data setups
const mockIncident = {
  incidentId: 'INC-TEST01',
  type: 'WEBHOOK_FAILURE',
  affectedTransactions: 3,
  affectedAmount: 4500
};

const mockEvidenceItems = [
  { type: 'PAYMENT_CAPTURED', severity: 'LOW', source: 'Payment' },
  { type: 'ORDER_UNPAID', severity: 'HIGH', source: 'Order' },
  { type: 'WEBHOOK_FAILURE', severity: 'HIGH', source: 'WebhookEvent' }
];

// Test 1: Confidence Breakdown Math
const runConfidenceTest = () => {
  const breakdown = buildConfidenceBreakdown(mockIncident, mockEvidenceItems);
  
  // Base 50 + 25 (state mismatch) + 20 (webhook failure) + 15 (multiple correlated) = 110. Clamped to 99.
  assert.strictEqual(breakdown.score, 99);
  assert.ok(breakdown.factors.length > 0);
  assert.ok(breakdown.explanation.includes('99%'));
  console.log('  ✔ Confidence Breakdown Calculation - PASSED');
};

// Test 2: Root Cause Graph Dynamic Generation
const runGraphTest = () => {
  const graph = buildRootCauseGraph(mockIncident, mockEvidenceItems);
  assert.strictEqual(graph.nodes.length, 4);
  assert.strictEqual(graph.edges.length, 3);
  assert.strictEqual(graph.nodes[0].label, 'Payment Captured');
  assert.strictEqual(graph.nodes[1].label, 'Webhook Delivery Failed');
  console.log('  ✔ Causal Graph Generation - PASSED');
};

// Test 3: Operator Action Checklist
const runActionsTest = () => {
  const actions = buildOperatorActionCenter(mockIncident, mockEvidenceItems);
  assert.ok(actions.length >= 2);
  assert.strictEqual(actions[0].priority, 'HIGH');
  assert.strictEqual(actions[0].status, 'TODO');
  console.log('  ✔ Operator Action Items Checklist - PASSED');
};

try {
  runConfidenceTest();
  runGraphTest();
  runActionsTest();
  console.log('\nEvidence Engine Tests finished: all tests passed.');
} catch (err) {
  console.error('\nEvidence Engine Tests failed:', err);
  process.exit(1);
}
