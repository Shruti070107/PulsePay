const simulatorService = require('../services/simulatorService');

const simulateScenario = async (req, res, next) => {
  try {
    const scenario = req.params.scenario || req.body.scenario;
    if (!scenario) {
      return res.status(400).json({
        success: false,
        error: 'Scenario parameter is required.'
      });
    }

    // Map kebab-case and other name variants to generator functions
    const generatorMap = {
      'normal': 'generateNormal',
      'webhook-failure': 'generateWebhookFailure',
      'webhook_failure': 'generateWebhookFailure',
      'duplicate': 'generateDuplicate',
      'duplicate-payment': 'generateDuplicate',
      'duplicate_payment': 'generateDuplicate',
      'out-of-order': 'generateOutOfOrder',
      'out_of_order': 'generateOutOfOrder',
      'refund-failure': 'generateRefundFailure',
      'refund_failure': 'generateRefundFailure',
      'late-auth': 'generateLateAuth',
      'late_authorization': 'generateLateAuth',
      
      // New Scenarios
      'webhook-outage': 'generateWebhookOutage',
      'webhook_outage': 'generateWebhookOutage',
      'gateway-timeout': 'generateGatewayTimeout',
      'gateway_timeout': 'generateGatewayTimeout',
      'auth-latency-spike': 'generateAuthLatencySpike',
      'auth_latency_spike': 'generateAuthLatencySpike',
      'duplicate-webhook': 'generateDuplicateWebhook',
      'duplicate_webhook': 'generateDuplicateWebhook',
      'merchant-5xx-spike': 'generateMerchant5xxSpike',
      'merchant_5xx_spike': 'generateMerchant5xxSpike',
      'merchant-timeout': 'generateMerchantTimeout',
      'merchant_timeout': 'generateMerchantTimeout',
      'provider-degradation': 'generateProviderDegradation',
      'provider_degradation': 'generateProviderDegradation',
      'high-decline-rate': 'generateHighDeclineRate',
      'high_decline_rate': 'generateHighDeclineRate',
      'permanent-decline': 'generatePermanentDecline',
      'permanent_decline': 'generatePermanentDecline',
      'partial-capture': 'generatePartialCapture',
      'partial_capture': 'generatePartialCapture',
      'amount-mismatch': 'generateAmountMismatch',
      'amount_mismatch': 'generateAmountMismatch',
      'order-state-mismatch': 'generateOrderStateMismatch',
      'order_state_mismatch': 'generateOrderStateMismatch',
      'retry-storm': 'generateRetryStorm',
      'retry_storm': 'generateRetryStorm',
      'merchant-traffic-spike': 'generateMerchantTrafficSpike',
      'merchant_traffic_spike': 'generateMerchantTrafficSpike',
      'currency-anomaly': 'generateCurrencyAnomaly',
      'currency_anomaly': 'generateCurrencyAnomaly',
      'repeated-customer-attempts': 'generateRepeatedCustomerAttempts',
      'repeated_customer_attempts': 'generateRepeatedCustomerAttempts',
      'multi-signal-compound': 'generateMultiSignalCompound',
      'multi_signal_compound': 'generateMultiSignalCompound'
    };

    const generatorName = generatorMap[scenario.toLowerCase()];
    if (!generatorName || !simulatorService[generatorName]) {
      return res.status(404).json({
        success: false,
        error: `Unknown simulation scenario: ${scenario}`
      });
    }

    const data = simulatorService[generatorName]();
    const result = await simulatorService.saveScenarioData(data);

    return res.status(201).json({
      success: true,
      scenario,
      paymentId: result.paymentId,
      orderId: result.orderId,
      eventsCreated: result.eventsCreated,
      webhooksCreated: result.webhooksCreated,
    });
  } catch (error) {
    next(error);
  }
};

const simulateNormal = (req, res, next) => { req.params.scenario = 'normal'; return simulateScenario(req, res, next); };
const simulateWebhookFailure = (req, res, next) => { req.params.scenario = 'webhook-failure'; return simulateScenario(req, res, next); };
const simulateDuplicate = (req, res, next) => { req.params.scenario = 'duplicate'; return simulateScenario(req, res, next); };
const simulateOutOfOrder = (req, res, next) => { req.params.scenario = 'out-of-order'; return simulateScenario(req, res, next); };
const simulateRefundFailure = (req, res, next) => { req.params.scenario = 'refund-failure'; return simulateScenario(req, res, next); };
const simulateLateAuth = (req, res, next) => { req.params.scenario = 'late-auth'; return simulateScenario(req, res, next); };

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
    const { seedDemoData } = require('../services/demoSeedService');
    const result = await seedDemoData({ quiet: true });

    return res.status(200).json({
      success: true,
      message: 'Demo Mode successfully activated with realistic synthetic recovery dataset.',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

const {
  LAB_SCENARIOS,
  generateHistoricalBaseline,
  executeScenarioLab
} = require('../services/simulator/labService');
const EvaluationReport = require('../models/EvaluationReport');

const getLabScenarios = async (req, res, next) => {
  try {
    return res.status(200).json({ success: true, data: LAB_SCENARIOS });
  } catch (error) {
    next(error);
  }
};

const triggerLabBaseline = async (req, res, next) => {
  try {
    const count = parseInt(req.body.count || 15000, 10);
    const seed = parseInt(req.body.seed || 42, 10);

    const Payment = require('../models/Payment');
    const Order = require('../models/Order');
    const PaymentEvent = require('../models/PaymentEvent');
    const WebhookEvent = require('../models/WebhookEvent');
    await Promise.all([
      Payment.deleteMany({ paymentId: { $regex: /^pay_hist_/ } }),
      Order.deleteMany({ paymentId: { $regex: /^pay_hist_/ } }),
      PaymentEvent.deleteMany({ paymentId: { $regex: /^pay_hist_/ } }),
      WebhookEvent.deleteMany({ paymentId: { $regex: /^pay_hist_/ } })
    ]);

    const result = await generateHistoricalBaseline(count, seed);
    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const runLabScenario = async (req, res, next) => {
  try {
    const { scenarioId } = req.body;
    if (!scenarioId) {
      return res.status(400).json({ success: false, error: 'scenarioId is required' });
    }
    const report = await executeScenarioLab(scenarioId);
    return res.status(201).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

const getLabReports = async (req, res, next) => {
  try {
    const reports = await EvaluationReport.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: reports });
  } catch (error) {
    next(error);
  }
};

const exportLabReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const format = req.query.format || 'json';
    const report = await EvaluationReport.findOne({ evaluationId: id });
    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=report-${id}.csv`);

      const csvLines = [
        'Metric,Value',
        `Evaluation ID,${report.evaluationId}`,
        `Scenario,${report.name}`,
        `AI Mode,${report.aiMode}`,
        `Transactions Generated,${report.stats.transactionsGenerated}`,
        `Transactions Affected,${report.stats.transactionsAffected}`,
        `Customers Affected,${report.stats.customersAffected}`,
        `Merchants Affected,${report.stats.merchantsAffected}`,
        `Financial Exposure,${report.stats.financialExposure}`,
        `Detection Latency (ms),${report.stats.detectionLatencyMs}`,
        `Precision (%),${report.metrics.precision}`,
        `Recall (%),${report.metrics.recall}`,
        `F1 Score (%),${report.metrics.f1Score}`,
        `Root Cause Accuracy (%),${report.metrics.rootCauseAccuracy}`,
        `Evidence Grounding (%),${report.metrics.evidenceGroundingRate}`,
        `Overall Rating Score,${report.scorecard.overallScore}`,
        `Detection Outcome,${report.scorecard.detection}`,
        `Root Cause Outcome,${report.scorecard.rootCause}`,
        `Evidence Outcome,${report.scorecard.evidence}`,
        `ML Outcome,${report.scorecard.ml}`,
        `AI Outcome,${report.scorecard.ai}`,
        `Blast Radius Outcome,${report.scorecard.blastRadius}`
      ];
      return res.send(csvLines.join('\n'));
    }

    return res.status(200).json(report);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  simulateScenario,
  simulateNormal,
  simulateWebhookFailure,
  simulateDuplicate,
  simulateOutOfOrder,
  simulateRefundFailure,
  simulateLateAuth,
  simulateBatch,
  triggerDemoMode,
  getLabScenarios,
  triggerLabBaseline,
  runLabScenario,
  getLabReports,
  exportLabReport
};
