const crypto = require('crypto');

const randomId = (length = 12) => {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
};

module.exports = {
  generatePaymentId: () => `pay_${randomId()}`,
  generateOrderId: () => `order_${randomId()}`,
  generateCustomerId: () => `cust_${randomId()}`,
  generateMerchantId: () => `merchant_${randomId()}`,
  generateWebhookId: () => `wh_${randomId()}`,
  generateEventId: () => `evt_${randomId()}`,
  generateRefundId: () => `ref_${randomId()}`,
  randomId
};
