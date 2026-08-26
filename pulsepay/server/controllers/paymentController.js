const Payment = require('../models/Payment');
const PaymentEvent = require('../models/PaymentEvent');
const Order = require('../models/Order');
const WebhookEvent = require('../models/WebhookEvent');

const getPayments = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 100;
    const page = parseInt(req.query.page, 10) || 1;
    const skip = (page - 1) * limit;

    const payments = await Payment.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Payment.countDocuments();

    return res.status(200).json({
      success: true,
      count: payments.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: payments,
    });
  } catch (error) {
    next(error);
  }
};

const getPaymentById = async (req, res, next) => {
  try {
    const payment = await Payment.findOne({ paymentId: req.params.id });
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Payment record not found'
        }
      });
    }
    return res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

const getPaymentEvents = async (req, res, next) => {
  try {
    const events = await PaymentEvent.find({ paymentId: req.params.id })
      .sort({ receivedAt: 1 }); // Sort by ingestion order to view arrival flow
      
    return res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    next(error);
  }
};

const getOrders = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 100;
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(limit);
      
    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

const getWebhooks = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 100;
    const webhooks = await WebhookEvent.find()
      .sort({ createdAt: -1 })
      .limit(limit);
      
    return res.status(200).json({
      success: true,
      count: webhooks.length,
      data: webhooks,
    });
  } catch (error) {
    next(error);
  }
};

const getIncidents = async (req, res, next) => {
  try {
    const Incident = require('../models/Incident');
    const limit = parseInt(req.query.limit, 10) || 100;
    const incidents = await Incident.find()
      .sort({ createdAt: -1 })
      .limit(limit);
      
    return res.status(200).json({
      success: true,
      count: incidents.length,
      data: incidents,
    });
  } catch (error) {
    next(error);
  }
};

const getPaymentState = async (req, res, next) => {
  try {
    const { reconstructFullState } = require('../services/stateEngine');
    const stateResult = await reconstructFullState(req.params.id);
    return res.status(200).json({
      success: true,
      data: stateResult,
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: error.message
        }
      });
    }
    next(error);
  }
};

const getPaymentTimeline = async (req, res, next) => {
  try {
    const { reconstructFullState } = require('../services/stateEngine');
    const stateResult = await reconstructFullState(req.params.id);
    return res.status(200).json({
      success: true,
      data: stateResult.timeline,
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: error.message
        }
      });
    }
    next(error);
  }
};

module.exports = {
  getPayments,
  getPaymentById,
  getPaymentEvents,
  getOrders,
  getWebhooks,
  getIncidents,
  getPaymentState,
  getPaymentTimeline,
};
