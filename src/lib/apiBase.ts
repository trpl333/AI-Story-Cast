/**
 * FastAPI reader backend. Override with `VITE_API_BASE_URL` in `.env.local`.
 * Default matches local `uvicorn` from `backend/README` / project docs.
 */
const DEFAULT_API_BASE = "http://127.0.0.1:8000";

export function getReaderApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.trim().replace(/\/$/, "");
  }
  return DEFAULT_API_BASE;
}
