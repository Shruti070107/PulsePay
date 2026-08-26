const Incident = require('../../models/Incident');
const { reconstructFullState } = require('../stateEngine');
const { predictAnomaly } = require('../ml/mlClient');

/**
 * Sanitizes input text/object to remove sensitive fields
 */
const sanitizeContext = (obj) => {
  const sanitizeValue = (val) => {
    if (typeof val === 'string') {
      // Mask typical credential formats or secrets
      return val.replace(/(key|token|secret|password|cvv|card|auth)[-_a-zA-Z0-9]{8,}/gi, '[REDACTED_CREDENTIAL]');
    }
    return val;
  };

  if (Array.isArray(obj)) {
    return obj.map(sanitizeContext);
  } else if (obj !== null && typeof obj === 'object') {
    const newObj = {};
    for (const key in obj) {
      if (['password', 'cvv', 'card', 'secret', 'token', 'apikey', 'authorization'].some(s => key.toLowerCase().includes(s))) {
        newObj[key] = '[REDACTED_SENSITIVE_KEY]';
      } else {
        newObj[key] = sanitizeContext(obj[key]);
      }
    }
    return newObj;
  }
  return sanitizeValue(obj);
};

const buildIncidentContext = async (incidentId) => {
  const incident = await Incident.findOne({ incidentId });
  if (!incident) {
    throw new Error(`Incident ${incidentId} not found`);
  }

  const transactionIds = incident.transactionIds || [];
  const sampleTxnIds = transactionIds.slice(0, 15);
  const reconstructedStates = [];

  // Fetch reconstructed states and ML predictions for sampled payments in parallel
  await Promise.all(sampleTxnIds.map(async (paymentId) => {
    try {
      const stateResult = await reconstructFullState(paymentId);
      const mlResult = await predictAnomaly(paymentId);
      reconstructedStates.push({
        paymentId,
        stateResult,
        mlResult
      });
    } catch (err) {
      console.error(`Error loading state for payment ${paymentId}:`, err.message);
    }
  }));

  // Build aggregate metrics
  const paymentStates = {};
  const orderStates = {};
  const webhookStats = { delivered: 0, failed: 0 };
  let mlTotalScore = 0;
  let mlAnomalousCount = 0;
  const failureCodes = new Set();
  const merchants = new Set();
  const endpoints = new Set();
  const customers = new Set();

  reconstructedStates.forEach(({ stateResult, mlResult }) => {
    merchants.add(stateResult.merchantId);
    customers.add(stateResult.customerId);

    // Payment states
    const pState = stateResult.paymentState;
    paymentStates[pState] = (paymentStates[pState] || 0) + 1;

    // Order states
    const oState = stateResult.orderState;
    orderStates[oState] = (orderStates[oState] || 0) + 1;

    // Webhook delivery
    const wState = stateResult.webhookState;
    if (wState === 'DELIVERED') {
      webhookStats.delivered++;
    } else if (wState === 'FAILED') {
      webhookStats.failed++;
    }

    // Webhook failures details
    stateResult.timeline.forEach(event => {
      if (event.eventType === 'webhook.failed' && event.metadata) {
        if (event.metadata.responseCode) {
          failureCodes.add(String(event.metadata.responseCode));
        }
        if (event.metadata.endpoint) {
          endpoints.add(event.metadata.endpoint);
        }
      }
    });

    // ML stats
    mlTotalScore += mlResult.normalized_anomaly_score;
    if (mlResult.is_anomaly) {
      mlAnomalousCount++;
    }
  });

  const durationMs = new Date(incident.latestOccurrence || incident.updatedAt) - new Date(incident.firstOccurrence || incident.createdAt);
  const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

  const context = {
    incidentId: incident.incidentId,
    type: incident.type,
    severity: incident.severity,
    affectedTransactions: incident.affectedTransactions,
    affectedAmount: incident.affectedAmount,
    affectedCustomers: customers.size || incident.affectedCustomers,
    durationMinutes,
    commonPatterns: {
      merchant: Array.from(merchants).join(', '),
      webhookEndpoint: Array.from(endpoints).join(', ') || '/webhooks/payment',
      failureCodes: Array.from(failureCodes)
    },
    paymentStates,
    orderStates,
    webhookStats,
    ml: {
      averageAnomalyScore: reconstructedStates.length > 0 ? (mlTotalScore / reconstructedStates.length) : 0,
      anomalousTransactions: mlAnomalousCount
    },
    evidence: incident.evidence
  };

  return sanitizeContext(context);
};

module.exports = {
  sanitizeContext,
  buildIncidentContext
};
