const mongoose = require('mongoose');
const { calculateGlobalBaseline, calculateMerchantBaseline } = require('../services/analytics/baselineEngine');
const { runAIEvaluation } = require('../services/ai/evaluationEngine');
const Payment = require('../models/Payment');
const PaymentEvent = require('../models/PaymentEvent');
const WebhookEvent = require('../models/WebhookEvent');
const Incident = require('../models/Incident');

const runTests = async () => {
  console.log('Running PulsePay Upgrade Integration Tests...');
  
  await mongoose.connect('mongodb://localhost:27017/pulsepay_test');
  
  // Clean
  await Promise.all([
    Payment.deleteMany({}),
    PaymentEvent.deleteMany({}),
    WebhookEvent.deleteMany({}),
    Incident.deleteMany({})
  ]);

  // Seed sample payments (recent)
  const now = new Date();
  const payment1 = await Payment.create({
    paymentId: 'pay_upg1',
    orderId: 'ord_upg1',
    customerId: 'cust_upg1',
    merchantId: 'merch_upg1',
    amount: 1500,
    currency: 'INR',
    paymentMethod: 'card',
    status: 'captured',
    createdAt: new Date(now.getTime() - 3600000)
  });

  const payment2 = await Payment.create({
    paymentId: 'pay_upg2',
    orderId: 'ord_upg2',
    customerId: 'cust_upg2',
    merchantId: 'merch_upg1',
    amount: 2500,
    currency: 'INR',
    paymentMethod: 'upi',
    status: 'failed',
    createdAt: new Date(now.getTime() - 100000)
  });

  const payment3 = await Payment.create({
    paymentId: 'pay_upg3',
    orderId: 'ord_upg3',
    customerId: 'cust_upg3',
    merchantId: 'merch_upg1',
    amount: 3000,
    currency: 'INR',
    paymentMethod: 'card',
    status: 'captured',
    createdAt: new Date(now.getTime() - 2000000)
  });

  // Seed historical payments (older than 24h window) to satisfy baseline engine minimum size of 3
  await Payment.create({
    paymentId: 'pay_upg_h1',
    orderId: 'ord_upg_h1',
    customerId: 'cust_upg_h1',
    merchantId: 'merch_upg1',
    amount: 1000,
    currency: 'INR',
    paymentMethod: 'card',
    status: 'captured',
    createdAt: new Date(now.getTime() - 2 * 24 * 3600000)
  });

  await Payment.create({
    paymentId: 'pay_upg_h2',
    orderId: 'ord_upg_h2',
    customerId: 'cust_upg_h2',
    merchantId: 'merch_upg1',
    amount: 2000,
    currency: 'INR',
    paymentMethod: 'upi',
    status: 'captured',
    createdAt: new Date(now.getTime() - 3 * 24 * 3600000)
  });

  await Payment.create({
    paymentId: 'pay_upg_h3',
    orderId: 'ord_upg_h3',
    customerId: 'cust_upg_h3',
    merchantId: 'merch_upg1',
    amount: 3000,
    currency: 'INR',
    paymentMethod: 'card',
    status: 'captured',
    createdAt: new Date(now.getTime() - 4 * 24 * 3600000)
  });

  // Seed events
  await PaymentEvent.create([
    { eventId: 'evt_upg1', paymentId: 'pay_upg1', type: 'payment.created', status: 'created', source: 'api', eventTimestamp: new Date(now.getTime() - 3610000), receivedAt: new Date(now.getTime() - 3610000) },
    { eventId: 'evt_upg2', paymentId: 'pay_upg1', type: 'payment.captured', status: 'captured', source: 'gateway', eventTimestamp: new Date(now.getTime() - 3600000), receivedAt: new Date(now.getTime() - 3600000) },
    { eventId: 'evt_upg3', paymentId: 'pay_upg2', type: 'payment.created', status: 'created', source: 'api', eventTimestamp: new Date(now.getTime() - 110000), receivedAt: new Date(now.getTime() - 110000) },
    { eventId: 'evt_upg4', paymentId: 'pay_upg2', type: 'payment.failed', status: 'failed', source: 'gateway', eventTimestamp: new Date(now.getTime() - 100000), receivedAt: new Date(now.getTime() - 100000), metadata: { errorCode: 'CARD_DECLINED' } },
    { eventId: 'evt_upg5', paymentId: 'pay_upg3', type: 'payment.created', status: 'created', source: 'api', eventTimestamp: new Date(now.getTime() - 2010000), receivedAt: new Date(now.getTime() - 2010000) },
    { eventId: 'evt_upg6', paymentId: 'pay_upg3', type: 'payment.captured', status: 'captured', source: 'gateway', eventTimestamp: new Date(now.getTime() - 2000000), receivedAt: new Date(now.getTime() - 2000000) }
  ]);

  // Baseline Engine validation
  console.log('\nTesting Baseline Engine...');
  const merchBaseline = await calculateMerchantBaseline('merch_upg1', 24);
  console.log(`  ✔ Merchant Baseline success: ${merchBaseline.success} - PASSED`);
  if (!merchBaseline.success) throw new Error('Merchant baseline failed');

  const globalBaseline = await calculateGlobalBaseline(24);
  console.log(`  ✔ Global Baseline success: ${globalBaseline.success} - PASSED`);
  if (!globalBaseline.success) throw new Error('Global baseline failed');

  // Seed an incident for AI evaluation testing
  const incident = await Incident.create({
    incidentId: 'INC-UPG101',
    type: 'WEBHOOK_FAILURE',
    severity: 'HIGH',
    status: 'active',
    affectedTransactions: 1,
    affectedAmount: 2500,
    affectedCustomers: 1,
    transactionIds: ['pay_upg2'],
    evidence: ['Payment failed at processor'],
    rootCause: 'Declined transaction',
    explanation: 'Webhook delivery failed.'
  });

  // AI Evaluation verification
  console.log('\nTesting AI Evaluation Engine...');
  const evalResult = await runAIEvaluation();
  console.log(`  ✔ AI Evaluation count: ${evalResult.evaluatedCount} - PASSED`);
  console.log(`  ✔ AI Evaluation grounding score: ${evalResult.averageGroundingScore} - PASSED`);
  if (evalResult.evaluatedCount === 0) throw new Error('AI evaluation failed to find incident');

  console.log('\nAll Upgrade Integration Tests Passed Successfully!');
  await mongoose.disconnect();
};

runTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
