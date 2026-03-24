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
  background: '#2b6cb0', padding: '12px 32px',
  display: 'flex', alignItems: 'center', gap: '24px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
};

function NavBar() {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav style={NAV_STYLE}>
      <Link to="/" style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', textDecoration: 'none' }}>
        Blockly Exercise Platform
      </Link>
      {user && hasPermission('MANAGE_EXERCISES') && (
        <Link to="/admin" style={{ color: '#bee3f8', textDecoration: 'none', fontSize: '0.9rem' }}>
          Admin Panel
        </Link>
      )}
      {user && user.role === 'SUPER_ADMIN' && (
        <Link to="/super-admin" style={{ color: '#bee3f8', textDecoration: 'none', fontSize: '0.9rem' }}>
          User Management
        </Link>
      )}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
        {user ? (
          <>
            <Link to="/profile" style={{ color: '#bee3f8', textDecoration: 'none', fontSize: '0.9rem' }}>
              {user.username}
            </Link>
            <button
              onClick={handleLogout}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '5px 14px', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
              Logout
            </button>
          </>
        ) : (
          <Link to="/login" style={{ color: '#bee3f8', textDecoration: 'none', fontSize: '0.9rem' }}>
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
