import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@/features/auth/AuthContext';

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // 로그인 후 원래 가려던 경로로 복귀시키기 위해 from 보존
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
