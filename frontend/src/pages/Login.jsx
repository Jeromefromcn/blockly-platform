import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const S = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: '#f7fafc'
  },
  card: {
    background: '#fff', borderRadius: 12, padding: '40px 36px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.1)', width: '100%', maxWidth: 400
  },
  title: { fontSize: '1.5rem', fontWeight: 700, color: '#2d3748', marginBottom: 8, textAlign: 'center' },
  sub: { color: '#718096', fontSize: '0.9rem', marginBottom: 28, textAlign: 'center' },
  label: { display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#718096', marginBottom: 5 },
  input: {
    width: '100%', padding: '10px 12px', border: '1px solid #cbd5e0',
    borderRadius: 6, fontSize: '0.95rem', outline: 'none', marginBottom: 18,
    boxSizing: 'border-box'
  },
  btn: {
    width: '100%', padding: '11px', border: 'none', borderRadius: 6,
    cursor: 'pointer', fontWeight: 700, fontSize: '1rem',
    background: '#2b6cb0', color: '#fff', marginTop: 4
  },
  error: {
    background: '#fff5f5', border: '1px solid #feb2b2', color: '#c53030',
    borderRadius: 6, padding: '10px 14px', fontSize: '0.88rem', marginBottom: 16
  },
};

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.username, form.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.title}>Blockly Exercise Platform</div>
        <div style={S.sub}>Sign in to continue</div>
        {error && <div style={S.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label style={S.label}>Username</label>
          <input
            style={S.input}
            type="text"
            autoComplete="username"
            placeholder="Enter username"
            value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            required
          />
          <label style={S.label}>Password</label>
          <input
            style={S.input}
            type="password"
            autoComplete="current-password"
            placeholder="Enter password"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            required
          />
          <button style={S.btn} type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
