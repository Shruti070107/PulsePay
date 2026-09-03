const express = require('express');
const router = express.Router();
const recoveryController = require('../controllers/recoveryController');
const benchmarkController = require('../controllers/benchmarkController');
const calibrationController = require('../controllers/calibrationController');

// Scan & Opportunities
router.post('/scan', recoveryController.scanOpportunities);
router.get('/opportunities', recoveryController.getOpportunities);
router.get('/opportunities/:id', recoveryController.getOpportunityById);

// Simulation & Execution
router.post('/simulate', recoveryController.simulateRecovery);
router.post('/execute', recoveryController.executeRecovery);
router.post('/compare-strategies', recoveryController.compareStrategies);


// Campaigns
router.get('/campaigns', recoveryController.getCampaigns);
router.post('/campaigns', recoveryController.createCampaign);
router.get('/campaigns/:id', recoveryController.getCampaignById);

// Executive Metrics & Analytics
router.get('/metrics', recoveryController.getRecoveryMetrics);

// AI Agent & Evaluation
router.post('/agent/analyze', recoveryController.analyzeWithAgent);
router.post('/evaluate', recoveryController.evaluateRecovery);

// 1-Click Interactive Demo
router.post('/demo', recoveryController.runDemo);
router.post('/mission', recoveryController.runRecoveryMission);

// ==========================================
// RECOVERY BENCHMARK & OUTCOME LAB APIS
// ==========================================
router.post('/benchmark/run', benchmarkController.runBenchmark);
router.get('/benchmark/latest', benchmarkController.getLatestBenchmark);
router.get('/benchmark/:id', benchmarkController.getBenchmarkById);
router.get('/benchmark/:id/results', benchmarkController.getBenchmarkResults);
router.get('/benchmark/:id/scenarios', benchmarkController.getBenchmarkScenarios);
router.get('/benchmark/:id/calibration', benchmarkController.getBenchmarkCalibration);
router.get('/benchmark/:id/baseline', benchmarkController.getBenchmarkBaselineComparison);

// ==========================================
// PROBABILITY CALIBRATION APIS
// ==========================================
router.post('/calibration/train', calibrationController.trainCalibration);
router.get('/calibration/latest', calibrationController.getLatestCalibration);
router.get('/calibration/:id', calibrationController.getCalibrationById);
router.get('/calibration/:id/metrics', calibrationController.getCalibrationMetrics);

module.exports = router;
