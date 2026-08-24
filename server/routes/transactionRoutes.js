const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const PaymentEvent = require('../models/PaymentEvent');
const Order = require('../models/Order');
const WebhookEvent = require('../models/WebhookEvent');
const Incident = require('../models/Incident');

const { validateRecord, normalizeRecord, detectDuplicates } = require('../services/normalization/normalizationLayer');
const { calculateMerchantBaseline } = require('../services/analytics/baselineEngine');
const { runIncidentDetectionAndAggregation } = require('../services/incident/incidentAggregator');

/**
 * Validates uploaded dataset records.
 */
router.post('/validate', async (req, res, next) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ success: false, error: 'Records must be a JSON array' });
    }

    const errors = [];
    let validCount = 0;
    let invalidCount = 0;
    const seenPaymentIds = new Set();

    records.forEach((record, index) => {
      const valResult = validateRecord(record, index, seenPaymentIds);
      if (record.paymentId) seenPaymentIds.add(record.paymentId);

      if (valResult.isValid && !valResult.isExactDuplicate) {
        validCount++;
      } else {
        invalidCount++;
        errors.push(...valResult.errors);
        if (valResult.isExactDuplicate) {
          errors.push({
            row: index + 1,
            field: 'paymentId',
            problem: `Exact duplicate payment ID: ${record.paymentId}`,
            correction: 'Provide a unique payment ID'
          });
        }
      }
    });

    const duplicatesList = await detectDuplicates(records);

    return res.status(200).json({
      success: true,
      total: records.length,
      valid: validCount,
      invalid: invalidCount,
      duplicates: duplicatesList.length,
      errors,
      duplicatesList
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Bulk imports normalized valid records.
 */
router.post('/import', async (req, res, next) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ success: false, error: 'Records must be a JSON array' });
    }

    for (const record of records) {
      const norm = normalizeRecord(record);

      // Save standard Payment
      await Payment.findOneAndUpdate(
        { paymentId: norm.paymentId },
        norm,
        { upsert: true, new: true }
      );

      // Save matching Order
      await Order.findOneAndUpdate(
        { paymentId: norm.paymentId },
        {
          paymentId: norm.paymentId,
          orderId: norm.orderId,
          amount: norm.amount,
          status: norm.status === 'captured' ? 'paid' : 'unpaid'
        },
        { upsert: true, new: true }
      );

      // Seed timeline elements
      await PaymentEvent.findOneAndUpdate(
        { eventId: `evt_${norm.paymentId}_created` },
        {
          eventId: `evt_${norm.paymentId}_created`,
          paymentId: norm.paymentId,
          type: 'payment.created',
          source: 'gateway',
          status: 'created',
          eventTimestamp: norm.createdAt,
          receivedAt: new Date(norm.createdAt.getTime() + 1000)
        },
        { upsert: true }
      );

      if (norm.status === 'captured') {
        await PaymentEvent.findOneAndUpdate(
          { eventId: `evt_${norm.paymentId}_captured` },
          {
            eventId: `evt_${norm.paymentId}_captured`,
            paymentId: norm.paymentId,
            type: 'payment.captured',
            source: 'gateway',
            status: 'captured',
            eventTimestamp: new Date(norm.createdAt.getTime() + 2000),
            receivedAt: new Date(norm.createdAt.getTime() + 3000)
          },
          { upsert: true }
        );
      }
    }

    // Auto run aggregation correlation
    await runIncidentDetectionAndAggregation(24);

    return res.status(200).json({ success: true, imported: records.length });
  } catch (err) {
    next(err);
  }
});

/**
 * Ingests a single event in SRE stream replay controls.
 */
router.post('/ingest-event', async (req, res, next) => {
  try {
    const { eventType, paymentId, amount, customerId, merchantId, status, timestamp, isWebhook, webhookStatus } = req.body;

    let payment = await Payment.findOne({ paymentId });
    if (!payment) {
      payment = new Payment({
        paymentId,
        orderId: `ORD-${paymentId}`,
        amount: amount || 1000,
        customerId: customerId || 'cust_default',
        merchantId: merchantId || 'merch_default',
        paymentMethod: 'card',
        status: status || 'created'
      });
      await payment.save();
    } else if (status) {
      payment.status = status;
      await payment.save();
    }

    let order = await Order.findOne({ paymentId });
    if (!order) {
      order = new Order({
        paymentId,
        orderId: payment.orderId,
        amount: payment.amount,
        status: payment.status === 'captured' ? 'paid' : 'unpaid'
      });
      await order.save();
    } else if (payment.status === 'captured') {
      order.status = 'paid';
      await order.save();
    }

    if (isWebhook) {
      const whEvent = new WebhookEvent({
        webhookId: `wh_${Math.random().toString(36).substr(2, 9)}`,
        paymentId,
        eventId: `evt_${Math.random().toString(36).substr(2, 9)}`,
        eventType: 'payment.captured',
        deliveryStatus: webhookStatus || 'delivered',
        attemptNumber: 1,
        timestamp: timestamp ? new Date(timestamp) : new Date()
      });
      await whEvent.save();
    } else {
      const pEvent = new PaymentEvent({
        eventId: `evt_${Math.random().toString(36).substr(2, 9)}`,
        paymentId,
        type: eventType || 'payment.created',
        source: 'gateway',
        status: status || 'created',
        eventTimestamp: timestamp ? new Date(timestamp) : new Date(),
        receivedAt: new Date()
      });
      await pEvent.save();
    }

    // Trigger incident scan to immediately group anomalies
    await runIncidentDetectionAndAggregation(24);

    return res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
});

/**
 * Returns baseline metrics for analytics.
 */
router.get('/baseline', async (req, res, next) => {
  try {
    const { merchantId } = req.query;
    if (!merchantId) {
      return res.status(400).json({ success: false, error: 'merchantId parameter is required' });
    }
    const result = await calculateMerchantBaseline(merchantId);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * Stores SRE operator usefulness classification feedback.
 */
router.post('/incidents/:id/feedback', async (req, res, next) => {
  try {
    const { feedback } = req.body;
    if (!['TRUE_INCIDENT', 'FALSE_POSITIVE', 'UNCERTAIN'].includes(feedback)) {
      return res.status(400).json({ success: false, error: 'Invalid feedback classification value' });
    }

    const incident = await Incident.findOne({ incidentId: req.params.id });
    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

    incident.operatorFeedback = feedback;
    incident.auditTrail.push({
      action: `operator feedback submitted: ${feedback}`,
      actor: 'operator',
      timestamp: new Date()
    });
    await incident.save();

    return res.status(200).json({ success: true, data: incident });
  } catch (err) {
    next(err);
  }
});

module.exports = { router };
