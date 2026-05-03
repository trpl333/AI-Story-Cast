import type { SearchResult } from "@/lib/importedBookStorage";
import { extractGutenbergNumericId } from "@/lib/publicDomainLiveSearch";

/** Client-side guard when a row slips through with a README or obvious non-text artifact URL. */
export function isImportableDiscoverSourceUrl(sourceUrl: string): boolean {
  if (typeof sourceUrl !== "string" || sourceUrl.trim().length === 0) return false;
  const u = sourceUrl.toLowerCase();
  if (u.includes("readme") || u.includes("-readme") || u.includes("_readme")) return false;
  if (u.includes(".zip")) return false;
  return true;
}

export function filterImportableDiscoverResults(results: readonly SearchResult[]): SearchResult[] {
  return results.filter((r) => isImportableDiscoverSourceUrl(r.sourceUrl));
}

/** Gutendex / n8n rows use plain `.txt` or UTF-8 ebook text URLs. */
export function discoverPlainTextLikely(sourceUrl: string): boolean {
  if (typeof sourceUrl !== "string" || sourceUrl.length === 0) return false;
  const u = sourceUrl.toLowerCase();
  return u.includes(".txt") || u.includes("txt.utf-8");
}

export type DiscoverSourceBadge = "Gutenberg" | "Public domain";

export function discoverSourceBadgeFor(result: SearchResult): DiscoverSourceBadge {
  return extractGutenbergNumericId(result.sourceUrl) !== null ? "Gutenberg" : "Public domain";
}
