import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, RotateCcw, Compass, Scale, ChevronDown, ChevronRight,
  CreditCard, AlertCircle, Terminal, Target, Activity, ShieldCheck, HelpCircle, LogOut, MessageSquare, Menu, X,
  Sun, Moon
} from 'lucide-react';
import { useTheme } from './context/ThemeContext';

import { ToastProvider } from './components/Toast';
import Login from './pages/Login';
import Register from './pages/Register';
import { getCurrentUser, logoutUser } from './api';
import Dashboard from './pages/Dashboard';
import Recovery from './pages/Recovery';
import PaymentInvestigation from './pages/PaymentInvestigation';
import PaymentRecoveryDetail from './pages/PaymentRecoveryDetail';
import Campaigns from './pages/Campaigns';
import RecoveryBenchmark from './pages/RecoveryBenchmark';
import Incidents from './pages/Incidents';
import IncidentDetails from './pages/IncidentDetails';
import Payments from './pages/Payments';
import PaymentDetails from './pages/PaymentDetails';
import DeveloperConsole from './pages/DeveloperConsole';
import Copilot from './pages/Copilot';
import RecoveryMission from './pages/RecoveryMission';

function ProtectedRoute({ children, isAuthenticated }) {
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

function AppLayout({ isAuthenticated, setIsAuthenticated }) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  // If on login route, render standalone login view
  if (location.pathname === '/login') {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  // Handle user sign-out
  const handleSignOut = () => {
    logoutUser().catch(() => {});
    sessionStorage.removeItem('pulsepay_auth');
    sessionStorage.removeItem('pulsepay_token');
    setIsAuthenticated(false);
    navigate('/login');
  };

  return (
    <ProtectedRoute isAuthenticated={isAuthenticated}>
      <div className="app-container">
        <button className="mobile-nav-trigger" onClick={() => setMobileNavOpen(open => !open)} aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}>
          {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <div className={`mobile-nav-overlay ${mobileNavOpen ? 'open' : ''}`} onClick={() => setMobileNavOpen(false)} />
        <aside className={`sidebar ${mobileNavOpen ? 'mobile-open' : ''}`}>
          {/* Logo & Brand Header */}
          <div className="logo">
            <Activity className="logo-icon" size={22} style={{ color: 'var(--color-info)' }} />
            <div>
              <h1 style={{ fontSize: '1.1rem', fontWeight: '700', letterSpacing: '-0.02em', lineHeight: 1 }}>
                PULSE<span style={{ color: 'var(--color-info)' }}>PAY</span>
              </h1>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '3px' }}>
                Revenue Recovery
              </div>
            </div>
          </div>

          {/* Simulation Mode Badge */}
          <div style={{ padding: '0 4px', marginTop: '12px' }}>
            <div 
              title="All payment activity uses synthetic data. No real financial transactions are processed."
              style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '6px',
                fontSize: '0.65rem', 
                fontWeight: '700', 
                color: 'var(--color-healthy)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                background: 'var(--color-healthy-bg)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-healthy-border)',
                cursor: 'help'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={13} />
                <span>SIMULATION MODE</span>
              </div>
              <HelpCircle size={12} style={{ opacity: 0.7 }} />
            </div>
          </div>
          
          {/* Primary Navigation (4 Core Sections) */}
          <nav style={{ flex: 1, marginTop: '20px' }}>
            <ul className="nav-links">
              <li>
                <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
                  <LayoutDashboard size={17} />
                  <span>Revenue Center</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/recovery" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <RotateCcw size={17} />
                  <span>Recovery Queue</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/investigation" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <Compass size={17} />
                  <span>Payment Investigation</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/experiments" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <Scale size={17} />
                  <span>Experiments</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/copilot" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <MessageSquare size={17} />
                  <span>Operations Copilot</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/mission" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <Target size={17} />
                  <span>Recovery Mission</span>
                </NavLink>
              </li>

              {/* Collapsible Advanced Tools */}
              <li style={{ marginTop: '18px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                <button 
                  onClick={() => setAdvancedOpen(!advancedOpen)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '0.68rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: '700',
                    cursor: 'pointer',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <span>Advanced Tools</span>
                  {advancedOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              </li>

              {advancedOpen && (
                <>
                  <li>
                    <NavLink to="/campaigns" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                      <Target size={16} />
                      <span>Campaigns & What-If</span>
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/payments" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                      <CreditCard size={16} />
                      <span>Payment Ledger</span>
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/incidents" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                      <AlertCircle size={16} />
                      <span>Incident Intelligence</span>
                    </NavLink>
                  </li>
                </>
              )}
            </ul>
          </nav>

          {/* Light / Dark Theme Toggle in Application Chrome */}
          <div style={{ padding: '10px 4px 6px', borderTop: '1px solid var(--sidebar-border)' }}>
            <button
              id="theme-toggle"
              onClick={toggleTheme}
              className="chrome-theme-toggle"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
              </div>
              <span className="theme-toggle-pill">{theme.toUpperCase()}</span>
            </button>
          </div>

          {/* Footer Status & Sign Out */}
          <div style={{ padding: '10px 6px', fontSize: '0.72rem', color: 'var(--text-muted)', borderTop: '1px solid var(--sidebar-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>PulsePay AI Recovery</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--color-healthy)', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--color-healthy)', borderRadius: '50%' }} />
                Safety Policy Gate Active
              </div>
            </div>
            <button 
              onClick={handleSignOut}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.68rem',
                cursor: 'pointer',
                padding: '3px 6px',
                borderRadius: 'var(--radius-xs)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'color 0.15s ease'
              }}
              title="Sign out of PulsePay"
            >
              <LogOut size={12} />
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/recovery" element={<Recovery />} />
            
            {/* Payment Investigation Routes */}
            <Route path="/investigation" element={<PaymentInvestigation />} />
            <Route path="/investigation/:id" element={<PaymentRecoveryDetail />} />
            
            {/* Experiments / Benchmark Routes */}
            <Route path="/experiments" element={<RecoveryBenchmark />} />
            <Route path="/mission" element={<RecoveryMission />} />
            <Route path="/copilot" element={<Copilot />} />
            <Route path="/benchmark" element={<RecoveryBenchmark />} />
            
            {/* Advanced / Supporting Routes */}
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/payments/:id" element={<PaymentDetails />} />
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/incidents/:id" element={<IncidentDetails />} />
            <Route path="/dev" element={<DeveloperConsole />} />
            <Route path="/dev-console" element={<DeveloperConsole />} />
            
            {/* Fallback */}
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </ProtectedRoute>
  );
}

function App() {
  const [authState, setAuthState] = useState(() => (
    sessionStorage.getItem('pulsepay_token') ? 'checking' : 'signed_out'
  ));
  const isAuthenticated = authState === 'authenticated';

  useEffect(() => {
    if (authState !== 'checking') return;
    getCurrentUser()
      .then(() => setAuthState('authenticated'))
      .catch(() => {
        sessionStorage.removeItem('pulsepay_auth');
        sessionStorage.removeItem('pulsepay_token');
        setAuthState('signed_out');
      });
  }, [authState]);

  if (authState === 'checking') {
    return <div className="auth-shell"><div style={{ color: 'var(--text-secondary)' }}>Restoring your session…</div></div>;
  }

  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login onLogin={() => setAuthState('authenticated')} />} />
          <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <Register onLogin={() => setAuthState('authenticated')} />} />
          <Route path="/*" element={<AppLayout isAuthenticated={isAuthenticated} setIsAuthenticated={(authenticated) => setAuthState(authenticated ? 'authenticated' : 'signed_out')} />} />
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;
