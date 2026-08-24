const assert = require('assert');
const { sanitizeContext } = require('../services/ai/incidentContextBuilder');
const { validateAndFormatResponse, buildFallbackResponse } = require('../services/ai/responseValidator');
const { queryMockProvider } = require('../services/ai/aiProvider');

const green = (text) => `\x1b[32m${text}\x1b[0m`;
const red = (text) => `\x1b[31m${text}\x1b[0m`;

const runAITests = () => {
  console.log('Running PulsePay AI Incident Investigator Tests...\n');
  let passedCount = 0;
  let failedCount = 0;

  const test = (name, fn) => {
    try {
      fn();
      console.log(`  ${green('✔')} ${name} - ${green('PASSED')}`);
      passedCount++;
    } catch (err) {
      console.error(`  ${red('✘')} ${name} - ${red('FAILED')}`);
      console.error(err);
      failedCount++;
    }
  };

  // Test 1: Sensitive Data Sanitization
  test('Credential and Token Sanitization', () => {
    const rawContext = {
      apiKey: 'key_live_1234abcd5678efgh',
      token: 'secret_token_xyz987',
      merchantName: 'Test Merchant',
      customerDetails: {
        cvv: '123',
        password: 'password123'
      },
      evidence: [
        'Called gateway api with token_1234abcd',
        'Healthy payment state reconstructed'
      ]
    };

    const sanitized = sanitizeContext(rawContext);
    
    assert.strictEqual(sanitized.apiKey, '[REDACTED_SENSITIVE_KEY]');
    assert.strictEqual(sanitized.token, '[REDACTED_SENSITIVE_KEY]');
    assert.strictEqual(sanitized.customerDetails.cvv, '[REDACTED_SENSITIVE_KEY]');
    assert.strictEqual(sanitized.customerDetails.password, '[REDACTED_SENSITIVE_KEY]');
    assert.strictEqual(sanitized.evidence[0], 'Called gateway api with [REDACTED_CREDENTIAL]');
    assert.strictEqual(sanitized.evidence[1], 'Healthy payment state reconstructed');
  });

  // Test 2: Mock AI Response Generation
  test('Mock AI Provider Grounding', () => {
    const mockContext = {
      incidentId: 'INC-123',
      type: 'WEBHOOK_FAILURE',
      severity: 'HIGH',
      affectedTransactions: 10,
      affectedAmount: 20000,
      affectedCustomers: 8,
      commonPatterns: {
        merchant: 'merchant_abc',
        webhookEndpoint: '/webhook/test',
        failureCodes: ['500']
      },
      paymentStates: { CAPTURED: 10 },
      orderStates: { unpaid: 10 },
      webhookStats: { failed: 30, delivered: 0 },
      evidence: ['Webhook delivery failed']
    };

    const rawMockResponse = queryMockProvider(mockContext);
    const parsed = JSON.parse(rawMockResponse);

    assert.strictEqual(typeof parsed.summary, 'string');
    assert.strictEqual(parsed.probableRootCause.includes('webhook'), true);
    assert.strictEqual(parsed.confidence, 0.95);
    assert.strictEqual(parsed.financialImpact.affectedAmount, 20000);
    assert.strictEqual(parsed.recommendedActions[0].priority, 'HIGH');
  });

  // Test 3: Response Validator and Repair Logic
  test('Response Schema Validation and Formatting', () => {
    const mockContext = {
      incidentId: 'INC-123',
      affectedAmount: 10000,
      affectedTransactions: 5,
      affectedCustomers: 3,
      evidence: ['Failed order']
    };

    // Case A: Correctly formatted model response wrapped in JSON markdown blocks
    const goodResponse = `
    \`\`\`json
    {
      "summary": "Webhook errors",
      "probableRootCause": "Failed server",
      "confidence": 0.8,
      "confidenceExplanation": "High probability",
      "facts": ["Fact A"],
      "inferences": ["Inference A"],
      "evidence": [{"statement": "log", "source": "system"}],
      "financialImpact": {
        "affectedAmount": 10000,
        "interpretation": "Captured value"
      },
      "customerImpact": "Low",
      "recommendedActions": [{"priority": "HIGH", "action": "test", "reason": "test"}],
      "unknowns": ["None"]
    }
    \`\`\`
    `;

    const validated = validateAndFormatResponse(goodResponse, mockContext);
    assert.strictEqual(validated.summary, 'Webhook errors');
    assert.strictEqual(validated.confidence, 0.8);
    assert.deepStrictEqual(validated.facts, ['Fact A']);
    assert.strictEqual(validated.recommendedActions[0].priority, 'HIGH');

    // Case B: Completely malformed JSON (triggering fallback recovery)
    const badResponse = 'This is a conversational text instead of JSON.';
    const fallback = validateAndFormatResponse(badResponse, mockContext);

    assert.strictEqual(fallback.summary.includes('fallback'), true);
    assert.strictEqual(fallback.probableRootCause.includes('failed to parse'), true);
    assert.strictEqual(fallback.confidence, 0.5);
    assert.strictEqual(fallback.financialImpact.affectedAmount, 10000);
  });

  // Summary
  console.log(`\nTests finished: ${green(`${passedCount} passed`)}, ${failedCount > 0 ? red(`${failedCount} failed`) : '0 failed'}`);
  if (failedCount > 0) {
    process.exit(1);
  }
};

runAITests();
