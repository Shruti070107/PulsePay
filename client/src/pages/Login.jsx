import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { loginUser, registerUser } from '../api';
import { Activity, Eye, EyeOff } from 'lucide-react';

const DEMO_EMAIL = 'ops@pulsepay.internal';
const DEMO_PASSWORD = 'demo12345';

const getReturnPath = (from) => {
  if (!from) return '/';
  if (typeof from === 'string') return from || '/';
  const path = `${from.pathname || '/'}${from.search || ''}${from.hash || ''}`;
  return path === '/login' ? '/' : path;
};

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const targetPath = getReturnPath(location.state?.from);

  const authenticate = (token) => {
    sessionStorage.setItem('pulsepay_auth', 'true');
    if (token) sessionStorage.setItem('pulsepay_token', token);
    if (onLogin) onLogin();
    navigate(targetPath, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) return setError('Please enter your work email address.');
    if (!password)     return setError('Please enter your password.');
    try {
      setLoading(true);
      const result = await loginUser({ email: email.trim().toLowerCase(), password });
      authenticate(result.data.token);
    } catch (err) {
      setError(err.message || 'Email or password is incorrect.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    setError('');
    setLoading(true);
    try {
      let result;
      try {
        result = await loginUser({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
      } catch {
        result = await registerUser({ name: 'Demo Operator', email: DEMO_EMAIL, password: DEMO_PASSWORD, confirmPassword: DEMO_PASSWORD });
      }
      authenticate(result.data.token);
    } catch (err) {
      setError(err.message || 'Unable to start the demo session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-panel">

        {/* Brand */}
        <div className="auth-brand">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
            <Activity size={20} color="var(--color-info)" />
            <span className="auth-brand-logo">PULSE<span>PAY</span></span>
          </div>
          <div className="auth-brand-sub">Revenue Recovery Operations</div>
        </div>

        <h1 className="auth-heading">Welcome back</h1>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div>
            <label className="auth-field-label" htmlFor="login-email">Work Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="auth-field-label" htmlFor="login-password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{ paddingRight: '40px' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px'
                }}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: '100%', marginTop: '4px' }}
          >
            {loading ? 'Signing in…' : 'Sign in to PulsePay'}
          </button>
        </form>

        <div className="auth-divider" style={{ margin: '16px 0 12px' }}>or</div>

        <button
          id="demo-signin"
          type="button"
          className="btn btn-secondary"
          onClick={handleQuickDemo}
          disabled={loading}
          style={{ width: '100%' }}
        >
          Quick Demo Sign-In
        </button>

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Create account</Link>
        </p>
        <p className="auth-footnote">Demo environment · Synthetic payment data only</p>
      </div>
    </div>
  );
};

export default Login;
