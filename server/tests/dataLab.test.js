const assert = require('assert');
const { validateRecord, mapStatus, normalizeRecord, detectDuplicates } = require('../services/normalization/normalizationLayer');

console.log('Running PulsePay Data Lab & Baseline Engine Tests...\n');

const testNormalizations = () => {
  assert.strictEqual(mapStatus('completed'), 'captured');
  assert.strictEqual(mapStatus('success_gate'), 'captured');
  assert.strictEqual(mapStatus('auth'), 'authorized');
  assert.strictEqual(mapStatus('declined'), 'failed');
  assert.strictEqual(mapStatus('pending'), 'processing');
  console.log('  ✔ Status Normalization Mapping - PASSED');
};

const testValidations = () => {
  // 1. Missing required field
  const record1 = { paymentId: 'pay_1', customerId: 'c_1', amount: 100 };
  const res1 = validateRecord(record1, 0);
  assert.strictEqual(res1.isValid, false);
  assert.ok(res1.errors.some(e => e.field === 'merchantId'));

  // 2. Negative amount
  const record2 = { paymentId: 'pay_2', customerId: 'c_1', merchantId: 'm_1', amount: -50, status: 'success', paymentMethod: 'card' };
  const res2 = validateRecord(record2, 1);
  assert.strictEqual(res2.isValid, false);
  assert.ok(res2.errors.some(e => e.field === 'amount'));

  // 3. Valid record
  const record3 = { paymentId: 'pay_3', customerId: 'c_1', merchantId: 'm_1', amount: 200, status: 'success', paymentMethod: 'card' };
  const res3 = validateRecord(record3, 2);
  assert.strictEqual(res3.isValid, true);

  console.log('  ✔ Record Parameter Validation - PASSED');
};

const testDuplicates = async () => {
  const records = [
    { paymentId: 'pay_dup1', customerId: 'c_1', merchantId: 'm_1', amount: 100, timestamp: '2026-08-23T00:00:00Z' },
    { paymentId: 'pay_dup1', customerId: 'c_1', merchantId: 'm_1', amount: 100, timestamp: '2026-08-23T00:00:05Z' }, // Exact batch duplicate
    { paymentId: 'pay_dup2', customerId: 'c_2', merchantId: 'm_2', amount: 500, timestamp: '2026-08-23T00:01:00Z' },
    { paymentId: 'pay_dup3', customerId: 'c_2', merchantId: 'm_2', amount: 500, timestamp: '2026-08-23T00:01:10Z' }  // Possible tap duplicate
  ];

  const duplicates = await detectDuplicates(records);
  assert.strictEqual(duplicates.length, 2);
  assert.strictEqual(duplicates[0].type, 'EXACT_DUPLICATE');
  assert.strictEqual(duplicates[1].type, 'POSSIBLE_DUPLICATE');

  console.log('  ✔ Exact vs Possible Duplicate Detections - PASSED');
};

try {
  testNormalizations();
  testValidations();
  testDuplicates();
  console.log('\nData Lab Tests finished: all tests passed.');
} catch (err) {
  console.error('\nData Lab Tests failed:', err);
  process.exit(1);
}
