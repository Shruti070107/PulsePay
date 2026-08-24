import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, AlertCircle, CreditCard, Terminal, Activity } from 'lucide-react';

import Dashboard from './pages/Dashboard';
import Incidents from './pages/Incidents';
import IncidentDetails from './pages/IncidentDetails';
import Payments from './pages/Payments';
import PaymentDetails from './pages/PaymentDetails';
import DeveloperConsole from './pages/DeveloperConsole';

function App() {
  return (
    <Router>
      <div className="app-container">
        <aside className="sidebar">
          <div className="logo">
            <Activity className="logo-icon" size={24} style={{ color: 'var(--color-info)' }} />
            <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>PULSE<span style={{ color: 'var(--color-info)' }}>PAY</span></h1>
          </div>
          
          <nav style={{ flex: 1, marginTop: '24px' }}>
            <ul className="nav-links">
              <li>
                <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
                  <LayoutDashboard size={18} />
                  <span>Dashboard</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/incidents" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <AlertCircle size={18} />
                  <span>Incidents</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/payments" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <CreditCard size={18} />
                  <span>Payments</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/dev" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <Terminal size={18} />
                  <span>Developer Console</span>
                </NavLink>
              </li>
            </ul>
          </nav>

          <div style={{ padding: '0 8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>Console v1.0.0</span>
          </div>
        </aside>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/incidents/:id" element={<IncidentDetails />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/payments/:id" element={<PaymentDetails />} />
            <Route path="/dev" element={<DeveloperConsole />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
