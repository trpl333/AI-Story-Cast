/** Thrown from `signUp` when the project requires email confirmation and no session is returned yet. */
export class EmailConfirmationRequiredError extends Error {
  readonly code: "EMAIL_CONFIRMATION_REQUIRED";
  readonly email: string;

  constructor(email: string) {
    super("Check your email to confirm your account, then sign in.");
    this.name = "EmailConfirmationRequiredError";
    this.email = email;
    this.code = "EMAIL_CONFIRMATION_REQUIRED";
  }
}

export function formatAuthError(err: unknown): string {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return "Something went wrong. Please try again.";
}
