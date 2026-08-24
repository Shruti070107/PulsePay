const { extractFeaturesForPayment } = require('./featureExtractor');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';

const predictAnomaly = async (paymentId) => {
  try {
    const features = await extractFeaturesForPayment(paymentId);
    
    const response = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features })
    });

    if (!response.ok) {
      throw new Error(`ML Service responded with status ${response.status}`);
    }

    const data = await response.json();
    return {
      raw_score: data.raw_score,
      normalized_anomaly_score: data.normalized_anomaly_score,
      is_anomaly: data.is_anomaly
    };
  } catch (error) {
    console.warn(`[ML Client] ML Service is offline or returned an error: ${error.message}. Returning default non-anomaly scores.`);
    return {
      raw_score: 0.0,
      normalized_anomaly_score: 0.0,
      is_anomaly: false
    };
  }
};

const trainModelOnDataset = async (dataset, contamination = 0.05) => {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataset,
        contamination
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`[ML Client] Failed to train ML model: ${error.message}`);
    throw error;
  }
};

const checkHealth = async () => {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (response.ok) {
      const data = await response.json();
      return { status: 'online', details: data };
    }
    return { status: 'offline', error: `HTTP ${response.status}` };
  } catch (error) {
    return { status: 'offline', error: error.message };
  }
};

module.exports = {
  predictAnomaly,
  trainModelOnDataset,
  checkHealth
};
