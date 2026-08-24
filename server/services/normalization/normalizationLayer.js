/**
 * Normalization & Validation Service
 */

const requiredFields = ['paymentId', 'customerId', 'merchantId', 'amount', 'status', 'paymentMethod'];
const supportedStatuses = ['created', 'processing', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded'];

/**
 * Validates a single transaction record.
 */
const validateRecord = (record, index, seenPaymentIds = new Set()) => {
  const errors = [];
  let isExactDuplicate = false;

  // 1. Required field checks
  requiredFields.forEach(field => {
    if (record[field] === undefined || record[field] === null || String(record[field]).trim() === '') {
      errors.push({
        row: index + 1,
        field,
        problem: `Missing required field: ${field}`,
        correction: `Provide a valid value for ${field}`
      });
    }
  });

  // 2. Amount checks
  if (record.amount !== undefined && record.amount !== null) {
    const amt = Number(record.amount);
    if (isNaN(amt) || amt <= 0) {
      errors.push({
        row: index + 1,
        field: 'amount',
        problem: `Invalid amount: ${record.amount}`,
        correction: 'Provide a positive numeric amount'
      });
    }
  }

  // 3. Timestamp checks
  if (record.timestamp) {
    const timestampDate = new Date(record.timestamp);
    if (isNaN(timestampDate.getTime())) {
      errors.push({
        row: index + 1,
        field: 'timestamp',
        problem: `Malformed timestamp: ${record.timestamp}`,
        correction: 'Provide an ISO or standard datetime string'
      });
    }
  }

  // 4. Status normalization mapping checks
  if (record.status) {
    const normalizedStatus = mapStatus(record.status);
    if (!supportedStatuses.includes(normalizedStatus)) {
      errors.push({
        row: index + 1,
        field: 'status',
        problem: `Unsupported transaction status: ${record.status}`,
        correction: `Status must be one of: ${supportedStatuses.join(', ')}`
      });
    }
  }

  // 5. In-batch Exact Duplicate checks
  if (record.paymentId && seenPaymentIds.has(record.paymentId)) {
    isExactDuplicate = true;
  }

  return {
    isValid: errors.length === 0,
    errors,
    isExactDuplicate
  };
};

/**
 * Maps varying status strings into internal standard representations.
 */
const mapStatus = (status) => {
  if (!status) return 'created';
  const s = String(status).toLowerCase().trim();
  if (s === 'completed' || s === 'success' || s === 'captured' || s === 'success_gate') return 'captured';
  if (s === 'authorized' || s === 'auth') return 'authorized';
  if (s === 'failed' || s === 'error' || s === 'declined') return 'failed';
  if (s === 'refunded' || s === 'refund') return 'refunded';
  if (s === 'processing' || s === 'pending') return 'processing';
  return s;
};

/**
 * Normalizes a raw transaction record into standard PulsePay formats.
 */
const normalizeRecord = (record) => {
  return {
    paymentId: String(record.paymentId).trim(),
    orderId: record.orderId ? String(record.orderId).trim() : `ORD-${record.paymentId}`,
    amount: Number(record.amount),
    currency: record.currency ? String(record.currency).toUpperCase().trim() : 'INR',
    customerId: String(record.customerId).trim(),
    merchantId: String(record.merchantId).trim(),
    paymentMethod: String(record.paymentMethod).toLowerCase().trim(),
    status: mapStatus(record.status),
    createdAt: record.timestamp ? new Date(record.timestamp) : new Date()
  };
};

/**
 * Performs duplicate detection across a dataset.
 */
const detectDuplicates = async (records) => {
  const seenPaymentIds = new Set();
  const duplicates = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (!record.paymentId) continue;

    // Check exact duplicate in the batch
    if (seenPaymentIds.has(record.paymentId)) {
      duplicates.push({
        row: i + 1,
        paymentId: record.paymentId,
        type: 'EXACT_DUPLICATE',
        description: `Exact duplicate paymentId found: ${record.paymentId}`
      });
    }
    seenPaymentIds.add(record.paymentId);

    // Look for possible duplicate based on merchantId + orderId + amount
    for (let j = i + 1; j < records.length; j++) {
      const match = records[j];
      if (
        record.merchantId === match.merchantId &&
        record.amount === match.amount &&
        record.customerId === match.customerId &&
        Math.abs(new Date(record.timestamp || Date.now()) - new Date(match.timestamp || Date.now())) <= 60000 &&
        record.paymentId !== match.paymentId
      ) {
        duplicates.push({
          row: j + 1,
          paymentId: match.paymentId,
          type: 'POSSIBLE_DUPLICATE',
          description: `Possible double checkout tap detected for Customer ${record.customerId} (₹${record.amount})`
        });
      }
    }
  }

  return duplicates;
};

module.exports = {
  validateRecord,
  mapStatus,
  normalizeRecord,
  detectDuplicates
};
