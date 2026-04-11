import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";

/**
 * Single gate for `/app/*`. When wiring Supabase, keep this component and ensure
 * the root provider sets `isSessionPending` until initial session is known.
 */
export default function ProtectedRoute() {
  const { isAuthenticated, isSessionPending } = useAuth();
  const location = useLocation();

  if (isSessionPending) {
    return (
      <div
        className="flex min-h-[40vh] items-center justify-center bg-[#FAF8F4] text-sm text-[#5C5346]"
        style={{ fontFamily: "'Inter', sans-serif" }}
        aria-busy="true"
        aria-live="polite"
      >
        Loading session…
      </div>
    );
  }

  if (!isAuthenticated) {
    const from = `${location.pathname}${location.search}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }

  return <Outlet />;
}
