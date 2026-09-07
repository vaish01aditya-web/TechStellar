import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-sm text-ink/60">Loading…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 text-center">
        <p className="font-serif text-xl">You don't have access to this page</p>
        <p className="text-sm text-ink/60">This section is restricted to: {roles.join(', ')}</p>
      </div>
    );
  }
  return children;
}
