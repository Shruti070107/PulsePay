const mongoose = require('mongoose');

const CalibrationPointSchema = new mongoose.Schema({
  rawProbability: { type: Number, required: true },
  calibratedProbability: { type: Number, required: true },
}, { _id: false });

const CalibrationModelSchema = new mongoose.Schema({
  calibrationId: { type: String, required: true, unique: true, index: true },
  name: { type: String, default: 'Isotonic & Platt Recovery Calibration Model' },
  method: { type: String, enum: ['ISOTONIC_REGRESSION', 'PLATT_SCALING', 'HYBRID_PIECEWISE'], default: 'ISOTONIC_REGRESSION' },
  version: { type: String, default: '1.0.0' },
  trainingSize: { type: Number, required: true, default: 7000 },
  trainingSeed: { type: Number, required: true, default: 20260826 },
  
  // Fitted parameters
  parameters: {
    plattA: { type: Number, default: 1.0 },
    plattB: { type: Number, default: 0.0 },
    isotonicKnots: [CalibrationPointSchema],
  },

  // In-sample Training Quality Metrics
  trainingMetrics: {
    rawBrierScore: { type: Number, default: 0 },
    calibratedBrierScore: { type: Number, default: 0 },
    rawECE: { type: Number, default: 0 },
    calibratedECE: { type: Number, default: 0 },
    rawCalibrationError: { type: Number, default: 0 },
    calibratedCalibrationError: { type: Number, default: 0 },
    brierScoreImprovement: { type: Number, default: 0 },
    eceImprovement: { type: Number, default: 0 },
  },

  // Out-of-sample Evaluation Quality Metrics
  evaluationMetrics: {
    evaluationSize: { type: Number, default: 3000 },
    rawBrierScore: { type: Number, default: 0 },
    calibratedBrierScore: { type: Number, default: 0 },
    rawECE: { type: Number, default: 0 },
    calibratedECE: { type: Number, default: 0 },
    rawCalibrationError: { type: Number, default: 0 },
    calibratedCalibrationError: { type: Number, default: 0 },
  },

  // Distribution Drift Analysis
  driftAnalysis: {
    psi: { type: Number, default: 0 }, // Population Stability Index
    ksStatistic: { type: Number, default: 0 }, // Kolmogorov-Smirnov test statistic
    driftStatus: { type: String, enum: ['LOW_DRIFT', 'MODERATE_DRIFT', 'HIGH_DRIFT'], default: 'LOW_DRIFT' },
    details: { type: String },
  },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('CalibrationModel', CalibrationModelSchema);
