const express = require('express');
const router = express.Router();
const simulatorController = require('../controllers/simulatorController');

router.get('/lab/scenarios', simulatorController.getLabScenarios);
router.post('/lab/baseline', simulatorController.triggerLabBaseline);
router.post('/lab/run', simulatorController.runLabScenario);
router.get('/lab/reports', simulatorController.getLabReports);
router.get('/lab/reports/:id/export', simulatorController.exportLabReport);

router.post('/normal', simulatorController.simulateNormal);
router.post('/webhook-failure', simulatorController.simulateWebhookFailure);
router.post('/duplicate', simulatorController.simulateDuplicate);
router.post('/out-of-order', simulatorController.simulateOutOfOrder);
router.post('/refund-failure', simulatorController.simulateRefundFailure);
router.post('/late-auth', simulatorController.simulateLateAuth);
router.post('/batch', simulatorController.simulateBatch);
router.post('/demo', simulatorController.triggerDemoMode);
router.post('/:scenario', simulatorController.simulateScenario);

module.exports = router;
