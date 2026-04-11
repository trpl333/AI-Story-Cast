import { useCallback, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { MockUser } from "./types";
import { MockAuthContext } from "./authContext";

const STORAGE_KEY = "aistorycast_mock_user";

function readUser(): MockUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MockUser;
    if (parsed && typeof parsed.email === "string" && typeof parsed.displayName === "string") {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeUser(user: MockUser | null) {
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

  const signIn = useCallback((email: string, _password?: string) => {
    const trimmed = email.trim();
    if (!trimmed) return;
    const displayName = trimmed.split("@")[0] || "Reader";
    writeUser({ email: trimmed, displayName });
  }, []);

  const signUp = useCallback((email: string, displayName: string, _password?: string) => {
    const e = email.trim();
    const n = displayName.trim() || e.split("@")[0] || "Reader";
    if (!e) return;
    writeUser({ email: e, displayName: n });
  }, []);

  const signOut = useCallback(() => {
    writeUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user !== null,
      signIn,
      signUp,
      signOut,
    }),
    [user, signIn, signUp, signOut],
  );

  return <MockAuthContext.Provider value={value}>{children}</MockAuthContext.Provider>;
}
