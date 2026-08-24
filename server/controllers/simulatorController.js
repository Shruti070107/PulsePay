const simulatorService = require('../services/simulatorService');

const simulateNormal = async (req, res, next) => {
  try {
    const data = simulatorService.generateNormal();
    const result = await simulatorService.saveScenarioData(data);
    
    return res.status(201).json({
      success: true,
      scenario: 'normal',
      paymentId: result.paymentId,
      orderId: result.orderId,
      eventsCreated: result.eventsCreated,
      webhooksCreated: result.webhooksCreated,
    });
  } catch (error) {
    next(error);
  }
};

const simulateWebhookFailure = async (req, res, next) => {
  try {
    const data = simulatorService.generateWebhookFailure();
    const result = await simulatorService.saveScenarioData(data);
    
    return res.status(201).json({
      success: true,
      scenario: 'webhook_failure',
      paymentId: result.paymentId,
      orderId: result.orderId,
      eventsCreated: result.eventsCreated,
      webhooksCreated: result.webhooksCreated,
    });
  } catch (error) {
    next(error);
  }
};

const simulateDuplicate = async (req, res, next) => {
  try {
    const data = simulatorService.generateDuplicate();
    const result = await simulatorService.saveScenarioData(data);
    
    return res.status(201).json({
      success: true,
      scenario: 'duplicate_payment',
      paymentId: result.paymentId,
      orderId: result.orderId,
      eventsCreated: result.eventsCreated,
      webhooksCreated: result.webhooksCreated,
    });
  } catch (error) {
    next(error);
  }
};

const simulateOutOfOrder = async (req, res, next) => {
  try {
    const data = simulatorService.generateOutOfOrder();
    const result = await simulatorService.saveScenarioData(data);
    
    return res.status(201).json({
      success: true,
      scenario: 'out_of_order',
      paymentId: result.paymentId,
      orderId: result.orderId,
      eventsCreated: result.eventsCreated,
      webhooksCreated: result.webhooksCreated,
    });
  } catch (error) {
    next(error);
  }
};

const simulateRefundFailure = async (req, res, next) => {
  try {
    const data = simulatorService.generateRefundFailure();
    const result = await simulatorService.saveScenarioData(data);
    
    return res.status(201).json({
      success: true,
      scenario: 'refund_failure',
      paymentId: result.paymentId,
      orderId: result.orderId,
      eventsCreated: result.eventsCreated,
      webhooksCreated: result.webhooksCreated,
    });
  } catch (error) {
    next(error);
  }
};

const simulateLateAuth = async (req, res, next) => {
  try {
    const data = simulatorService.generateLateAuth();
    const result = await simulatorService.saveScenarioData(data);
    
    return res.status(201).json({
      success: true,
      scenario: 'late_authorization',
      paymentId: result.paymentId,
      orderId: result.orderId,
      eventsCreated: result.eventsCreated,
      webhooksCreated: result.webhooksCreated,
    });
  } catch (error) {
    next(error);
  }
};

const simulateBatch = async (req, res, next) => {
  try {
    const count = parseInt(req.body.count, 10);
    const distribution = req.body.distribution || {};

    if (isNaN(count) || count <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Count must be a positive integer.',
      });
    }

    if (count > 10000) {
      return res.status(400).json({
        success: false,
        error: 'Batch simulation count exceeds the maximum safety limit of 10,000.',
      });
    }

    const result = await simulatorService.generateBatch(count, distribution);
    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const triggerDemoMode = async (req, res, next) => {
  try {
    const Payment = require('../models/Payment');
    const PaymentEvent = require('../models/PaymentEvent');
    const Order = require('../models/Order');
    const WebhookEvent = require('../models/WebhookEvent');
    const Incident = require('../models/Incident');
    const Investigation = require('../models/Investigation');
    const { runIncidentDetectionAndAggregation } = require('../services/incident/incidentAggregator');
    const { extractFeaturesForPayment } = require('../services/ml/featureExtractor');
    const { trainModelOnDataset } = require('../services/ml/mlClient');

    // 1. Clear database collections
    await Promise.all([
      Payment.deleteMany({}),
      PaymentEvent.deleteMany({}),
      Order.deleteMany({}),
      WebhookEvent.deleteMany({}),
      Incident.deleteMany({}),
      Investigation.deleteMany({})
    ]);

    // 2. Generate controlled batch
    const createdPayments = [];
    
    // Normal payments
    for (let i = 0; i < 20; i++) {
      const data = simulatorService.generateNormal();
      await simulatorService.saveScenarioData(data);
      createdPayments.push(data.payment.paymentId);
    }
    
    // Webhook failures
    for (let i = 0; i < 3; i++) {
      const data = simulatorService.generateWebhookFailure();
      await simulatorService.saveScenarioData(data);
      createdPayments.push(data.payment.paymentId);
    }
    
    // Duplicate payment pair
    {
      const data = simulatorService.generateDuplicate();
      await simulatorService.saveScenarioData(data);
      createdPayments.push(...data.payments.map(p => p.paymentId));
    }
    
    // Out-of-order
    {
      const data = simulatorService.generateOutOfOrder();
      await simulatorService.saveScenarioData(data);
      createdPayments.push(data.payment.paymentId);
    }
    
    // Late Auth
    {
      const data = simulatorService.generateLateAuth();
      await simulatorService.saveScenarioData(data);
      createdPayments.push(data.payment.paymentId);
    }

    // 3. Trigger Incident Detection scan
    const aggregationResult = await runIncidentDetectionAndAggregation(24);

    // 4. Train ML model on the generated data
    const payments = await Payment.find();
    const dataset = [];
    for (const p of payments) {
      try {
        const features = await extractFeaturesForPayment(p.paymentId);
        dataset.push(features);
      } catch (err) {
        // Skip anomalies features errors
      }
    }
    
    if (dataset.length >= 5) {
      await trainModelOnDataset(dataset, 0.05).catch(() => {});
    }

    return res.status(200).json({
      success: true,
      message: 'Demo Mode successfully activated. Database cleared, 27 payments generated, and incident correlation finished.',
      paymentsCreated: createdPayments.length,
      incidentsAggregated: aggregationResult.incidentsDetected
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  simulateNormal,
  simulateWebhookFailure,
  simulateDuplicate,
  simulateOutOfOrder,
  simulateRefundFailure,
  simulateLateAuth,
  simulateBatch,
  triggerDemoMode
};
