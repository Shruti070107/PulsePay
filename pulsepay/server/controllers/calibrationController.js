const CalibrationModel = require('../models/CalibrationModel');
const RecoveryBenchmark = require('../models/RecoveryBenchmark');
const { generateBenchmarkDataset } = require('../services/recovery/benchmarkDatasetGenerator');
const { trainCalibrationModel, computeCalibrationMetrics, calculateDistributionDrift } = require('../services/recovery/calibrationEngine');
const { evaluatePaymentRecovery } = require('../services/recovery/recoveryBenchmarkEngine');

const trainCalibration = async (req, res, next) => {
  try {
    const { datasetSize = 10000, seed = 20260826, method = 'ISOTONIC_REGRESSION' } = req.body;

    const dataset = generateBenchmarkDataset({
      datasetSize: parseInt(datasetSize, 10),
      seed: parseInt(seed, 10),
      evaluationSplitRatio: 0.30,
    });

    const trainingRecords = dataset.filter(r => r.split === 'TRAIN');

    const preparedTrainingRecords = trainingRecords.map(r => {
      const rawEval = evaluatePaymentRecovery({
        amount: r.amount,
        failureType: r.failureType,
        attemptCount: r.attemptCount,
        providerHealth: r.providerHealth,
        customerHistory: r.customerHistory,
        latencyMs: r.latencyMs,
        webhookStatus: r.webhookStatus,
        historicalRecoverySignal: r.historicalRecoverySignal,
        paymentMethod: r.paymentMethod,
      });
      return {
        ...r,
        rawProbability: rawEval.rawRecoveryProbability,
      };
    });

    const modelResult = await trainCalibrationModel(preparedTrainingRecords, {
      seed: parseInt(seed, 10),
      method,
    });

    return res.status(201).json({
      success: true,
      data: modelResult.modelDoc,
    });
  } catch (err) {
    next(err);
  }
};

const getLatestCalibration = async (req, res, next) => {
  try {
    const model = await CalibrationModel.findOne().sort({ createdAt: -1 }).lean();
    if (!model) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'No calibration models found' },
      });
    }

    return res.status(200).json({
      success: true,
      data: model,
    });
  } catch (err) {
    next(err);
  }
};

const getCalibrationById = async (req, res, next) => {
  try {
    const model = await CalibrationModel.findOne({ calibrationId: req.params.id }).lean();
    if (!model) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Calibration model not found' },
      });
    }

    return res.status(200).json({
      success: true,
      data: model,
    });
  } catch (err) {
    next(err);
  }
};

const getCalibrationMetrics = async (req, res, next) => {
  try {
    const benchmark = await RecoveryBenchmark.findOne({ status: 'COMPLETED' })
      .sort({ createdAt: -1 })
      .select('rawMetrics calibratedMetrics calibrationComparison driftAnalysis scenarioScorecards')
      .lean();

    if (!benchmark) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'No completed benchmark calibration metrics found' },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        rawMetrics: benchmark.rawMetrics,
        calibratedMetrics: benchmark.calibratedMetrics,
        calibrationComparison: benchmark.calibrationComparison,
        driftAnalysis: benchmark.driftAnalysis,
        scenarioScorecards: benchmark.scenarioScorecards,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  trainCalibration,
  getLatestCalibration,
  getCalibrationById,
  getCalibrationMetrics,
};
