/**
 * PulsePay Probability Calibration Engine
 * Implements Isotonic Regression (Pool Adjacent Violators Algorithm) and Platt Scaling (Logistic Calibration).
 * Strictly fitted on historical training data to calibrate recovery probabilities out-of-sample.
 */

const CalibrationModel = require('../../models/CalibrationModel');

// Helper: Clip probability to avoid log(0) and extreme edge saturation
function clipProb(p, min = 0.001, max = 0.999) {
  return Math.min(max, Math.max(min, p));
}

// Helper: Logit function
function logit(p) {
  const cp = clipProb(p);
  return Math.log(cp / (1 - cp));
}

// Helper: Sigmoid function
function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

/**
 * 1. Isotonic Regression using Pool Adjacent Violators Algorithm (PAVA)
 * Fits monotonic non-decreasing mapping from raw probabilities to empirical rates.
 */
function fitIsotonicRegression(trainingPairs) {
  // trainingPairs: [{ x: rawProbability, y: actualOutcome (0 or 1), weight: 1 }]
  if (!trainingPairs || trainingPairs.length === 0) {
    return [{ rawProbability: 0, calibratedProbability: 0 }, { rawProbability: 1, calibratedProbability: 1 }];
  }

  // Sort ascending by raw probability x
  const sorted = [...trainingPairs].sort((a, b) => a.x - b.x);

  // Initialize blocks: { xSum, ySum, weight, xMin, xMax }
  const blocks = sorted.map(pt => ({
    ySum: pt.y,
    weight: 1,
    yMean: pt.y,
    xMin: pt.x,
    xMax: pt.x,
  }));

  // PAVA: Merge violating blocks where blocks[i].yMean < blocks[i-1].yMean
  let i = 0;
  while (i < blocks.length - 1) {
    if (blocks[i].yMean > blocks[i + 1].yMean) {
      // Violation found -> Merge blocks[i] and blocks[i+1]
      const merged = {
        ySum: blocks[i].ySum + blocks[i + 1].ySum,
        weight: blocks[i].weight + blocks[i + 1].weight,
        yMean: (blocks[i].ySum + blocks[i + 1].ySum) / (blocks[i].weight + blocks[i + 1].weight),
        xMin: Math.min(blocks[i].xMin, blocks[i + 1].xMin),
        xMax: Math.max(blocks[i].xMax, blocks[i + 1].xMax),
      };
      blocks.splice(i, 2, merged);

      // Backtrack to check if merge violated prior monotonicity
      while (i > 0 && blocks[i - 1].yMean > blocks[i].yMean) {
        const prevMerged = {
          ySum: blocks[i - 1].ySum + blocks[i].ySum,
          weight: blocks[i - 1].weight + blocks[i].weight,
          yMean: (blocks[i - 1].ySum + blocks[i].ySum) / (blocks[i - 1].weight + blocks[i].weight),
          xMin: Math.min(blocks[i - 1].xMin, blocks[i].xMin),
          xMax: Math.max(blocks[i - 1].xMax, blocks[i].xMax),
        };
        blocks.splice(i - 1, 2, prevMerged);
        i--;
      }
    } else {
      i++;
    }
  }

  // Extract calibration knots (x, yCalibrated)
  const knots = [];
  knots.push({ rawProbability: 0.0, calibratedProbability: 0.0 });

  blocks.forEach(b => {
    const rawMid = (b.xMin + b.xMax) / 2;
    const calProb = Math.round(b.yMean * 1000) / 1000;
    if (knots.length === 0 || knots[knots.length - 1].rawProbability < rawMid) {
      knots.push({ rawProbability: Math.round(rawMid * 1000) / 1000, calibratedProbability: calProb });
    }
  });

  if (knots[knots.length - 1].rawProbability < 1.0) {
    knots.push({ rawProbability: 1.0, calibratedProbability: 1.0 });
  }

  return knots;
}

/**
 * Predict using Isotonic Knots (Linear Interpolation between monotonic knots)
 */
function predictIsotonic(rawProb, knots) {
  if (!knots || knots.length === 0) return rawProb;
  if (rawProb <= knots[0].rawProbability) return knots[0].calibratedProbability;
  if (rawProb >= knots[knots.length - 1].rawProbability) return knots[knots.length - 1].calibratedProbability;

  // Binary search or scan interval
  for (let i = 0; i < knots.length - 1; i++) {
    const k1 = knots[i];
    const k2 = knots[i + 1];
    if (rawProb >= k1.rawProbability && rawProb <= k2.rawProbability) {
      if (k2.rawProbability === k1.rawProbability) return k1.calibratedProbability;
      const t = (rawProb - k1.rawProbability) / (k2.rawProbability - k1.rawProbability);
      const interpolated = k1.calibratedProbability + t * (k2.calibratedProbability - k1.calibratedProbability);
      return Math.round(interpolated * 1000) / 1000;
    }
  }
  return rawProb;
}

/**
 * 2. Platt Scaling (Logistic Calibration via Maximum Likelihood Estimation)
 */
function fitPlattScaling(trainingPairs, iterations = 80, learningRate = 0.05) {
  let A = 1.0;
  let B = 0.0;

  for (let iter = 0; iter < iterations; iter++) {
    let gradA = 0;
    let gradB = 0;

    for (const pt of trainingPairs) {
      const logitVal = logit(pt.x);
      const pHat = sigmoid(A * logitVal + B);
      const err = pHat - pt.y;

      gradA += err * logitVal;
      gradB += err;
    }

    gradA /= trainingPairs.length;
    gradB /= trainingPairs.length;

    A -= learningRate * gradA;
    B -= learningRate * gradB;
  }

  return { A: Math.round(A * 1000) / 1000, B: Math.round(B * 1000) / 1000 };
}

function predictPlatt(rawProb, A, B) {
  const logitVal = logit(rawProb);
  const pCalibrated = sigmoid(A * logitVal + B);
  return Math.round(pCalibrated * 1000) / 1000;
}

/**
 * Compute Calibration Metrics (Brier Score, ECE, MAE, 10 Buckets)
 */
function computeCalibrationMetrics(predictions, groundTruthLabels) {
  // predictions: array of float [0, 1]
  // groundTruthLabels: array of 0 or 1
  const N = predictions.length;
  if (N === 0) {
    return {
      brierScore: 0,
      ece: 0,
      calibrationError: 0,
      averagePredictedProbability: 0,
      actualSuccessRate: 0,
      calibrationBuckets: [],
    };
  }

  // 1. Brier Score = (1/N) * sum((p_i - y_i)^2)
  let brierSum = 0;
  let sumPred = 0;
  let sumActual = 0;

  for (let i = 0; i < N; i++) {
    const p = predictions[i];
    const y = groundTruthLabels[i];
    brierSum += (p - y) ** 2;
    sumPred += p;
    sumActual += y;
  }

  const brierScore = Math.round((brierSum / N) * 10000) / 10000; // e.g. 0.0425
  const averagePredictedProbability = Math.round((sumPred / N) * 1000) / 10; // %
  const actualSuccessRate = Math.round((sumActual / N) * 1000) / 10; // %

  // 2. 10 Probability Buckets
  const bucketDefs = [
    { bucket: '0-10%', rangeMin: 0.0, rangeMax: 0.10 },
    { bucket: '10-20%', rangeMin: 0.10, rangeMax: 0.20 },
    { bucket: '20-30%', rangeMin: 0.20, rangeMax: 0.30 },
    { bucket: '30-40%', rangeMin: 0.30, rangeMax: 0.40 },
    { bucket: '40-50%', rangeMin: 0.40, rangeMax: 0.50 },
    { bucket: '50-60%', rangeMin: 0.50, rangeMax: 0.60 },
    { bucket: '60-70%', rangeMin: 0.60, rangeMax: 0.70 },
    { bucket: '70-80%', rangeMin: 0.70, rangeMax: 0.80 },
    { bucket: '80-90%', rangeMin: 0.80, rangeMax: 0.90 },
    { bucket: '90-100%', rangeMin: 0.90, rangeMax: 1.00 },
  ];

  const buckets = bucketDefs.map(b => ({
    bucket: b.bucket,
    rangeMin: b.rangeMin,
    rangeMax: b.rangeMax,
    predictionCount: 0,
    sumProb: 0,
    successes: 0,
  }));

  for (let i = 0; i < N; i++) {
    const p = predictions[i];
    const y = groundTruthLabels[i];
    const b = buckets.find(b => p >= b.rangeMin && (p < b.rangeMax || (b.rangeMax === 1.0 && p <= 1.0))) || buckets[buckets.length - 1];
    b.predictionCount++;
    b.sumProb += p;
    if (y === 1) b.successes++;
  }

  // 3. Expected Calibration Error (ECE) & Calibration Buckets Formatting
  let weightedEceSum = 0;
  const formattedBuckets = buckets.map(b => {
    const avgPredPct = b.predictionCount > 0 ? Math.round((b.sumProb / b.predictionCount) * 1000) / 10 : 0;
    const actualRatePct = b.predictionCount > 0 ? Math.round((b.successes / b.predictionCount) * 1000) / 10 : 0;
    const errorPct = Math.abs(avgPredPct - actualRatePct);

    if (b.predictionCount > 0) {
      weightedEceSum += (Math.abs((b.sumProb / b.predictionCount) - (b.successes / b.predictionCount)) * b.predictionCount);
    }

    return {
      bucket: b.bucket,
      rangeMin: b.rangeMin,
      rangeMax: b.rangeMax,
      predictionCount: b.predictionCount,
      averagePredictedProbability: avgPredPct,
      actualRecoveryRate: actualRatePct,
      calibrationError: Math.round(errorPct * 10) / 10,
    };
  });

  const ece = Math.round((weightedEceSum / N) * 1000) / 1000; // e.g. 0.035
  const calibrationError = Math.round((weightedEceSum / N) * 1000) / 10; // as % e.g. 3.5%

  return {
    brierScore,
    ece,
    calibrationError,
    averagePredictedProbability,
    actualSuccessRate,
    calibrationBuckets: formattedBuckets,
  };
}

/**
 * 4. Drift Analysis (Population Stability Index & Kolmogorov-Smirnov check)
 */
function calculateDistributionDrift(trainProbs, evalProbs) {
  if (!trainProbs.length || !evalProbs.length) {
    return { psi: 0, ksStatistic: 0, driftStatus: 'LOW_DRIFT', details: 'Insufficient sample size for drift analysis' };
  }

  // 10 Bins for PSI
  const bins = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
  let psi = 0;

  const numBins = bins.length - 1;
  for (let i = 0; i < numBins; i++) {
    const min = bins[i];
    const max = bins[i + 1];

    const trainCount = trainProbs.filter(p => p >= min && (p < max || (max === 1.0 && p <= 1.0))).length;
    const evalCount = evalProbs.filter(p => p >= min && (p < max || (max === 1.0 && p <= 1.0))).length;

    const trainPct = (trainCount + 0.5) / (trainProbs.length + 0.5 * numBins);
    const evalPct = (evalCount + 0.5) / (evalProbs.length + 0.5 * numBins);

    psi += (evalPct - trainPct) * Math.log(evalPct / trainPct);
  }

  psi = Math.round(psi * 10000) / 10000;

  // Kolmogorov-Smirnov test statistic
  const sortedTrain = [...trainProbs].sort((a, b) => a - b);
  const sortedEval = [...evalProbs].sort((a, b) => a - b);
  let maxKs = 0;

  const allPoints = Array.from(new Set([...sortedTrain, ...sortedEval])).sort((a, b) => a - b);
  for (const x of allPoints) {
    const cdfTrain = sortedTrain.filter(p => p <= x).length / sortedTrain.length;
    const cdfEval = sortedEval.filter(p => p <= x).length / sortedEval.length;
    const diff = Math.abs(cdfTrain - cdfEval);
    if (diff > maxKs) maxKs = diff;
  }
  const ksStatistic = Math.round(maxKs * 1000) / 1000;

  let driftStatus = 'LOW_DRIFT';
  if (psi >= 0.25) driftStatus = 'HIGH_DRIFT';
  else if (psi >= 0.10) driftStatus = 'MODERATE_DRIFT';

  return {
    psi,
    ksStatistic,
    driftStatus,
    details: `PSI: ${psi} (Thresholds: <0.10 Low, 0.10-0.25 Moderate, >0.25 High) | KS Statistic: ${ksStatistic}`,
  };
}

/**
 * 5. Train & Fit Calibration Model on 7,000 Training Records ONLY
 */
async function trainCalibrationModel(trainingRecords, options = {}) {
  // Verify train/eval isolation: Reject if any evaluation records are passed in
  const containsEvaluation = trainingRecords.some(r => r.split === 'EVALUATION');
  if (containsEvaluation) {
    throw new Error('ISOLATION_VIOLATION: Evaluation records cannot be used to train or fit the calibration model!');
  }

  const { seed = 20260826, method = 'ISOTONIC_REGRESSION' } = options;
  const calibrationId = `CALIB-${seed}-${Date.now().toString().slice(-6)}`;

  // Extract (rawProbability, actualOutcome) training pairs
  // In training records, actualOutcome is determined by groundTruth.recoverable & non-permanent/non-duplicate
  const trainingPairs = trainingRecords.map(r => {
    // True training outcome under optimal intervention
    const isRecoverable = r.groundTruth.recoverable && !r.groundTruth.isPermanentDecline && !r.groundTruth.isDuplicateRisk;
    const actualOutcome = isRecoverable ? 1 : 0;
    
    return {
      x: r.rawProbability !== undefined ? r.rawProbability : r.recoveryProbability,
      y: actualOutcome,
    };
  });

  // Fit Isotonic Regression Knots
  const isotonicKnots = fitIsotonicRegression(trainingPairs);

  // Fit Platt Scaling parameters
  const plattParams = fitPlattScaling(trainingPairs);

  // In-sample Training Metrics
  const rawTrainProbs = trainingPairs.map(p => p.x);
  const trainLabels = trainingPairs.map(p => p.y);
  const calibratedTrainProbs = rawTrainProbs.map(p => 
    method === 'PLATT_SCALING' ? predictPlatt(p, plattParams.A, plattParams.B) : predictIsotonic(p, isotonicKnots)
  );

  const rawTrainMetrics = computeCalibrationMetrics(rawTrainProbs, trainLabels);
  const calTrainMetrics = computeCalibrationMetrics(calibratedTrainProbs, trainLabels);

  const modelDoc = await CalibrationModel.create({
    calibrationId,
    name: `PulsePay ${method === 'PLATT_SCALING' ? 'Platt' : 'Isotonic'} Calibration Model (Seed ${seed})`,
    method,
    trainingSize: trainingRecords.length,
    trainingSeed: seed,
    parameters: {
      plattA: plattParams.A,
      plattB: plattParams.B,
      isotonicKnots,
    },
    trainingMetrics: {
      rawBrierScore: rawTrainMetrics.brierScore,
      calibratedBrierScore: calTrainMetrics.brierScore,
      rawECE: rawTrainMetrics.ece,
      calibratedECE: calTrainMetrics.ece,
      rawCalibrationError: rawTrainMetrics.calibrationError,
      calibratedCalibrationError: calTrainMetrics.calibrationError,
      brierScoreImprovement: Math.round((rawTrainMetrics.brierScore - calTrainMetrics.brierScore) * 10000) / 10000,
      eceImprovement: Math.round((rawTrainMetrics.ece - calTrainMetrics.ece) * 1000) / 1000,
    },
    driftAnalysis: {
      psi: 0,
      ksStatistic: 0,
      driftStatus: 'LOW_DRIFT',
      details: 'Baseline training distribution fitted.',
    },
  });

  return {
    calibrationId,
    method,
    parameters: modelDoc.parameters,
    trainingMetrics: modelDoc.trainingMetrics,
    calibrate: (rawProb) => {
      if (method === 'PLATT_SCALING') {
        return predictPlatt(rawProb, plattParams.A, plattParams.B);
      }
      return predictIsotonic(rawProb, isotonicKnots);
    },
    modelDoc,
  };
}

module.exports = {
  fitIsotonicRegression,
  predictIsotonic,
  fitPlattScaling,
  predictPlatt,
  computeCalibrationMetrics,
  calculateDistributionDrift,
  trainCalibrationModel,
};
