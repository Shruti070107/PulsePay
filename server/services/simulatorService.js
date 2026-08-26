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

// Helper to create fully populated event objects
const createEvent = (payment, type, status, source, timestamp, arrivalTime, metadata = {}, extra = {}) => {
  return {
    eventId: generateEventId(),
    paymentId: payment.paymentId,
    type,
    eventType: type,
    source,
    status,
    timestamp: timestamp,
    eventTimestamp: timestamp,
    receivedAt: arrivalTime || timestamp,
    merchantId: payment.merchantId,
    customerId: payment.customerId,
    orderId: payment.orderId,
    amount: payment.amount,
    currency: payment.currency,
    provider: extra.provider || 'gateway_mock',
    attempt: extra.attempt || 1,
    metadata
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

  const t0 = new Date(now.getTime());
  const t1 = new Date(now.getTime() + 1000);
  const t2 = new Date(now.getTime() + 2000);
  const tSent = new Date(now.getTime() + 2500);
  const tDelivered = new Date(now.getTime() + 3000);
  const tOrder = new Date(now.getTime() + 3200);

  const captureEventId = generateEventId();
  const webhookId = generateWebhookId();

  const events = [
    createEvent(payment, 'payment.created', 'created', 'api', t0),
    createEvent(payment, 'payment.authorized', 'authorized', 'gateway', t1, t1, { authCode: 'AUTH_OK' }),
    createEvent(payment, 'payment.captured', 'captured', 'gateway', t2, t2, { gatewayTransactionId: 'TXN_OK' }),
    createEvent(payment, 'webhook.sent', 'sent', 'webhook_engine', tSent),
    createEvent(payment, 'webhook.delivered', 'delivered', 'webhook_engine', tDelivered, tDelivered, { webhookId, responseCode: 200 }),
    createEvent(payment, 'order.paid', 'paid', 'merchant_system', tOrder)
  ];

  const webhooks = [{
    webhookId,
    paymentId,
    eventId: captureEventId,
    eventType: 'payment.captured',
    deliveryStatus: 'delivered',
    responseCode: 200,
    attemptNumber: 1,
    timestamp: tDelivered,
  }];

  return { payment, order, events, webhooks };
};

/**
 * Scenario 2: Webhook Failure (Retries exhaust with error)
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

  const t0 = new Date(now.getTime());
  const t1 = new Date(now.getTime() + 1000);
  const t2 = new Date(now.getTime() + 2000);
  const tWh1 = new Date(now.getTime() + 3000);
  const tWh2 = new Date(now.getTime() + 15000);
  const tWh3 = new Date(now.getTime() + 60000);

  const captureEventId = generateEventId();
  const webhookId = generateWebhookId();

  const events = [
    createEvent(payment, 'payment.created', 'created', 'api', t0),
    createEvent(payment, 'payment.authorized', 'authorized', 'gateway', t1, t1, { authCode: 'AUTH_OK' }),
    createEvent(payment, 'payment.captured', 'captured', 'gateway', t2, t2, { gatewayTransactionId: 'TXN_OK' }),
    createEvent(payment, 'webhook.failed', 'failed', 'webhook_engine', tWh1, tWh1, { webhookId, responseCode: 500, attemptNumber: 1 }),
    createEvent(payment, 'webhook.failed', 'failed', 'webhook_engine', tWh2, tWh2, { webhookId, responseCode: 502, attemptNumber: 2 }),
    createEvent(payment, 'webhook.failed', 'failed', 'webhook_engine', tWh3, tWh3, { webhookId, responseCode: 503, attemptNumber: 3 })
  ];

  const webhooks = [
    { webhookId, paymentId, eventId: captureEventId, eventType: 'payment.captured', deliveryStatus: 'failed', responseCode: 500, attemptNumber: 1, timestamp: tWh1 },
    { webhookId, paymentId, eventId: captureEventId, eventType: 'payment.captured', deliveryStatus: 'failed', responseCode: 502, attemptNumber: 2, timestamp: tWh2 },
    { webhookId, paymentId, eventId: captureEventId, eventType: 'payment.captured', deliveryStatus: 'failed', responseCode: 503, attemptNumber: 3, timestamp: tWh3 }
  ];

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

  // First payment
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

  const t0_1 = new Date(now.getTime());
  const t1_1 = new Date(now.getTime() + 1000);

  const events1 = [
    createEvent(payment1, 'payment.created', 'created', 'api', t0_1),
    createEvent(payment1, 'payment.processing', 'processing', 'gateway', t1_1, t1_1, { gatewayMessage: 'Processing at network' })
  ];

  // Second payment (Duplicate 10s later)
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

  const t0_2 = new Date(now.getTime() + 10000);
  const events2 = [
    createEvent(payment2, 'payment.created', 'created', 'api', t0_2)
  ];

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

  const tCreated = new Date(now.getTime());
  const tAuthorized = new Date(now.getTime() + 1000);
  const tCaptured = new Date(now.getTime() + 2000);

  // Ingestion occurs out-of-order
  const arrival1 = new Date(now.getTime() + 10000);
  const arrival2 = new Date(now.getTime() + 12000);
  const arrival3 = new Date(now.getTime() + 14000);

  const captureEventId = generateEventId();
  const webhookId = generateWebhookId();
  const tWh = new Date(now.getTime() + 15000);
  const tOrder = new Date(now.getTime() + 15500);

  const events = [
    createEvent(payment, 'payment.created', 'created', 'api', tCreated, arrival1),
    createEvent(payment, 'payment.captured', 'captured', 'gateway', tCaptured, arrival2, { gatewayTransactionId: 'TXN_OK', eventId: captureEventId }),
    createEvent(payment, 'payment.authorized', 'authorized', 'gateway', tAuthorized, arrival3, { authCode: 'AUTH_OK' }),
    createEvent(payment, 'webhook.delivered', 'delivered', 'webhook_engine', tWh, tWh, { webhookId }),
    createEvent(payment, 'order.paid', 'paid', 'merchant_system', tOrder)
  ];

  const webhooks = [{
    webhookId,
    paymentId,
    eventId: captureEventId,
    eventType: 'payment.captured',
    deliveryStatus: 'delivered',
    responseCode: 200,
    attemptNumber: 1,
    timestamp: tWh,
  }];

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

  const t0 = new Date(now.getTime());
  const t1 = new Date(now.getTime() + 1000);
  const t2 = new Date(now.getTime() + 2000);
  const tWh = new Date(now.getTime() + 3000);
  const tOrder = new Date(now.getTime() + 3200);
  const tRefund1 = new Date(now.getTime() + 10000);
  const tRefund2 = new Date(now.getTime() + 12000);

  const captureEventId = generateEventId();
  const webhookId = generateWebhookId();
  const refundId = generateRefundId();

  const events = [
    createEvent(payment, 'payment.created', 'created', 'api', t0),
    createEvent(payment, 'payment.authorized', 'authorized', 'gateway', t1, t1, { authCode: 'AUTH_OK' }),
    createEvent(payment, 'payment.captured', 'captured', 'gateway', t2, t2, { gatewayTransactionId: 'TXN_OK', eventId: captureEventId }),
    createEvent(payment, 'order.paid', 'paid', 'merchant_system', tOrder),
    createEvent(payment, 'refund.created', 'created', 'api', tRefund1, tRefund1, { refundId, amount: base.amount }),
    createEvent(payment, 'refund.failed', 'failed', 'gateway', tRefund2, tRefund2, { refundId, errorCode: 'INSUFFICIENT_MERCHANT_BALANCE', message: 'Refund declined by bank' })
  ];

  const webhooks = [{
    webhookId,
    paymentId,
    eventId: captureEventId,
    eventType: 'payment.captured',
    deliveryStatus: 'delivered',
    responseCode: 200,
    attemptNumber: 1,
    timestamp: tWh,
  }];

  return { payment, order, events, webhooks };
};

/**
 * Scenario 6: Late Authorization
 */
const generateLateAuth = (base = generateBaseTransaction(), options = {}) => {
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

  const t0 = new Date(now.getTime());
  const tFail = new Date(now.getTime() + 5000);
  const tAuth = new Date(now.getTime() + 30000);
  const tCap = new Date(now.getTime() + 32000);
  const tWh = new Date(now.getTime() + 33000);
  const tOrder = new Date(now.getTime() + 34000);

  const captureEventId = generateEventId();
  const webhookId = generateWebhookId();

  const events = [
    createEvent(payment, 'payment.created', 'created', 'api', t0),
    createEvent(payment, 'payment.failed', 'failed', 'gateway', tFail, tFail, { errorCode: 'NETWORK_TIMEOUT' }),
    createEvent(payment, 'payment.authorized', 'authorized', 'gateway', tAuth, tAuth, { authCode: 'LATE_AUTH_123' }),
    createEvent(payment, 'payment.captured', 'captured', 'gateway', tCap, tCap, { gatewayTransactionId: 'TXN_LATE_123', eventId: captureEventId }),
    createEvent(payment, 'order.paid', 'paid', 'merchant_system', tOrder)
  ];

  const webhooks = [{
    webhookId,
    paymentId,
    eventId: captureEventId,
    eventType: 'payment.captured',
    deliveryStatus: 'delivered',
    responseCode: 200,
    attemptNumber: 1,
    timestamp: tWh,
  }];

  return { payment, order, events, webhooks };
};

/**
 * Scenario 7: Webhook Outage (Complete network blockage)
 */
const generateWebhookOutage = (base = generateBaseTransaction(), options = {}) => {
  const data = generateWebhookFailure(base, options);
  // Enhance webhook failure to show continuous retry exhaustion
  const webhookId = data.webhooks[0]?.webhookId || generateWebhookId();
  const captureEventId = generateEventId();
  const now = options.now || new Date();
  
  const tWh4 = new Date(now.getTime() + 300000); // 5 min retry
  const tWh5 = new Date(now.getTime() + 600000); // 10 min retry

  data.events.push(
    createEvent(data.payment, 'webhook.failed', 'failed', 'webhook_engine', tWh4, tWh4, { webhookId, responseCode: 504, attemptNumber: 4 }),
    createEvent(data.payment, 'webhook.failed', 'failed', 'webhook_engine', tWh5, tWh5, { webhookId, responseCode: 504, attemptNumber: 5 })
  );

  data.webhooks.push(
    { webhookId, paymentId: data.payment.paymentId, eventId: captureEventId, eventType: 'payment.captured', deliveryStatus: 'failed', responseCode: 504, attemptNumber: 4, timestamp: tWh4 },
    { webhookId, paymentId: data.payment.paymentId, eventId: captureEventId, eventType: 'payment.captured', deliveryStatus: 'failed', responseCode: 504, attemptNumber: 5, timestamp: tWh5 }
  );

  return data;
};

/**
 * Scenario 8: Payment Gateway Timeout
 */
const generateGatewayTimeout = (base = generateBaseTransaction(), options = {}) => {
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
    status: 'processing', // Stays stuck in processing
  };

  const order = {
    orderId,
    paymentId,
    amount: base.amount,
    status: 'unpaid',
  };

  const t0 = new Date(now.getTime());
  const t1 = new Date(now.getTime() + 1500);

  const events = [
    createEvent(payment, 'payment.created', 'created', 'api', t0),
    createEvent(payment, 'payment.processing', 'processing', 'gateway', t1, t1, { gatewayMessage: 'Gateway connection timeout. No status resolution.' })
  ];

  return { payment, order, events, webhooks: [] };
};

/**
 * Scenario 9: Authorization Latency Spike
 */
const generateAuthLatencySpike = (base = generateBaseTransaction(), options = {}) => {
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

  const t0 = new Date(now.getTime());
  // Huge gap between create and authorize
  const t1 = new Date(now.getTime() + 45000); // 45 seconds delay!
  const t2 = new Date(now.getTime() + 46000);
  const tSent = new Date(now.getTime() + 46500);
  const tDelivered = new Date(now.getTime() + 47000);
  const tOrder = new Date(now.getTime() + 47200);

  const captureEventId = generateEventId();
  const webhookId = generateWebhookId();

  const events = [
    createEvent(payment, 'payment.created', 'created', 'api', t0),
    createEvent(payment, 'payment.authorized', 'authorized', 'gateway', t1, t1, { authCode: 'AUTH_SLOW' }),
    createEvent(payment, 'payment.captured', 'captured', 'gateway', t2, t2, { gatewayTransactionId: 'TXN_SLOW' }),
    createEvent(payment, 'webhook.sent', 'sent', 'webhook_engine', tSent),
    createEvent(payment, 'webhook.delivered', 'delivered', 'webhook_engine', tDelivered, tDelivered, { webhookId, responseCode: 200 }),
    createEvent(payment, 'order.paid', 'paid', 'merchant_system', tOrder)
  ];

  const webhooks = [{
    webhookId,
    paymentId,
    eventId: captureEventId,
    eventType: 'payment.captured',
    deliveryStatus: 'delivered',
    responseCode: 200,
    attemptNumber: 1,
    timestamp: tDelivered,
  }];

  return { payment, order, events, webhooks };
};

/**
 * Scenario 10: Duplicate Webhook (Multiple delivered events)
 */
const generateDuplicateWebhook = (base = generateBaseTransaction(), options = {}) => {
  const data = generateNormal(base, options);
  const now = options.now || new Date();
  
  // Send duplicate webhook event 10s later
  const tDupDelivered = new Date(now.getTime() + 13000);
  const webhookIdDup = generateWebhookId();
  const captureEventId = data.events.find(e => e.type === 'payment.captured')?.eventId || generateEventId();

  data.events.push(
    createEvent(data.payment, 'webhook.delivered', 'delivered', 'webhook_engine', tDupDelivered, tDupDelivered, { webhookId: webhookIdDup, responseCode: 200, isDuplicate: true })
  );

  data.webhooks.push({
    webhookId: webhookIdDup,
    paymentId: data.payment.paymentId,
    eventId: captureEventId,
    eventType: 'payment.captured',
    deliveryStatus: 'delivered',
    responseCode: 200,
    attemptNumber: 2,
    timestamp: tDupDelivered,
  });

  return data;
};

/**
 * Scenario 11: Merchant Endpoint 5xx Spike
 */
const generateMerchant5xxSpike = (base = generateBaseTransaction(), options = {}) => {
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

  const t0 = new Date(now.getTime());
  const t1 = new Date(now.getTime() + 1000);
  const t2 = new Date(now.getTime() + 2000);
  const tWh1 = new Date(now.getTime() + 3000);
  const tWh2 = new Date(now.getTime() + 8000);

  const captureEventId = generateEventId();
  const webhookId = generateWebhookId();

  const events = [
    createEvent(payment, 'payment.created', 'created', 'api', t0),
    createEvent(payment, 'payment.authorized', 'authorized', 'gateway', t1, t1, { authCode: 'AUTH_OK' }),
    createEvent(payment, 'payment.captured', 'captured', 'gateway', t2, t2, { gatewayTransactionId: 'TXN_OK' }),
    createEvent(payment, 'webhook.failed', 'failed', 'webhook_engine', tWh1, tWh1, { webhookId, responseCode: 500, attemptNumber: 1 }),
    createEvent(payment, 'webhook.failed', 'failed', 'webhook_engine', tWh2, tWh2, { webhookId, responseCode: 500, attemptNumber: 2 })
  ];

  const webhooks = [
    { webhookId, paymentId, eventId: captureEventId, eventType: 'payment.captured', deliveryStatus: 'failed', responseCode: 500, attemptNumber: 1, timestamp: tWh1 },
    { webhookId, paymentId, eventId: captureEventId, eventType: 'payment.captured', deliveryStatus: 'failed', responseCode: 500, attemptNumber: 2, timestamp: tWh2 }
  ];

  return { payment, order, events, webhooks };
};

/**
 * Scenario 12: Merchant Endpoint Timeout (HTTP 504)
 */
const generateMerchantTimeout = (base = generateBaseTransaction(), options = {}) => {
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

  const t0 = new Date(now.getTime());
  const t1 = new Date(now.getTime() + 1000);
  const t2 = new Date(now.getTime() + 2000);
  const tWh = new Date(now.getTime() + 15000); // Fails after long connection timeout

  const captureEventId = generateEventId();
  const webhookId = generateWebhookId();

  const events = [
    createEvent(payment, 'payment.created', 'created', 'api', t0),
    createEvent(payment, 'payment.authorized', 'authorized', 'gateway', t1, t1, { authCode: 'AUTH_OK' }),
    createEvent(payment, 'payment.captured', 'captured', 'gateway', t2, t2, { gatewayTransactionId: 'TXN_OK' }),
    createEvent(payment, 'webhook.failed', 'failed', 'webhook_engine', tWh, tWh, { webhookId, responseCode: 504, attemptNumber: 1 })
  ];

  const webhooks = [
    { webhookId, paymentId, eventId: captureEventId, eventType: 'payment.captured', deliveryStatus: 'failed', responseCode: 504, attemptNumber: 1, timestamp: tWh }
  ];

  return { payment, order, events, webhooks };
};

/**
 * Scenario 13: Provider Degradation (Stripe decline burst & slowness)
 */
const generateProviderDegradation = (base = generateBaseTransaction(), options = {}) => {
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
    status: 'failed',
  };

  const order = {
    orderId,
    paymentId,
    amount: base.amount,
    status: 'unpaid',
  };

  const t0 = new Date(now.getTime());
  const t1 = new Date(now.getTime() + 14000); // 14s slowness!

  const events = [
    createEvent(payment, 'payment.created', 'created', 'api', t0),
    createEvent(payment, 'payment.failed', 'failed', 'gateway', t1, t1, { errorCode: 'PROVIDER_TIMEOUT', details: 'Stripe degradation slow responses' }, { provider: 'stripe' })
  ];

  return { payment, order, events, webhooks: [] };
};

/**
 * Scenario 14: High Decline-Rate Burst
 */
const generateHighDeclineRate = (base = generateBaseTransaction(), options = {}) => {
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
    status: 'failed',
  };

  const order = {
    orderId,
    paymentId,
    amount: base.amount,
    status: 'unpaid',
  };

  const t0 = new Date(now.getTime());
  const t1 = new Date(now.getTime() + 800);

  const events = [
    createEvent(payment, 'payment.created', 'created', 'api', t0),
    createEvent(payment, 'payment.failed', 'failed', 'gateway', t1, t1, { errorCode: 'CARD_DECLINED', message: 'Insufficient funds on customer account' })
  ];

  return { payment, order, events, webhooks: [] };
};

/**
 * Scenario 15: Partial Capture Anomaly
 */
const generatePartialCapture = (base = generateBaseTransaction(), options = {}) => {
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
    status: 'partially_refunded',
  };

  // Order is for full amount, but payment captured less
  const order = {
    orderId,
    paymentId,
    amount: base.amount,
    status: 'unpaid',
  };

  const t0 = new Date(now.getTime());
  const t1 = new Date(now.getTime() + 1000);
  const t2 = new Date(now.getTime() + 2000);
  const tWh = new Date(now.getTime() + 3000);

  const captureEventId = generateEventId();
  const webhookId = generateWebhookId();

  const events = [
    createEvent(payment, 'payment.created', 'created', 'api', t0),
    createEvent(payment, 'payment.authorized', 'authorized', 'gateway', t1, t1, { authCode: 'AUTH_OK' }),
    // Capture amount is less than auth amount
    createEvent(payment, 'payment.captured', 'captured', 'gateway', t2, t2, { gatewayTransactionId: 'TXN_OK', capturedAmount: base.amount - 100 })
  ];

  const webhooks = [{
    webhookId,
    paymentId,
    eventId: captureEventId,
    eventType: 'payment.captured',
    deliveryStatus: 'delivered',
    responseCode: 200,
    attemptNumber: 1,
    timestamp: tWh,
  }];

  return { payment, order, events, webhooks };
};

/**
 * Scenario 16: Amount Mismatch (Captured ₹1000, Order ₹900)
 */
const generateAmountMismatch = (base = generateBaseTransaction(), options = {}) => {
  const paymentId = generatePaymentId();
  const orderId = generateOrderId();
  const now = options.now || new Date();

  const payment = {
    paymentId,
    orderId,
    amount: base.amount, // e.g. 1000
    currency: base.currency,
    customerId: base.customerId,
    merchantId: base.merchantId,
    paymentMethod: base.paymentMethod,
    status: 'captured',
  };

  const order = {
    orderId,
    paymentId,
    amount: base.amount - 100, // mismatch
    status: 'paid',
  };

  const t0 = new Date(now.getTime());
  const t1 = new Date(now.getTime() + 1000);
  const t2 = new Date(now.getTime() + 2000);
  const tWh = new Date(now.getTime() + 3000);

  const captureEventId = generateEventId();
  const webhookId = generateWebhookId();

  const events = [
    createEvent(payment, 'payment.created', 'created', 'api', t0),
    createEvent(payment, 'payment.authorized', 'authorized', 'gateway', t1, t1, { authCode: 'AUTH_OK' }),
    createEvent(payment, 'payment.captured', 'captured', 'gateway', t2, t2, { gatewayTransactionId: 'TXN_OK' })
  ];

  const webhooks = [{
    webhookId,
    paymentId,
    eventId: captureEventId,
    eventType: 'payment.captured',
    deliveryStatus: 'delivered',
    responseCode: 200,
    attemptNumber: 1,
    timestamp: tWh,
  }];

  return { payment, order, events, webhooks };
};

/**
 * Scenario 17: Order/Payment State Mismatch
 */
const generateOrderStateMismatch = (base = generateBaseTransaction(), options = {}) => {
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

  // Payment is captured, but order remains unpaid
  const order = {
    orderId,
    paymentId,
    amount: base.amount,
    status: 'unpaid',
  };

  const t0 = new Date(now.getTime());
  const t1 = new Date(now.getTime() + 1000);
  const t2 = new Date(now.getTime() + 2000);

  const events = [
    createEvent(payment, 'payment.created', 'created', 'api', t0),
    createEvent(payment, 'payment.authorized', 'authorized', 'gateway', t1, t1, { authCode: 'AUTH_OK' }),
    createEvent(payment, 'payment.captured', 'captured', 'gateway', t2, t2, { gatewayTransactionId: 'TXN_OK' })
  ];

  return { payment, order, events, webhooks: [] };
};

/**
 * Scenario 18: Retry Storm (Rapid firing of retries)
 */
const generateRetryStorm = (base = generateBaseTransaction(), options = {}) => {
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

  const t0 = new Date(now.getTime());
  const t1 = new Date(now.getTime() + 1000);
  const t2 = new Date(now.getTime() + 2000);

  // Retries fired rapidly (1s intervals instead of standard backoff)
  const tWh1 = new Date(now.getTime() + 2100);
  const tWh2 = new Date(now.getTime() + 3100);
  const tWh3 = new Date(now.getTime() + 4100);
  const tWh4 = new Date(now.getTime() + 5100);

  const captureEventId = generateEventId();
  const webhookId = generateWebhookId();

  const events = [
    createEvent(payment, 'payment.created', 'created', 'api', t0),
    createEvent(payment, 'payment.authorized', 'authorized', 'gateway', t1, t1, { authCode: 'AUTH_OK' }),
    createEvent(payment, 'payment.captured', 'captured', 'gateway', t2, t2, { gatewayTransactionId: 'TXN_OK' }),
    createEvent(payment, 'webhook.failed', 'failed', 'webhook_engine', tWh1, tWh1, { webhookId, responseCode: 503, attemptNumber: 1 }),
    createEvent(payment, 'webhook.failed', 'failed', 'webhook_engine', tWh2, tWh2, { webhookId, responseCode: 503, attemptNumber: 2 }),
    createEvent(payment, 'webhook.failed', 'failed', 'webhook_engine', tWh3, tWh3, { webhookId, responseCode: 503, attemptNumber: 3 }),
    createEvent(payment, 'webhook.failed', 'failed', 'webhook_engine', tWh4, tWh4, { webhookId, responseCode: 503, attemptNumber: 4 })
  ];

  const webhooks = [
    { webhookId, paymentId, eventId: captureEventId, eventType: 'payment.captured', deliveryStatus: 'failed', responseCode: 503, attemptNumber: 1, timestamp: tWh1 },
    { webhookId, paymentId, eventId: captureEventId, eventType: 'payment.captured', deliveryStatus: 'failed', responseCode: 503, attemptNumber: 2, timestamp: tWh2 },
    { webhookId, paymentId, eventId: captureEventId, eventType: 'payment.captured', deliveryStatus: 'failed', responseCode: 503, attemptNumber: 3, timestamp: tWh3 },
    { webhookId, paymentId, eventId: captureEventId, eventType: 'payment.captured', deliveryStatus: 'failed', responseCode: 503, attemptNumber: 4, timestamp: tWh4 }
  ];

  return { payment, order, events, webhooks };
};

/**
 * Scenario 19: Sudden Merchant Traffic Spike
 */
const generateMerchantTrafficSpike = (base = generateBaseTransaction(), options = {}) => {
  const data = generateNormal(base, options);
  // Add a marker in metadata indicating burst context
  data.events.forEach(e => {
    e.metadata = { ...e.metadata, trafficContext: 'BURST_TRAFFIC_SPIKE' };
  });
  return data;
};

/**
 * Scenario 20: Currency Anomaly (Payment in USD instead of standard INR)
 */
const generateCurrencyAnomaly = (base = generateBaseTransaction(), options = {}) => {
  const paymentId = generatePaymentId();
  const orderId = generateOrderId();
  const now = options.now || new Date();

  // Currency set to USD, amount is small value (e.g. 10 USD)
  const payment = {
    paymentId,
    orderId,
    amount: 10,
    currency: 'USD',
    customerId: base.customerId,
    merchantId: base.merchantId,
    paymentMethod: base.paymentMethod,
    status: 'captured',
  };

  const order = {
    orderId,
    paymentId,
    amount: 10,
    status: 'paid',
  };

  const t0 = new Date(now.getTime());
  const t1 = new Date(now.getTime() + 1000);
  const t2 = new Date(now.getTime() + 2000);
  const tWh = new Date(now.getTime() + 3000);

  const captureEventId = generateEventId();
  const webhookId = generateWebhookId();

  const events = [
    createEvent(payment, 'payment.created', 'created', 'api', t0),
    createEvent(payment, 'payment.authorized', 'authorized', 'gateway', t1, t1, { authCode: 'AUTH_OK' }),
    createEvent(payment, 'payment.captured', 'captured', 'gateway', t2, t2, { gatewayTransactionId: 'TXN_OK' })
  ];

  const webhooks = [{
    webhookId,
    paymentId,
    eventId: captureEventId,
    eventType: 'payment.captured',
    deliveryStatus: 'delivered',
    responseCode: 200,
    attemptNumber: 1,
    timestamp: tWh,
  }];

  return { payment, order, events, webhooks };
};

/**
 * Scenario 21: Repeated Customer Payment Attempt (UPI failures -> success)
 */
const generateRepeatedCustomerAttempts = (base = generateBaseTransaction(), options = {}) => {
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
    paymentMethod: 'upi',
    status: 'captured',
  };

  const order = {
    orderId,
    paymentId,
    amount: base.amount,
    status: 'paid',
  };

  const events = [];
  const captureEventId = generateEventId();
  const webhookId = generateWebhookId();

  // 3 sequential payment failures on the same customer card/UPI
  for (let i = 0; i < 3; i++) {
    const tFail = new Date(now.getTime() + i * 5000);
    events.push(
      createEvent(payment, 'payment.created', 'created', 'api', tFail),
      createEvent(payment, 'payment.failed', 'failed', 'gateway', new Date(tFail.getTime() + 1000), new Date(tFail.getTime() + 1000), { errorCode: 'USER_ABORTED', message: 'UPI transaction aborted by user' })
    );
  }

  // 4th attempt succeeds
  const tSuccess = new Date(now.getTime() + 20000);
  const tAuth = new Date(now.getTime() + 21000);
  const tCap = new Date(now.getTime() + 22000);
  const tWh = new Date(now.getTime() + 23000);
  const tOrder = new Date(now.getTime() + 23200);

  events.push(
    createEvent(payment, 'payment.created', 'created', 'api', tSuccess),
    createEvent(payment, 'payment.authorized', 'authorized', 'gateway', tAuth, tAuth, { authCode: 'AUTH_UPI_OK' }),
    createEvent(payment, 'payment.captured', 'captured', 'gateway', tCap, tCap, { gatewayTransactionId: 'TXN_UPI_OK', eventId: captureEventId }),
    createEvent(payment, 'order.paid', 'paid', 'merchant_system', tOrder)
  );

  const webhooks = [{
    webhookId,
    paymentId,
    eventId: captureEventId,
    eventType: 'payment.captured',
    deliveryStatus: 'delivered',
    responseCode: 200,
    attemptNumber: 1,
    timestamp: tWh,
  }];

  return { payment, order, events, webhooks };
};

/**
 * Scenario 22: Multi-Signal Compound Incident (Spike + timeout + duplicate)
 */
const generateMultiSignalCompound = (base = generateBaseTransaction(), options = {}) => {
  // Generates duplicate risk and a merchant timeout together
  const now = options.now || new Date();
  const dupData = generateDuplicate(base, options);
  const timeoutData = generateMerchantTimeout(base, { now: new Date(now.getTime() + 20000) });

  return {
    payments: [...dupData.payments, timeoutData.payment],
    orders: [...dupData.orders, timeoutData.order],
    events: [...dupData.events, ...timeoutData.events],
    webhooks: [...dupData.webhooks, ...timeoutData.webhooks]
  };
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
  generateWebhookOutage,
  generateGatewayTimeout,
  generateAuthLatencySpike,
  generateDuplicateWebhook,
  generateMerchant5xxSpike,
  generateMerchantTimeout,
  generateProviderDegradation,
  generateHighDeclineRate,
  generatePartialCapture,
  generateAmountMismatch,
  generateOrderStateMismatch,
  generateRetryStorm,
  generateMerchantTrafficSpike,
  generateCurrencyAnomaly,
  generateRepeatedCustomerAttempts,
  generateMultiSignalCompound,
  saveScenarioData,
  generateBatch,
};
