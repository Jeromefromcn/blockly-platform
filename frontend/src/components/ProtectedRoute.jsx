import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children, permission, superAdminOnly }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (superAdminOnly && user.role !== 'SUPER_ADMIN') {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#e53e3e' }}>
        403 — Access denied. Super Admin only.
      </div>
    );
  }

  if (permission && user.role !== 'SUPER_ADMIN') {
    const hasIt = Array.isArray(user.permissions) && user.permissions.includes(permission);
    if (!hasIt) {
      return (
        <div style={{ padding: 40, textAlign: 'center', color: '#e53e3e' }}>
          403 — You do not have permission to access this page.
        </div>
      );
    }
  }

  return children;
}
