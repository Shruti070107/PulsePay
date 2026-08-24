const { PaymentStates } = require('./stateConstants');
const { validateTransition } = require('./eventValidator');

const reconstructPaymentState = (payment, events) => {
  // 1. Stable Sort chronologically (logical order)
  const chronologicalEvents = [...events].sort((a, b) => {
    const diff = new Date(a.eventTimestamp) - new Date(b.eventTimestamp);
    if (diff !== 0) return diff;
    return a.eventId.localeCompare(b.eventId);
  });

  // 2. Stable Sort by arrival (received order)
  const arrivalEvents = [...events].sort((a, b) => {
    const diff = new Date(a.receivedAt) - new Date(b.receivedAt);
    if (diff !== 0) return diff;
    return a.eventId.localeCompare(b.eventId);
  });

  // 3. Detect Out of Order Ingestion
  let outOfOrderDetected = false;
  for (let i = 0; i < chronologicalEvents.length; i++) {
    if (chronologicalEvents[i].eventId !== arrivalEvents[i].eventId) {
      outOfOrderDetected = true;
      break;
    }
  }

  // 4. Process logical timeline transitions
  let currentState = PaymentStates.UNKNOWN;
  let duplicateEventsDetected = false;
  let invalidTransitionDetected = false;
  let lateAuthorizationDetected = false;
  let refundAnomalyDetected = false;
  const previousPaymentStates = [];
  const seenEventTypes = new Set();
  let hasFailed = false;
  const evidence = [];

  const eventToStateMap = {
    'payment.created': PaymentStates.CREATED,
    'payment.processing': PaymentStates.PROCESSING,
    'payment.authorized': PaymentStates.AUTHORIZED,
    'payment.captured': PaymentStates.CAPTURED,
    'payment.failed': PaymentStates.FAILED,
    'payment.cancelled': PaymentStates.CANCELLED,
    'refund.succeeded': PaymentStates.REFUNDED
  };

  chronologicalEvents.forEach(event => {
    const targetState = eventToStateMap[event.type];
    
    // Check for duplicate payment transition events
    if (targetState) {
      if (seenEventTypes.has(event.type)) {
        duplicateEventsDetected = true;
        evidence.push(`Duplicate logical event detected: ${event.type}`);
      }
      seenEventTypes.add(event.type);

      if (!validateTransition(currentState, targetState)) {
        invalidTransitionDetected = true;
        evidence.push(`Lifecycle violation: Invalid transition from ${currentState} to ${targetState} on event ${event.type}`);
      }

      if (currentState !== targetState) {
        if (currentState !== PaymentStates.UNKNOWN) {
          previousPaymentStates.push(currentState);
        }
        
        // Late authorization detection
        if (targetState === PaymentStates.AUTHORIZED || targetState === PaymentStates.CAPTURED) {
          if (hasFailed || previousPaymentStates.includes(PaymentStates.FAILED)) {
            lateAuthorizationDetected = true;
          }
        }
        
        currentState = targetState;
        if (currentState === PaymentStates.FAILED) {
          hasFailed = true;
        }
      }
    }

    // Refund evidence & anomaly tracking
    if (event.type === 'refund.created') {
      evidence.push(`Refund of amount ₹${event.metadata?.amount || 'unknown'} initiated`);
    }
    if (event.type === 'refund.failed') {
      refundAnomalyDetected = true;
      evidence.push(`Refund attempt failed: ${event.metadata?.message || 'declined by gateway'}`);
    }
  });

  // Base state evidence
  if (currentState === PaymentStates.CAPTURED) {
    evidence.push('Payment captured successfully');
  } else if (currentState === PaymentStates.FAILED) {
    evidence.push('Payment failed processing at gateway');
  } else if (currentState === PaymentStates.PROCESSING) {
    evidence.push('Payment remains unresolved in processing state');
  }

  if (outOfOrderDetected) {
    evidence.push('Audit anomaly: Payment events arrived out of order');
  }
  if (duplicateEventsDetected) {
    evidence.push('Audit anomaly: Duplicate events detected in event stream');
  }
  if (lateAuthorizationDetected) {
    evidence.push('Late authorization detected (payment captured after initial failure)');
  }

  return {
    paymentState: currentState,
    outOfOrderDetected,
    duplicateEventsDetected,
    invalidTransitionDetected,
    lateAuthorizationDetected,
    refundAnomalyDetected,
    previousPaymentStates,
    evidence,
    timeline: chronologicalEvents.map(evt => ({
      eventId: evt.eventId,
      eventType: evt.type,
      eventTimestamp: evt.eventTimestamp,
      receivedAt: evt.receivedAt,
      source: evt.source,
      status: evt.status
    }))
  };
};

module.exports = {
  reconstructPaymentState
};
