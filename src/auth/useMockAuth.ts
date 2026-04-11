import { useContext } from "react";
import { MockAuthContext } from "./authContext";
import type { MockAuthContextValue } from "./authContext";

export function useMockAuth(): MockAuthContextValue {
  const ctx = useContext(MockAuthContext);
  if (!ctx) {
    throw new Error("useMockAuth must be used within MockAuthProvider");
  }
  return ctx;
}
