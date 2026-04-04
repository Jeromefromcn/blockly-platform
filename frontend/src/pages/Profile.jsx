import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { apiGet, apiPut } from '../api.js';

const S = {
  container: { maxWidth: 600, margin: '40px auto', padding: '0 20px' },
  card: { background: '#fff', borderRadius: 10, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 24 },
  h2: { fontSize: '1.1rem', fontWeight: 700, color: '#2d3748', marginBottom: 20 },
  label: { display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#718096', marginBottom: 5 },
  input: { width: '100%', padding: '9px 12px', border: '1px solid #cbd5e0', borderRadius: 6, fontSize: '0.92rem', outline: 'none', marginBottom: 16, boxSizing: 'border-box' },
  readOnly: { background: '#f7fafc', color: '#a0aec0' },
  btn: { padding: '9px 24px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', background: '#2b6cb0', color: '#fff' },
  msg: { padding: '8px 14px', borderRadius: 6, fontSize: '0.85rem', marginBottom: 14 },
  success: { background: '#f0fff4', border: '1px solid #9ae6b4', color: '#276749' },
  error: { background: '#fff5f5', border: '1px solid #feb2b2', color: '#c53030' },
};

export default function Profile() {
  const { user, fetchMe } = useAuth();
  const [profile, setProfile] = useState({ displayName: '', email: '' });
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [profileMsg, setProfileMsg] = useState(null);
  const [pwMsg, setPwMsg] = useState(null);

  useEffect(() => {
    apiGet('/api/profile').then(r => r.json()).then(data => {
      setProfile({ displayName: data.displayName || '', email: data.email || '' });
    });
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileMsg(null);
    try {
      const res = await apiPut('/api/profile', profile);
      if (res.ok) {
        setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
        fetchMe();
      } else {
        const d = await res.json();
        setProfileMsg({ type: 'error', text: d.error || 'Update failed.' });
      }
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message });
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    try {
      const res = await apiPut('/api/profile/password', {
        oldPassword: pwForm.oldPassword,
        newPassword: pwForm.newPassword,
      });
      if (res.ok) {
        setPwMsg({ type: 'success', text: 'Password changed. Please log in again.' });
        setPwForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const d = await res.json();
        setPwMsg({ type: 'error', text: d.error || 'Failed to change password.' });
      }
    } catch (err) {
      setPwMsg({ type: 'error', text: err.message });
    }
  };

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <div style={S.container}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#2d3748', marginBottom: 24 }}>My Profile</h1>

      <div style={S.card}>
        <h2 style={S.h2}>Account Information</h2>
        {profileMsg && (
          <div style={{ ...S.msg, ...(profileMsg.type === 'success' ? S.success : S.error) }}>
            {profileMsg.text}
          </div>
        )}
        <form onSubmit={saveProfile}>
          <label style={S.label}>Username (read-only)</label>
          <input style={{ ...S.input, ...S.readOnly }} value={user?.username || ''} readOnly />

          <label style={S.label}>Role</label>
          <input style={{ ...S.input, ...S.readOnly }} value={user?.role || ''} readOnly />

          <label style={S.label}>Display Name</label>
          <input
            style={S.input}
            value={profile.displayName}
            onChange={e => setProfile(p => ({ ...p, displayName: e.target.value }))}
            placeholder="Your display name"
            disabled={isSuperAdmin}
          />

          <label style={S.label}>Email</label>
          <input
            style={S.input}
            type="email"
            value={profile.email}
            onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
            placeholder="your@email.com"
            disabled={isSuperAdmin}
          />

          {!isSuperAdmin && (
            <button style={S.btn} type="submit">Save Profile</button>
          )}
        </form>
      </div>

      {!isSuperAdmin && (
        <div style={S.card}>
          <h2 style={S.h2}>Change Password</h2>
          {pwMsg && (
            <div style={{ ...S.msg, ...(pwMsg.type === 'success' ? S.success : S.error) }}>
              {pwMsg.text}
            </div>
          )}
          <form onSubmit={savePassword}>
            <label style={S.label}>Current Password</label>
            <input
              style={S.input}
              type="password"
              value={pwForm.oldPassword}
              onChange={e => setPwForm(f => ({ ...f, oldPassword: e.target.value }))}
              required
            />
            <label style={S.label}>New Password</label>
            <input
              style={S.input}
              type="password"
              value={pwForm.newPassword}
              onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
              required
            />
            <label style={S.label}>Confirm New Password</label>
            <input
              style={S.input}
              type="password"
              value={pwForm.confirmPassword}
              onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
              required
            />
            <button style={S.btn} type="submit">Save Password</button>
          </form>
        </div>
      )}
    </div>
  );
}
