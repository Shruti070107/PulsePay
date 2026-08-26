const Incident = require('../../models/Incident');
const { scanPaymentsForAnomalies } = require('../detection/anomalyDetector');
const { groupSignalsIntoIncidents, generateGroupingRationale } = require('./correlationEngine');
const { analyzeImpact } = require('./impactAnalyzer');
const { randomId } = require('../../utils/idGenerator');

/**
 * Maps the state engine overallState + webhookState into the Mongoose Incident type enum
 */
const mapStateToIncidentType = (stateType, webhookState) => {
  if (stateType === 'AMBIGUOUS') {
    return webhookState === 'FAILED' ? 'WEBHOOK_FAILURE' : 'CAPTURED_ORDER_UNPAID';
  }
  if (stateType === 'DUPLICATE_RISK') return 'DUPLICATE_PAYMENT_RISK';
  if (stateType === 'EVENT_ORDER_ANOMALY') return 'OUT_OF_ORDER_EVENTS';
  if (stateType === 'REFUND_ANOMALY') return 'REFUND_INCONSISTENCY';
  if (stateType === 'LATE_AUTHORIZATION') return 'LATE_AUTHORIZATION';
  if (stateType === 'STATISTICALLY_ANOMALOUS') return 'STATISTICALLY_ANOMALOUS';
  return 'WEBHOOK_FAILURE'; // fallback
};

const runIncidentDetectionAndAggregation = async (timeWindowHours = 24) => {
  // 1. Scan and detect raw anomaly signals
  const signals = await scanPaymentsForAnomalies(timeWindowHours);
  
  if (signals.length === 0) {
    return {
      success: true,
      incidentsDetected: 0,
      transactionsProcessed: 0
    };
  }

  // 2. Correlate and group signals
  const groups = groupSignalsIntoIncidents(signals);

  let incidentsDetected = 0;

  for (const group of groups) {
    const leader = group[0];
    const mappedType = mapStateToIncidentType(leader.type, leader.webhookState);
    const impact = analyzeImpact(group);

    // Grouping Rationale, Primary/Secondary signals, Possible Root Causes
    const groupingRationale = generateGroupingRationale(group);
    const primarySignals = Array.from(new Set(group.map(s => s.type)));
    const secondarySignals = Array.from(new Set(group.map(s => s.failureCode).filter(Boolean)));
    const possibleRootCauses = [
      leader.failureCode ? `Gateway endpoint response failure code: ${leader.failureCode}` : 'Gateway/Network processing latency timeout',
      leader.type === 'DUPLICATE_RISK' ? 'Idempotent key missing from transaction request header' : 'Webhooks delivery retry threshold exceeded'
    ];

    // Split evidence into deterministic vs statistical
    const deterministicEvidence = impact.evidence.filter(e => !e.includes('Machine learning') && !e.includes('Anomaly Score'));
    const statisticalEvidence = impact.evidence.filter(e => e.includes('Machine learning') || e.includes('Anomaly Score') || e.includes('Z-score') || e.includes('average amount'));

    // Try to find an existing active/investigating incident of the same type & status
    let incidentDoc = await Incident.findOne({
      type: mappedType,
      status: { $in: ['active', 'investigating'] }
    });

    if (incidentDoc) {
      // Merge with existing incident
      const mergedTransactionIds = Array.from(new Set([...incidentDoc.transactionIds, ...impact.transactionIds]));
      
      // Recalculate metrics
      incidentDoc.transactionIds = mergedTransactionIds;
      incidentDoc.affectedTransactions = mergedTransactionIds.length;
      
      // Merge evidence
      const mergedEvidence = Array.from(new Set([...incidentDoc.evidence, ...impact.evidence]));
      incidentDoc.evidence = mergedEvidence;
      incidentDoc.deterministicEvidence = Array.from(new Set([...incidentDoc.deterministicEvidence, ...deterministicEvidence]));
      incidentDoc.statisticalEvidence = Array.from(new Set([...incidentDoc.statisticalEvidence, ...statisticalEvidence]));
      incidentDoc.primarySignals = Array.from(new Set([...incidentDoc.primarySignals, ...primarySignals]));
      incidentDoc.secondarySignals = Array.from(new Set([...incidentDoc.secondarySignals, ...secondarySignals]));

      // Adjust amounts and customers (merging counts without double counting)
      const existingTxns = new Set(incidentDoc.transactionIds.slice(0, -impact.transactionIds.length));
      let newAmount = incidentDoc.affectedAmount;
      group.forEach(s => {
        if (!existingTxns.has(s.paymentId)) {
          newAmount += s.amount;
        }
      });
      incidentDoc.affectedAmount = newAmount;
      incidentDoc.groupingRationale = groupingRationale;
      
      // Save changes
      await incidentDoc.save();
    } else {
      // Create new incident
      const incidentId = `INC-${randomId(6).toUpperCase()}`;
      
      const explanationMap = {
        'WEBHOOK_FAILURE': 'Payment was captured but webhook delivery repeatedly failed, leaving the order unpaid.',
        'CAPTURED_ORDER_UNPAID': 'Payment was captured successfully, but the merchant order remains unpaid.',
        'DUPLICATE_PAYMENT_RISK': 'Multiple identical payment attempts detected for the same customer, merchant, and amount in a short window.',
        'OUT_OF_ORDER_EVENTS': 'Payment events were ingested out of logical chronological sequence.',
        'REFUND_INCONSISTENCY': 'Refund request was initiated but failed to complete successfully at the payment processor.',
        'LATE_AUTHORIZATION': 'A transaction that initially returned a failure event was later captured or authorized by the processor.',
        'STATISTICALLY_ANOMALOUS': 'Transaction(s) flagged as statistically anomalous by the Isolation Forest model.'
      };

      // Fetch related incidents
      const relatedIncidents = await Incident.find({
        type: mappedType,
        incidentId: { $ne: incidentId }
      }).limit(3).select('incidentId type severity status affectedTransactions affectedAmount').lean();

      await Incident.create({
        incidentId,
        type: mappedType,
        severity: impact.severity,
        status: 'active',
        affectedTransactions: impact.affectedTransactions,
        affectedAmount: impact.affectedAmount,
        affectedCustomers: impact.affectedCustomers,
        transactionIds: impact.transactionIds,
        evidence: impact.evidence,
        deterministicEvidence,
        statisticalEvidence,
        aiEvidence: [],
        primarySignals,
        secondarySignals,
        relatedIncidents,
        possibleRootCauses,
        groupingRationale,
        rootCause: 'Pending operator review',
        confidence: 1.0,
        recommendation: 'Check merchant endpoint logs, retry scheduler, and bank settlement sheets.',
        explanation: explanationMap[mappedType] || 'Multiple payment anomalies detected with similar characteristics.',
        operatorActions: [
          'Verify transaction lifecycle on gateway dashboard',
          'Review webhook responses and failure counts',
          'Coordinate manually with merchant orders database'
        ]
      });
      
      incidentsDetected++;
    }
  }

  return {
    success: true,
    incidentsDetected,
    transactionsProcessed: signals.length
  };
};

module.exports = {
  mapStateToIncidentType,
  runIncidentDetectionAndAggregation
};
