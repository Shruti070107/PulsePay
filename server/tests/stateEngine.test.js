const assert = require('assert');
const { PaymentStates, OrderStates, WebhookStates } = require('../services/stateEngine/stateConstants');
const { reconstructPaymentState } = require('../services/stateEngine/paymentState');
const { reconstructOrderState } = require('../services/stateEngine/orderState');
const { reconstructWebhookState } = require('../services/stateEngine/webhookState');

// Color helpers for terminal logging
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const red = (text) => `\x1b[31m${text}\x1b[0m`;

const runTests = () => {
  console.log('Running PulsePay State Reconstruction Engine Tests...\n');
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

  // Test 1: Normal payment
  test('Normal Payment Flow', () => {
    const payment = { paymentId: 'pay_01', status: 'captured' };
    const order = { orderId: 'order_01', status: 'paid' };
    
    const t0 = new Date('2026-08-22T10:00:00Z');
    const t1 = new Date('2026-08-22T10:00:01Z');
    const t2 = new Date('2026-08-22T10:00:02Z');

    const events = [
      { eventId: 'e1', paymentId: 'pay_01', type: 'payment.created', status: 'created', eventTimestamp: t0, receivedAt: t0 },
      { eventId: 'e2', paymentId: 'pay_01', type: 'payment.authorized', status: 'authorized', eventTimestamp: t1, receivedAt: t1 },
      { eventId: 'e3', paymentId: 'pay_01', type: 'payment.captured', status: 'captured', eventTimestamp: t2, receivedAt: t2 }
    ];

    const webhooks = [
      { webhookId: 'wh_01', paymentId: 'pay_01', deliveryStatus: 'delivered', attemptNumber: 1, timestamp: t2 }
    ];

    const payResult = reconstructPaymentState(payment, events);
    const orderResult = reconstructOrderState(order, events);
    const whResult = reconstructWebhookState(webhooks);

    assert.strictEqual(payResult.paymentState, PaymentStates.CAPTURED);
    assert.strictEqual(payResult.outOfOrderDetected, false);
    assert.strictEqual(payResult.duplicateEventsDetected, false);
    assert.strictEqual(payResult.invalidTransitionDetected, false);
    assert.strictEqual(payResult.lateAuthorizationDetected, false);

    assert.strictEqual(orderResult.orderState, OrderStates.PAID);
    assert.strictEqual(whResult.webhookState, WebhookStates.DELIVERED);
    assert.strictEqual(whResult.webhookRetryCount, 1);
  });

  // Test 2: Webhook failure
  test('Webhook Delivery Failure', () => {
    const payment = { paymentId: 'pay_02', status: 'captured' };
    const order = { orderId: 'order_02', status: 'unpaid' };
    
    const t0 = new Date('2026-08-22T10:00:00Z');

    const events = [
      { eventId: 'e1', paymentId: 'pay_02', type: 'payment.created', status: 'created', eventTimestamp: t0, receivedAt: t0 },
      { eventId: 'e2', paymentId: 'pay_02', type: 'payment.captured', status: 'captured', eventTimestamp: t0, receivedAt: t0 }
    ];

    const webhooks = [
      { webhookId: 'wh_02', paymentId: 'pay_02', deliveryStatus: 'failed', attemptNumber: 1, responseCode: 500, timestamp: t0 },
      { webhookId: 'wh_02', paymentId: 'pay_02', deliveryStatus: 'failed', attemptNumber: 2, responseCode: 502, timestamp: t0 },
      { webhookId: 'wh_02', paymentId: 'pay_02', deliveryStatus: 'failed', attemptNumber: 3, responseCode: 503, timestamp: t0 }
    ];

    const whResult = reconstructWebhookState(webhooks);
    const orderResult = reconstructOrderState(order, events);

    assert.strictEqual(whResult.webhookState, WebhookStates.FAILED);
    assert.strictEqual(whResult.webhookRetryCount, 3);
    assert.strictEqual(orderResult.orderState, OrderStates.UNPAID);
  });

  // Test 3: Duplicate event
  test('Duplicate Event Detection', () => {
    const payment = { paymentId: 'pay_03' };
    const t0 = new Date();

    const events = [
      { eventId: 'e1', paymentId: 'pay_03', type: 'payment.created', status: 'created', eventTimestamp: t0, receivedAt: t0 },
      { eventId: 'e2', paymentId: 'pay_03', type: 'payment.captured', status: 'captured', eventTimestamp: t0, receivedAt: t0 },
      { eventId: 'e3', paymentId: 'pay_03', type: 'payment.captured', status: 'captured', eventTimestamp: t0, receivedAt: t0 } // Duplicate
    ];

    const payResult = reconstructPaymentState(payment, events);

    assert.strictEqual(payResult.paymentState, PaymentStates.CAPTURED);
    assert.strictEqual(payResult.duplicateEventsDetected, true);
  });

  // Test 4: Out-of-order events
  test('Out of Order Ingestion Detection', () => {
    const payment = { paymentId: 'pay_04' };
    
    const tCreated = new Date('2026-08-22T10:00:00Z');
    const tAuthorized = new Date('2026-08-22T10:00:01Z');
    const tCaptured = new Date('2026-08-22T10:00:02Z');

    const arrival1 = new Date('2026-08-22T10:00:10Z');
    const arrival2 = new Date('2026-08-22T10:00:12Z');
    const arrival3 = new Date('2026-08-22T10:00:14Z');

    const events = [
      { eventId: 'e1', paymentId: 'pay_04', type: 'payment.created', eventTimestamp: tCreated, receivedAt: arrival1 },
      { eventId: 'e3', paymentId: 'pay_04', type: 'payment.captured', eventTimestamp: tCaptured, receivedAt: arrival2 },
      { eventId: 'e2', paymentId: 'pay_04', type: 'payment.authorized', eventTimestamp: tAuthorized, receivedAt: arrival3 }
    ];

    const payResult = reconstructPaymentState(payment, events);

    assert.strictEqual(payResult.paymentState, PaymentStates.CAPTURED);
    assert.strictEqual(payResult.outOfOrderDetected, true);
  });

  // Test 5: Late authorization
  test('Late Authorization Flow', () => {
    const payment = { paymentId: 'pay_05' };
    
    const t0 = new Date('2026-08-22T10:00:00Z');
    const t1 = new Date('2026-08-22T10:00:05Z');
    const t2 = new Date('2026-08-22T10:00:30Z');
    const t3 = new Date('2026-08-22T10:00:32Z');

    const events = [
      { eventId: 'e1', paymentId: 'pay_05', type: 'payment.created', eventTimestamp: t0, receivedAt: t0 },
      { eventId: 'e2', paymentId: 'pay_05', type: 'payment.failed', eventTimestamp: t1, receivedAt: t1 },
      { eventId: 'e3', paymentId: 'pay_05', type: 'payment.authorized', eventTimestamp: t2, receivedAt: t2 },
      { eventId: 'e4', paymentId: 'pay_05', type: 'payment.captured', eventTimestamp: t3, receivedAt: t3 }
    ];

    const payResult = reconstructPaymentState(payment, events);

    assert.strictEqual(payResult.paymentState, PaymentStates.CAPTURED);
    assert.strictEqual(payResult.lateAuthorizationDetected, true);
    assert.deepStrictEqual(payResult.previousPaymentStates, [PaymentStates.CREATED, PaymentStates.FAILED, PaymentStates.AUTHORIZED]);
  });

  // Test 6: Invalid transition
  test('Invalid State Transition Detection', () => {
    const payment = { paymentId: 'pay_06' };
    const t0 = new Date();

    const events = [
      { eventId: 'e1', paymentId: 'pay_06', type: 'payment.created', eventTimestamp: t0, receivedAt: t0 },
      { eventId: 'e2', paymentId: 'pay_06', type: 'payment.captured', eventTimestamp: t0, receivedAt: t0 },
      { eventId: 'e3', paymentId: 'pay_06', type: 'payment.processing', eventTimestamp: t0, receivedAt: t0 } // Invalid: CAPTURED -> PROCESSING
    ];

    const payResult = reconstructPaymentState(payment, events);

    assert.strictEqual(payResult.invalidTransitionDetected, true);
  });

  // Test 7: Refund failure
  test('Refund Failure Timeline', () => {
    const payment = { paymentId: 'pay_07' };
    const t0 = new Date('2026-08-22T10:00:00Z');
    const t1 = new Date('2026-08-22T10:00:02Z');
    const t2 = new Date('2026-08-22T10:00:10Z');
    const t3 = new Date('2026-08-22T10:00:12Z');

    const events = [
      { eventId: 'e1', paymentId: 'pay_07', type: 'payment.created', eventTimestamp: t0, receivedAt: t0 },
      { eventId: 'e2', paymentId: 'pay_07', type: 'payment.captured', eventTimestamp: t1, receivedAt: t1 },
      { eventId: 'e3', paymentId: 'pay_07', type: 'refund.created', eventTimestamp: t2, receivedAt: t2, metadata: { amount: 499 } },
      { eventId: 'e4', paymentId: 'pay_07', type: 'refund.failed', eventTimestamp: t3, receivedAt: t3, metadata: { message: 'Card expired' } }
    ];

    const payResult = reconstructPaymentState(payment, events);

    assert.strictEqual(payResult.paymentState, PaymentStates.CAPTURED);
    assert.strictEqual(payResult.refundAnomalyDetected, true);
    assert.ok(payResult.evidence.some(e => e.includes('Refund attempt failed')));
  });

  // Summary
  console.log(`\nTests finished: ${green(`${passedCount} passed`)}, ${failedCount > 0 ? red(`${failedCount} failed`) : '0 failed'}`);
  if (failedCount > 0) {
    process.exit(1);
  }
};

runTests();
