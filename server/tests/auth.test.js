const assert = require('assert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { issueToken, requireAuth } = require('../middleware/auth');
const authController = require('../controllers/authController');

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

  // Test Controller Response Helper
  const mockRes = () => {
    const res = {
      statusCode: 200,
      body: null,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.body = data; return this; }
    };
    return res;
  };

  // Mock User.findOne for controller testing
  const originalFindOne = User.findOne;

  try {
    // 1. Login with missing credentials
    let res = mockRes();
    let nextCalled = false;
    await authController.login({ body: {} }, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false, 'Should handle missing body without calling next(err)');
    assert.strictEqual(res.statusCode, 401, 'Missing body must return 401');
    assert.strictEqual(res.body.success, false);

    // 2. Login with non-existent user
    User.findOne = () => ({
      select: () => Promise.resolve(null)
    });
    res = mockRes();
    await authController.login({ body: { email: 'nobody@example.test', password: 'Password123!' } }, res, () => { nextCalled = true; });
    assert.strictEqual(res.statusCode, 401, 'Unknown email must return 401');
    assert.strictEqual(res.body.error.message, 'Email or password is incorrect.');

    // 3. Login with invalid password
    User.findOne = () => ({
      select: () => Promise.resolve({
        _id: 'user-123',
        name: 'Test Operator',
        email: 'op@example.test',
        passwordHash: hash
      })
    });
    res = mockRes();
    await authController.login({ body: { email: 'op@example.test', password: 'WrongPassword!' } }, res, () => { nextCalled = true; });
    assert.strictEqual(res.statusCode, 401, 'Invalid password must return 401');
    assert.strictEqual(res.body.error.message, 'Email or password is incorrect.');

    // 4. Login with corrupt or undefined passwordHash (Must NOT throw 500)
    User.findOne = () => ({
      select: () => Promise.resolve({
        _id: 'user-corrupt',
        name: 'Corrupt User',
        email: 'corrupt@example.test',
        passwordHash: undefined
      })
    });
    res = mockRes();
    nextCalled = false;
    await authController.login({ body: { email: 'corrupt@example.test', password: 'any-password' } }, res, (err) => { nextCalled = true; });
    assert.strictEqual(nextCalled, false, 'Corrupt passwordHash must not throw to next(err)');
    assert.strictEqual(res.statusCode, 401, 'Corrupt/missing passwordHash must return 401, never 500');

    // 5. Login with valid credentials
    User.findOne = () => ({
      select: () => Promise.resolve({
        _id: 'user-123',
        name: 'Test Operator',
        email: 'op@example.test',
        passwordHash: hash
      })
    });
    res = mockRes();
    await authController.login({ body: { email: 'op@example.test', password: 'test-password-123' } }, res, (err) => { assert.fail('Login must not error: ' + err); });
    assert.strictEqual(res.statusCode, 200, 'Valid login must return 200');
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.email, 'op@example.test');
    assert.ok(res.body.data.token, 'Must return JWT token');

    // 6. Registration validation
    res = mockRes();
    await authController.register({ body: { name: '', email: 'bad-email', password: 'short' } }, res, () => {});
    assert.strictEqual(res.statusCode, 400, 'Invalid registration data must return 400');

    // 7. Logout
    res = mockRes();
    authController.logout({}, res);
    assert.strictEqual(res.statusCode, 200, 'Logout must return 200');
    assert.strictEqual(res.body.success, true);

    console.log('  ✔ Controller login (200 success, 401 invalid, safe corrupt-hash handling, registration validation, logout) - PASSED');
  } finally {
    User.findOne = originalFindOne;
  }

  console.log('Authentication tests finished: all tests passed.');
};

runTests().catch((error) => { console.error(error); process.exitCode = 1; });
