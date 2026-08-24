const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Payment = require('../models/Payment');
const PaymentEvent = require('../models/PaymentEvent');
const Order = require('../models/Order');
const WebhookEvent = require('../models/WebhookEvent');
const Incident = require('../models/Incident');
const Investigation = require('../models/Investigation');

const simulatorService = require('../services/simulatorService');
const { runIncidentDetectionAndAggregation } = require('../services/incident/incidentAggregator');
const { runIncidentInvestigation } = require('../services/ai');

const green = (text) => `\x1b[32m${text}\x1b[0m`;
const red = (text) => `\x1b[31m${text}\x1b[0m`;

const runFullPipelineTest = async () => {
  console.log('Starting PulsePay End-to-End Ingestion & Investigation Pipeline Test...\n');
  
  try {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }
  } catch (err) {
    console.error('Failed to connect to MongoDB for integration tests:', err.message);
    process.exit(1);
  }

  // Clear previous test records to keep it isolated
  console.log('Clearing old test database records...');
  await Promise.all([
    Payment.deleteMany({}),
    PaymentEvent.deleteMany({}),
    Order.deleteMany({}),
    WebhookEvent.deleteMany({}),
    Incident.deleteMany({}),
    Investigation.deleteMany({})
  ]);

  let passed = 0;
  let failed = 0;

  const assertTest = (name, condition) => {
    if (condition) {
      console.log(`  ${green('✔')} ${name} - ${green('PASSED')}`);
      passed++;
    } else {
      console.error(`  ${red('✘')} ${name} - ${red('FAILED')}`);
      failed++;
    }
  };

  try {
    // 2. Generate Simulator data for all 6 scenarios
    console.log('\nStep 1: Simulating payment streams across 6 operational scenarios...');
    
    const scenarios = [
      { name: 'normal', generator: simulatorService.generateNormal },
      { name: 'webhook-failure', generator: simulatorService.generateWebhookFailure },
      { name: 'duplicate', generator: simulatorService.generateDuplicate },
      { name: 'out-of-order', generator: simulatorService.generateOutOfOrder },
      { name: 'refund-failure', generator: simulatorService.generateRefundFailure },
      { name: 'late-auth', generator: simulatorService.generateLateAuth }
    ];

    for (const sc of scenarios) {
      const data = sc.generator();
      const result = await simulatorService.saveScenarioData(data);
      console.log(`  Generated ${sc.name} payment streams: ${result.paymentId}`);
    }

    const paymentCount = await Payment.countDocuments();
    assertTest('Simulator creates expected payment documents count', paymentCount === 7);

    // 3. Trigger Ingestion and Incident Aggregator
    console.log('\nStep 2: Invoking Incident Aggregator and State Reconstruction...');
    const detectResult = await runIncidentDetectionAndAggregation(24);
    
    assertTest('Aggregator completes successfully', detectResult.success === true);
    assertTest('Aggregator processes exactly 6 transactions', detectResult.transactionsProcessed === 6);
    
    const incidentCount = await Incident.countDocuments();
    console.log(`  Aggregated ${incidentCount} incidents in database.`);
    assertTest('Aggregator detects failures and groups them', incidentCount > 0);

    // 4. Test AI Investigation
    console.log('\nStep 3: Triggering AI Root Cause Investigation on first aggregated incident...');
    const incident = await Incident.findOne();
    if (!incident) {
      throw new Error('No incidents found to investigate');
    }

    console.log(`  Targeting Incident ID: ${incident.incidentId} (Type: ${incident.type})`);
    const investigation = await runIncidentInvestigation(incident.incidentId);

    assertTest('Investigation completes and creates database record', investigation !== null);
    assertTest('Investigation ID has correct prefix', investigation.investigationId.startsWith('INV-'));
    assertTest('Investigation summary contains expected textual content', typeof investigation.summary === 'string' && investigation.summary.length > 0);
    assertTest('Investigation probable root cause is populated', typeof investigation.probableRootCause === 'string' && investigation.probableRootCause.length > 0);
    assertTest('Confidence is within safety bounds', investigation.confidence >= 0.0 && investigation.confidence <= 1.0);
    assertTest('Facts and Inferences are resolved arrays', Array.isArray(investigation.facts) && Array.isArray(investigation.inferences));
    assertTest('Financial impact affected amount matches context', investigation.financialImpact.affectedAmount === incident.affectedAmount);

    const savedInvestigation = await Investigation.findOne({ incidentId: incident.incidentId });
    assertTest('Investigation is successfully saved to MongoDB', savedInvestigation !== null);

    // 5. Test rich details resolution
    console.log('\nStep 4: Resolving rich incident evidence details (supplementary endpoint)...');
    const { resolveRichIncidentDetails } = require('../services/incident/evidenceEngine');
    const richData = await resolveRichIncidentDetails(incident);

    assertTest('Rich details has visual timeline', Array.isArray(richData.timeline) && richData.timeline.length > 0);
    assertTest('Rich details has structured evidenceItems', Array.isArray(richData.evidenceItems) && richData.evidenceItems.length > 0);
    assertTest('Rich details has computed blastRadius metrics', richData.blastRadius && richData.blastRadius.affectedAmount === incident.affectedAmount);
    assertTest('Rich details has operatorActionCenter checklist', Array.isArray(richData.operatorActionCenter) && richData.operatorActionCenter.length > 0);
    assertTest('Rich details has causal Root Cause Graph nodes & edges', richData.rootCauseGraph && Array.isArray(richData.rootCauseGraph.nodes));

  } catch (error) {
    console.error('Fatal Pipeline Test error:', error);
    failed++;
  } finally {
    console.log(`\nPipeline test finished: ${green(`${passed} passed`)}, ${failed > 0 ? red(`${failed} failed`) : '0 failed'}`);
    await mongoose.connection.close();
    if (failed > 0) {
      process.exit(1);
    }
  }
};

runFullPipelineTest();
