const RecoveryBenchmark = require('../models/RecoveryBenchmark');
const RecoveryBenchmarkResult = require('../models/RecoveryBenchmarkResult');
const { runRecoveryBenchmark } = require('../services/recovery/recoveryBenchmarkEngine');

const runBenchmark = async (req, res, next) => {
  try {
    const {
      datasetSize = 10000,
      seed = 20260826,
      evaluationSplitRatio = 0.30,
      name,
    } = req.body;

    const result = await runRecoveryBenchmark({
      datasetSize: parseInt(datasetSize, 10),
      seed: parseInt(seed, 10),
      evaluationSplitRatio: parseFloat(evaluationSplitRatio),
      name,
    });

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const getLatestBenchmark = async (req, res, next) => {
  try {
    let benchmark = await RecoveryBenchmark.findOne({ status: 'COMPLETED' })
      .sort({ createdAt: -1 })
      .lean();

    if (!benchmark) {
      // Run an initial 10,000 benchmark automatically if database is fresh
      const result = await runRecoveryBenchmark({ datasetSize: 10000, seed: 20260826 });
      benchmark = result.benchmark;
    }

    return res.status(200).json({
      success: true,
      data: benchmark,
    });
  } catch (err) {
    next(err);
  }
};

const getBenchmarkById = async (req, res, next) => {
  try {
    const benchmark = await RecoveryBenchmark.findOne({ benchmarkId: req.params.id }).lean();
    if (!benchmark) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Benchmark not found' },
      });
    }

    return res.status(200).json({
      success: true,
      data: benchmark,
    });
  } catch (err) {
    next(err);
  }
};

const getBenchmarkResults = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, scenarioId, strategy } = req.query;
    const filter = { benchmarkId: req.params.id };
    if (scenarioId) filter.scenarioId = scenarioId;
    if (strategy) filter.recommendedStrategy = strategy;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [results, total] = await Promise.all([
      RecoveryBenchmarkResult.find(filter).skip(skip).limit(parseInt(limit, 10)).lean(),
      RecoveryBenchmarkResult.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: results,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        totalPages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (err) {
    next(err);
  }
};

const getBenchmarkScenarios = async (req, res, next) => {
  try {
    const benchmark = await RecoveryBenchmark.findOne({ benchmarkId: req.params.id }).select('scenarioScorecards').lean();
    if (!benchmark) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Benchmark not found' },
      });
    }

    return res.status(200).json({
      success: true,
      data: benchmark.scenarioScorecards,
    });
  } catch (err) {
    next(err);
  }
};

const getBenchmarkCalibration = async (req, res, next) => {
  try {
    const benchmark = await RecoveryBenchmark.findOne({ benchmarkId: req.params.id }).select('calibrationBuckets calibrationError averagePredictedProbability actualSuccessRate').lean();
    if (!benchmark) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Benchmark not found' },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        calibrationBuckets: benchmark.calibrationBuckets,
        calibrationError: benchmark.calibrationError,
        averagePredictedProbability: benchmark.averagePredictedProbability,
        actualSuccessRate: benchmark.actualSuccessRate,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getBenchmarkBaselineComparison = async (req, res, next) => {
  try {
    const benchmark = await RecoveryBenchmark.findOne({ benchmarkId: req.params.id }).select('baselineComparison').lean();
    if (!benchmark) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Benchmark not found' },
      });
    }

    return res.status(200).json({
      success: true,
      data: benchmark.baselineComparison,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  runBenchmark,
  getLatestBenchmark,
  getBenchmarkById,
  getBenchmarkResults,
  getBenchmarkScenarios,
  getBenchmarkCalibration,
  getBenchmarkBaselineComparison,
};
