const Payment = require('../../models/Payment');
const { reconstructFullState } = require('../stateEngine');
const { predictAnomaly } = require('../ml/mlClient');
const { calculateMerchantBaseline } = require('../analytics/baselineEngine');

const scanPaymentsForAnomalies = async (timeWindowHours = 24) => {
  const query = {};
  if (timeWindowHours) {
    const cutoff = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);
    query.createdAt = { $gte: cutoff };
  }

  const payments = await Payment.find(query);
  const signals = [];

  for (const payment of payments) {
    try {
      const stateResult = await reconstructFullState(payment.paymentId);
      const mlResult = await predictAnomaly(payment.paymentId);
      
      const isDeterministicAnomaly = stateResult.overallState !== 'HEALTHY';
      const isMLAnomaly = mlResult.is_anomaly;

      // Calculate merchant baselines for Amount Anomaly detection
      const baseline = await calculateMerchantBaseline(payment.merchantId);
      let isAmountAnomaly = false;
      let amountEvidence = null;

      if (baseline && baseline.success) {
        const zScore = Math.abs(payment.amount - baseline.averageAmount) / baseline.stdDev;
        if (zScore > 2.5) {
          isAmountAnomaly = true;
          const devPercent = Math.round(((payment.amount - baseline.averageAmount) / baseline.averageAmount) * 100);
          amountEvidence = `Amount anomaly: Z-score ${zScore.toFixed(1)} (${devPercent > 0 ? '+' : ''}${devPercent}% deviation against merchant average ₹${baseline.averageAmount})`;
        }
      }

      if (isDeterministicAnomaly || isMLAnomaly || isAmountAnomaly) {
        let failureCode = null;
        let endpoint = `https://api.merchant.com/webhooks`;

        const failedEvent = stateResult.timeline.find(
          e => e.eventType === 'webhook.failed' || e.eventType === 'webhook.delivered'
        );
        if (failedEvent && failedEvent.metadata) {
          if (failedEvent.metadata.responseCode) {
            failureCode = String(failedEvent.metadata.responseCode);
          }
          if (failedEvent.metadata.endpoint) {
            endpoint = failedEvent.metadata.endpoint;
          }
        }

        const evidence = [...stateResult.evidence];
        if (isMLAnomaly) {
          evidence.push(`Machine learning model flagged transaction as statistically anomalous (Anomaly Score: ${mlResult.normalized_anomaly_score.toFixed(2)})`);
        }
        if (isAmountAnomaly && amountEvidence) {
          evidence.push(amountEvidence);
        }

        let signalType = isDeterministicAnomaly ? stateResult.overallState : 'STATISTICALLY_ANOMALOUS';
        if (isAmountAnomaly && !isDeterministicAnomaly && !isMLAnomaly) {
          signalType = 'STATISTICALLY_ANOMALOUS';
        }

        signals.push({
          paymentId: payment.paymentId,
          customerId: stateResult.customerId,
          merchantId: stateResult.merchantId,
          type: signalType,
          timestamp: payment.createdAt,
          amount: stateResult.amount,
          currency: stateResult.currency,
          paymentMethod: stateResult.paymentMethod,
          processor: 'gateway_mock',
          failureCode,
          endpoint,
          evidence
        });
      }
    } catch (err) {
      console.error(`Error scanning payment ${payment.paymentId}:`, err.message);
    }
  }

  return signals;
};

module.exports = {
  scanPaymentsForAnomalies
};
