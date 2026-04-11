import { createContext } from "react";
import type { MockUser } from "./types";

export type MockAuthContextValue = {
  user: MockUser | null;
  isAuthenticated: boolean;
  signIn: (email: string, _password?: string) => void;
  signUp: (email: string, displayName: string, _password?: string) => void;
  signOut: () => void;
};

export const MockAuthContext = createContext<MockAuthContextValue | null>(null);
