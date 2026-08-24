const express = require('express');
const router = express.Router();
const simulatorController = require('../controllers/simulatorController');

router.post('/normal', simulatorController.simulateNormal);
router.post('/webhook-failure', simulatorController.simulateWebhookFailure);
router.post('/duplicate', simulatorController.simulateDuplicate);
router.post('/out-of-order', simulatorController.simulateOutOfOrder);
router.post('/refund-failure', simulatorController.simulateRefundFailure);
router.post('/late-auth', simulatorController.simulateLateAuth);
router.post('/batch', simulatorController.simulateBatch);
router.post('/demo', simulatorController.triggerDemoMode);

module.exports = router;
