import { useEffect, useRef, useState } from 'react';
import { apiDelete, apiGet, apiPost, apiPut } from '../api.js';

const S = {
  container: { maxWidth: 1100, margin: '32px auto', padding: '0 20px' },
  h1: { fontSize: '1.4rem', fontWeight: 700, color: '#2d3748', marginBottom: 24 },
  tabs: { display: 'flex', marginBottom: 20, borderBottom: '2px solid #e2e8f0' },
  tab: { padding: '10px 24px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.92rem', color: '#718096', borderBottom: '3px solid transparent', marginBottom: -2 },
  activeTab: { color: '#2b6cb0', borderBottomColor: '#2b6cb0' },
  btn: { padding: '8px 18px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  th: { background: '#f7fafc', padding: '10px 16px', textAlign: 'left', fontSize: '0.82rem', color: '#4a5568', fontWeight: 600, borderBottom: '2px solid #e2e8f0' },
  td: { padding: '11px 16px', borderBottom: '1px solid #edf2f7', fontSize: '0.88rem', color: '#2d3748', verticalAlign: 'middle' },
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modalCard: { background: '#fff', borderRadius: 10, padding: 28, width: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' },
  label: { display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#718096', marginBottom: 5 },
  input: { width: '100%', padding: '9px 12px', border: '1px solid #cbd5e0', borderRadius: 6, fontSize: '0.92rem', outline: 'none', marginBottom: 14, boxSizing: 'border-box' },
  select: { width: '100%', padding: '9px 12px', border: '1px solid #cbd5e0', borderRadius: 6, fontSize: '0.92rem', outline: 'none', marginBottom: 14, background: '#fff', boxSizing: 'border-box' },
  msg: { padding: '8px 14px', borderRadius: 6, fontSize: '0.85rem', marginBottom: 14 },
  success: { background: '#f0fff4', border: '1px solid #9ae6b4', color: '#276749' },
  error: { background: '#fff5f5', border: '1px solid #feb2b2', color: '#c53030' },
};

const ALL_PERMISSIONS = ['VIEW_EXERCISES', 'SUBMIT_EXERCISES', 'GRADE_SUBMISSIONS', 'MANAGE_EXERCISES', 'MANAGE_USERS'];

function RoleBadge({ role }) {
  const colors = { TUTOR: '#ebf8ff:#2b6cb0', STUDENT: '#f0fff4:#276749', SUPER_ADMIN: '#faf5ff:#6b46c1' };
  const [bg, color] = (colors[role] || '#e2e8f0:#4a5568').split(':');
  return (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 12, background: bg, color, fontSize: '0.78rem', fontWeight: 600 }}>
      {role}
    </span>
  );
}

function Pagination({ totalItems, currentPage, itemsPerPage, onPageChange, onItemsPerPageChange }) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalItems === 0) return null;
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
      pageNumbers.push(i);
    }
  }

  const pagesWithEllipsis = [];
  let prev = null;
  for (const p of pageNumbers) {
    if (prev !== null && p - prev > 1) pagesWithEllipsis.push('...');
    pagesWithEllipsis.push(p);
    prev = p;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
      <div style={{ fontSize: '0.83rem', color: '#718096' }}>
        Showing {startItem}–{endItem} of {totalItems} items
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <select
          value={itemsPerPage}
          onChange={e => { onItemsPerPageChange(Number(e.target.value)); onPageChange(1); }}
          style={{ padding: '4px 8px', border: '1px solid #cbd5e0', borderRadius: 5, fontSize: '0.82rem', background: '#fff', cursor: 'pointer' }}>
          {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
        </select>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{ padding: '4px 10px', border: '1px solid #cbd5e0', borderRadius: 5, background: currentPage === 1 ? '#f7fafc' : '#fff', color: currentPage === 1 ? '#a0aec0' : '#2d3748', cursor: currentPage === 1 ? 'default' : 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
          Previous
        </button>
        {pagesWithEllipsis.map((p, i) =>
          p === '...'
            ? <span key={`e${i}`} style={{ fontSize: '0.82rem', color: '#a0aec0', padding: '0 2px' }}>...</span>
            : <button key={p}
                onClick={() => onPageChange(p)}
                style={{ padding: '4px 9px', border: '1px solid #cbd5e0', borderRadius: 5, background: p === currentPage ? '#2b6cb0' : '#fff', color: p === currentPage ? '#fff' : '#2d3748', cursor: 'pointer', fontSize: '0.82rem', fontWeight: p === currentPage ? 700 : 400 }}>
                {p}
              </button>
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{ padding: '4px 10px', border: '1px solid #cbd5e0', borderRadius: 5, background: currentPage === totalPages ? '#f7fafc' : '#fff', color: currentPage === totalPages ? '#a0aec0' : '#2d3748', cursor: currentPage === totalPages ? 'default' : 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
          Next
        </button>
      </div>
    </div>
  );
}

export default function SuperAdminPanel() {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ username: '', password: '', role: 'STUDENT', displayName: '', email: '' });
  const [createMsg, setCreateMsg] = useState(null);
  const [permRole, setPermRole] = useState('TUTOR');
  const [permMap, setPermMap] = useState({ TUTOR: [], STUDENT: [] });
  const [permMsg, setPermMsg] = useState(null);
  const csvRef = useRef(null);
  const [importMsg, setImportMsg] = useState(null);
  const [usersPage, setUsersPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(10);

  const loadUsers = () => apiGet('/api/admin/users').then(r => r.json()).then(setUsers);
  const loadPerms = () => Promise.all(['TUTOR', 'STUDENT'].map(role =>
    apiGet(`/api/admin/permissions/${role}`).then(r => r.json()).then(d => ({ role, perms: d.permissions }))
  )).then(results => {
    const map = {};
    results.forEach(({ role, perms }) => { map[role] = perms; });
    setPermMap(map);
  });

  useEffect(() => {
    Promise.all([loadUsers(), loadPerms()]).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateMsg(null);
    try {
      const res = await apiPost('/api/admin/users', createForm);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      setCreateMsg({ type: 'success', text: `User "${data.username}" created.` });
      setCreateForm({ username: '', password: '', role: 'STUDENT', displayName: '', email: '' });
      loadUsers();
    } catch (err) {
      setCreateMsg({ type: 'error', text: err.message });
    }
  };

  const handleDelete = async (id, username) => {
    if (!confirm(`Delete user "${username}"?`)) return;
    await apiDelete(`/api/admin/users/${id}`);
    loadUsers();
  };

  const handleResetPassword = async (id, username) => {
    if (!confirm(`Reset password for "${username}" to 12345678?`)) return;
    await apiPost(`/api/admin/users/${id}/reset-password`);
    alert('Password reset to 12345678');
  };

  const handleForceLogout = async (id, username) => {
    if (!confirm(`Force logout "${username}"? Their current sessions will be invalidated.`)) return;
    await apiPost(`/api/admin/users/${id}/force-logout`);
    alert('User has been logged out');
  };

  const handleCsvImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMsg(null);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch('/api/admin/users/import-csv', { method: 'POST', body: form, credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      const created = data.filter(r => r.status === 'created').length;
      const failed = data.filter(r => r.status === 'failed').length;
      setImportMsg({ type: 'success', text: `CSV import complete: ${created} created, ${failed} failed.`, details: data });
      loadUsers();
    } catch (err) {
      setImportMsg({ type: 'error', text: err.message });
    }
    e.target.value = '';
  };

  const togglePerm = (role, perm) => {
    setPermMap(prev => {
      const perms = prev[role] || [];
      return {
        ...prev,
        [role]: perms.includes(perm) ? perms.filter(p => p !== perm) : [...perms, perm],
      };
    });
  };

  const savePerms = async (role) => {
    setPermMsg(null);
    try {
      const res = await apiPut(`/api/admin/permissions/${role}`, { permissions: permMap[role] || [] });
      if (res.ok) {
        setPermMsg({ type: 'success', text: `Permissions for ${role} saved.` });
      } else {
        const d = await res.json();
        setPermMsg({ type: 'error', text: d.error || 'Save failed.' });
      }
    } catch (err) {
      setPermMsg({ type: 'error', text: err.message });
    }
  };

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={S.container}>
      <h1 style={S.h1}>Super Admin Panel</h1>

      <div style={S.tabs}>
        {[['users', 'Users'], ['permissions', 'Role Permissions']].map(([key, label]) => (
          <button key={key}
            style={{ ...S.tab, ...(tab === key ? S.activeTab : {}) }}
            onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {tab === 'users' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <button style={{ ...S.btn, background: '#2b6cb0', color: '#fff' }}
              onClick={() => { setShowCreate(true); setCreateMsg(null); }}>
              + Create User
            </button>
            <button style={{ ...S.btn, background: '#e2e8f0', color: '#4a5568' }}
              onClick={() => csvRef.current?.click()}>
              Import CSV
            </button>
            <input ref={csvRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsvImport} />
          </div>

          {importMsg && (
            <div style={{ ...S.msg, ...(importMsg.type === 'success' ? S.success : S.error), marginBottom: 16 }}>
              {importMsg.text}
              {importMsg.details && (
                <div style={{ marginTop: 8, fontSize: '0.8rem' }}>
                  {importMsg.details.map((r, i) => (
                    <div key={i}>{r.username}: {r.status}{r.error ? ` — ${r.error}` : ''}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          <table style={S.table}>
            <thead>
              <tr>{['ID', 'Username', 'Role', 'Display Name', 'Email', 'Enabled', 'Actions'].map(h => (
                <th key={h} style={S.th}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {users.length === 0
                ? <tr><td colSpan={7} style={{ ...S.td, textAlign: 'center', color: '#a0aec0' }}>No users</td></tr>
                : users.slice((usersPage - 1) * usersPerPage, usersPage * usersPerPage).map(u => (
                  <tr key={u.id}>
                    <td style={S.td}>{u.id}</td>
                    <td style={{ ...S.td, fontFamily: 'monospace' }}>{u.username}</td>
                    <td style={S.td}><RoleBadge role={u.role} /></td>
                    <td style={S.td}>{u.displayName || '—'}</td>
                    <td style={S.td}>{u.email || '—'}</td>
                    <td style={S.td}>{u.enabled ? 'Yes' : 'No'}</td>
                    <td style={{ ...S.td, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button style={{ ...S.btn, background: '#ebf8ff', color: '#2b6cb0', fontSize: '0.78rem' }}
                        onClick={() => handleResetPassword(u.id, u.username)}>Reset PW</button>
                      <button style={{ ...S.btn, background: '#fffaf0', color: '#c05621', fontSize: '0.78rem' }}
                        onClick={() => handleForceLogout(u.id, u.username)}>Force Logout</button>
                      <button style={{ ...S.btn, background: '#fff5f5', color: '#c53030', fontSize: '0.78rem' }}
                        onClick={() => handleDelete(u.id, u.username)}>Delete</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <Pagination
            totalItems={users.length}
            currentPage={usersPage}
            itemsPerPage={usersPerPage}
            onPageChange={setUsersPage}
            onItemsPerPageChange={setUsersPerPage}
          />
        </div>
      )}

      {/* Permissions Tab */}
      {tab === 'permissions' && (
        <div>
          {permMsg && (
            <div style={{ ...S.msg, ...(permMsg.type === 'success' ? S.success : S.error), marginBottom: 16 }}>
              {permMsg.text}
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            {['TUTOR', 'STUDENT'].map(role => (
              <button key={role}
                style={{ ...S.btn, background: permRole === role ? '#2b6cb0' : '#e2e8f0', color: permRole === role ? '#fff' : '#4a5568' }}
                onClick={() => setPermRole(role)}>
                {role}
              </button>
            ))}
          </div>
          <div style={{ background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <h3 style={{ fontSize: '0.95rem', marginBottom: 16, color: '#2d3748' }}>
              Permissions for {permRole}
            </h3>
            {ALL_PERMISSIONS.map(perm => (
              <label key={perm} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, cursor: 'pointer', fontSize: '0.9rem', color: '#4a5568' }}>
                <input
                  type="checkbox"
                  checked={(permMap[permRole] || []).includes(perm)}
                  onChange={() => togglePerm(permRole, perm)}
                  style={{ width: 16, height: 16 }}
                />
                {perm}
              </label>
            ))}
            <button style={{ ...S.btn, background: '#2b6cb0', color: '#fff', marginTop: 8 }}
              onClick={() => savePerms(permRole)}>
              Save Permissions
            </button>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreate && (
        <div style={S.modal} onClick={() => setShowCreate(false)}>
          <div style={S.modalCard} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1rem', marginBottom: 16, color: '#2d3748' }}>Create New User</h3>
            {createMsg && (
              <div style={{ ...S.msg, ...(createMsg.type === 'success' ? S.success : S.error) }}>
                {createMsg.text}
              </div>
            )}
            <form onSubmit={handleCreate}>
              <label style={S.label}>Username *</label>
              <input style={S.input} value={createForm.username}
                onChange={e => setCreateForm(f => ({ ...f, username: e.target.value }))} required />
              <label style={S.label}>Password (leave blank for 12345678)</label>
              <input style={S.input} type="password" value={createForm.password}
                onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} />
              <label style={S.label}>Role *</label>
              <select style={S.select} value={createForm.role}
                onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}>
                <option value="STUDENT">STUDENT</option>
                <option value="TUTOR">TUTOR</option>
              </select>
              <label style={S.label}>Display Name</label>
              <input style={S.input} value={createForm.displayName}
                onChange={e => setCreateForm(f => ({ ...f, displayName: e.target.value }))} />
              <label style={S.label}>Email</label>
              <input style={S.input} type="email" value={createForm.email}
                onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" style={{ ...S.btn, background: '#e2e8f0', color: '#4a5568' }}
                  onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" style={{ ...S.btn, background: '#2b6cb0', color: '#fff' }}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
