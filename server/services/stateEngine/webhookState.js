const { WebhookStates } = require('./stateConstants');

const reconstructWebhookState = (webhookEvents) => {
  if (!webhookEvents || webhookEvents.length === 0) {
    return {
      webhookState: WebhookStates.NONE,
      webhookRetryCount: 0,
      previousFailures: false,
      evidence: ['No webhook delivery attempts recorded']
    };
  }

  // Sort by attempt number
  const sortedEvents = [...webhookEvents].sort((a, b) => a.attemptNumber - b.attemptNumber);
  const maxAttempt = Math.max(...sortedEvents.map(e => e.attemptNumber || 1));
  
  const hasDelivered = sortedEvents.some(e => e.deliveryStatus === 'delivered');
  const hasRetrying = sortedEvents.some(e => e.deliveryStatus === 'retrying');
  const hasFailed = sortedEvents.some(e => e.deliveryStatus === 'failed');

  let state = WebhookStates.NONE;
  let previousFailures = false;

  if (hasDelivered) {
    state = WebhookStates.DELIVERED;
    if (maxAttempt > 1 || hasFailed) {
      previousFailures = true;
    }
  } else if (hasRetrying) {
    state = WebhookStates.RETRYING;
  } else if (hasFailed) {
    state = WebhookStates.FAILED;
  }

  const evidence = [];
  if (state === WebhookStates.DELIVERED) {
    if (previousFailures) {
      evidence.push(`Webhook delivered successfully after ${maxAttempt} attempts`);
    } else {
      evidence.push('Webhook delivered successfully');
    }
  } else if (state === WebhookStates.FAILED) {
    evidence.push(`Webhook delivery failed after ${maxAttempt} attempts`);
  } else if (state === WebhookStates.RETRYING) {
    evidence.push(`Webhook retrying, attempt ${maxAttempt} in progress`);
  }

  return {
    webhookState: state,
    webhookRetryCount: maxAttempt,
    previousFailures,
    evidence
  };
};

module.exports = {
  reconstructWebhookState
};
