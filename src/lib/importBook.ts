import { autoDetectChaptersFromGutenbergText } from "@/lib/chapterAutoDetect";
import { extractChapterByMarkers } from "@/lib/chapterMarkers";
import { putChapterText, putFullText, deleteAllTextsForBook } from "@/lib/importedBookDb";
import {
  chapterConfigsForImport,
  getBookTextStorageKey,
  LEGACY_MOBY_CHAPTER_1_STORAGE_KEY,
  USER_FACING_SOURCE_LABEL,
  type ChapterImportConfig,
  type ImportedShelfBook,
  type SearchResult,
} from "@/lib/importedBookStorage";

/**
 * When false, import skips the n8n proxy and direct source fetch (honest until the import service exists).
 * Set to true once the webhook is deployed and CORS allows the app origin.
 */
export const ENABLE_REMOTE_IMPORT = true;

/** Returned in `ImportBookFailure.code` when `ENABLE_REMOTE_IMPORT` is false. */
export const IMPORT_SERVICE_NOT_CONNECTED = "IMPORT_SERVICE_NOT_CONNECTED" as const;

/**
 * Optional server-side fetch + slice; used when browser CORS blocks direct Gutenberg access.
 *
 * ## n8n / proxy response (current + expected)
 *
 * **Current (backward compatible):**
 * `{ success: true, rawText: string, chapterText?: string }` — optional single `chapterText`
 * for the first catalog chapter when the workflow slices one chapter server-side.
 *
 * **Expected future shape (multi-chapter):**
 * ```json
 * {
 *   "success": true,
 *   "rawText": "...",
 *   "chapters": [
 *     { "chapterSlug": "chapter-1", "title": "Chapter I", "chapterText": "..." },
 *     { "chapterSlug": "chapter-2", "title": "Chapter II", "chapterText": "..." }
 *   ]
 * }
 * ```
 * The app merges `chapters[].chapterText` by `chapterSlug`, then falls back to client marker
 * extraction per `chapterImports` entry, then to legacy single `chapterText` for the first
 * chapter only when `chapters` is absent.
 */
export const AISTORYCAST_IMPORT_PROXY_URL =
  "https://n8n.jdpenterprises.ai/webhook/aistorycast-import-book";

type ProxyChapterEntry = {
  chapterSlug?: unknown;
  title?: unknown;
  chapterText?: unknown;
};

type ProxyImportResponse = {
  success?: unknown;
  rawText?: unknown;
  chapterText?: unknown;
  chapters?: unknown;
};

function parseChaptersBySlug(d: ProxyImportResponse): Map<string, string> {
  const map = new Map<string, string>();
  if (!Array.isArray(d.chapters)) return map;
  for (const item of d.chapters) {
    const row = item as ProxyChapterEntry;
    if (typeof row.chapterSlug !== "string" || row.chapterSlug.length === 0) continue;
    if (typeof row.chapterText !== "string" || row.chapterText.trim().length === 0) continue;
    map.set(row.chapterSlug, row.chapterText.trim());
  }
  return map;
}

function logPrefix(sr: SearchResult): string {
  return `[importBook:${sr.id}]`;
}

export type ImportBookFailure = {
  ok: false;
  message: string;
  code?: typeof IMPORT_SERVICE_NOT_CONNECTED;
};
export type ImportBookSuccess = { ok: true; shelfBook: ImportedShelfBook };

async function clearStoredImport(bookId: string): Promise<void> {
  await deleteAllTextsForBook(bookId);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(getBookTextStorageKey(bookId));
    const chapterPrefix = `aistorycast-book-chapter-${bookId}-`;
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k || !k.startsWith(chapterPrefix)) continue;
      keysToRemove.push(k);
    }
    for (const k of keysToRemove) {
      window.localStorage.removeItem(k);
    }
    if (bookId === "moby-dick") {
      window.localStorage.removeItem(LEGACY_MOBY_CHAPTER_1_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

function extractChapterBodyFromConfig(rawText: string, ci: ChapterImportConfig): string {
  return extractChapterByMarkers(rawText, ci.startMarker, ci.endMarker, {
    startMarkerOccurrenceIndex: ci.startMarkerOccurrenceIndex,
  }).trim();
}

/**
 * Resolves one chapter body: `chaptersBySlug` from proxy, else legacy single `chapterText`
 * for the first catalog chapter only, else client marker slice.
 */
function resolveChapterBodyForConfig(
  sr: SearchResult,
  cfg: ChapterImportConfig,
  rawText: string,
  chaptersBySlug: Map<string, string>,
  legacySingleChapterText: string | undefined,
  configIndex: number,
): { chapterBody: string | null; errorReason: string | null } {
  const fromMulti = chaptersBySlug.get(cfg.chapterSlug);
  if (typeof fromMulti === "string" && fromMulti.trim().length > 0) {
    console.debug(logPrefix(sr), "chapter", cfg.chapterSlug, "text from proxy chapters[]");
    return { chapterBody: fromMulti.trim(), errorReason: null };
  }

  const fromLegacySingle =
    configIndex === 0 && typeof legacySingleChapterText === "string" ? legacySingleChapterText.trim() : "";
  if (fromLegacySingle.length > 0) {
    console.debug(logPrefix(sr), "chapter", cfg.chapterSlug, "text from legacy proxy chapterText");
    return { chapterBody: fromLegacySingle, errorReason: null };
  }

  const sliced = extractChapterBodyFromConfig(rawText, cfg);
  if (sliced.length > 0) {
    console.debug(logPrefix(sr), "chapter", cfg.chapterSlug, "text from client marker extraction");
    return { chapterBody: sliced, errorReason: null };
  }

  const reason = `chapterImport(s): could not derive text for ${cfg.chapterSlug} (markers / proxy empty)`;
  console.warn(logPrefix(sr), reason);
  return { chapterBody: null, errorReason: reason };
}

async function tryImportViaProxy(searchResult: SearchResult): Promise<
  | { ok: true; rawText: string; chapterText?: string; chaptersBySlug: Map<string, string> }
  | { ok: false; reason: string }
> {
  const tag = logPrefix(searchResult);
  const configs = chapterConfigsForImport(searchResult);
  try {
    const res = await fetch(AISTORYCAST_IMPORT_PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: searchResult.id,
        title: searchResult.title,
        author: searchResult.author,
        sourceUrl: searchResult.sourceUrl,
        /** First chapter only — backward compatible for existing n8n workflows. */
        chapterImport: configs[0] ?? searchResult.chapterImport ?? null,
        /** Full ordered list when present (multi-chapter); may be a single-element array. */
        chapterImports: configs.length > 0 ? configs : null,
      }),
      mode: "cors",
    });
    if (!res.ok) {
      const reason = `proxy HTTP ${res.status} ${res.statusText}`;
      console.warn(tag, "proxy request failed:", reason);
      return { ok: false, reason };
    }

    let data: unknown;
    try {
      data = await res.json();
    } catch (e) {
      const reason = `proxy response is not JSON: ${e instanceof Error ? e.message : String(e)}`;
      console.warn(tag, reason);
      return { ok: false, reason };
    }

    const d = data as ProxyImportResponse;
    if (d.success !== true) {
      const reason = `proxy returned success!==true (${JSON.stringify(d.success)})`;
      console.warn(tag, reason, data);
      return { ok: false, reason };
    }

    if (typeof d.rawText !== "string" || d.rawText.trim().length === 0) {
      const reason = "proxy returned empty or missing rawText";
      console.warn(tag, reason);
      return { ok: false, reason };
    }

    const chapterText =
      typeof d.chapterText === "string" && d.chapterText.trim().length > 0 ? d.chapterText.trim() : undefined;
    const chaptersBySlug = parseChaptersBySlug(d);
    return { ok: true, rawText: d.rawText, chapterText, chaptersBySlug };
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    console.warn(tag, "proxy error (network/CORS/etc.):", reason);
    return { ok: false, reason };
  }
}

async function tryImportViaBrowserFetch(searchResult: SearchResult): Promise<
  | { ok: true; rawText: string }
  | { ok: false; reason: string }
> {
  const tag = logPrefix(searchResult);
  try {
    const response = await fetch(searchResult.sourceUrl, { method: "GET", mode: "cors" });
    if (!response.ok) {
      const reason = `browser fetch HTTP ${response.status} ${response.statusText}`;
      console.warn(tag, reason);
      return { ok: false, reason };
    }
    const text = await response.text();
    if (text.trim().length === 0) {
      const reason = "browser fetch returned empty body";
      console.warn(tag, reason);
      return { ok: false, reason };
    }
    return { ok: true, rawText: text };
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    console.warn(tag, "browser fetch error (network/CORS/etc.):", reason);
    return { ok: false, reason };
  }
}

async function persistImportedText(
  searchResult: SearchResult,
  rawText: string,
  chapterBodies: Array<{ slug: string; body: string; title?: string }>,
): Promise<ImportBookSuccess | ImportBookFailure> {
  const tag = logPrefix(searchResult);
  try {
    await putFullText(searchResult.id, rawText);
    for (const ch of chapterBodies) {
      await putChapterText(searchResult.id, ch.slug, ch.body, ch.title);
    }
  } catch (e) {
    await clearStoredImport(searchResult.id);
    console.error(tag, "IndexedDB write failed:", e instanceof Error ? e.message : String(e));
    return { ok: false, message: `Could not import ${searchResult.title}. Please try again.` };
  }

  const shelfBook: ImportedShelfBook = {
    id: searchResult.id,
    title: searchResult.title,
    author: searchResult.author,
    source: USER_FACING_SOURCE_LABEL,
    sourceUrl: searchResult.sourceUrl,
    status: "ready",
    addedAt: new Date().toISOString(),
  };
  for (const ch of chapterBodies) {
    console.debug(tag, "stored chapter", ch.slug, "bodyLength", ch.body.length);
  }
  return { ok: true, shelfBook };
}

/**
 * Imports plain text when `ENABLE_REMOTE_IMPORT` is true: tries the configured proxy first, then browser fetch.
 * Persists full text to IndexedDB and every configured chapter slice (proxy `chapters` / `chapterText` or client markers).
 * When `ENABLE_REMOTE_IMPORT` is false, returns `IMPORT_SERVICE_NOT_CONNECTED` without calling the network.
 */
export async function importBook(searchResult: SearchResult): Promise<ImportBookSuccess | ImportBookFailure> {
  if (typeof window === "undefined") {
    console.warn(logPrefix(searchResult), "import skipped: not in browser");
    return { ok: false, message: "Import is only available in the browser." };
  }

  const tag = logPrefix(searchResult);
  const configs = chapterConfigsForImport(searchResult);

  if (!ENABLE_REMOTE_IMPORT) {
    console.warn(tag, "IMPORT_SERVICE_NOT_CONNECTED: ENABLE_REMOTE_IMPORT is false (no proxy or direct fetch)");
    return {
      ok: false,
      code: IMPORT_SERVICE_NOT_CONNECTED,
      message: `Could not import ${searchResult.title}. Please try again.`,
    };
  }

  let rawText: string;
  let legacyProxyChapter: string | undefined;
  let chaptersBySlug = new Map<string, string>();

  const proxyOutcome = await tryImportViaProxy(searchResult);
  if (proxyOutcome.ok) {
    rawText = proxyOutcome.rawText;
    legacyProxyChapter = proxyOutcome.chapterText;
    chaptersBySlug = proxyOutcome.chaptersBySlug;
    console.debug(tag, "loaded full text via import proxy");
  } else {
    console.debug(tag, "falling back to browser fetch after proxy:", proxyOutcome.reason);
    const browserOutcome = await tryImportViaBrowserFetch(searchResult);
    if (!browserOutcome.ok) {
      console.error(tag, "import failed after proxy and browser fetch:", proxyOutcome.reason, "|", browserOutcome.reason);
      return { ok: false, message: `Could not import ${searchResult.title}. Please try again.` };
    }
    rawText = browserOutcome.rawText;
    console.debug(tag, "loaded full text via browser fetch");
  }

  if (configs.length === 0) {
    const detected = autoDetectChaptersFromGutenbergText(rawText, 3);
    const chapterBodies = detected.map((d) => ({
      slug: d.chapterSlug,
      body: d.chapterText,
      title: d.title,
    }));
    if (chapterBodies.length > 0) {
      console.debug(tag, "auto-detected", chapterBodies.length, "chapter(s) from Gutenberg headings");
    } else {
      console.debug(tag, "no chapter headings auto-detected; full text only");
    }
    const outcome = await persistImportedText(searchResult, rawText, chapterBodies);
    if (!outcome.ok) {
      console.error(tag, "persist failed after successful fetch");
    }
    return outcome;
  }

  const chapterBodies: Array<{ slug: string; body: string; title?: string }> = [];
  for (let i = 0; i < configs.length; i++) {
    const cfg = configs[i];
    const { chapterBody, errorReason } = resolveChapterBodyForConfig(
      searchResult,
      cfg,
      rawText,
      chaptersBySlug,
      legacyProxyChapter,
      i,
    );
    if (errorReason || !chapterBody || chapterBody.length === 0) {
      await clearStoredImport(searchResult.id);
      console.error(tag, "import failed:", errorReason ?? "empty chapter body");
      return { ok: false, message: `Could not import ${searchResult.title}. Please try again.` };
    }
    chapterBodies.push({ slug: cfg.chapterSlug, body: chapterBody, title: cfg.title });
  }

  const outcome = await persistImportedText(searchResult, rawText, chapterBodies);
  if (!outcome.ok) {
    console.error(tag, "persist failed after successful fetch");
  }
  return outcome;
}
