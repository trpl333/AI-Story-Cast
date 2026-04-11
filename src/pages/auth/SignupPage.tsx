import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import AuthPageChrome from "./AuthPageChrome";

export default function SignupPage() {
  const { isAuthenticated, signUp } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (isAuthenticated) navigate("/app", { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signUp(email, displayName, password);
  };

  return (
    <AuthPageChrome>
      <div className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-3xl font-bold text-[#1C1A17]" style={{ fontFamily: "'Playfair Display', serif" }}>
          Create your account
        </h1>
        <p className="mt-2 text-sm text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
          Mock registration — stored locally in this browser only until real auth ships.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-5 rounded-2xl border border-[#E0D8CC] bg-white p-8 shadow-sm">
          <div>
            <label htmlFor="signup-name" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Display name
            </label>
            <input
              id="signup-name"
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-[#E0D8CC] bg-[#FAF8F4] px-4 py-3 text-sm text-[#1C1A17] outline-none focus:border-[#C4873A]"
              style={{ fontFamily: "'Inter', sans-serif" }}
              placeholder="Jane Reader"
            />
          </div>
          <div>
            <label htmlFor="signup-email" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Email
            </label>
            <input
              id="signup-email"
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
            <label htmlFor="signup-password" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
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
            Create account
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-[#C4873A] hover:text-[#A66B2E]">
            Sign in
          </Link>
        </p>
      </div>
    </AuthPageChrome>
  );
}
