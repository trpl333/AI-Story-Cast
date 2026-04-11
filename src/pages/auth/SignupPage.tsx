import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { EmailConfirmationRequiredError, formatAuthError } from "@/auth/authErrors";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import AuthPageChrome from "./AuthPageChrome";

export default function SignupPage() {
  const { isAuthenticated, signUp } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate("/app", { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setInfoMessage(null);
    setSubmitting(true);
    try {
      await signUp(email, displayName, password);
    } catch (err) {
      if (err instanceof EmailConfirmationRequiredError) {
        setInfoMessage(err.message);
      } else {
        setFormError(formatAuthError(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthPageChrome>
      <div className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-3xl font-bold text-[#1C1A17]" style={{ fontFamily: "'Playfair Display', serif" }}>
          Create your account
        </h1>
        <p className="mt-2 text-sm text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
          Use a real email and password (minimum 6 characters). If your project requires email confirmation, you&apos;ll sign in after you confirm.
        </p>

        {!isSupabaseConfigured() ? (
          <div
            className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
            style={{ fontFamily: "'Inter', sans-serif" }}
            role="status"
          >
            Supabase env vars are missing. Copy <code className="rounded bg-amber-100/80 px-1">.env.example</code> to{" "}
            <code className="rounded bg-amber-100/80 px-1">.env.local</code> and set <code className="rounded bg-amber-100/80 px-1">VITE_SUPABASE_URL</code> and{" "}
            <code className="rounded bg-amber-100/80 px-1">VITE_SUPABASE_ANON_KEY</code>.
          </div>
        ) : null}

        {formError ? (
          <p
            className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
            style={{ fontFamily: "'Inter', sans-serif" }}
            role="alert"
          >
            {formError}
          </p>
        ) : null}

        {infoMessage ? (
          <p
            className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
            style={{ fontFamily: "'Inter', sans-serif" }}
            role="status"
          >
            {infoMessage}
          </p>
        ) : null}

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
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[#E0D8CC] bg-[#FAF8F4] px-4 py-3 text-sm text-[#1C1A17] outline-none focus:border-[#C4873A]"
              style={{ fontFamily: "'Inter', sans-serif" }}
              placeholder="At least 6 characters"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[#2C2416] py-3.5 text-sm font-semibold text-[#FAF8F4] hover:bg-[#3D3220] disabled:cursor-not-allowed disabled:opacity-60"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {submitting ? "Creating account…" : "Create account"}
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
