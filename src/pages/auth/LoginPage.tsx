import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import AuthPageChrome from "./AuthPageChrome";

export default function LoginPage() {
  const { isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!isAuthenticated) return;
    const from = (location.state as { from?: string })?.from || "/app";
    navigate(from, { replace: true });
  }, [isAuthenticated, location.state, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(email, password);
  };

  return (
    <AuthPageChrome>
      <div className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-3xl font-bold text-[#1C1A17]" style={{ fontFamily: "'Playfair Display', serif" }}>
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
          Mock sign-in for the app shell — no server yet. Use any email; password is ignored.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-5 rounded-2xl border border-[#E0D8CC] bg-white p-8 shadow-sm">
          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[#E0D8CC] bg-[#FAF8F4] px-4 py-3 text-sm text-[#1C1A17] outline-none focus:border-[#C4873A]"
              style={{ fontFamily: "'Inter', sans-serif" }}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[#E0D8CC] bg-[#FAF8F4] px-4 py-3 text-sm text-[#1C1A17] outline-none focus:border-[#C4873A]"
              style={{ fontFamily: "'Inter', sans-serif" }}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-[#2C2416] py-3.5 text-sm font-semibold text-[#FAF8F4] hover:bg-[#3D3220]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Sign in
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
          New to AIStoryCast?{" "}
          <Link to="/signup" className="font-semibold text-[#C4873A] hover:text-[#A66B2E]">
            Create an account
          </Link>
        </p>
      </div>
    </AuthPageChrome>
  );
}
