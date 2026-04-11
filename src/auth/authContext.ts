import { createContext } from "react";
import type { AuthUser } from "./types";

/**
 * App-wide session contract. `MockAuthProvider` implements this today;
 * `SupabaseAuthProvider` (future) should preserve the shape so pages keep using `useAuth`.
 */
export type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** True until the client knows session state (e.g. Supabase `getSession`). Mock uses `false` always. */
  isSessionPending: boolean;
  signIn: (email: string, password?: string) => Promise<void>;
  signUp: (email: string, displayName: string, password?: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** JWT for future `Authorization: Bearer` calls. Mock returns null. */
  getAccessToken: () => Promise<string | null>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
