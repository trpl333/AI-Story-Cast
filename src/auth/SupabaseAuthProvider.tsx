import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabaseClient";
import type { AuthUser } from "./types";
import { AuthContext, type AuthContextValue } from "./authContext";
import { EmailConfirmationRequiredError } from "./authErrors";

function mapUser(u: User | null): AuthUser | null {
  if (!u) return null;
  const meta = u.user_metadata as Record<string, unknown> | undefined;
  const fromMeta =
    (typeof meta?.display_name === "string" && meta.display_name.trim()) ||
    (typeof meta?.full_name === "string" && meta.full_name.trim()) ||
    "";
  const email = u.email ?? "";
  const displayName = fromMeta || email.split("@")[0] || "Reader";
  return { email, displayName };
}

function missingEnvValue(): AuthContextValue {
  const rejectConfigured = async () => {
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local (see .env.example).",
    );
  };
  return {
    user: null,
    isAuthenticated: false,
    isSessionPending: false,
    signIn: rejectConfigured,
    signUp: rejectConfigured,
    signOut: async () => {},
    getAccessToken: async () => null,
  };
}

function SupabaseAuthProviderInner({ children, client }: { children: ReactNode; client: SupabaseClient }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionPending, setIsSessionPending] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void client.auth.getSession().then(({ data: { session: s } }) => {
      if (cancelled) return;
      setSession(s);
      setIsSessionPending(false);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, newSession) => {
      if (cancelled) return;
      setSession(newSession);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [client]);

  const user = useMemo(() => mapUser(session?.user ?? null), [session]);

  const signIn = useCallback(
    async (email: string, password?: string) => {
      const pw = password ?? "";
      if (!pw) {
        throw new Error("Password is required.");
      }
      const { error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password: pw,
      });
      if (error) throw new Error(error.message);
    },
    [client],
  );

  const signUp = useCallback(
    async (email: string, displayName: string, password?: string) => {
      const e = email.trim();
      const pw = password ?? "";
      if (!e) {
        throw new Error("Email is required.");
      }
      if (!pw) {
        throw new Error("Password is required.");
      }
      const { data, error } = await client.auth.signUp({
        email: e,
        password: pw,
        options: {
          data: {
            display_name: displayName.trim() || e.split("@")[0] || "Reader",
          },
        },
      });
      if (error) throw new Error(error.message);
      if (!data.session && data.user) {
        throw new EmailConfirmationRequiredError(e);
      }
    },
    [client],
  );

  const signOut = useCallback(async () => {
    const { error } = await client.auth.signOut();
    if (error) throw new Error(error.message);
  }, [client]);

  const getAccessToken = useCallback(async () => {
    const { data, error } = await client.auth.getSession();
    if (error) return null;
    return data.session?.access_token ?? null;
  }, [client]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isSessionPending,
      signIn,
      signUp,
      signOut,
      getAccessToken,
    }),
    [user, isSessionPending, signIn, signUp, signOut, getAccessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();

  const client = useMemo(() => {
    if (!configured) return null;
    return getSupabaseBrowserClient();
  }, [configured]);

  const missingValue = useMemo(() => missingEnvValue(), []);

  if (!configured || !client) {
    return <AuthContext.Provider value={missingValue}>{children}</AuthContext.Provider>;
  }

  return <SupabaseAuthProviderInner client={client}>{children}</SupabaseAuthProviderInner>;
}
