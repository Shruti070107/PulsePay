/**
 * Multi-factor Recovery Scoring Engine
 * Combines deterministic payment state, historical baseline recovery benchmarks,
 * time decay functions, and failure reason classification.
 */

// Base recovery benchmark probabilities by failure signature
const FAILURE_REASON_PROBABILITIES = {
  // Transient / Network / System issues (High recovery potential)
  GATEWAY_TIMEOUT: 0.88,
  PROCESSING_TIMEOUT_ABANDONMENT: 0.82,
  NETWORK_TIMEOUT: 0.85,
  WEBHOOK_DELIVERY_FAILURE: 0.94,
  CAPTURED_ORDER_UNPAID_STATE_MISMATCH: 0.96,
  HTTP_504_GATEWAY_TIMEOUT: 0.87,
  HTTP_502_BAD_GATEWAY: 0.85,
  HTTP_503_SERVICE_UNAVAILABLE: 0.80,
  LATENCY_TIMEOUT: 0.84,
  OUT_OF_ORDER_INGESTION: 0.92,
  DUPLICATE_PAYMENT_RISK: 0.90, // Recoverable via reconciliation, not charging again

  // Transient Customer / Bank issues (Moderate recovery potential)
  INSUFFICIENT_FUNDS: 0.38,
  BANK_SERVER_BUSY: 0.72,
  OTP_TIMEOUT: 0.58,
  AUTHENTICATION_TIMEOUT: 0.55,
  USER_CANCELLED: 0.28,
  DO_NOT_HONOR: 0.30,

  // Permanent Failures (Low / Zero recovery potential)
  CARD_EXPIRED: 0.05,
  INVALID_CARD_NUMBER: 0.02,
  LOST_OR_STOLEN_CARD: 0.01,
  FRAUD_SUSPECTED: 0.01,
  ACCOUNT_BLOCKED: 0.02,
  INVALID_ACCOUNT_DETAILS: 0.03,
  MAX_RETRIES_EXCEEDED: 0.08,
};

const PAYMENT_METHOD_MODIFIERS = {
  upi: 1.05,
  credit_card: 1.00,
  debit_card: 0.95,
  net_banking: 0.90,
  wallet: 0.98,
};

const calculateRecoveryProbability = (input) => {
  const {
    amount,
    paymentMethod = 'upi',
    provider = 'gateway_mock',
    failureReason = 'UNKNOWN_FAILURE',
    retryCount = 0,
    timeSinceFailureMinutes = 0,
    isCapturedOrderUnpaid = false,
    hasWebhookFailure = false,
    incidentSeverity = 'LOW',
  } = input;

  // 1. Base Probability from failure code
  const reasonKey = String(failureReason).toUpperCase().replace(/\s+/g, '_');
  let baseProb = FAILURE_REASON_PROBABILITIES[reasonKey];

  if (baseProb === undefined) {
    if (isCapturedOrderUnpaid || hasWebhookFailure) {
      baseProb = 0.94;
    } else if (reasonKey.includes('TIMEOUT') || reasonKey.includes('504') || reasonKey.includes('502')) {
      baseProb = 0.86;
    } else if (reasonKey.includes('DECLINE') || reasonKey.includes('FUNDS')) {
      baseProb = 0.35;
    } else if (reasonKey.includes('FRAUD') || reasonKey.includes('STOLEN') || reasonKey.includes('EXPIRED')) {
      baseProb = 0.02;
    } else {
      baseProb = 0.50; // Neutral baseline
    }
  }

  // 2. Retry Decay (Exponential drop off after 1st attempt)
  // Each previous failed retry reduces recovery likelihood
  const retryDecay = Math.pow(0.78, retryCount);

  // 3. Time Decay (Recovery probability decays over hours)
  const timeDecayHours = timeSinceFailureMinutes / 60;
  const timeDecay = Math.max(0.60, 1.0 - (timeDecayHours * 0.03));

  // 4. Payment Method Modifier
  const methodMod = PAYMENT_METHOD_MODIFIERS[paymentMethod.toLowerCase()] || 1.0;

  // 5. Calculate Final Probability
  let recoveryProbability = baseProb * retryDecay * timeDecay * methodMod;
  recoveryProbability = Math.max(0.01, Math.min(0.98, recoveryProbability));
  recoveryProbability = Math.round(recoveryProbability * 100) / 100;

  // 6. Classification Tier
  let classification = 'POSSIBLY_RECOVERABLE';
  if (recoveryProbability >= 0.72) {
    classification = 'RECOVERABLE';
  } else if (recoveryProbability >= 0.40) {
    classification = 'POSSIBLY_RECOVERABLE';
  } else if (recoveryProbability >= 0.15) {
    classification = 'LOW_PROBABILITY';
  } else {
    classification = 'NON_RECOVERABLE';
  }

  const recoverabilityScore = Math.round(recoveryProbability * 100);

  // 7. Approximate Feature Influence (Explicitly labeled for transparency)
  const featureInfluence = [
    {
      feature: `Failure Signature (${failureReason})`,
      weight: Math.round(baseProb * 100) / 100,
      impact: baseProb >= 0.7 ? 'STRONG_POSITIVE' : baseProb <= 0.2 ? 'STRONG_NEGATIVE' : 'NEUTRAL',
    },
    {
      feature: `Retry Attempts (${retryCount} prior attempts)`,
      weight: Math.round((1 - retryDecay) * -100) / 100,
      impact: retryCount > 1 ? 'MODERATE_NEGATIVE' : 'LOW_IMPACT',
    },
    {
      feature: `Time Decay (${timeSinceFailureMinutes}m elapsed)`,
      weight: Math.round((1 - timeDecay) * -100) / 100,
      impact: timeSinceFailureMinutes > 120 ? 'MODERATE_NEGATIVE' : 'FRESH_WINDOW',
    },
    {
      feature: `Payment Method (${paymentMethod.toUpperCase()})`,
      weight: Math.round((methodMod - 1.0) * 100) / 100,
      impact: methodMod >= 1.0 ? 'POSITIVE' : 'SLIGHT_FRICTION',
    },
  ];

  // 8. Human-Readable Reasons & Explanations
  const reasons = [];
  if (isCapturedOrderUnpaid) {
    reasons.push('Gateway confirmed funds were captured; merchant ledger requires instant zero-friction reconciliation.');
  } else if (reasonKey.includes('TIMEOUT')) {
    reasons.push('Transient gateway timeout indicates network interruption with zero evidence of customer payment rejection.');
  } else if (reasonKey.includes('FUNDS')) {
    reasons.push('Insufficient funds decline; customer prompt or recovery link offers moderate recovery potential.');
  } else if (reasonKey.includes('EXPIRED') || reasonKey.includes('FRAUD')) {
    reasons.push('Permanent payment failure. Automated retry will fail and is blocked by safety policy.');
  }

  if (retryCount === 0) {
    reasons.push('First-time failure with intact customer session context.');
  } else {
    reasons.push(`Previously attempted ${retryCount} time(s); additional retries face diminishing returns.`);
  }

  const safeReason = String(failureReason || 'TRANSIENT_ERROR');
  const explanations = {
    whyThisPayment: isCapturedOrderUnpaid 
      ? `Captured payment of ₹${amount} is in an un-reconciled state with confirmed gateway receipt.`
      : `Failed due to ${safeReason.replace(/_/g, ' ')} with ₹${amount} at risk and ${recoverabilityScore}% estimated recoverability.`,
    whyNow: timeSinceFailureMinutes < 30 
      ? 'Immediate window offers peak recovery rate before customer switches vendors or abandons checkout.'
      : `${timeSinceFailureMinutes} minutes elapsed since initial decline; action required before session context expires.`,
  };

  const stopConditions = [];
  if (retryCount >= 2) stopConditions.push('Max retry limit (2) reached');
  if (recoveryProbability < 0.15) stopConditions.push('Probability below minimum viable threshold (15%)');
  if (reasonKey.includes('FRAUD')) stopConditions.push('Security / Risk trigger detected');

  return {
    recoveryProbability,
    recoverabilityScore,
    classification,
    riskScore: Math.round((1.0 - recoveryProbability) * 60 + (retryCount * 15)),
    confidence: isCapturedOrderUnpaid || baseProb >= 0.85 ? 95 : 82,
    featureInfluence,
    reasons,
    explanations,
    stopConditions,
  };
};

module.exports = {
  calculateRecoveryProbability,
  FAILURE_REASON_PROBABILITIES,
};
