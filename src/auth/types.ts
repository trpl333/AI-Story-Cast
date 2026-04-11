/** Minimal profile surfaced in the UI; extend when wiring a real profile table or provider metadata. */
export type AuthUser = {
  email: string;
  displayName: string;
};
