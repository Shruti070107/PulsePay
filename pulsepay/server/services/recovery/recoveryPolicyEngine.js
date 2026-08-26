/**
 * Recovery Safety / Policy Engine
 * Deterministic guardrails that constrain all recovery actions.
 * The AI reasoning layer CANNOT bypass or override these rules.
 */

const DEFAULT_POLICY = {
  maxRetries: 2,
  maxCumulativeAttempts: 3,
  minTimeBetweenRetriesMinutes: 2,
  maxAutomatedRetryAmount: 50000,
  allowAutomatedRetry: true,
  allowRecoveryLinks: true,
};

const PERMANENT_FAILURE_CODES = [
  'CARD_EXPIRED',
  'INVALID_CARD_NUMBER',
  'LOST_OR_STOLEN_CARD',
  'FRAUD_SUSPECTED',
  'ACCOUNT_BLOCKED',
  'INVALID_ACCOUNT_DETAILS',
  'DO_NOT_HONOR_PERMANENT',
];

const evaluateRecoveryPolicies = (input, customPolicy = {}) => {
  const policy = { ...DEFAULT_POLICY, ...customPolicy };
  const {
    paymentId,
    amount = 0,
    failureReason = 'UNKNOWN_FAILURE',
    retryCount = 0,
    timeSinceFailureMinutes = 0,
    expectedValue = 0,
    recommendedAction = 'RETRY_PAYMENT',
    isDuplicate = false,
    riskScore = 0,
  } = input;

  const reasonUpper = String(failureReason).toUpperCase();
  const policyChecks = [];
  let blocked = false;
  let blockedReason = null;

  const isHaltAction = recommendedAction === 'STOP_RECOVERY' || recommendedAction === 'NO_ACTION';
  const isRetryAction = [
    'RETRY_PAYMENT', 
    'WAIT_AND_RETRY', 
    'DELAYED_RETRY', 
    'IMMEDIATE_RETRY', 
    'ALTERNATE_ROUTE'
  ].includes(recommendedAction);

  // Rule 1: STOP_RECOVERY / NO_ACTION action
  if (isHaltAction) {
    policyChecks.push({
      rule: 'RECOVERY_ELIGIBILITY',
      passed: false,
      details: 'Recovery is halted due to zero/negative expected value, high risk, or permanent failure.',
    });
    return {
      allowed: false,
      blocked: true,
      reason: 'Action is STOP_RECOVERY / NO_ACTION',
      whySafe: 'Safely halted to prevent unnecessary customer friction or gateway fees.',
      policyChecks,
    };
  }

  // Rule 2: Permanent failure gate
  const isPermanent = PERMANENT_FAILURE_CODES.some(code => reasonUpper.includes(code));
  if (isPermanent && isRetryAction) {
    blocked = true;
    blockedReason = `Permanent failure signature (${failureReason}) cannot be resolved by automated retry.`;
    policyChecks.push({
      rule: 'PERMANENT_FAILURE_GATE',
      passed: false,
      details: blockedReason,
    });
  } else {
    policyChecks.push({
      rule: 'PERMANENT_FAILURE_GATE',
      passed: true,
      details: 'Failure signature is transient and eligible for recovery.',
    });
  }

  // Rule 3: Max retry count limit
  if (isRetryAction && retryCount >= policy.maxRetries) {
    blocked = true;
    blockedReason = `Maximum automated retry limit (${policy.maxRetries}) exceeded. (Current retries: ${retryCount})`;
    policyChecks.push({
      rule: 'MAX_RETRY_LIMIT',
      passed: false,
      details: blockedReason,
    });
  } else {
    policyChecks.push({
      rule: 'MAX_RETRY_LIMIT',
      passed: true,
      details: `Retry count (${retryCount}) is within policy threshold (≤ ${policy.maxRetries}).`,
    });
  }

  // Rule 4: Duplicate payment protection
  if (isDuplicate || reasonUpper.includes('DUPLICATE')) {
    if (isRetryAction) {
      blocked = true;
      blockedReason = 'Duplicate transaction flag active. Automated retry blocked to prevent double-charging.';
      policyChecks.push({
        rule: 'DUPLICATE_CHARGE_PROTECTION',
        passed: false,
        details: blockedReason,
      });
    } else {
      policyChecks.push({
        rule: 'DUPLICATE_CHARGE_PROTECTION',
        passed: true,
        details: 'Action is non-billing reconciliation.',
      });
    }
  } else {
    policyChecks.push({
      rule: 'DUPLICATE_CHARGE_PROTECTION',
      passed: true,
      details: 'No duplicate charge indicators detected.',
    });
  }

  // Rule 5: High Amount Ceiling (Above threshold requires recovery link rather than automated retry)
  if (isRetryAction && amount > policy.maxAutomatedRetryAmount) {
    blocked = true;
    blockedReason = `Transaction amount (₹${amount}) exceeds automated retry ceiling (₹${policy.maxAutomatedRetryAmount}).`;
    policyChecks.push({
      rule: 'MAX_AMOUNT_CEILING',
      passed: false,
      details: blockedReason,
    });
  } else {
    policyChecks.push({
      rule: 'MAX_AMOUNT_CEILING',
      passed: true,
      details: `Amount ₹${amount} is within automated recovery ceiling.`,
    });
  }

  // Rule 6: Expected Value Positivity
  if (expectedValue <= 0) {
    blocked = true;
    blockedReason = 'Action has non-positive Expected Value (EV ≤ 0).';
    policyChecks.push({
      rule: 'POSITIVE_EXPECTED_VALUE',
      passed: false,
      details: blockedReason,
    });
  } else {
    policyChecks.push({
      rule: 'POSITIVE_EXPECTED_VALUE',
      passed: true,
      details: `Positive Expected Value verified (EV: ₹${expectedValue}).`,
    });
  }

  // Rule 7: High Fraud/Risk Indicator Check
  if (riskScore >= 80) {
    blocked = true;
    blockedReason = `Elevated risk score (${riskScore}/100) requires manual security clearance.`;
    policyChecks.push({
      rule: 'FRAUD_RISK_GATE',
      passed: false,
      details: blockedReason,
    });
  } else {
    policyChecks.push({
      rule: 'FRAUD_RISK_GATE',
      passed: true,
      details: `Risk score (${riskScore}/100) is within safe operational bounds.`,
    });
  }

  const passedCount = policyChecks.filter(c => c.passed).length;
  const whySafe = !blocked 
    ? `All ${passedCount} safety policies passed: retry count (${retryCount} ≤ ${policy.maxRetries}), no permanent decline code, duplicate guard verified, and positive expected value.`
    : `Execution blocked by safety policy: ${blockedReason}`;

  return {
    allowed: !blocked,
    blocked,
    reason: blockedReason,
    whySafe,
    policyChecks,
  };
};

module.exports = {
  evaluateRecoveryPolicies,
  DEFAULT_POLICY,
  PERMANENT_FAILURE_CODES,
};
