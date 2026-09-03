const assert = require('assert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { issueToken, requireAuth } = require('../middleware/auth');

process.env.JWT_SECRET = 'auth-test-secret';

const runTests = async () => {
  console.log('\nRunning PulsePay Authentication Tests...');

  const password = 'test-password-123';
  const hash = await bcrypt.hash(password, 12);
  assert.notStrictEqual(hash, password, 'Passwords must never be stored in plaintext');
  assert.strictEqual(await bcrypt.compare(password, hash), true, 'Password hash must verify');
  assert.strictEqual(User.schema.path('email').options.lowercase, true, 'Emails must be normalized to lowercase');
  assert.strictEqual(User.schema.path('passwordHash').options.select, false, 'Password hashes must be excluded by default');

  const token = issueToken({ _id: { toString: () => 'auth-test-user' }, email: 'operator@example.test' });
  assert.strictEqual(jwt.verify(token, process.env.JWT_SECRET).sub, 'auth-test-user', 'Issued JWT must contain the user identity');

  let statusCode;
  let responseBody;
  requireAuth(
    { headers: { authorization: 'Bearer invalid-token' } },
    { status: (code) => ({ json: (body) => { statusCode = code; responseBody = body; } }) },
    () => assert.fail('Invalid tokens must not reach protected handlers')
  );
  assert.strictEqual(statusCode, 401);
  assert.strictEqual(responseBody.error.message, 'Your session has expired. Please sign in again.');

  console.log('  ✔ Password hashing, email normalization, JWT issuance, and invalid-session handling - PASSED');
  console.log('Authentication tests finished: all tests passed.');
};

runTests().catch((error) => { console.error(error); process.exitCode = 1; });
