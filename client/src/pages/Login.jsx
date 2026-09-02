import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

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
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState('');

  const targetPath = getReturnPath(location.state?.from);

  const authenticateDemoSession = () => {
    sessionStorage.setItem('pulsepay_auth', 'true');
    if (onLogin) onLogin();
    navigate(targetPath, { replace: true });
  };

  const handleAuthenticate = (e) => {
    e.preventDefault();

    if (email.trim().toLowerCase() !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
      setError('Use the demo operator credentials shown on this page.');
      return;
    }

    authenticateDemoSession();
  };

  const handleQuickDemoSignIn = () => {
    setError('');
    authenticateDemoSession();
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'var(--font-sans)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-sm)',
        padding: '32px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        
        {/* Brand Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: '700', letterSpacing: '0', color: 'var(--text-primary)', marginBottom: '6px' }}>
            PULSE<span style={{ color: 'var(--color-info)' }}>PAY</span>
          </span>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '600' }}>
            Revenue Recovery Operations
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleAuthenticate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div style={{
              padding: '8px 10px',
              backgroundColor: 'var(--color-critical-bg)',
              border: '1px solid var(--color-critical-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-critical)',
              fontSize: '0.74rem'
            }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '5px', fontWeight: '500' }}>
              Work email
            </label>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ops@pulsepay.internal"
              style={{ width: '100%', fontSize: '0.8rem' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '5px', fontWeight: '500' }}>
              Password
            </label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              style={{ width: '100%', fontSize: '0.8rem' }}
              required
            />
          </div>

          <button 
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '9px 16px', fontSize: '0.82rem', marginTop: '4px' }}
          >
            Sign in to PulsePay
          </button>
        </form>

        {/* Quick Demo Sign-In Separator & Action */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ textAlign: 'center', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            Demo environment · Synthetic payment data
          </div>

          <button 
            type="button"
            className="btn btn-secondary"
            onClick={handleQuickDemoSignIn}
            style={{ width: '100%', padding: '8px 14px', fontSize: '0.78rem' }}
          >
            Quick Demo Sign-In
          </button>
        </div>

      </div>
    </div>
  );
};

export default Login;
