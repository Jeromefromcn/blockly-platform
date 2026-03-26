import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Workspace from './pages/Workspace.jsx';
import Admin from './pages/Admin.jsx';
import AdminEditor from './pages/AdminEditor.jsx';
import Login from './pages/Login.jsx';
import Profile from './pages/Profile.jsx';
import SuperAdminPanel from './pages/SuperAdminPanel.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';

function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header style={{
      background: '#fff',
      borderBottom: '1px solid #e2e8f0',
      height: 60,
      display: 'flex', alignItems: 'center',
      padding: '0 28px',
      position: 'sticky', top: 0, zIndex: 200,
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      gap: 24,
    }}>
      {/* Logo */}
      <a href="/" style={{ fontWeight: 800, fontSize: '1.15rem', color: '#6366f1', letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: 8 }}>
        🧩 Blockly
      </a>

      {/* Nav links - only show when logged in */}
      {user && (
        <nav style={{ display: 'flex', gap: 4, flex: 1 }}>
          {/* Show Home link for everyone */}
          <a href="/" style={{ padding: '6px 12px', borderRadius: 8, fontSize: '0.88rem', fontWeight: 500, color: '#4a5568', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            Home
          </a>
          {/* Show Admin link for TUTOR and SUPER_ADMIN */}
          {(user.role === 'TUTOR' || user.role === 'SUPER_ADMIN') && (
            <a href="/admin" style={{ padding: '6px 12px', borderRadius: 8, fontSize: '0.88rem', fontWeight: 500, color: '#4a5568', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              Admin
            </a>
          )}
          {/* Show User Management link for SUPER_ADMIN only */}
          {user.role === 'SUPER_ADMIN' && (
            <a href="/super-admin" style={{ padding: '6px 12px', borderRadius: 8, fontSize: '0.88rem', fontWeight: 500, color: '#4a5568', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              User Management
            </a>
          )}
        </nav>
      )}

      {/* Right section */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        {user ? (
          <>
            <span style={{
              padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              background: user.role === 'SUPER_ADMIN' ? '#ede9fe' : user.role === 'TUTOR' ? '#dbeafe' : '#dcfce7',
              color: user.role === 'SUPER_ADMIN' ? '#5b21b6' : user.role === 'TUTOR' ? '#1d4ed8' : '#15803d',
            }}>{user.role?.replace('_', ' ')}</span>
            <a href="/profile" style={{ fontSize: '0.88rem', fontWeight: 500, color: '#374151' }}>{user.username}</a>
            <div style={{ width: 1, height: 20, background: '#e2e8f0' }} />
            <button onClick={handleLogout} style={{
              padding: '6px 14px', border: '1px solid #e2e8f0', borderRadius: 8,
              background: '#fff', cursor: 'pointer', fontSize: '0.82rem', color: '#6b7280', fontWeight: 500,
              transition: 'all 0.15s'
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#d1d5db'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
              Sign out
            </button>
          </>
        ) : (
          <a href="/login" style={{ padding: '7px 18px', borderRadius: 8, background: '#6366f1', color: '#fff', fontSize: '0.88rem', fontWeight: 600 }}>Sign in</a>
        )}
      </div>
    </header>
  );
}

function AppRoutes() {
  return (
    <>
      <NavBar />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected: general access */}
        <Route path="/" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />
        <Route path="/exercise/:id" element={
          <ProtectedRoute>
            <Workspace />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />

        {/* Protected: requires MANAGE_EXERCISES */}
        <Route path="/admin" element={
          <ProtectedRoute permission="MANAGE_EXERCISES">
            <Admin />
          </ProtectedRoute>
        } />
        <Route path="/admin/exercise/new" element={
          <ProtectedRoute permission="MANAGE_EXERCISES">
            <AdminEditor />
          </ProtectedRoute>
        } />
        <Route path="/admin/exercise/:id/edit" element={
          <ProtectedRoute permission="MANAGE_EXERCISES">
            <AdminEditor />
          </ProtectedRoute>
        } />

        {/* Protected: super admin only */}
        <Route path="/super-admin" element={
          <ProtectedRoute superAdminOnly>
            <SuperAdminPanel />
          </ProtectedRoute>
        } />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
