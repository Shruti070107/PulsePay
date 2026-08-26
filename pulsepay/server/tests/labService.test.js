const assert = require('assert');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const {
  generateHistoricalBaseline,
  executeScenarioLab,
  LAB_SCENARIOS
} = require('../services/simulator/labService');
const EvaluationReport = require('../models/EvaluationReport');
const Payment = require('../models/Payment');

const green = (text) => `\x1b[32m${text}\x1b[0m`;
const red = (text) => `\x1b[31m${text}\x1b[0m`;

const runLabServiceTests = async () => {
  console.log('Running PulsePay Scenario Lab Service & Evaluation Tests...\n');

  try {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }
  } catch (err) {
    console.error('Failed to connect to MongoDB for integration tests:', err.message);
    process.exit(1);
  }

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
    // Test 1: LAB_SCENARIOS registry size and elements
    assertTest('LAB_SCENARIOS Registry', LAB_SCENARIOS.length === 11);
    assertTest('Scenario Template keys', LAB_SCENARIOS.some(s => s.scenarioId === 'WEBHOOK_OUTAGE'));

    // Test 2: Seeded Historical Baseline Normal Traffic Generator
    console.log('Generating baseline traffic...');
    await Payment.deleteMany({ paymentId: { $regex: /^pay_hist_/ } });
    const baselineResult = await generateHistoricalBaseline(100, 42);
    assertTest('Baseline generator result count', baselineResult.count === 100);
    assertTest('Baseline generator result origin', baselineResult.origin === 'SYNTHETIC_SIMULATION');

    // Test 3: Run Scenario Lab evaluation (e.g., duplicate payments)
    console.log('Running duplicate payment scenario lab execution...');
    await EvaluationReport.deleteMany({});
    const report = await executeScenarioLab('DUPLICATE_PAYMENT');
    
    assertTest('Evaluation Report successfully created', !!report);
    assertTest('Evaluation Report maps scenario ID', report.scenarioId === 'DUPLICATE_PAYMENT');
    assertTest('Evaluation Report has scorecard status indicators', report.scorecard.overallScore > 0);
    assertTest('Evaluation Report has precision metric details', typeof report.metrics.precision === 'number');
    assertTest('Evaluation Report has recall metric details', typeof report.metrics.recall === 'number');

    // Test 4: Export details (JSON/CSV) verification logic
    const dbReport = await EvaluationReport.findOne({ scenarioId: 'DUPLICATE_PAYMENT' });
    assertTest('Database report query validation', !!dbReport);

  } catch (error) {
    console.error('Tests encountered a critical error:', error);
    failed++;
  } finally {
    console.log(`\nTests Completed: ${green(passed)} passed, ${red(failed)} failed.\n`);
    if (failed > 0) {
      process.exit(1);
    }
  }
};

if (require.main === module) {
  runLabServiceTests().then(() => process.exit(0));
}
