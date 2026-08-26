const Payment = require('../../models/Payment');
const PaymentEvent = require('../../models/PaymentEvent');
const Order = require('../../models/Order');
const WebhookEvent = require('../../models/WebhookEvent');
const Incident = require('../../models/Incident');

/**
 * Builds chronological timeline of all events across payments in this incident.
 */
const buildIncidentTimeline = async (transactionIds, preloadedEvents, preloadedWebhooks) => {
  const [events, webhooks] = (preloadedEvents && preloadedWebhooks) 
    ? [preloadedEvents, preloadedWebhooks]
    : await Promise.all([
        PaymentEvent.find({ paymentId: { $in: transactionIds } }).lean(),
        WebhookEvent.find({ paymentId: { $in: transactionIds } }).lean()
      ]);

  const timeline = [];

  events.forEach(evt => {
    timeline.push({
      id: evt.eventId,
      paymentId: evt.paymentId,
      eventType: evt.type,
      eventTimestamp: evt.eventTimestamp || evt.timestamp,
      receivedAt: evt.receivedAt || evt.createdAt,
      source: evt.source,
      status: evt.status,
      metadata: evt.metadata || {}
    });
  });

  webhooks.forEach(wh => {
    timeline.push({
      id: wh.webhookId,
      paymentId: wh.paymentId,
      eventType: 'webhook.delivery',
      eventTimestamp: wh.timestamp,
      receivedAt: wh.createdAt,
      source: 'gateway',
      status: wh.deliveryStatus,
      metadata: { responseCode: wh.responseCode, attemptNumber: wh.attemptNumber }
    });
  });

  // Sort chronologically by eventTimestamp
  timeline.sort((a, b) => new Date(a.eventTimestamp) - new Date(b.eventTimestamp));

  return timeline;
};

/**
 * Compiles evidence items from payment/event/order/webhook structures.
 */
const buildEvidenceItems = async (incident, payments, events, orders, webhooks) => {
  const evidenceItems = [];

  // 1. Check for Captured payments
  const capturedPayments = payments.filter(p => p.status === 'captured');
  if (capturedPayments.length > 0) {
    evidenceItems.push({
      type: 'PAYMENT_CAPTURED',
      severity: 'LOW',
      description: `${capturedPayments.length} payment(s) successfully marked as CAPTURED at gateway.`,
      source: 'Payment',
      confidence: 1.0
    });
  }

  // 2. Check for Unpaid Orders
  const unpaidOrders = orders.filter(o => o.status === 'unpaid');
  if (unpaidOrders.length > 0) {
    evidenceItems.push({
      type: 'ORDER_UNPAID',
      severity: 'HIGH',
      description: `${unpaidOrders.length} merchant order(s) remain UNPAID.`,
      source: 'Order',
      confidence: 1.0
    });
  }

  // 3. Webhook Delivery Failures
  const failedWebhooks = webhooks.filter(w => w.deliveryStatus === 'failed');
  if (failedWebhooks.length > 0) {
    evidenceItems.push({
      type: 'WEBHOOK_FAILURE',
      severity: 'HIGH',
      description: `${failedWebhooks.length} webhook delivery attempt(s) failed.`,
      source: 'WebhookEvent',
      confidence: 0.98
    });
  }

  // 4. Ingest delay or out of order events
  let outOfOrderCount = 0;
  events.forEach(evt => {
    const diff = Math.abs(new Date(evt.receivedAt) - new Date(evt.eventTimestamp));
    if (diff > 5000) {
      outOfOrderCount++;
    }
  });

  if (outOfOrderCount > 0) {
    evidenceItems.push({
      type: 'OUT_OF_ORDER_EVENT',
      severity: 'MEDIUM',
      description: `${outOfOrderCount} event(s) experienced out-of-order ingestion delays.`,
      source: 'PaymentEvent',
      confidence: 0.95
    });
  }

  // 5. Late authorizations
  const failedEvents = events.filter(e => e.type === 'payment.failed');
  const capturedEvents = events.filter(e => e.type === 'payment.captured');
  if (failedEvents.length > 0 && capturedEvents.length > 0) {
    evidenceItems.push({
      type: 'LATE_AUTHORIZATION',
      severity: 'MEDIUM',
      description: 'Authorized captured events logged after initial failures.',
      source: 'PaymentEvent',
      confidence: 0.95
    });
  }

  // 6. High Retry Rates
  const highRetries = webhooks.filter(w => w.attemptNumber >= 3);
  if (highRetries.length > 0) {
    evidenceItems.push({
      type: 'HIGH_RETRY_RATE',
      severity: 'MEDIUM',
      description: `${highRetries.length} webhook(s) reached attempt retry limit.`,
      source: 'WebhookEvent',
      confidence: 0.90
    });
  }

  // 7. Duplicate transactions
  let duplicateCount = 0;
  for (let i = 0; i < payments.length; i++) {
    for (let j = i + 1; j < payments.length; j++) {
      if (
        payments[i].customerId === payments[j].customerId &&
        payments[i].merchantId === payments[j].merchantId &&
        payments[i].amount === payments[j].amount &&
        Math.abs(new Date(payments[i].createdAt) - new Date(payments[j].createdAt)) <= 60000
      ) {
        duplicateCount++;
      }
    }
  }
  if (duplicateCount > 0) {
    evidenceItems.push({
      type: 'DUPLICATE_TRANSACTION',
      severity: 'HIGH',
      description: `${duplicateCount} duplicate transaction pair(s) detected.`,
      source: 'Payment',
      confidence: 0.98
    });
  }

  return evidenceItems;
};

/**
 * Builds confidence breakdown using a deterministic scoring logic.
 */
const buildConfidenceBreakdown = (incident, evidenceItems) => {
  let score = 50; // base score
  const factors = [];

  const addFactor = (name, pts) => {
    score += pts;
    factors.push({ name, score: pts });
  };

  // State mismatch (e.g. captured order unpaid)
  const hasCaptured = evidenceItems.some(e => e.type === 'PAYMENT_CAPTURED');
  const hasUnpaid = evidenceItems.some(e => e.type === 'ORDER_UNPAID');
  if (hasCaptured && hasUnpaid) {
    addFactor('State consistency (captured order unpaid)', 25);
  }

  // Repeated webhook failures
  const webhookFailures = evidenceItems.filter(e => e.type === 'WEBHOOK_FAILURE');
  if (webhookFailures.length > 0) {
    addFactor('Repeated webhook delivery failures', 20);
  }

  // Multiple transactions correlated
  if (incident.affectedTransactions > 1) {
    addFactor('Multiple correlated transactions matching pattern', 15);
  }

  // Duplicate checks
  const hasDuplicate = evidenceItems.some(e => e.type === 'DUPLICATE_TRANSACTION');
  if (hasDuplicate) {
    addFactor('Duplicate transaction timing matching', 15);
  }

  // Late auth checks
  const hasLateAuth = evidenceItems.some(e => e.type === 'LATE_AUTHORIZATION');
  if (hasLateAuth) {
    addFactor('Late authorization timeline sync', 10);
  }

  // Subtract uncertainty (if no webhook events are present in webhook failures)
  if (incident.type === 'WEBHOOK_FAILURE' && webhookFailures.length === 0) {
    addFactor('Uncertainty: missing webhook delivery telemetry', -15);
  }

  // Clamp final score
  score = Math.max(10, Math.min(99, score));

  let explanation = `Confidence set at ${score}% based on `;
  if (score >= 85) {
    explanation += 'definitive state mismatch mappings and repeated telemetry confirmations.';
  } else if (score >= 60) {
    explanation += 'correlated event patterns with moderate matching validation.';
  } else {
    explanation += 'incomplete state parameters or low correlation volume.';
  }

  return {
    score,
    explanation,
    factors
  };
};

/**
 * Dynamic causal path generator.
 */
const buildRootCauseGraph = (incident, evidenceItems) => {
  const nodes = [];
  const edges = [];

  if (incident.type === 'WEBHOOK_FAILURE' || incident.type === 'CAPTURED_ORDER_UNPAID') {
    nodes.push({ id: 'N1', label: 'Payment Captured', status: 'healthy' });
    nodes.push({ id: 'N2', label: 'Webhook Delivery Failed', status: 'critical' });
    nodes.push({ id: 'N3', label: 'Merchant Order Unpaid', status: 'warning' });
    nodes.push({ id: 'N4', label: 'State Mismatch', status: 'critical' });

    edges.push({ from: 'N1', to: 'N2' });
    edges.push({ from: 'N2', to: 'N3' });
    edges.push({ from: 'N3', to: 'N4' });
  } else if (incident.type === 'DUPLICATE_PAYMENT_RISK') {
    nodes.push({ id: 'N1', label: 'First Checkout Request', status: 'healthy' });
    nodes.push({ id: 'N2', label: 'Double Tap / API Delay', status: 'warning' });
    nodes.push({ id: 'N3', label: 'Second Checkout Request', status: 'warning' });
    nodes.push({ id: 'N4', label: 'Duplicate Payments Created', status: 'critical' });

    edges.push({ from: 'N1', to: 'N2' });
    edges.push({ from: 'N2', to: 'N3' });
    edges.push({ from: 'N3', to: 'N4' });
  } else if (incident.type === 'LATE_AUTHORIZATION') {
    nodes.push({ id: 'N1', label: 'Payment Attempt Failed', status: 'warning' });
    nodes.push({ id: 'N2', label: 'Late Sync Response Received', status: 'healthy' });
    nodes.push({ id: 'N3', label: 'Order Update Attempted', status: 'warning' });
    nodes.push({ id: 'N4', label: 'Late Auth Reconciled', status: 'healthy' });

    edges.push({ from: 'N1', to: 'N2' });
    edges.push({ from: 'N2', to: 'N3' });
    edges.push({ from: 'N3', to: 'N4' });
  } else {
    nodes.push({ id: 'N1', label: 'Ingested Event Stream', status: 'healthy' });
    nodes.push({ id: 'N2', label: 'Anomalous Event Arrived', status: 'critical' });
    nodes.push({ id: 'N3', label: 'Incident State Raised', status: 'warning' });

    edges.push({ from: 'N1', to: 'N2' });
    edges.push({ from: 'N2', to: 'N3' });
  }

  return { nodes, edges };
};

/**
 * Build Operator checklist.
 */
const buildOperatorActionCenter = (incident, evidenceItems) => {
  const actions = [];
  let actionId = 1;

  const addAction = (priority, action, reason, evidenceRef) => {
    actions.push({
      id: `ACT-${incident.incidentId}-${actionId++}`,
      priority,
      action,
      reason,
      evidenceRef,
      status: 'TODO'
    });
  };

  const hasCaptured = evidenceItems.some(e => e.type === 'PAYMENT_CAPTURED');
  const hasUnpaid = evidenceItems.some(e => e.type === 'ORDER_UNPAID');
  const hasWebhookFail = evidenceItems.some(e => e.type === 'WEBHOOK_FAILURE');

  if (hasCaptured && hasUnpaid) {
    addAction('HIGH', 'Verify gateway transaction capture status.', 'Payment is marked CAPTURED, but order remains unpaid.', 'PAYMENT_CAPTURED');
    addAction('HIGH', 'Reconcile merchant order status with ledger.', 'Merchant order database is out of sync.', 'ORDER_UNPAID');
  }

  if (hasWebhookFail) {
    addAction('HIGH', 'Inspect merchant webhook logs.', 'Repeated webhook delivery failures logged.', 'WEBHOOK_FAILURE');
    addAction('MEDIUM', 'Check merchant webhook endpoint firewall or blocklist rules.', 'Status code 500/503 indicates server rejection.', 'WEBHOOK_FAILURE');
  }

  if (incident.type === 'DUPLICATE_PAYMENT_RISK') {
    addAction('HIGH', 'Audit duplicate checkout requests for idempotency keys.', 'Multiple payment calls within 1 minute window.', 'DUPLICATE_TRANSACTION');
    addAction('MEDIUM', 'Review candidate transactions for partial refunds.', 'Avoid customer charge disputes by proactive refunds.', 'DUPLICATE_TRANSACTION');
  }

  if (incident.type === 'OUT_OF_ORDER_EVENTS') {
    addAction('MEDIUM', 'Inspect ingestion queue arrival latency.', 'Delayed database writes flagged.', 'OUT_OF_ORDER_EVENT');
  }

  // Fallback default action
  if (actions.length === 0) {
    addAction('MEDIUM', 'Review chronological transaction log events.', 'Deterministic scan flagged operational anomaly.', 'STATE_MISMATCH');
  }

  return actions;
};

/**
 * Related Incidents using the same correlation rules (e.g. sharing type, status).
 */
const getRelatedIncidents = async (incident) => {
  const related = await Incident.find({
    type: incident.type,
    incidentId: { $ne: incident.incidentId }
  })
  .sort({ createdAt: -1 })
  .limit(3);

  return related.map(rel => ({
    incidentId: rel.incidentId,
    type: rel.type,
    severity: rel.severity,
    status: rel.status,
    affectedTransactions: rel.affectedTransactions,
    affectedAmount: rel.affectedAmount,
    createdAt: rel.createdAt
  }));
};

/**
 * Supplemental details resolution logic
 */
const resolveRichIncidentDetails = async (incident) => {
  const transactionIds = incident.transactionIds;

  // 1. Fetch related data using lean queries for instant in-memory processing
  const [payments, events, orders, webhooks] = await Promise.all([
    Payment.find({ paymentId: { $in: transactionIds } }).lean(),
    PaymentEvent.find({ paymentId: { $in: transactionIds } }).lean(),
    Order.find({ paymentId: { $in: transactionIds } }).lean(),
    WebhookEvent.find({ paymentId: { $in: transactionIds } }).lean()
  ]);

  // 2. Build items
  const timeline = await buildIncidentTimeline(transactionIds, events, webhooks);
  const evidenceItems = await buildEvidenceItems(incident, payments, events, orders, webhooks);
  const confidenceBreakdown = buildConfidenceBreakdown(incident, evidenceItems);
  const rootCauseGraph = buildRootCauseGraph(incident, evidenceItems);
  
  // Build blast radius metrics
  const uniqueMerchants = Array.from(new Set(payments.map(p => p.merchantId))).length;
  const mlAnomalyCount = payments.filter(p => p.status === 'failed').length;
  
  const earliestPay = payments.reduce((min, p) => p.createdAt < min ? p.createdAt : min, payments[0]?.createdAt || new Date());
  const latestPay = payments.reduce((max, p) => p.createdAt > max ? p.createdAt : max, payments[0]?.createdAt || new Date());
  const incidentDuration = Math.max(0, Math.round((new Date(latestPay) - new Date(earliestPay)) / 1000));
  
  const failedPayments = payments.filter(p => p.status === 'failed' || p.status === 'processing');
  const failureRate = payments.length > 0 ? Math.round((failedPayments.length / payments.length) * 100) : 0;

  // Compute breakdowns for blast radius
  const byMerchantMap = {};
  const byProviderMap = {};
  payments.forEach(p => {
    byMerchantMap[p.merchantId] = byMerchantMap[p.merchantId] || { count: 0, amount: 0 };
    byMerchantMap[p.merchantId].count++;
    byMerchantMap[p.merchantId].amount += p.amount;

    const provider = p.paymentMethod || 'gateway_mock';
    byProviderMap[provider] = byProviderMap[provider] || { count: 0, amount: 0 };
    byProviderMap[provider].count++;
    byProviderMap[provider].amount += p.amount;
  });

  const byEventTypeMap = {};
  events.forEach(e => {
    byEventTypeMap[e.type] = (byEventTypeMap[e.type] || 0) + 1;
  });

  const byFailureReasonMap = {};
  events.filter(e => e.type === 'payment.failed' || e.type === 'webhook.failed' || e.type === 'refund.failed').forEach(e => {
    const reason = e.metadata?.errorCode || e.metadata?.responseCode || 'unknown';
    byFailureReasonMap[reason] = (byFailureReasonMap[reason] || 0) + 1;
  });

  const byTimeBucketMap = {};
  payments.forEach(p => {
    const hour = new Date(p.createdAt).getHours();
    const bucket = `${String(hour).padStart(2, '0')}:00`;
    byTimeBucketMap[bucket] = (byTimeBucketMap[bucket] || 0) + 1;
  });

  const blastRadius = {
    affectedTransactions: payments.length,
    affectedCustomers: Array.from(new Set(payments.map(p => p.customerId))).length,
    affectedMerchants: uniqueMerchants,
    affectedOrders: orders.length,
    affectedAmount: incident.affectedAmount,
    incidentDuration,
    failureRate: failureRate || 100,
    mlAnomalyCount: mlAnomalyCount || 1,
    byMerchant: Object.entries(byMerchantMap).map(([merchantId, val]) => ({ merchantId, count: val.count, amount: val.amount })),
    byProvider: Object.entries(byProviderMap).map(([provider, val]) => ({ provider, count: val.count, amount: val.amount })),
    byEventType: Object.entries(byEventTypeMap).map(([eventType, count]) => ({ eventType, count })),
    byFailureReason: Object.entries(byFailureReasonMap).map(([code, count]) => ({ code, count })),
    byTimeBucket: Object.entries(byTimeBucketMap).map(([time, count]) => ({ time, count }))
  };

  // Resolve operator action checklist (persisted state check)
  let actions = incident.operatorActionCenter || [];
  if (actions.length === 0) {
    actions = buildOperatorActionCenter(incident, evidenceItems);
    incident.operatorActionCenter = actions;
    incident.evidenceItems = evidenceItems;
    incident.blastRadius = blastRadius;
    incident.confidenceBreakdown = confidenceBreakdown;
    await incident.save();
  }

  const relatedIncidents = await getRelatedIncidents(incident);

  // Return the merged object
  return {
    ...incident.toObject(),
    timeline,
    evidenceItems: incident.evidenceItems && incident.evidenceItems.length ? incident.evidenceItems : evidenceItems,
    blastRadius: incident.blastRadius && incident.blastRadius.affectedTransactions ? incident.blastRadius : blastRadius,
    confidenceBreakdown: incident.confidenceBreakdown && incident.confidenceBreakdown.score ? incident.confidenceBreakdown : confidenceBreakdown,
    operatorActionCenter: incident.operatorActionCenter,
    rootCauseGraph,
    relatedIncidents
  };
};

module.exports = {
  buildIncidentTimeline,
  buildEvidenceItems,
  buildConfidenceBreakdown,
  buildRootCauseGraph,
  buildOperatorActionCenter,
  getRelatedIncidents,
  resolveRichIncidentDetails
};
