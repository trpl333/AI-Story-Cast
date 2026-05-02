import type { ChapterImportConfig, SearchResult } from "@/lib/importedBookStorage";

const SESSION_BY_ID_KEY = "aistorycast-live-search-by-id-v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Gutendex / Gutenberg file URLs; used to hide duplicate hits already covered by the starter catalog. */
export function extractGutenbergNumericId(sourceUrl: string): number | null {
  const m = /gutenberg\.org\/(?:files\/(\d+)\/|cache\/epub\/(\d+)\/|ebooks\/(\d+)(?:\.|$|\/))/.exec(sourceUrl);
  if (!m) return null;
  const n = Number(m[1] || m[2] || m[3]);
  return Number.isFinite(n) ? n : null;
}

function parseChapterImport(value: unknown): ChapterImportConfig | undefined {
  if (!isRecord(value)) return undefined;
  const chapterSlug = value.chapterSlug;
  const startMarker = value.startMarker;
  const endMarker = value.endMarker;
  if (typeof chapterSlug !== "string" || chapterSlug.length === 0) return undefined;
  if (typeof startMarker !== "string" || typeof endMarker !== "string") return undefined;
  const title = typeof value.title === "string" ? value.title : undefined;
  const startMarkerOccurrenceIndex =
    typeof value.startMarkerOccurrenceIndex === "number" ? value.startMarkerOccurrenceIndex : undefined;
  return { chapterSlug, title, startMarker, endMarker, startMarkerOccurrenceIndex };
}

function parseSearchResultRow(value: unknown): SearchResult | null {
  if (!isRecord(value)) return null;
  const id = value.id;
  const title = value.title;
  const author = value.author;
  const source = value.source;
  const sourceUrl = value.sourceUrl;
  const description = value.description;
  if (typeof id !== "string" || id.length === 0) return null;
  if (typeof title !== "string" || title.length === 0) return null;
  if (typeof author !== "string" || author.length === 0) return null;
  if (typeof source !== "string" || source.length === 0) return null;
  if (typeof sourceUrl !== "string" || sourceUrl.length === 0) return null;
  const descriptionText = typeof description === "string" ? description : "";

  let chapterImport: ChapterImportConfig | undefined;
  if (value.chapterImport != null) {
    chapterImport = parseChapterImport(value.chapterImport);
  }

  let chapterImports: ChapterImportConfig[] | undefined;
  if (Array.isArray(value.chapterImports)) {
    const parsed = value.chapterImports.map(parseChapterImport).filter((c): c is ChapterImportConfig => Boolean(c));
    chapterImports = parsed.length > 0 ? parsed : undefined;
  }

  return {
    id,
    title,
    author,
    source,
    sourceUrl,
    description: descriptionText,
    chapterImport,
    chapterImports,
  };
}

export function readLiveSearchResultById(id: string): SearchResult | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.sessionStorage.getItem(SESSION_BY_ID_KEY);
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return undefined;
    const row = parsed[id];
    return parseSearchResultRow(row) ?? undefined;
  } catch {
    return undefined;
  }
}

/** Persist live webhook rows so Library “Start reading” can resolve title before the book is on the shelf. */
export function mergeLiveSearchResultsIntoSessionCache(results: SearchResult[]) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.sessionStorage.getItem(SESSION_BY_ID_KEY);
    const bag: Record<string, unknown> = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    for (const r of results) {
      bag[r.id] = r;
    }
    window.sessionStorage.setItem(SESSION_BY_ID_KEY, JSON.stringify(bag));
  } catch {
    /* ignore quota / privacy mode */
  }
}

export type LiveSearchProxyResponse = {
  success?: unknown;
  results?: unknown;
};

export function parseLiveSearchProxyResponse(data: unknown): SearchResult[] {
  if (!isRecord(data)) return [];
  if (data.success !== true) return [];
  if (!Array.isArray(data.results)) return [];
  const out: SearchResult[] = [];
  for (const item of data.results) {
    const row = parseSearchResultRow(item);
    if (row) out.push(row);
  }
  return out;
}

/**
 * POST { query } to the n8n search webhook; returns normalized rows or [] on any failure.
 */
export async function fetchLivePublicDomainSearchResults(
  webhookBaseUrl: string,
  query: string,
): Promise<SearchResult[]> {
  const url = webhookBaseUrl.replace(/\/?$/, "");
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      mode: "cors",
    });
    if (!res.ok) {
      console.warn("[publicDomainLiveSearch] HTTP", res.status, res.statusText);
      return [];
    }
    let data: unknown;
    try {
      data = await res.json();
    } catch (e) {
      console.warn("[publicDomainLiveSearch] response is not JSON:", e);
      return [];
    }
    return parseLiveSearchProxyResponse(data);
  } catch (e) {
    console.warn("[publicDomainLiveSearch] fetch failed:", e instanceof Error ? e.message : String(e));
    return [];
  }
}
