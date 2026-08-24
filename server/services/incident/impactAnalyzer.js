const calculateSeverity = (transactionCount, affectedAmount) => {
  if (affectedAmount >= 100000 || transactionCount >= 500) {
    return 'CRITICAL';
  }
  if (affectedAmount >= 10000 || transactionCount >= 50) {
    return 'HIGH';
  }
  if (affectedAmount >= 2000 || transactionCount >= 10) {
    return 'MEDIUM';
  }
  return 'LOW';
};

const analyzeImpact = (signals) => {
  const transactionIds = Array.from(new Set(signals.map(s => s.paymentId)));
  const affectedTransactionCount = transactionIds.length;
  
  // Total exposure amount
  const affectedAmount = signals.reduce((sum, s) => sum + s.amount, 0);
  const affectedCustomers = Array.from(new Set(signals.map(s => s.customerId))).length;

  const timestamps = signals.map(s => new Date(s.timestamp));
  const firstOccurrence = new Date(Math.min(...timestamps));
  const latestOccurrence = new Date(Math.max(...timestamps));

  let severity = calculateSeverity(affectedTransactionCount, affectedAmount);
  // Cap severity of purely statistical anomalies to LOW
  const isPureMLAnomaly = signals.every(s => s.type === 'STATISTICALLY_ANOMALOUS');
  if (isPureMLAnomaly) {
    severity = 'LOW';
  }

  // Consolidate evidence
  let allEvidence = [];
  signals.forEach(s => {
    if (s.evidence) {
      allEvidence.push(...s.evidence);
    }
  });
  const evidence = Array.from(new Set(allEvidence.filter(Boolean)));

  // Calculate Recoverable Amount (Estimated Financial Mismatch)
  let recoverableAmount = 0;
  signals.forEach(s => {
    if (s.type === 'AMBIGUOUS' || s.type === 'REFUND_ANOMALY') {
      recoverableAmount += s.amount;
    } else if (s.type === 'DUPLICATE_RISK') {
      // In duplicates, two payments are generated (T and T+10s), but only one is the duplicate/excess.
      // So the duplicate risk exposure is half of the total pair volume.
      recoverableAmount += (s.amount / 2);
    }
  });

  return {
    affectedTransactions: affectedTransactionCount,
    affectedAmount,
    affectedCustomers,
    firstOccurrence,
    latestOccurrence,
    severity,
    recoverableAmount: Math.round(recoverableAmount),
    evidence,
    transactionIds
  };
};

module.exports = {
  calculateSeverity,
  analyzeImpact
};
