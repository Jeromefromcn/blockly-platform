import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const colors = {
    success: { bg: '#f0fff4', border: '#9ae6b4', color: '#276749' },
    error:   { bg: '#fff5f5', border: '#fc8181', color: '#c53030' },
    info:    { bg: '#ebf8ff', border: '#90cdf4', color: '#2c5282' },
    warning: { bg: '#fffbeb', border: '#f6ad55', color: '#744210' },
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 340 }}>
        {toasts.map(t => {
          const c = colors[t.type] || colors.info;
          return (
            <div key={t.id} style={{
              padding: '10px 16px', borderRadius: 8, border: `1px solid ${c.border}`,
              background: c.bg, color: c.color, fontSize: '0.88rem', fontWeight: 500,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              animation: 'slideIn 0.2s ease'
            }}>
              {t.message}
            </div>
          );
        })}
      </div>
      <style>{`@keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }`}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
