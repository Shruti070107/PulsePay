const Payment = require('../models/Payment');
const PaymentEvent = require('../models/PaymentEvent');
const Order = require('../models/Order');
const WebhookEvent = require('../models/WebhookEvent');
const {
  generatePaymentId,
  generateOrderId,
  generateCustomerId,
  generateMerchantId,
  generateWebhookId,
  generateEventId,
  generateRefundId,
} = require('../utils/idGenerator');

const INR_AMOUNTS = [199, 299, 499, 799, 1299, 2499, 4999, 9999, 24999];
const PAYMENT_METHODS = ['credit_card', 'debit_card', 'upi', 'net_banking', 'wallet'];

// Helper to get random item from array
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Helper to generate base attributes for simulated transaction
const generateBaseTransaction = () => {
  return {
    amount: randomChoice(INR_AMOUNTS),
    currency: 'INR',
    paymentMethod: randomChoice(PAYMENT_METHODS),
    customerId: generateCustomerId(),
    merchantId: generateMerchantId(),
  };
};

/**
 * Scenario 1: Normal Payment Flow
 */
const generateNormal = (base = generateBaseTransaction(), options = {}) => {
  const paymentId = generatePaymentId();
  const orderId = generateOrderId();
  const now = options.now || new Date();
  
  const payment = {
    paymentId,
    orderId,
    amount: base.amount,
    currency: base.currency,
    customerId: base.customerId,
    merchantId: base.merchantId,
    paymentMethod: base.paymentMethod,
    status: 'captured',
  };

  const order = {
    orderId,
    paymentId,
    amount: base.amount,
    status: 'paid',
  };

  const events = [];
  const webhooks = [];

  // T: payment.created
  const t0 = new Date(now.getTime());
  events.push({
    eventId: generateEventId(),
    paymentId,
    type: 'payment.created',
    source: 'api',
    status: 'created',
    timestamp: t0,
    eventTimestamp: t0,
    receivedAt: t0,
    metadata: { orderId, amount: base.amount },
  });

  // T + 1s: payment.authorized
  const t1 = new Date(now.getTime() + 1000);
  events.push({
    eventId: generateEventId(),
    paymentId,
    type: 'payment.authorized',
    source: 'gateway',
    status: 'authorized',
    timestamp: t1,
    eventTimestamp: t1,
    receivedAt: t1,
    metadata: { authCode: 'AUTH' + Math.floor(1000 + Math.random() * 9000) },
  });

  // T + 2s: payment.captured
  const t2 = new Date(now.getTime() + 2000);
  const captureEventId = generateEventId();
  events.push({
    eventId: captureEventId,
    paymentId,
    type: 'payment.captured',
    source: 'gateway',
    status: 'captured',
    timestamp: t2,
    eventTimestamp: t2,
    receivedAt: t2,
    metadata: { gatewayTransactionId: 'TXN_' + Math.floor(100000 + Math.random() * 900000) },
  });

  // T + 2.5s: webhook.sent
  const tSent = new Date(now.getTime() + 2500);
  events.push({
    eventId: generateEventId(),
    paymentId,
    type: 'webhook.sent',
    source: 'webhook_engine',
    status: 'sent',
    timestamp: tSent,
    eventTimestamp: tSent,
    receivedAt: tSent,
    metadata: { webhookId: generateWebhookId() },
  });

  // T + 3s: webhook.delivered
  const tDelivered = new Date(now.getTime() + 3000);
  const webhookId = generateWebhookId();
  events.push({
    eventId: generateEventId(),
    paymentId,
    type: 'webhook.delivered',
    source: 'webhook_engine',
    status: 'delivered',
    timestamp: tDelivered,
    eventTimestamp: tDelivered,
    receivedAt: tDelivered,
    metadata: { webhookId, responseCode: 200 },
  });

  webhooks.push({
    webhookId,
    paymentId,
    eventId: captureEventId,
    eventType: 'payment.captured',
    deliveryStatus: 'delivered',
    responseCode: 200,
    attemptNumber: 1,
    timestamp: tDelivered,
  });

  // T + 3.2s: order.paid
  const tOrder = new Date(now.getTime() + 3200);
  events.push({
    eventId: generateEventId(),
    paymentId,
    type: 'order.paid',
    source: 'merchant_system',
    status: 'paid',
    timestamp: tOrder,
    eventTimestamp: tOrder,
    receivedAt: tOrder,
    metadata: { orderId },
  });

  return { payment, order, events, webhooks };
};

/**
 * Scenario 2: Webhook Failure
 */
const generateWebhookFailure = (base = generateBaseTransaction(), options = {}) => {
  const paymentId = generatePaymentId();
  const orderId = generateOrderId();
  const now = options.now || new Date();

  const payment = {
    paymentId,
    orderId,
    amount: base.amount,
    currency: base.currency,
    customerId: base.customerId,
    merchantId: base.merchantId,
    paymentMethod: base.paymentMethod,
    status: 'captured',
  };

  const order = {
    orderId,
    paymentId,
    amount: base.amount,
    status: 'unpaid',
  };

  const events = [];
  const webhooks = [];

  // T: payment.created
  const t0 = new Date(now.getTime());
  events.push({
    eventId: generateEventId(),
    paymentId,
    type: 'payment.created',
    source: 'api',
    status: 'created',
    timestamp: t0,
    eventTimestamp: t0,
    receivedAt: t0,
    metadata: { orderId, amount: base.amount },
  });

  // T + 1s: payment.authorized
  const t1 = new Date(now.getTime() + 1000);
  events.push({
    eventId: generateEventId(),
    paymentId,
    type: 'payment.authorized',
    source: 'gateway',
    status: 'authorized',
    timestamp: t1,
    eventTimestamp: t1,
    receivedAt: t1,
    metadata: { authCode: 'AUTH' + Math.floor(1000 + Math.random() * 9000) },
  });

  // T + 2s: payment.captured
  const t2 = new Date(now.getTime() + 2000);
  const captureEventId = generateEventId();
  events.push({
    eventId: captureEventId,
    paymentId,
    type: 'payment.captured',
    source: 'gateway',
    status: 'captured',
    timestamp: t2,
    eventTimestamp: t2,
    receivedAt: t2,
    metadata: { gatewayTransactionId: 'TXN_' + Math.floor(100000 + Math.random() * 900000) },
  });

  // Webhook Attempt 1 (T + 3s, fails 500)
  const webhookId = generateWebhookId();
  const tWh1 = new Date(now.getTime() + 3000);
  events.push({
    eventId: generateEventId(),
    paymentId,
    type: 'webhook.failed',
    source: 'webhook_engine',
    status: 'failed',
    timestamp: tWh1,
    eventTimestamp: tWh1,
    receivedAt: tWh1,
    metadata: { webhookId, attemptNumber: 1, responseCode: 500 },
  });
  webhooks.push({
    webhookId,
    paymentId,
    eventId: captureEventId,
    eventType: 'payment.captured',
    deliveryStatus: 'failed',
    responseCode: 500,
    attemptNumber: 1,
    timestamp: tWh1,
  });

  // Webhook Attempt 2 (T + 15s, fails 502)
  const tWh2 = new Date(now.getTime() + 15000);
  events.push({
    eventId: generateEventId(),
    paymentId,
    type: 'webhook.failed',
    source: 'webhook_engine',
    status: 'failed',
    timestamp: tWh2,
    eventTimestamp: tWh2,
    receivedAt: tWh2,
    metadata: { webhookId, attemptNumber: 2, responseCode: 502 },
  });
  webhooks.push({
    webhookId,
    paymentId,
    eventId: captureEventId,
    eventType: 'payment.captured',
    deliveryStatus: 'failed',
    responseCode: 502,
    attemptNumber: 2,
    timestamp: tWh2,
  });

  // Webhook Attempt 3 (T + 60s, fails 503)
  const tWh3 = new Date(now.getTime() + 60000);
  events.push({
    eventId: generateEventId(),
    paymentId,
    type: 'webhook.failed',
    source: 'webhook_engine',
    status: 'failed',
    timestamp: tWh3,
    eventTimestamp: tWh3,
    receivedAt: tWh3,
    metadata: { webhookId, attemptNumber: 3, responseCode: 503 },
  });
  webhooks.push({
    webhookId,
    paymentId,
    eventId: captureEventId,
    eventType: 'payment.captured',
    deliveryStatus: 'failed',
    responseCode: 503,
    attemptNumber: 3,
    timestamp: tWh3,
  });

  return { payment, order, events, webhooks };
};

/**
 * Scenario 3: Duplicate Payment Risk
 */
const generateDuplicate = (base = generateBaseTransaction(), options = {}) => {
  const customerId = base.customerId;
  const merchantId = base.merchantId;
  const amount = base.amount;
  const now = options.now || new Date();

  // First payment (Stuck in processing)
  const paymentId1 = generatePaymentId();
  const orderId1 = generateOrderId();
  
  const payment1 = {
    paymentId: paymentId1,
    orderId: orderId1,
    amount,
    currency: base.currency,
    customerId,
    merchantId,
    paymentMethod: base.paymentMethod,
    status: 'processing',
  };

  const order1 = {
    orderId: orderId1,
    paymentId: paymentId1,
    amount,
    status: 'unpaid',
  };

  const events1 = [];
  const t0_1 = new Date(now.getTime());
  events1.push({
    eventId: generateEventId(),
    paymentId: paymentId1,
    type: 'payment.created',
    source: 'api',
    status: 'created',
    timestamp: t0_1,
    eventTimestamp: t0_1,
    receivedAt: t0_1,
    metadata: { orderId: orderId1, amount },
  });

  const t1_1 = new Date(now.getTime() + 1000);
  events1.push({
    eventId: generateEventId(),
    paymentId: paymentId1,
    type: 'payment.processing',
    source: 'gateway',
    status: 'processing',
    timestamp: t1_1,
    eventTimestamp: t1_1,
    receivedAt: t1_1,
    metadata: { gatewayMessage: 'Processing at network' },
  });

  // Second payment (Duplicate attempt 10s later)
  const paymentId2 = generatePaymentId();
  const orderId2 = generateOrderId();
  
  const payment2 = {
    paymentId: paymentId2,
    orderId: orderId2,
    amount,
    currency: base.currency,
    customerId,
    merchantId,
    paymentMethod: base.paymentMethod,
    status: 'created',
  };

  const order2 = {
    orderId: orderId2,
    paymentId: paymentId2,
    amount,
    status: 'created',
  };

  const events2 = [];
  const t0_2 = new Date(now.getTime() + 10000);
  events2.push({
    eventId: generateEventId(),
    paymentId: paymentId2,
    type: 'payment.created',
    source: 'api',
    status: 'created',
    timestamp: t0_2,
    eventTimestamp: t0_2,
    receivedAt: t0_2,
    metadata: { orderId: orderId2, amount },
  });

  return {
    payments: [payment1, payment2],
    orders: [order1, order2],
    events: [...events1, ...events2],
    webhooks: [],
  };
};

/**
 * Scenario 4: Out of Order Events
 */
const generateOutOfOrder = (base = generateBaseTransaction(), options = {}) => {
  const paymentId = generatePaymentId();
  const orderId = generateOrderId();
  const now = options.now || new Date();

  const payment = {
    paymentId,
    orderId,
    amount: base.amount,
    currency: base.currency,
    customerId: base.customerId,
    merchantId: base.merchantId,
    paymentMethod: base.paymentMethod,
    status: 'captured',
  };

  const order = {
    orderId,
    paymentId,
    amount: base.amount,
    status: 'paid',
  };

  const events = [];
  const webhooks = [];

  // Actual timestamps (logical order)
  const tCreated = new Date(now.getTime());
  const tAuthorized = new Date(now.getTime() + 1000);
  const tCaptured = new Date(now.getTime() + 2000);

  // Ingestion timestamps (out of order arrival sequence)
  const arrival1 = new Date(now.getTime() + 10000); // created arrives T + 10s
  const arrival2 = new Date(now.getTime() + 12000); // captured arrives T + 12s
  const arrival3 = new Date(now.getTime() + 14000); // authorized arrives T + 14s

  // 1. payment.created (Logical T_created, Ingested arrival1)
  events.push({
    eventId: generateEventId(),
    paymentId,
    type: 'payment.created',
    source: 'api',
    status: 'created',
    timestamp: tCreated,
    eventTimestamp: tCreated,
    receivedAt: arrival1,
    metadata: { orderId, amount: base.amount },
  });

  // 2. payment.captured (Logical T_captured, Ingested arrival2)
  const captureEventId = generateEventId();
  events.push({
    eventId: captureEventId,
    paymentId,
    type: 'payment.captured',
    source: 'gateway',
    status: 'captured',
    timestamp: tCaptured,
    eventTimestamp: tCaptured,
    receivedAt: arrival2,
    metadata: { gatewayTransactionId: 'TXN_' + Math.floor(100000 + Math.random() * 900000) },
  });

  // 3. payment.authorized (Logical T_authorized, Ingested arrival3)
  events.push({
    eventId: generateEventId(),
    paymentId,
    type: 'payment.authorized',
    source: 'gateway',
    status: 'authorized',
    timestamp: tAuthorized,
    eventTimestamp: tAuthorized,
    receivedAt: arrival3,
    metadata: { authCode: 'AUTH' + Math.floor(1000 + Math.random() * 9000) },
  });

  // Regular successful webhook for the capture
  const tWh = new Date(now.getTime() + 15000);
  const webhookId = generateWebhookId();
  events.push({
    eventId: generateEventId(),
    paymentId,
    type: 'webhook.delivered',
    source: 'webhook_engine',
    status: 'delivered',
    timestamp: tWh,
    eventTimestamp: tWh,
    receivedAt: tWh,
    metadata: { webhookId },
  });
  webhooks.push({
    webhookId,
    paymentId,
    eventId: captureEventId,
    eventType: 'payment.captured',
    deliveryStatus: 'delivered',
    responseCode: 200,
    attemptNumber: 1,
    timestamp: tWh,
  });

  // Order Paid event
  const tOrder = new Date(now.getTime() + 15500);
  events.push({
    eventId: generateEventId(),
    paymentId,
    type: 'order.paid',
    source: 'merchant_system',
    status: 'paid',
    timestamp: tOrder,
    eventTimestamp: tOrder,
    receivedAt: tOrder,
    metadata: { orderId },
  });

  return { payment, order, events, webhooks };
};

/**
 * Scenario 5: Refund Failure
 */
const generateRefundFailure = (base = generateBaseTransaction(), options = {}) => {
  const paymentId = generatePaymentId();
  const orderId = generateOrderId();
  const now = options.now || new Date();

  const payment = {
    paymentId,
    orderId,
    amount: base.amount,
    currency: base.currency,
    customerId: base.customerId,
    merchantId: base.merchantId,
    paymentMethod: base.paymentMethod,
    status: 'captured',
  };

  const order = {
    orderId,
    paymentId,
    amount: base.amount,
    status: 'paid',
  };

  const events = [];
  const webhooks = [];

  // T: payment.created
  const t0 = new Date(now.getTime());
  events.push({
    eventId: generateEventId(),
    paymentId,
    type: 'payment.created',
    source: 'api',
    status: 'created',
    timestamp: t0,
    eventTimestamp: t0,
    receivedAt: t0,
    metadata: { orderId, amount: base.amount },
  });

  // T + 1s: payment.authorized
  const t1 = new Date(now.getTime() + 1000);
  events.push({
    eventId: generateEventId(),
    paymentId,
    type: 'payment.authorized',
    source: 'gateway',
    status: 'authorized',
    timestamp: t1,
    eventTimestamp: t1,
    receivedAt: t1,
    metadata: { authCode: 'AUTH_REF' },
  });

  // T + 2s: payment.captured
  const t2 = new Date(now.getTime() + 2000);
  const captureEventId = generateEventId();
  events.push({
    eventId: captureEventId,
    paymentId,
    type: 'payment.captured',
    source: 'gateway',
    status: 'captured',
    timestamp: t2,
    eventTimestamp: t2,
    receivedAt: t2,
    metadata: { gatewayTransactionId: 'TXN_REF' },
  });

  // Webhook
  const tWh = new Date(now.getTime() + 3000);
  const webhookId = generateWebhookId();
  webhooks.push({
    webhookId,
    paymentId,
    eventId: captureEventId,
    eventType: 'payment.captured',
    deliveryStatus: 'delivered',
    responseCode: 200,
    attemptNumber: 1,
    timestamp: tWh,
  });

  // Order paid
  events.push({
    eventId: generateEventId(),
    paymentId,
    type: 'order.paid',
    source: 'merchant_system',
    status: 'paid',
    timestamp: new Date(now.getTime() + 3200),
    eventTimestamp: new Date(now.getTime() + 3200),
    receivedAt: new Date(now.getTime() + 3200),
    metadata: { orderId },
  });

  // T + 10s: refund.created
  const tRefund1 = new Date(now.getTime() + 10000);
  const refundId = generateRefundId();
  events.push({
    eventId: generateEventId(),
    paymentId,
    type: 'refund.created',
    source: 'api',
    status: 'created',
    timestamp: tRefund1,
    eventTimestamp: tRefund1,
    receivedAt: tRefund1,
    metadata: { refundId, amount: base.amount, reason: 'Customer Request' },
  });

  // T + 12s: refund.failed
  const tRefund2 = new Date(now.getTime() + 12000);
  events.push({
    eventId: generateEventId(),
    paymentId,
    type: 'refund.failed',
    source: 'gateway',
    status: 'failed',
    timestamp: tRefund2,
    eventTimestamp: tRefund2,
    receivedAt: tRefund2,
    metadata: { refundId, errorCode: 'INSUFFICIENT_MERCHANT_BALANCE', message: 'Refund declined by bank' },
  });

  return { payment, order, events, webhooks };
};

/**
 * Scenario 6: Late Authorization
 */
const generateLateAuth = (base = generateBaseTransaction(), options = {}) => {
  const paymentId = generatePaymentId();
  const orderId = generateOrderId();
  const now = options.now || new Date();

  // Payment starts as failed, but authorized later
  const payment = {
    paymentId,
    orderId,
    amount: base.amount,
    currency: base.currency,
    customerId: base.customerId,
    merchantId: base.merchantId,
    paymentMethod: base.paymentMethod,
    status: 'captured', // Final status is captured
  };

  const order = {
    orderId,
    paymentId,
    amount: base.amount,
    status: 'paid', // Final status is paid
  };

  const events = [];
  const webhooks = [];

  // T: payment.created
  const t0 = new Date(now.getTime());
  events.push({
    eventId: generateEventId(),
    paymentId,
    type: 'payment.created',
    source: 'api',
    status: 'created',
    timestamp: t0,
    eventTimestamp: t0,
    receivedAt: t0,
    metadata: { orderId, amount: base.amount },
  });

  // T + 5s: payment.failed (Gateway initially failed due to drop/timeout)
  const tFail = new Date(now.getTime() + 5000);
  events.push({
    eventId: generateEventId(),
    paymentId,
    type: 'payment.failed',
    source: 'gateway',
    status: 'failed',
    timestamp: tFail,
    eventTimestamp: tFail,
    receivedAt: tFail,
    metadata: { errorCode: 'NETWORK_TIMEOUT', message: 'Gateway response timed out' },
  });

  // T + 30s: payment.authorized (Late authorization arrives from processor)
  const tAuth = new Date(now.getTime() + 30000);
  events.push({
    eventId: generateEventId(),
    paymentId,
    type: 'payment.authorized',
    source: 'gateway',
    status: 'authorized',
    timestamp: tAuth,
    eventTimestamp: tAuth,
    receivedAt: tAuth,
    metadata: { authCode: 'LATE_AUTH_123', originalAttemptStatus: 'failed' },
  });

  // T + 32s: payment.captured
  const tCap = new Date(now.getTime() + 32000);
  const captureEventId = generateEventId();
  events.push({
    eventId: captureEventId,
    paymentId,
    type: 'payment.captured',
    source: 'gateway',
    status: 'captured',
    timestamp: tCap,
    eventTimestamp: tCap,
    receivedAt: tCap,
    metadata: { gatewayTransactionId: 'TXN_LATE_123' },
  });

  // Webhook
  const tWh = new Date(now.getTime() + 33000);
  const webhookId = generateWebhookId();
  webhooks.push({
    webhookId,
    paymentId,
    eventId: captureEventId,
    eventType: 'payment.captured',
    deliveryStatus: 'delivered',
    responseCode: 200,
    attemptNumber: 1,
    timestamp: tWh,
  });

  // Order paid
  const tOrder = new Date(now.getTime() + 34000);
  events.push({
    eventId: generateEventId(),
    paymentId,
    type: 'order.paid',
    source: 'merchant_system',
    status: 'paid',
    timestamp: tOrder,
    eventTimestamp: tOrder,
    receivedAt: tOrder,
    metadata: { orderId },
  });

  return { payment, order, events, webhooks };
};

/**
 * Saves generated data directly to database
 */
const saveScenarioData = async (data) => {
  const result = {
    paymentId: null,
    orderId: null,
    eventsCreated: 0,
    webhooksCreated: 0,
  };

  if (data.payment) {
    await Payment.create(data.payment);
    result.paymentId = data.payment.paymentId;
    result.orderId = data.payment.orderId;
  }
  if (data.payments && data.payments.length) {
    await Payment.insertMany(data.payments);
    result.paymentId = data.payments.map(p => p.paymentId).join(',');
    result.orderId = data.payments.map(p => p.orderId).join(',');
  }

  if (data.order) await Order.create(data.order);
  if (data.orders && data.orders.length) await Order.insertMany(data.orders);

  if (data.events && data.events.length) {
    await PaymentEvent.insertMany(data.events);
    result.eventsCreated = data.events.length;
  }

  if (data.webhooks && data.webhooks.length) {
    await WebhookEvent.insertMany(data.webhooks);
    result.webhooksCreated = data.webhooks.length;
  }

  return result;
};

/**
 * Generate Batch of Simulated Transactions with a given distribution
 */
const generateBatch = async (count, distribution = {}) => {
  // Validate distribution or use defaults
  const dist = {
    normal: distribution.normal !== undefined ? distribution.normal : 0.85,
    webhookFailure: distribution.webhookFailure !== undefined ? distribution.webhookFailure : 0.05,
    duplicate: distribution.duplicate !== undefined ? distribution.duplicate : 0.03,
    outOfOrder: distribution.outOfOrder !== undefined ? distribution.outOfOrder : 0.03,
    refundFailure: distribution.refundFailure !== undefined ? distribution.refundFailure : 0.04,
    lateAuth: distribution.lateAuth !== undefined ? distribution.lateAuth : 0.05,
  };

  // Normalize distribution percentages
  const sum = Object.values(dist).reduce((a, b) => a + b, 0);
  Object.keys(dist).forEach(key => {
    dist[key] = dist[key] / sum;
  });

  const payments = [];
  const orders = [];
  const events = [];
  const webhooks = [];

  const nowBase = new Date();

  // Define counts per scenario
  const counts = {
    webhookFailure: Math.round(count * dist.webhookFailure),
    duplicate: Math.round(count * dist.duplicate),
    outOfOrder: Math.round(count * dist.outOfOrder),
    refundFailure: Math.round(count * dist.refundFailure),
    lateAuth: Math.round(count * dist.lateAuth),
  };

  // Calculate remaining count for normal (duplicate generates 2 payments)
  const nonNormalPaymentsCount = 
    counts.webhookFailure + 
    (counts.duplicate * 2) + 
    counts.outOfOrder + 
    counts.refundFailure + 
    counts.lateAuth;

  counts.normal = Math.max(0, count - nonNormalPaymentsCount);

  // Helper to generate a random timestamp in the last 24 hours
  const getRandomTimeInPast = () => {
    const offsetMs = Math.floor(Math.random() * 24 * 60 * 60 * 1000); // up to 24h
    return new Date(nowBase.getTime() - offsetMs);
  };

  // Generate Normal
  for (let i = 0; i < counts.normal; i++) {
    const data = generateNormal(generateBaseTransaction(), { now: getRandomTimeInPast() });
    payments.push(data.payment);
    orders.push(data.order);
    events.push(...data.events);
    if (data.webhooks) webhooks.push(...data.webhooks);
  }

  // Generate Webhook Failure
  for (let i = 0; i < counts.webhookFailure; i++) {
    const data = generateWebhookFailure(generateBaseTransaction(), { now: getRandomTimeInPast() });
    payments.push(data.payment);
    orders.push(data.order);
    events.push(...data.events);
    if (data.webhooks) webhooks.push(...data.webhooks);
  }

  // Generate Duplicate Risk
  for (let i = 0; i < counts.duplicate; i++) {
    const data = generateDuplicate(generateBaseTransaction(), { now: getRandomTimeInPast() });
    payments.push(...data.payments);
    orders.push(...data.orders);
    events.push(...data.events);
  }

  // Generate Out of Order
  for (let i = 0; i < counts.outOfOrder; i++) {
    const data = generateOutOfOrder(generateBaseTransaction(), { now: getRandomTimeInPast() });
    payments.push(data.payment);
    orders.push(data.order);
    events.push(...data.events);
    if (data.webhooks) webhooks.push(...data.webhooks);
  }

  // Generate Refund Failure
  for (let i = 0; i < counts.refundFailure; i++) {
    const data = generateRefundFailure(generateBaseTransaction(), { now: getRandomTimeInPast() });
    payments.push(data.payment);
    orders.push(data.order);
    events.push(...data.events);
    if (data.webhooks) webhooks.push(...data.webhooks);
  }

  // Generate Late Auth
  for (let i = 0; i < counts.lateAuth; i++) {
    const data = generateLateAuth(generateBaseTransaction(), { now: getRandomTimeInPast() });
    payments.push(data.payment);
    orders.push(data.order);
    events.push(...data.events);
    if (data.webhooks) webhooks.push(...data.webhooks);
  }

  // Write to database in chunks for speed
  const chunkSize = 1000;
  
  const chunkWrite = async (model, docs) => {
    for (let i = 0; i < docs.length; i += chunkSize) {
      const chunk = docs.slice(i, i + chunkSize);
      await model.insertMany(chunk, { ordered: false }).catch(err => {
        // Suppress minor duplicate errors from synthetic ids overlap if any
        console.warn('Batch write partial success, some warnings: ', err.message);
      });
    }
  };

  await chunkWrite(Payment, payments);
  await chunkWrite(Order, orders);
  await chunkWrite(PaymentEvent, events);
  if (webhooks.length) {
    await chunkWrite(WebhookEvent, webhooks);
  }

  return {
    success: true,
    totalCount: payments.length,
    scenariosGenerated: counts,
    paymentsCreated: payments.length,
    ordersCreated: orders.length,
    eventsCreated: events.length,
    webhooksCreated: webhooks.length,
  };
};

module.exports = {
  generateNormal,
  generateWebhookFailure,
  generateDuplicate,
  generateOutOfOrder,
  generateRefundFailure,
  generateLateAuth,
  saveScenarioData,
  generateBatch,
};
