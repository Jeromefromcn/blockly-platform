import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Workspace from './pages/Workspace.jsx';
import Admin from './pages/Admin.jsx';
import AdminEditor from './pages/AdminEditor.jsx';
import Login from './pages/Login.jsx';
import Profile from './pages/Profile.jsx';
import SuperAdminPanel from './pages/SuperAdminPanel.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';

const NAV_STYLE = {
  background: '#fff', borderBottom: '1px solid #edf2f7', padding: '0 24px', height: 56,
  display: 'flex', alignItems: 'center', gap: '24px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)', position: 'sticky', top: 0, zIndex: 100
};

function NavBar() {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const role = user?.role;
  return (
    <nav style={NAV_STYLE}>
      <Link to="/" style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1a202c', letterSpacing: '-0.02em', textDecoration: 'none' }}>
        Blockly Exercise Platform
      </Link>
      {user && hasPermission('MANAGE_EXERCISES') && (
        <Link to="/admin" style={{ color: '#4a5568', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 500 }}>
          Admin Panel
        </Link>
      )}
      {user && user.role === 'SUPER_ADMIN' && (
        <Link to="/super-admin" style={{ color: '#4a5568', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 500 }}>
          User Management
        </Link>
      )}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        {user ? (
          <>
            {role && (
              <span style={{
                padding: '2px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                background: role === 'SUPER_ADMIN' ? '#e9d8fd' : role === 'TUTOR' ? '#bee3f8' : '#c6f6d5',
                color: role === 'SUPER_ADMIN' ? '#553c9a' : role === 'TUTOR' ? '#2c5282' : '#22543d',
              }}>
                {role.replace('_', ' ')}
              </span>
            )}
            <Link to="/profile" style={{ color: '#2d3748', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600 }}>
              {user.username}
            </Link>
            <div style={{ width: 1, height: 20, background: '#e2e8f0' }} />
            <button
              onClick={handleLogout}
              style={{ background: 'none', border: '1px solid #e2e8f0', color: '#4a5568', padding: '5px 14px', borderRadius: 6, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
              Logout
            </button>
          </>
        ) : (
          <Link to="/login" style={{ color: '#4a5568', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 500 }}>
            Login
          </Link>
        )}
      </div>
    </nav>
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
