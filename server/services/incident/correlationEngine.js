/**
 * Calculates similarity score (0-100) between two anomaly signals
 */
const calculateSimilarityScore = (s1, s2) => {
  let score = 0;

  // 1. Time Proximity (Max Weight: 40)
  const timeDiffSec = Math.abs(new Date(s1.timestamp) - new Date(s2.timestamp)) / 1000;
  if (timeDiffSec <= 600) { // 10 minutes sliding window
    score += 40 * (1 - timeDiffSec / 600);
  }

  // 2. Merchant ID Match (Weight: 20)
  if (s1.merchantId === s2.merchantId) {
    score += 20;
  }

  // 3. Anomaly Type Match (Weight: 20)
  if (s1.type === s2.type) {
    score += 20;
  }

  // 4. Failure Code Match (Weight: 10)
  if (s1.failureCode && s2.failureCode && s1.failureCode === s2.failureCode) {
    score += 10;
  }

  // 5. Webhook Endpoint Match (Weight: 10)
  if (s1.endpoint && s2.endpoint && s1.endpoint === s2.endpoint) {
    score += 10;
  }

  return score;
};

/**
 * Leader-Follower Clustering Algorithm
 * Clusters signals into groups where the average similarity score exceeds the threshold
 */
const groupSignalsIntoIncidents = (signals, threshold = 70) => {
  const groups = []; // Array of arrays: [[Signal1, Signal2], [Signal3]]

  for (const signal of signals) {
    let matchedGroup = null;

    for (const group of groups) {
      // Calculate average similarity score between the new signal and all signals in the group
      let totalScore = 0;
      for (const member of group) {
        totalScore += calculateSimilarityScore(signal, member);
      }
      const avgScore = totalScore / group.length;

      if (avgScore >= threshold) {
        matchedGroup = group;
        break;
      }
    }

    if (matchedGroup) {
      matchedGroup.push(signal);
    } else {
      groups.push([signal]);
    }
  }

  return groups;
};

/**
 * Generates human-readable rationale explaining why signals are grouped into the same incident
 */
const generateGroupingRationale = (signals) => {
  if (signals.length === 0) return 'No anomaly signals correlated.';
  const leader = signals[0];
  const type = String(leader.type).replace(/_/g, ' ');
  
  const merchants = Array.from(new Set(signals.map(s => s.merchantId)));
  const providers = Array.from(new Set(signals.map(s => s.provider || 'gateway_mock')));
  const failureCodes = Array.from(new Set(signals.map(s => s.failureCode).filter(Boolean)));
  
  let rationale = `Correlated ${signals.length} transaction anomaly event(s) under type [${type}] due to `;
  
  const reasons = [];
  if (merchants.length === 1) {
    reasons.push(`matching merchant partition ID [${merchants[0]}]`);
  } else {
    reasons.push(`shared profile spread across ${merchants.length} merchants`);
  }
  
  if (providers.length === 1) {
    reasons.push(`routing signature on provider [${providers[0]}]`);
  }
  
  if (failureCodes.length > 0) {
    reasons.push(`matching gateway error telemetry status code(s): [${failureCodes.join(', ')}]`);
  }
  
  const timestamps = signals.map(s => new Date(s.timestamp));
  if (timestamps.length > 1) {
    const minTime = new Date(Math.min(...timestamps));
    const maxTime = new Date(Math.max(...timestamps));
    const windowSec = Math.round((maxTime - minTime) / 1000);
    reasons.push(`close temporal sequence within a sliding window of ${windowSec} seconds`);
  } else {
    reasons.push('narrow occurrence threshold');
  }

  rationale += reasons.join(', ') + '.';
  return rationale;
};

module.exports = {
  calculateSimilarityScore,
  groupSignalsIntoIncidents,
  generateGroupingRationale
};
