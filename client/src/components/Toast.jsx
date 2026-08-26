import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4500) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => {
          let Icon = Info;
          let iconColor = 'var(--color-info)';
          let borderColor = 'var(--color-info-border)';

          if (toast.type === 'success') {
            Icon = CheckCircle2;
            iconColor = 'var(--color-healthy)';
            borderColor = 'var(--color-healthy-border)';
          } else if (toast.type === 'warning' || toast.type === 'blocked') {
            Icon = AlertTriangle;
            iconColor = 'var(--color-warning)';
            borderColor = 'var(--color-warning-border)';
          } else if (toast.type === 'error' || toast.type === 'critical') {
            Icon = XCircle;
            iconColor = 'var(--color-critical)';
            borderColor = 'var(--color-critical-border)';
          }

          return (
            <div key={toast.id} className="toast" style={{ borderColor }}>
              <Icon size={18} style={{ color: iconColor, flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1, color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
                {toast.message}
              </div>
              <button 
                onClick={() => removeToast(toast.id)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--text-muted)', 
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      addToast: (msg) => console.log('[Toast fallback]', msg),
      removeToast: () => {},
    };
  }
  return context;
};
