const { OrderStates } = require('./stateConstants');

const reconstructOrderState = (order, events) => {
  if (!order) {
    return {
      orderState: OrderStates.UNKNOWN,
      evidence: ['No merchant order record found']
    };
  }

  let state = OrderStates.UNKNOWN;
  const statusMap = {
    'created': OrderStates.CREATED,
    'unpaid': OrderStates.UNPAID,
    'paid': OrderStates.PAID,
    'cancelled': OrderStates.CANCELLED
  };

  state = statusMap[order.status] || OrderStates.UNKNOWN;

  // Scan events to verify if there's any conflicting timeline order state
  const orderPaidEvent = events.find(e => e.type === 'order.paid');
  if (orderPaidEvent && state !== OrderStates.PAID) {
    state = OrderStates.PAID; // Prioritize event chronological state change
  }

  const evidence = [];
  if (state === OrderStates.PAID) {
    evidence.push('Merchant order is paid');
  } else if (state === OrderStates.UNPAID) {
    evidence.push('Merchant order remains unpaid');
  } else if (state === OrderStates.CANCELLED) {
    evidence.push('Merchant order is cancelled');
  } else if (state === OrderStates.CREATED) {
    evidence.push('Merchant order is created but pending');
  }

  return {
    orderState: state,
    evidence
  };
};

module.exports = {
  reconstructOrderState
};
