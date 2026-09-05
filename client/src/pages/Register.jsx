import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { registerUser } from '../api';
import { Activity, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const Register = ({ onLogin }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim())      return setError('Please enter your full name.');
    if (!form.email.trim())     return setError('Please enter a valid work email address.');
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.');
    try {
      setSaving(true);
      const result = await registerUser(form);
      sessionStorage.setItem('pulsepay_token', result.data.token);
      sessionStorage.setItem('pulsepay_auth', 'true');
      onLogin?.(result.data.user);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to create your account. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="auth-shell">
      <button
        id="auth-theme-toggle"
        onClick={toggleTheme}
        className="auth-theme-toggle"
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      >
        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
      </button>

      <div className="auth-panel">

        {/* Brand */}
        <div className="auth-brand">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
            <Activity size={20} color="var(--color-info)" />
            <span className="auth-brand-logo">PULSE<span>PAY</span></span>
          </div>
          <div className="auth-brand-sub">Revenue Recovery Operations</div>
        </div>

        <h1 className="auth-heading">Create your account</h1>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={submit} className="auth-form">
          <div>
            <label className="auth-field-label" htmlFor="reg-name">Full Name</label>
            <input
              id="reg-name"
              type="text"
              value={form.name}
              onChange={update('name')}
              placeholder="Alex Johnson"
              autoComplete="name"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="auth-field-label" htmlFor="reg-email">Work Email</label>
            <input
              id="reg-email"
              type="email"
              value={form.email}
              onChange={update('email')}
              placeholder="you@company.com"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="auth-field-label" htmlFor="reg-password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={update('password')}
                placeholder="At least 8 characters"
                autoComplete="new-password"
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

          <div>
            <label className="auth-field-label" htmlFor="reg-confirm">Confirm Password</label>
            <input
              id="reg-confirm"
              type="password"
              value={form.confirmPassword}
              onChange={update('confirmPassword')}
              placeholder="Repeat your password"
              autoComplete="new-password"
              required
            />
          </div>

          <button
            id="register-submit"
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={saving}
            style={{ width: '100%', marginTop: '4px' }}
          >
            {saving ? 'Creating account…' : 'Create PulsePay Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
        <p className="auth-footnote">Demo environment · Synthetic payment data only</p>
      </div>
    </div>
  );
};

export default Register;
