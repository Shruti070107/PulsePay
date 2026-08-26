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
  const merchantBaselineCache = new Map();

  const getCachedBaseline = async (merchantId) => {
    if (!merchantId) return null;
    if (merchantBaselineCache.has(merchantId)) {
      return merchantBaselineCache.get(merchantId);
    }
    const b = await calculateMerchantBaseline(merchantId).catch(() => null);
    merchantBaselineCache.set(merchantId, b);
    return b;
  };

  const processPayment = async (payment) => {
    try {
      const [stateResult, mlResult, baseline] = await Promise.all([
        reconstructFullState(payment.paymentId),
        predictAnomaly(payment.paymentId),
        getCachedBaseline(payment.merchantId)
      ]);
      
      const isDeterministicAnomaly = stateResult.overallState !== 'HEALTHY';
      const isMLAnomaly = mlResult.is_anomaly;

      let isAmountAnomaly = false;
      let amountEvidence = null;

      if (baseline && baseline.success && baseline.stdDev > 0) {
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

        return {
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
        };
      }
    } catch (err) {
      console.error(`Error scanning payment ${payment.paymentId}:`, err.message);
    }
    return null;
  };

  const CHUNK_SIZE = 10;
  for (let i = 0; i < payments.length; i += CHUNK_SIZE) {
    const chunk = payments.slice(i, i + CHUNK_SIZE);
    const chunkResults = await Promise.all(chunk.map(processPayment));
    chunkResults.filter(Boolean).forEach(s => signals.push(s));
  }

  return signals;
};

module.exports = {
  scanPaymentsForAnomalies
};
