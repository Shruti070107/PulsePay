const Incident = require('../models/Incident');
const { runIncidentDetectionAndAggregation } = require('../services/incident/incidentAggregator');

const detectIncidents = async (req, res, next) => {
  try {
    const hours = parseInt(req.body.hours, 10) || 24;
    const result = await runIncidentDetectionAndAggregation(hours);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getIncidents = async (req, res, next) => {
  try {
    const { status, severity } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;

    const incidents = await Incident.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: incidents.length,
      data: incidents,
    });
  } catch (error) {
    next(error);
  }
};

const getIncidentById = async (req, res, next) => {
  try {
    const incident = await Incident.findOne({ incidentId: req.params.id });
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Incident record not found'
        }
      });
    }
    const { resolveRichIncidentDetails } = require('../services/incident/evidenceEngine');
    const richData = await resolveRichIncidentDetails(incident);
    return res.status(200).json({
      success: true,
      data: richData,
    });
  } catch (error) {
    next(error);
  }
};

const updateIncidentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'investigating', 'resolved'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid incident status'
        }
      });
    }

    const incident = await Incident.findOneAndUpdate(
      { incidentId: req.params.id },
      { status },
      { new: true }
    );

    if (!incident) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Incident record not found'
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: incident,
    });
  } catch (error) {
    next(error);
  }
};

const resolveIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findOneAndUpdate(
      { incidentId: req.params.id },
      { status: 'resolved' },
      { new: true }
    );

    if (!incident) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Incident record not found'
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: incident,
    });
  } catch (error) {
    next(error);
  }
};

const { runIncidentInvestigation } = require('../services/ai');
const Investigation = require('../models/Investigation');

const investigateIncident = async (req, res, next) => {
  try {
    const incidentId = req.params.id;
    const investigation = await runIncidentInvestigation(incidentId);
    return res.status(201).json({
      success: true,
      data: {
        incident: incidentId,
        investigation
      }
    });
  } catch (error) {
    next(error);
  }
};

const getIncidentInvestigations = async (req, res, next) => {
  try {
    const incidentId = req.params.id;
    const investigations = await Investigation.find({ incidentId }).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: investigations.length,
      data: investigations
    });
  } catch (error) {
    next(error);
  }
};

const updateActionStatus = async (req, res, next) => {
  try {
    const { actionId, status } = req.body;
    if (!['TODO', 'IN_PROGRESS', 'DONE', 'DISMISSED'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid status. Must be one of TODO, IN_PROGRESS, DONE, DISMISSED'
        }
      });
    }

    const incident = await Incident.findOne({ incidentId: req.params.id });
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Incident record not found'
        }
      });
    }

    const action = incident.operatorActionCenter.find(a => a.id === actionId);
    if (!action) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Action task not found'
        }
      });
    }

    action.status = status;
    await incident.save();

    return res.status(200).json({
      success: true,
      data: incident
    });
  } catch (error) {
    next(error);
  }
};

const getIncidentReplay = async (req, res, next) => {
  try {
    const { id } = req.params;
    const incident = await Incident.findOne({ incidentId: id });
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Incident not found' }
      });
    }

    const Payment = require('../models/Payment');
    const PaymentEvent = require('../models/PaymentEvent');
    const Order = require('../models/Order');
    const WebhookEvent = require('../models/WebhookEvent');

    const paymentIds = (incident.transactionIds || []).slice(0, 20);
    const [payments, events, orders, webhooks] = await Promise.all([
      Payment.find({ paymentId: { $in: paymentIds } }),
      PaymentEvent.find({ paymentId: { $in: paymentIds } }),
      Order.find({ paymentId: { $in: paymentIds } }),
      WebhookEvent.find({ paymentId: { $in: paymentIds } })
    ]);

    // Gather all event-like occurrences into a timeline
    const rawTimeline = [];
    events.forEach(e => {
      rawTimeline.push({
        type: 'event',
        timestamp: new Date(e.eventTimestamp),
        original: e
      });
    });
    webhooks.forEach(w => {
      rawTimeline.push({
        type: 'webhook',
        timestamp: new Date(w.timestamp),
        original: w
      });
    });

    // Sort chronologically
    rawTimeline.sort((a, b) => a.timestamp - b.timestamp);

    // Build chronological snapshots (T+0, T+1, ...)
    const replaySequence = [];
    const activePayments = new Map();
    const activeOrders = new Map();
    const activeWebhooks = new Map();

    rawTimeline.forEach((step, index) => {
      const orig = step.original;
      
      if (step.type === 'event') {
        const pId = orig.paymentId;
        const currentP = payments.find(p => p.paymentId === pId) || { paymentId: pId };
        
        let pState = activePayments.get(pId) || {
          paymentId: pId,
          status: 'created',
          amount: currentP.amount,
          currency: currentP.currency,
          events: []
        };
        
        pState.status = orig.status;
        pState.events.push({
          eventType: orig.type,
          status: orig.status,
          timestamp: step.timestamp
        });
        activePayments.set(pId, { ...pState });

        if (orig.type === 'order.paid' || orig.type === 'payment.captured') {
          const currentO = orders.find(o => o.paymentId === pId) || { orderId: `ord_${pId}` };
          let oState = activeOrders.get(pId) || {
            orderId: currentO.orderId,
            status: 'unpaid'
          };
          if (orig.type === 'order.paid') oState.status = 'paid';
          activeOrders.set(pId, oState);
        }
      } else {
        const pId = orig.paymentId;
        let wState = activeWebhooks.get(orig.webhookId) || {
          webhookId: orig.webhookId,
          paymentId: pId,
          deliveryStatus: orig.deliveryStatus,
          attempts: []
        };
        wState.deliveryStatus = orig.deliveryStatus;
        wState.attempts.push({
          attempt: orig.attemptNumber,
          responseCode: orig.responseCode,
          timestamp: step.timestamp
        });
        activeWebhooks.set(orig.webhookId, wState);
      }

      replaySequence.push({
        step: index,
        time: step.timestamp,
        triggerEvent: {
          type: step.type,
          name: step.type === 'event' ? orig.type : `webhook.${orig.deliveryStatus}`,
          paymentId: orig.paymentId,
          meta: orig.metadata || {}
        },
        states: {
          payments: Array.from(activePayments.values()),
          orders: Array.from(activeOrders.values()),
          webhooks: Array.from(activeWebhooks.values())
        }
      });
    });

    return res.status(200).json({
      success: true,
      incidentId: id,
      replaySequence
    });
  } catch (error) {
    next(error);
  }
};

const runIncidentWhatIf = async (req, res, next) => {
  try {
    const { id } = req.params;
    const incident = await Incident.findOne({ incidentId: id });
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Incident not found' }
      });
    }

    const {
      webhookSuccessRate,
      exposureDurationMinutes,
      declinationRateReduction
    } = req.body;

    const Payment = require('../models/Payment');
    const PaymentEvent = require('../models/PaymentEvent');
    const WebhookEvent = require('../models/WebhookEvent');

    const paymentIds = (incident.transactionIds || []).slice(0, 20);
    const [payments, events, webhooks] = await Promise.all([
      Payment.find({ paymentId: { $in: paymentIds } }),
      PaymentEvent.find({ paymentId: { $in: paymentIds } }),
      WebhookEvent.find({ paymentId: { $in: paymentIds } })
    ]);

    const originalTransactions = payments.length;
    const originalAmount = incident.affectedAmount;
    const originalCustomers = incident.affectedCustomers;

    const earliestPay = payments.reduce((min, p) => p.createdAt < min ? p.createdAt : min, payments[0]?.createdAt || new Date());
    const latestPay = payments.reduce((max, p) => p.createdAt > max ? p.createdAt : max, payments[0]?.createdAt || new Date());
    const actualDurationMinutes = Math.max(1, Math.round((new Date(latestPay) - new Date(earliestPay)) / (1000 * 60)));

    const failedWebhooks = webhooks.filter(w => w.deliveryStatus === 'failed').length;
    const cardDeclines = events.filter(e => e.type === 'payment.failed' && e.metadata?.errorCode === 'CARD_DECLINED').length;

    let simulatedTransactions = originalTransactions;
    let simulatedAmount = originalAmount;
    let simulatedCustomers = originalCustomers;
    let recoveredTransactions = 0;
    let recoveredAmount = 0;

    if (exposureDurationMinutes !== undefined && exposureDurationMinutes > 0) {
      const ratio = Math.min(1.0, exposureDurationMinutes / actualDurationMinutes);
      simulatedTransactions = Math.round(originalTransactions * ratio);
      simulatedAmount = Math.round(originalAmount * ratio);
      simulatedCustomers = Math.round(originalCustomers * ratio);
    }

    if (webhookSuccessRate !== undefined) {
      const rate = Math.max(0.0, Math.min(1.0, webhookSuccessRate));
      recoveredAmount += Math.round(simulatedAmount * rate);
      recoveredTransactions += Math.round(simulatedTransactions * rate);
    }

    if (declinationRateReduction !== undefined) {
      const reduction = Math.max(0.0, Math.min(1.0, declinationRateReduction));
      const recoveredDeclineRatio = (cardDeclines / Math.max(1, originalTransactions)) * reduction;
      recoveredAmount += Math.round(simulatedAmount * recoveredDeclineRatio);
      recoveredTransactions += Math.round(simulatedTransactions * recoveredDeclineRatio);
    }

    recoveredTransactions = Math.min(originalTransactions, recoveredTransactions);
    recoveredAmount = Math.min(originalAmount, recoveredAmount);

    return res.status(200).json({
      success: true,
      incidentId: id,
      baseline: {
        transactions: originalTransactions,
        amount: originalAmount,
        customers: originalCustomers,
        durationMinutes: actualDurationMinutes
      },
      simulated: {
        transactions: Math.max(0, simulatedTransactions - recoveredTransactions),
        amount: Math.max(0, simulatedAmount - recoveredAmount),
        customers: Math.max(0, simulatedCustomers - recoveredTransactions),
        durationMinutes: exposureDurationMinutes || actualDurationMinutes
      },
      recovered: {
        transactions: recoveredTransactions,
        amount: recoveredAmount
      }
    });
  } catch (error) {
    next(error);
  }
};

const runAIEvaluation = async (req, res, next) => {
  try {
    const { runAIEvaluation: evaluate } = require('../services/ai/evaluationEngine');
    const results = await evaluate();
    return res.status(200).json(results);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  detectIncidents,
  getIncidents,
  getIncidentById,
  updateIncidentStatus,
  resolveIncident,
  investigateIncident,
  getIncidentInvestigations,
  updateActionStatus,
  runAIEvaluation,
  getIncidentReplay,
  runIncidentWhatIf
};
