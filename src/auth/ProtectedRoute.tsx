import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useMockAuth } from "./useMockAuth";

/**
 * Placeholder guard for `/app/*`. Swap `useMockAuth` for your session provider
 * (e.g. Clerk, Supabase, Auth.js) and keep this wrapper as the single gate. Replace `useMockAuth` with your session hook.
 */
export default function ProtectedRoute() {
  const { isAuthenticated } = useMockAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    const from = `${location.pathname}${location.search}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }

  return <Outlet />;
}
