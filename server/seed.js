require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { seedDemoData } = require('./services/demoSeedService');

const run = async () => {
  try {
    console.log('Connecting to database...');
    await connectDB();
    const result = await seedDemoData({ quiet: false });
    console.log('\n==================================================');
    console.log('PulsePay Demo Seed Completed Successfully!');
    console.log(`Total Opportunities: ${result.totalOpportunities}`);
    console.log(`Pending Opportunities: ${result.pendingCount} (${result.pendingEligible} eligible, ${result.pendingBlocked} blocked)`);
    console.log(`Historical Executions: ${result.historicalActions} (${result.recoveredCount} recovered, ${result.blockedCount} blocked, ${result.failedCount} failed)`);
    console.log('==================================================\n');
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('[PulsePay Seed Error]', err);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  }
};

run();
