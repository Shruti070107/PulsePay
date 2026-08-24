const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.get('/payments', paymentController.getPayments);
router.get('/payments/:id', paymentController.getPaymentById);
router.get('/payments/:id/events', paymentController.getPaymentEvents);
router.get('/orders', paymentController.getOrders);
router.get('/webhooks', paymentController.getWebhooks);
router.get('/payments/:id/state', paymentController.getPaymentState);
router.get('/payments/:id/timeline', paymentController.getPaymentTimeline);

module.exports = router;
