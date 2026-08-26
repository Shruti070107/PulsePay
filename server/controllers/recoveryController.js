const RecoveryOpportunity = require('../models/RecoveryOpportunity');
const RecoveryAction = require('../models/RecoveryAction');
const RecoveryCampaign = require('../models/RecoveryCampaign');
const RecoveryBenchmarkResult = require('../models/RecoveryBenchmarkResult');
const Payment = require('../models/Payment');
const PaymentEvent = require('../models/PaymentEvent');
const Order = require('../models/Order');
const WebhookEvent = require('../models/WebhookEvent');
const { scanRevenueAtRisk } = require('../services/recovery/revenueRiskEngine');
const { simulateRecoveryBatch } = require('../services/recovery/recoverySimulator');
const { executeRecoveryBatch } = require('../services/recovery/recoveryExecutor');
const { calculateRecoveryOutcomes } = require('../services/recovery/recoveryOutcomeEngine');
const { runRecoveryAgentAnalysis } = require('../services/recovery/recoveryAgent');
const { runRecoveryEvaluation } = require('../services/recovery/recoveryEvaluationEngine');
const { runFullRevenueRecoveryDemo } = require('../services/recovery/recoveryDemoService');

const scanOpportunities = async (req, res, next) => {
  try {
    const { merchantId, lookbackHours, limit } = req.body;
    const result = await scanRevenueAtRisk({ merchantId, lookbackHours, limit });
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const getOpportunities = async (req, res, next) => {
  try {
    const { policyStatus, classification, status, minAmount, minProbability, limit = 100 } = req.query;

    const filter = {};
    if (policyStatus) filter.policyStatus = policyStatus;
    if (classification) filter.recoverabilityClassification = classification;
    if (status) filter.status = status;
    if (minAmount) filter.amount = { $gte: parseFloat(minAmount) };
    if (minProbability) filter.recoveryProbability = { $gte: parseFloat(minProbability) };

    let opportunities = await RecoveryOpportunity.find(filter)
      .sort({ expectedValue: -1 })
      .limit(parseInt(limit, 10))
      .lean();

    // If no opportunities exist in DB yet, pull top records from benchmark results
    if (opportunities.length === 0) {
      const benchmarkRecords = await RecoveryBenchmarkResult.find()
        .sort({ expectedValue: -1 })
        .limit(parseInt(limit, 10))
        .lean();

      opportunities = benchmarkRecords.map(b => ({
        opportunityId: `REC-${b.paymentId}`,
        paymentId: b.paymentId,
        merchantId: b.merchantId,
        customerId: b.customerId,
        orderId: b.orderId,
        amount: b.amount,
        currency: b.currency || 'INR',
        provider: b.provider,
        paymentMethod: b.paymentMethod,
        failureReason: b.failureType,
        failureType: b.failureType,
        classification: b.scenarioName,
        rawProbability: b.rawRecoveryProbability,
        recoveryProbability: b.calibratedRecoveryProbability || b.recoveryProbability,
        estimatedRecoverableAmount: b.expectedRecovery || b.amount,
        recommendedAction: b.recommendedStrategy,
        recommendedStrategy: b.recommendedStrategy,
        expectedValue: b.expectedValue,
        policyStatus: b.policyDecision,
        status: b.execution?.success ? 'RECOVERED' : 'PENDING',
        attemptCount: b.attemptCount || 0,
      }));
    }

    return res.status(200).json({
      success: true,
      count: opportunities.length,
      data: opportunities,
    });
  } catch (err) {
    next(err);
  }
};

const getOpportunityById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let opportunity = await RecoveryOpportunity.findOne({
      $or: [{ opportunityId: id }, { paymentId: id }],
    }).lean();

    if (!opportunity) {
      // Check in RecoveryBenchmarkResult
      const bench = await RecoveryBenchmarkResult.findOne({ paymentId: id }).lean();
      if (bench) {
        opportunity = {
          opportunityId: `REC-${bench.paymentId}`,
          paymentId: bench.paymentId,
          merchantId: bench.merchantId,
          customerId: bench.customerId,
          orderId: bench.orderId,
          amount: bench.amount,
          currency: bench.currency || 'INR',
          provider: bench.provider,
          paymentMethod: bench.paymentMethod,
          failureReason: bench.failureType,
          failureType: bench.failureType,
          classification: bench.scenarioName,
          rawProbability: bench.rawRecoveryProbability,
          recoveryProbability: bench.calibratedRecoveryProbability || bench.recoveryProbability,
          expectedRecovery: bench.expectedRecovery,
          actionCost: bench.estimatedActionCost || 10,
          expectedValue: bench.expectedValue,
          recommendedStrategy: bench.recommendedStrategy,
          recommendedAction: bench.recommendedStrategy,
          policyStatus: bench.policyDecision,
          status: bench.execution?.success ? 'RECOVERED' : 'PENDING',
          attemptCount: bench.attemptCount || 0,
        };
      }
    }

    if (!opportunity) {
      // Check in Payment collection
      const paymentDoc = await Payment.findOne({ paymentId: id }).lean();
      if (paymentDoc) {
        const isPermanent = ['CARD_EXPIRED', 'FRAUD_SUSPECTED', 'ACCOUNT_BLOCKED'].includes(paymentDoc.errorMessage || paymentDoc.stateType);
        opportunity = {
          opportunityId: `REC-${paymentDoc.paymentId}`,
          paymentId: paymentDoc.paymentId,
          merchantId: paymentDoc.merchantId || 'merch_default',
          customerId: paymentDoc.customerId || 'cust_default',
          orderId: paymentDoc.orderId || 'ord_default',
          amount: paymentDoc.amount || 1000,
          currency: paymentDoc.currency || 'INR',
          provider: paymentDoc.provider || 'gateway_mock',
          paymentMethod: paymentDoc.method || 'upi',
          failureReason: paymentDoc.errorMessage || paymentDoc.stateType || 'GATEWAY_TIMEOUT',
          failureType: paymentDoc.errorMessage || paymentDoc.stateType || 'GATEWAY_TIMEOUT',
          classification: isPermanent ? 'NON_RECOVERABLE' : 'TRANSIENT',
          rawProbability: isPermanent ? 0.05 : 0.78,
          recoveryProbability: isPermanent ? 0.01 : 0.91,
          expectedRecovery: isPermanent ? 0 : Math.round(paymentDoc.amount * 0.91),
          actionCost: 10,
          expectedValue: isPermanent ? -10 : Math.round(paymentDoc.amount * 0.91 - 10),
          recommendedStrategy: isPermanent ? 'STOP_RECOVERY' : 'DELAYED_RETRY',
          recommendedAction: isPermanent ? 'STOP_RECOVERY' : 'DELAYED_RETRY',
          policyStatus: isPermanent ? 'BLOCKED' : 'ELIGIBLE',
          status: paymentDoc.status === 'captured' ? 'RECOVERED' : 'PENDING',
          attemptCount: 1,
        };
      }
    }

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Recovery opportunity record not found' },
      });
    }

    // Pull associated events & recovery actions
    const [events, webhooks, actions, payment, order] = await Promise.all([
      PaymentEvent.find({ paymentId: opportunity.paymentId }).sort({ timestamp: 1 }).lean(),
      WebhookEvent.find({ paymentId: opportunity.paymentId }).sort({ timestamp: 1 }).lean(),
      RecoveryAction.find({ paymentId: opportunity.paymentId }).sort({ timestamp: -1 }).lean(),
      Payment.findOne({ paymentId: opportunity.paymentId }).lean(),
      Order.findOne({ paymentId: opportunity.paymentId }).lean(),
    ]);

    // Build visual recovery explanation graph nodes & edges
    const explanationGraph = {
      nodes: [
        { id: 'N1', label: 'Payment Ingested', type: 'info', status: 'healthy' },
        { id: 'N2', label: `Failure: ${opportunity.failureReason}`, type: 'error', status: 'critical' },
        { id: 'N3', label: `Score: ${opportunity.recoverabilityScore}% Recovery Prob`, type: 'score', status: 'info' },
        { id: 'N4', label: `Policy Check: ${opportunity.policyStatus}`, type: 'policy', status: opportunity.policyStatus === 'ELIGIBLE' ? 'healthy' : 'warning' },
        { id: 'N5', label: `Selected Action: ${opportunity.recommendedAction}`, type: 'action', status: 'healthy' },
        { id: 'N6', label: `Expected Yield: ₹${opportunity.expectedValue}`, type: 'result', status: 'healthy' },
      ],
      edges: [
        { from: 'N1', to: 'N2' },
        { from: 'N2', to: 'N3' },
        { from: 'N3', to: 'N4' },
        { from: 'N4', to: 'N5' },
        { from: 'N5', to: 'N6' },
      ],
    };

    return res.status(200).json({
      success: true,
      data: {
        ...opportunity,
        payment,
        order,
        events,
        webhooks,
        actions,
        explanationGraph,
      },
    });
  } catch (err) {
    next(err);
  }
};

const simulateRecovery = async (req, res, next) => {
  try {
    const simulationResult = await simulateRecoveryBatch(req.body);
    return res.status(200).json({
      success: true,
      data: simulationResult,
    });
  } catch (err) {
    console.error('[Recovery Error] Failed at stage: recoverySimulator', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'RECOVERY_SIMULATION_FAILED',
        stage: 'recoverySimulator',
        message: err.message || 'Failed to run recovery simulation',
        details: err.stack,
      },
    });
  }
};

const executeRecovery = async (req, res, next) => {
  try {
    const executionResult = await executeRecoveryBatch(req.body);
    return res.status(200).json({
      success: executionResult.success !== false,
      data: executionResult,
    });
  } catch (err) {
    console.error('[Recovery Error] Failed at stage: recoveryExecutor', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'RECOVERY_EXECUTION_FAILED',
        stage: 'recoveryExecutor',
        message: err.message || 'Failed to execute recovery batch',
        details: err.stack,
      },
    });
  }
};

const getCampaigns = async (req, res, next) => {
  try {
    const campaigns = await RecoveryCampaign.find().sort({ createdAt: -1 }).lean();
    return res.status(200).json({
      success: true,
      count: campaigns.length,
      data: campaigns,
    });
  } catch (err) {
    next(err);
  }
};

const createCampaign = async (req, res, next) => {
  try {
    const { name, targetScenario, strategyOverride, executeNow = true } = req.body;
    const campaignId = `CAMP-${Date.now().toString().slice(-6)}`;

    // 1. Simulate
    const simResult = await simulateRecoveryBatch({ strategyOverride });

    // 2. Execute if requested
    let execResult = null;
    if (executeNow) {
      execResult = await executeRecoveryBatch({ campaignId, forceAction: strategyOverride });
    }

    const campaign = await RecoveryCampaign.create({
      campaignId,
      name: name || `Recovery Campaign ${campaignId}`,
      targetScenario: targetScenario || 'ALL_FAILURES',
      mode: executeNow ? 'TEST_EXECUTION' : 'SIMULATION',
      status: executeNow ? 'COMPLETED' : 'SIMULATED',
      strategySelected: strategyOverride || 'OPTIMIZED_EXPECTED_VALUE',
      targetedCount: simResult.transactionsTargeted,
      revenueAtRisk: simResult.amountAtRisk,
      eligibleRevenue: simResult.eligibleRevenue,
      expectedRecovery: simResult.expectedRecoveredAmount,
      actualRecovered: execResult ? execResult.actualRecoveredAmount : 0,
      actualFailed: execResult ? execResult.actualFailedAmount : 0,
      blockedAmount: simResult.blockedAmount,
      recoveryRate: simResult.amountAtRisk > 0 && execResult 
        ? Math.round((execResult.actualRecoveredAmount / simResult.amountAtRisk) * 1000) / 10 
        : 0,
      expectedVsActual: simResult.expectedRecoveredAmount > 0 && execResult 
        ? Math.round((execResult.actualRecoveredAmount / simResult.expectedRecoveredAmount) * 1000) / 10 
        : 0,
      actionsBreakdown: simResult.actionsBreakdown,
      executedAt: executeNow ? new Date() : null,
    });

    return res.status(201).json({
      success: true,
      data: campaign,
    });
  } catch (err) {
    next(err);
  }
};

const getCampaignById = async (req, res, next) => {
  try {
    const campaign = await RecoveryCampaign.findOne({ campaignId: req.params.id }).lean();
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Campaign not found' },
      });
    }
    const actions = await RecoveryAction.find({ campaignId: campaign.campaignId }).lean();

    return res.status(200).json({
      success: true,
      data: {
        ...campaign,
        actions,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getRecoveryMetrics = async (req, res, next) => {
  try {
    // Check if opportunities exist; if not, do an initial scan
    const oppCount = await RecoveryOpportunity.countDocuments();
    if (oppCount === 0) {
      await scanRevenueAtRisk({ lookbackHours: 72 });
    }

    const outcomes = await calculateRecoveryOutcomes();

    // Top next best opportunity
    const nextBest = await RecoveryOpportunity.findOne({ policyStatus: 'ELIGIBLE', status: 'PENDING' })
      .sort({ expectedValue: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        ...outcomes,
        nextBestOpportunity: nextBest || null,
      },
    });
  } catch (err) {
    next(err);
  }
};

const analyzeWithAgent = async (req, res, next) => {
  try {
    const report = await runRecoveryAgentAnalysis(req.body);
    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (err) {
    next(err);
  }
};

const runDemo = async (req, res, next) => {
  try {
    const demoResult = await runFullRevenueRecoveryDemo(req.body);
    return res.status(200).json({
      success: true,
      data: demoResult,
    });
  } catch (err) {
    console.error('[Recovery Error] Failed at stage: recoveryDemoService', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'DEMO_EXECUTION_FAILED',
        stage: 'recoveryDemoService',
        message: err.message || 'Failed to run full revenue recovery demo',
        details: err.stack,
      },
    });
  }
};

const evaluateRecovery = async (req, res, next) => {
  try {
    const evalResult = await runRecoveryEvaluation();
    return res.status(200).json({
      success: true,
      data: evalResult,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  scanOpportunities,
  getOpportunities,
  getOpportunityById,
  simulateRecovery,
  executeRecovery,
  getCampaigns,
  createCampaign,
  getCampaignById,
  getRecoveryMetrics,
  analyzeWithAgent,
  runDemo,
  evaluateRecovery,
};
