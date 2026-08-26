const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const { extractFeaturesForPayment } = require('../services/ml/featureExtractor');
const { trainModelOnDataset } = require('../services/ml/mlClient');

router.post('/train', async (req, res, next) => {
  try {
    const payments = await Payment.find();
    if (payments.length < 5) {
      return res.status(400).json({
        success: false,
        error: 'At least 5 transactions must exist in MongoDB to train the model.'
      });
    }

    // Extract features for all payments sequentially to be safe
    const dataset = [];
    for (const p of payments) {
      try {
        const features = await extractFeaturesForPayment(p.paymentId);
        dataset.push(features);
      } catch (err) {
        console.warn(`Skipping payment ${p.paymentId} during training features extraction: ${err.message}`);
      }
    }

    if (dataset.length < 5) {
      return res.status(400).json({
        success: false,
        error: `Extracted features only for ${dataset.length} payments, minimum required is 5.`
      });
    }

    const contamination = req.body.contamination || 0.05;
    const trainResult = await trainModelOnDataset(dataset, contamination);

    return res.status(200).json({
      success: true,
      message: 'Model training pipeline triggered successfully',
      data: trainResult
    });
  } catch (error) {
    next(error);
  }
});

router.get('/payments/:id/anomaly', async (req, res, next) => {
  try {
    const { predictAnomaly } = require('../services/ml/mlClient');
    
    const features = await extractFeaturesForPayment(req.params.id);
    const prediction = await predictAnomaly(req.params.id);

    return res.status(200).json({
      success: true,
      paymentId: req.params.id,
      features,
      prediction
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
