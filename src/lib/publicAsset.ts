/** URL for a file in `/public` (honors Vite `base`). */
export function publicAsset(path: string): string {
  const p = path.startsWith("/") ? path.slice(1) : path;
  return `${import.meta.env.BASE_URL}${p}`;
}
