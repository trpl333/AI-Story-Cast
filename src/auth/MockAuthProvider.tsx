/**
 * Local-only mock session (localStorage). Not used in `App.tsx` once Supabase is enabled.
 * Keep for quick UI work without a Supabase project, or swap into `App.tsx` temporarily.
 */
import { useCallback, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { AuthUser } from "./types";
import { AuthContext } from "./authContext";

const STORAGE_KEY = "aistorycast_mock_user";

function readUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (parsed && typeof parsed.email === "string" && typeof parsed.displayName === "string") {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeUser(user: AuthUser | null) {
  if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  else localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("aistorycast-auth"));
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener("aistorycast-auth", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("aistorycast-auth", cb);
  };
}

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const user = useSyncExternalStore(subscribe, readUser, () => null);

  const signIn = useCallback(async (email: string, _password?: string) => {
    const trimmed = email.trim();
    if (!trimmed) return;
    const displayName = trimmed.split("@")[0] || "Reader";
    writeUser({ email: trimmed, displayName });
  }, []);

  const signUp = useCallback(async (email: string, displayName: string, _password?: string) => {
    const e = email.trim();
    const n = displayName.trim() || e.split("@")[0] || "Reader";
    if (!e) return;
    writeUser({ email: e, displayName: n });
  }, []);

  const signOut = useCallback(async () => {
    writeUser(null);
  }, []);

  const getAccessToken = useCallback(async () => null, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user !== null,
      isSessionPending: false,
      signIn,
      signUp,
      signOut,
      getAccessToken,
    }),
    [user, signIn, signUp, signOut, getAccessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
