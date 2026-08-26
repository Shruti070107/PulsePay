const { PaymentStates } = require('./stateConstants');

const ALLOWED_TRANSITIONS = {
  [PaymentStates.UNKNOWN]: [PaymentStates.CREATED],
  [PaymentStates.CREATED]: [PaymentStates.PROCESSING, PaymentStates.AUTHORIZED, PaymentStates.FAILED, PaymentStates.CANCELLED],
  [PaymentStates.PROCESSING]: [PaymentStates.AUTHORIZED, PaymentStates.FAILED, PaymentStates.CANCELLED],
  [PaymentStates.AUTHORIZED]: [PaymentStates.CAPTURED, PaymentStates.FAILED],
  [PaymentStates.CAPTURED]: [PaymentStates.REFUNDED, PaymentStates.PARTIALLY_REFUNDED],
  [PaymentStates.FAILED]: [PaymentStates.AUTHORIZED, PaymentStates.CAPTURED], // late authorization
  [PaymentStates.CANCELLED]: [],
  [PaymentStates.REFUNDED]: [],
  [PaymentStates.PARTIALLY_REFUNDED]: [PaymentStates.REFUNDED]
};

const validateTransition = (fromState, toState) => {
  if (fromState === toState) return true;
  
  const allowed = ALLOWED_TRANSITIONS[fromState];
  if (!allowed) return false;
  
  return allowed.includes(toState);
};

module.exports = {
  validateTransition
};
