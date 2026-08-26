const Payment = require('../../models/Payment');
const PaymentEvent = require('../../models/PaymentEvent');
const Order = require('../../models/Order');
const WebhookEvent = require('../../models/WebhookEvent');
const RecoveryOpportunity = require('../../models/RecoveryOpportunity');
const RecoveryAction = require('../../models/RecoveryAction');
const RecoveryBenchmarkResult = require('../../models/RecoveryBenchmarkResult');
const { evaluateRecoveryPolicies } = require('./recoveryPolicyEngine');
const { randomId, generateEventId, generateWebhookId } = require('../../utils/idGenerator');

/**
 * Bounded Synthetic Execution Engine
 * Executes safe, idempotent recovery actions inside the synthetic payment test environment.
 * NEVER contacts real payment rails or moves actual money.
 */
const executeRecoveryBatch = async (params = {}) => {
  const {
    opportunityIds = [],
    paymentIds = [],
    paymentId,
    opportunityId,
    batchId = `RB-${Date.now()}`,
    campaignId = `CAMP-${randomId(6).toUpperCase()}`,
    forceAction,
  } = params;

  // Aggregate all requested identifiers
  const targetIds = [
    ...(Array.isArray(opportunityIds) ? opportunityIds : [opportunityIds]),
    ...(Array.isArray(paymentIds) ? paymentIds : [paymentIds]),
    ...(paymentId ? [paymentId] : []),
    ...(opportunityId ? [opportunityId] : []),
  ].filter(Boolean);

  let query = {};
  if (targetIds.length > 0) {
    query = {
      $or: [
        { opportunityId: { $in: targetIds } },
        { paymentId: { $in: targetIds } },
      ],
    };
  } else {
    query = { status: { $in: ['PENDING', 'SIMULATED'] } };
  }

  let opportunities = await RecoveryOpportunity.find(query);

  // If specific IDs were requested but no RecoveryOpportunity records exist, synthesize from Payment or Benchmark results
  if (opportunities.length === 0 && targetIds.length > 0) {
    for (const id of targetIds) {
      // 1. Check in RecoveryBenchmarkResult
      const bench = await RecoveryBenchmarkResult.findOne({ paymentId: id }).lean();
      if (bench) {
        const opp = await RecoveryOpportunity.findOneAndUpdate(
          { paymentId: bench.paymentId },
          {
            opportunityId: `REC-${bench.paymentId}`,
            paymentId: bench.paymentId,
            merchantId: bench.merchantId,
            customerId: bench.customerId,
            orderId: bench.orderId,
            amount: bench.amount,
            currency: bench.currency || 'INR',
            provider: bench.provider || 'gateway_mock',
            paymentMethod: bench.paymentMethod || 'upi',
            failureReason: bench.failureType || 'GATEWAY_TIMEOUT',
            recoverabilityClassification: 'RECOVERABLE',
            recoverabilityScore: Math.round((bench.rawRecoveryProbability || 0.8) * 100),
            rawProbability: bench.rawRecoveryProbability || 0.78,
            recoveryProbability: bench.calibratedRecoveryProbability || 0.91,
            estimatedRecoverableAmount: bench.expectedRecovery || bench.amount,
            recommendedAction: bench.recommendedStrategy || 'DELAYED_RETRY',
            expectedValue: bench.expectedValue || (bench.amount * 0.91 - 10),
            policyStatus: bench.policyDecision === 'BLOCKED' ? 'BLOCKED' : 'ELIGIBLE',
            status: 'PENDING',
          },
          { upsert: true, new: true }
        );
        opportunities.push(opp);
        continue;
      }

      // 2. Check in Payment collection
      const paymentDoc = await Payment.findOne({ paymentId: id }).lean();
      if (paymentDoc) {
        const failEvent = await PaymentEvent.findOne({ paymentId: id, type: 'payment.failed' }).sort({ timestamp: -1 }).lean();
        const failureReason = failEvent?.metadata?.errorCode || failEvent?.metadata?.failureReason || failEvent?.failureReason || paymentDoc.errorMessage || paymentDoc.stateType || 'GATEWAY_TIMEOUT';
        const isPermanent = ['CARD_EXPIRED', 'FRAUD_SUSPECTED', 'ACCOUNT_BLOCKED', 'LOST_OR_STOLEN_CARD', 'DO_NOT_HONOR_PERMANENT'].some(code => String(failureReason).toUpperCase().includes(code));

        const opp = await RecoveryOpportunity.findOneAndUpdate(
          { paymentId: paymentDoc.paymentId },
          {
            opportunityId: `REC-${paymentDoc.paymentId}`,
            paymentId: paymentDoc.paymentId,
            merchantId: paymentDoc.merchantId || 'merch_default',
            customerId: paymentDoc.customerId || 'cust_default',
            orderId: paymentDoc.orderId || 'ord_default',
            amount: paymentDoc.amount || 1000,
            currency: paymentDoc.currency || 'INR',
            provider: paymentDoc.provider || 'gateway_mock',
            paymentMethod: paymentDoc.paymentMethod || paymentDoc.method || 'upi',
            failureReason,
            recoverabilityClassification: isPermanent ? 'NON_RECOVERABLE' : 'RECOVERABLE',
            recoverabilityScore: isPermanent ? 5 : 85,
            rawProbability: isPermanent ? 0.05 : 0.78,
            recoveryProbability: isPermanent ? 0.01 : 0.91,
            estimatedRecoverableAmount: isPermanent ? 0 : paymentDoc.amount,
            recommendedAction: isPermanent ? 'STOP_RECOVERY' : 'DELAYED_RETRY',
            expectedValue: isPermanent ? -10 : Math.round(paymentDoc.amount * 0.91 - 10),
            policyStatus: isPermanent ? 'BLOCKED' : 'ELIGIBLE',
            status: paymentDoc.status === 'captured' ? 'RECOVERED' : 'PENDING',
          },
          { upsert: true, new: true }
        );
        opportunities.push(opp);
      }
    }
  }

  // If still empty and specific target IDs were provided
  if (opportunities.length === 0 && targetIds.length > 0) {
    return {
      success: false,
      status: 'NOT_FOUND',
      reason: `No payment or recovery opportunity found for identifier(s): ${targetIds.join(', ')}`,
      totalTargeted: 0,
      totalExecuted: 0,
      actions: [],
    };
  }

  let totalExecuted = 0;
  let recoveredCount = 0;
  let failedCount = 0;
  let blockedCount = 0;
  let skippedCount = 0;
  let actualRecoveredAmount = 0;
  let actualFailedAmount = 0;
  let blockedAmount = 0;

  const executedActions = [];
  let primaryPolicyResult = null;

  for (const opp of opportunities) {
    const actionToExecute = forceAction || opp.recommendedAction || 'DELAYED_RETRY';
    const idempotencyKey = `REC-${campaignId}-${opp.paymentId}-${actionToExecute}`;

    // 1. Idempotency Check
    const existingAction = await RecoveryAction.findOne({ idempotencyKey });
    if (existingAction) {
      skippedCount++;
      executedActions.push({
        paymentId: opp.paymentId,
        action: actionToExecute,
        result: 'SKIPPED',
        reason: 'Duplicate execution prevented by idempotency guard.',
      });
      continue;
    }

    // 2. Policy Re-check at execution time
    const policyResult = evaluateRecoveryPolicies({
      paymentId: opp.paymentId,
      amount: opp.amount,
      failureReason: opp.failureReason,
      retryCount: opp.retryCount || 0,
      timeSinceFailureMinutes: opp.timeSinceFailureMinutes || 0,
      expectedValue: opp.expectedValue,
      recommendedAction: actionToExecute,
    });

    primaryPolicyResult = policyResult;

    if (!policyResult.allowed) {
      blockedCount++;
      blockedAmount += opp.amount;

      const blockedActionDoc = await RecoveryAction.create({
        recoveryActionId: `ACT-${randomId(8).toUpperCase()}`,
        idempotencyKey,
        batchId,
        campaignId,
        paymentId: opp.paymentId,
        opportunityId: opp.opportunityId,
        action: actionToExecute,
        previousState: opp.status || 'PENDING',
        newState: 'BLOCKED',
        amount: opp.amount,
        recoveredAmount: 0,
        result: 'BLOCKED',
        reason: policyResult.reason,
        policyDecision: {
          allowed: false,
          ruleEvaluated: 'SAFETY_POLICY_CHECK',
          reason: policyResult.reason,
        },
      });

      opp.status = 'FAILED';
      opp.policyStatus = 'BLOCKED';
      opp.blockedReason = policyResult.reason;
      await opp.save();

      executedActions.push(blockedActionDoc);
      continue;
    }

    totalExecuted++;

    // 3. Execute Synthetic Recovery Action
    const payment = await Payment.findOne({ paymentId: opp.paymentId });
    const order = await Order.findOne({ paymentId: opp.paymentId });
    const previousState = payment ? payment.status : 'failed';

    // Recovery determination (using calibrated recovery probability)
    const prob = typeof opp.recoveryProbability === 'number' ? opp.recoveryProbability : 0.91;
    const isSuccess = Math.random() <= prob;

    if (isSuccess) {
      recoveredCount++;
      actualRecoveredAmount += opp.amount;

      if (payment) {
        payment.status = 'captured';
        payment.updatedAt = new Date();
        await payment.save();
      }

      if (order) {
        order.status = 'paid';
        order.updatedAt = new Date();
        await order.save();
      }

      // Append synthetic recovery event to timeline
      if (actionToExecute === 'RECONCILE_WEBHOOK' || actionToExecute === 'RETRY_WEBHOOK' || actionToExecute === 'RECONCILIATION') {
        await WebhookEvent.create({
          webhookId: generateWebhookId(),
          eventId: generateEventId(),
          paymentId: opp.paymentId,
          eventType: 'webhook.delivery',
          deliveryStatus: 'delivered',
          responseCode: 200,
          attemptNumber: (opp.retryCount || 0) + 1,
          timestamp: new Date(),
        });
      } else {
        await PaymentEvent.create({
          eventId: generateEventId(),
          paymentId: opp.paymentId,
          type: 'payment.captured',
          eventType: 'payment.captured',
          source: 'recovery_agent',
          status: 'success',
          timestamp: new Date(),
          eventTimestamp: new Date(),
          receivedAt: new Date(),
          merchantId: opp.merchantId,
          customerId: opp.customerId,
          orderId: opp.orderId,
          amount: opp.amount,
          currency: opp.currency || 'INR',
          metadata: {
            recoveryAction: actionToExecute,
            recoveredBy: 'PulsePay Agent',
            campaignId,
          },
        });
      }

      const actionDoc = await RecoveryAction.create({
        recoveryActionId: `ACT-${randomId(8).toUpperCase()}`,
        idempotencyKey,
        batchId,
        campaignId,
        paymentId: opp.paymentId,
        opportunityId: opp.opportunityId,
        action: actionToExecute,
        previousState,
        newState: 'CAPTURED',
        amount: opp.amount,
        recoveredAmount: opp.amount,
        result: 'RECOVERED',
        reason: `Successfully recovered ₹${opp.amount} via ${actionToExecute}.`,
        policyDecision: {
          allowed: true,
          ruleEvaluated: 'SAFETY_POLICY_CHECK',
          reason: policyResult.whySafe,
        },
        executionDetails: {
          successProbability: prob,
        },
      });

      opp.status = 'RECOVERED';
      opp.actualRecoveredAmount = opp.amount;
      opp.lastActionAt = new Date();
      await opp.save();

      executedActions.push(actionDoc);
    } else {
      failedCount++;
      actualFailedAmount += opp.amount;

      // Append failed recovery attempt event
      await PaymentEvent.create({
        eventId: generateEventId(),
        paymentId: opp.paymentId,
        type: 'payment.failed',
        eventType: 'payment.failed',
        source: 'recovery_agent',
        status: 'failed',
        timestamp: new Date(),
        eventTimestamp: new Date(),
        receivedAt: new Date(),
        merchantId: opp.merchantId,
        customerId: opp.customerId,
        orderId: opp.orderId,
        amount: opp.amount,
        currency: opp.currency || 'INR',
        metadata: {
          recoveryAction: actionToExecute,
          failureReason: 'RECOVERY_ATTEMPT_DECLINED',
          campaignId,
        },
      });

      const actionDoc = await RecoveryAction.create({
        recoveryActionId: `ACT-${randomId(8).toUpperCase()}`,
        idempotencyKey,
        batchId,
        campaignId,
        paymentId: opp.paymentId,
        opportunityId: opp.opportunityId,
        action: actionToExecute,
        previousState,
        newState: 'FAILED',
        amount: opp.amount,
        recoveredAmount: 0,
        result: 'FAILED',
        reason: 'Recovery attempt declined by downstream synthetic gateway simulator.',
        policyDecision: {
          allowed: true,
          ruleEvaluated: 'SAFETY_POLICY_CHECK',
          reason: policyResult.whySafe,
        },
      });

      opp.status = 'FAILED';
      opp.retryCount = (opp.retryCount || 0) + 1;
      opp.lastActionAt = new Date();
      await opp.save();

      executedActions.push(actionDoc);
    }
  }

  // If single execution was requested and was blocked by policy:
  if ((targetIds.length === 1 || opportunities.length === 1) && blockedCount >= 1 && totalExecuted === 0) {
    return {
      success: false,
      status: 'BLOCKED',
      paymentId: (opportunities[0] && opportunities[0].paymentId) || targetIds[0],
      reason: primaryPolicyResult?.reason || 'Execution blocked by deterministic safety policy.',
      policyChecks: primaryPolicyResult?.policyChecks || [],
      totalTargeted: opportunities.length,
      totalExecuted: 0,
      blockedCount,
      actions: executedActions,
    };
  }

  // If single execution was requested and was skipped (idempotency):
  if ((targetIds.length === 1 || opportunities.length === 1) && skippedCount >= 1 && totalExecuted === 0) {
    return {
      success: true,
      status: 'SKIPPED',
      paymentId: (opportunities[0] && opportunities[0].paymentId) || targetIds[0],
      reason: 'Duplicate execution prevented by idempotency guard.',
      totalTargeted: opportunities.length,
      totalExecuted: 0,
      skippedCount,
      actions: executedActions,
    };
  }

  const primaryAction = executedActions[0] || {};

  return {
    success: true,
    status: recoveredCount > 0 ? 'EXECUTED' : 'COMPLETED',
    paymentId: opportunities[0]?.paymentId,
    action: primaryAction.action,
    recoveredAmount: actualRecoveredAmount,
    outcomeId: primaryAction.recoveryActionId,
    idempotencyKey: primaryAction.idempotencyKey,
    batchId,
    campaignId,
    mode: 'SYNTHETIC_TEST_EXECUTION',
    totalTargeted: opportunities.length,
    totalExecuted,
    recoveredCount,
    failedCount,
    blockedCount,
    skippedCount,
    actualRecoveredAmount,
    actualFailedAmount,
    blockedAmount,
    recoveryRate: totalExecuted > 0 ? Math.round((recoveredCount / totalExecuted) * 1000) / 10 : 0,
    actions: executedActions,
  };
};

module.exports = {
  executeRecoveryBatch,
};
