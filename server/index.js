require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

const mlClient = require('./services/ml/mlClient');
const authRoutes = require('./routes/authRoutes');
const { requireAuth } = require('./middleware/auth');

// Health Check Endpoint
app.get(['/health', '/api/health'], async (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const dbStates = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting'
  };

  const mlHealth = await mlClient.checkHealth();
  const apiKey = process.env.GEMINI_API_KEY;
  const isAIConfigured = apiKey && apiKey.trim() !== '' && apiKey !== 'YOUR_GEMINI_API_KEY';
  const aiServiceStatus = isAIConfigured ? 'online' : 'offline';

  res.status(200).json({
    status: 'UP',
    timestamp: new Date(),
    uptime: process.uptime(),
    database: {
      status: dbStates[dbStatus] || 'Unknown',
      readyState: dbStatus
    },
    pythonService: mlHealth.status,
    aiService: aiServiceStatus
  });
});

// Explicit ML health check endpoint
app.get('/api/ml/health', async (req, res) => {
  const mlHealth = await mlClient.checkHealth();
  if (mlHealth.status === 'online') {
    return res.status(200).json({
      success: true,
      status: 'ONLINE',
      service: 'Python FastAPI ML Service'
    });
  } else {
    return res.status(200).json({
      success: false,
      status: 'OFFLINE',
      service: 'Python FastAPI ML Service',
      error: mlHealth.error
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api', requireAuth);

// Import Routes
const simulatorRoutes = require('./routes/simulatorRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const mlRoutes = require('./routes/mlRoutes');
const recoveryRoutes = require('./routes/recoveryRoutes');
const { router: transactionRoutes } = require('./routes/transactionRoutes');

// Routes
app.use('/api/recovery', recoveryRoutes);
app.use('/api/simulator', simulatorRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api', paymentRoutes);

// Fallback Route
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found'
    }
  });
});

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('[Central Error Handler] Caught error:', err);
  const statusCode = err.status || 500;
  return res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'An unexpected server error occurred.'
    }
  });
});

app.listen(PORT, () => {
  console.log(`PulsePay server running on port ${PORT}`);
});
