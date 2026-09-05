require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const simulatorService = require('../services/simulatorService');
const { runIncidentDetectionAndAggregation } = require('../services/incident/incidentAggregator');
const { runFullRevenueRecoveryDemo } = require('../services/recovery/recoveryDemoService');

const Payment = require('../models/Payment');
const Order = require('../models/Order');
const PaymentEvent = require('../models/PaymentEvent');
const WebhookEvent = require('../models/WebhookEvent');
const Incident = require('../models/Incident');
const RecoveryOpportunity = require('../models/RecoveryOpportunity');
const RecoveryCampaign = require('../models/RecoveryCampaign');
const RecoveryAction = require('../models/RecoveryAction');

async function seed() {
  console.log('--- PulsePay Realistic Synthetic Data Seeder ---');
  await connectDB();

  console.log('1. Clearing old synthetic operational data...');
  await Promise.all([
    Payment.deleteMany({}),
    Order.deleteMany({}),
    PaymentEvent.deleteMany({}),
    WebhookEvent.deleteMany({}),
    Incident.deleteMany({}),
    RecoveryOpportunity.deleteMany({}),
    RecoveryCampaign.deleteMany({}),
    RecoveryAction.deleteMany({})
  ]);

  console.log('2. Generating normal baseline traffic & operational failure scenarios...');
  const demoScenarios = [
    'generateWebhookFailure',
    'generateDuplicate',
    'generateOutOfOrder',
    'generateRefundFailure',
    'generateLateAuth',
    'generateWebhookOutage',
    'generateGatewayTimeout',
    'generateAuthLatencySpike',
    'generateMerchant5xxSpike',
    'generateMerchantTimeout',
    'generateProviderDegradation',
    'generateHighDeclineRate',
    'generatePermanentDecline',
    'generatePartialCapture',
    'generateAmountMismatch',
    'generateOrderStateMismatch',
    'generateRetryStorm',
    'generateRepeatedCustomerAttempts',
    'generateMultiSignalCompound'
  ];

  // 20 Normal payments
  for (let i = 0; i < 20; i++) {
    const data = simulatorService.generateNormal();
    await simulatorService.saveScenarioData(data);
  }

  // Multi-scenario failures
  for (const scName of demoScenarios) {
    if (typeof simulatorService[scName] === 'function') {
      try {
        const data = simulatorService[scName]();
        await simulatorService.saveScenarioData(data);
      } catch (err) {
        console.warn(`Warning: failed scenario ${scName}:`, err.message);
      }
    }
  }

  console.log('3. Running incident detection and correlation pipeline...');
  const aggResult = await runIncidentDetectionAndAggregation(24);
  console.log(`   Created ${aggResult.incidentsDetected || 0} incidents.`);

  console.log('4. Initializing revenue recovery demo campaign & risk opportunities...');
  const recoveryDemo = await runFullRevenueRecoveryDemo();
  console.log(`   Recovery demo executed. Salvaged ₹${recoveryDemo.actualRecovered.toLocaleString()} (${recoveryDemo.recoveryRate}% rate).`);

  const paymentCount = await Payment.countDocuments();
  const incidentCount = await Incident.countDocuments();
  const oppCount = await RecoveryOpportunity.countDocuments();
  console.log('\n✔ Seed successfully complete:');
  console.log(`  - Payments: ${paymentCount}`);
  console.log(`  - Incidents: ${incidentCount}`);
  console.log(`  - Recovery Opportunities: ${oppCount}`);

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
