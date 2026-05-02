import { extractChapterByMarkers } from "@/lib/chapterMarkers";
import {
  getBookChapterStorageKey,
  getBookTextStorageKey,
  USER_FACING_SOURCE_LABEL,
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

/** Optional server-side fetch + slice; used when browser CORS blocks direct Gutenberg access. */
export const AISTORYCAST_IMPORT_PROXY_URL =
  "https://n8n.jdpenterprises.ai/webhook/aistorycast-import-book";

type ProxyImportResponse = {
  success?: unknown;
  rawText?: unknown;
  chapterText?: unknown;
};

function logPrefix(sr: SearchResult): string {
  return `[importBook:${sr.id}]`;
}

export type ImportBookFailure = {
  ok: false;
  message: string;
  code?: typeof IMPORT_SERVICE_NOT_CONNECTED;
};
export type ImportBookSuccess = { ok: true; shelfBook: ImportedShelfBook };

function clearStoredImport(bookId: string, chapterSlug: string | undefined) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(getBookTextStorageKey(bookId));
    if (chapterSlug) window.localStorage.removeItem(getBookChapterStorageKey(bookId, chapterSlug));
  } catch {
    /* ignore */
  }
}

function extractChapterBody(rawText: string, sr: SearchResult): string {
  const ci = sr.chapterImport;
  if (!ci) return "";
  return extractChapterByMarkers(rawText, ci.startMarker, ci.endMarker, {
    startMarkerOccurrenceIndex: ci.startMarkerOccurrenceIndex,
  }).trim();
}

/**
 * Returns chapter body to store, or null if `chapterImport` is set but nothing could be derived.
 */
function resolveChapterBodyForStorage(
  sr: SearchResult,
  rawText: string,
  proxyChapterText: string | undefined,
): { chapterBody: string | null; errorReason: string | null } {
  const ci = sr.chapterImport;
  if (!ci) return { chapterBody: null, errorReason: null };

  const fromProxy = typeof proxyChapterText === "string" ? proxyChapterText.trim() : "";
  if (fromProxy.length > 0) {
    console.debug(logPrefix(sr), "chapter text from import proxy response");
    return { chapterBody: fromProxy, errorReason: null };
  }

  const sliced = extractChapterBody(rawText, sr);
  if (sliced.length > 0) {
    console.debug(logPrefix(sr), "chapter text from client marker extraction");
    return { chapterBody: sliced, errorReason: null };
  }

  const reason = "chapterImport configured but marker extraction yielded empty text (and no proxy chapterText)";
  console.warn(logPrefix(sr), reason);
  return { chapterBody: null, errorReason: reason };
}

async function tryImportViaProxy(searchResult: SearchResult): Promise<
  | { ok: true; rawText: string; chapterText?: string }
  | { ok: false; reason: string }
> {
  const tag = logPrefix(searchResult);
  try {
    const res = await fetch(AISTORYCAST_IMPORT_PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: searchResult.id,
        title: searchResult.title,
        author: searchResult.author,
        sourceUrl: searchResult.sourceUrl,
        chapterImport: searchResult.chapterImport ?? null,
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
      typeof d.chapterText === "string" && d.chapterText.trim().length > 0 ? d.chapterText : undefined;
    return { ok: true, rawText: d.rawText, chapterText };
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

function persistImportedText(
  searchResult: SearchResult,
  rawText: string,
  chapterBody: string | null,
): ImportBookSuccess | ImportBookFailure {
  const tag = logPrefix(searchResult);
  const textKey = getBookTextStorageKey(searchResult.id);
  const slug = searchResult.chapterImport?.chapterSlug;

  if (searchResult.chapterImport && slug && (!chapterBody || chapterBody.length === 0)) {
    console.error(tag, "persist aborted: chapterImport requires non-empty chapter body");
    return { ok: false, message: `Could not import ${searchResult.title}. Please try again.` };
  }

  try {
    window.localStorage.setItem(textKey, rawText);
    if (slug && chapterBody) {
      window.localStorage.setItem(getBookChapterStorageKey(searchResult.id, slug), chapterBody);
    }
  } catch (e) {
    clearStoredImport(searchResult.id, slug);
    console.error(tag, "localStorage write failed:", e instanceof Error ? e.message : String(e));
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
  return { ok: true, shelfBook };
}

/**
 * Imports plain text when `ENABLE_REMOTE_IMPORT` is true: tries the configured proxy first, then browser fetch.
 * Stores full text and optional chapter slice (from proxy `chapterText` or client marker extraction).
 * When `ENABLE_REMOTE_IMPORT` is false, returns `IMPORT_SERVICE_NOT_CONNECTED` without calling the network.
 */
export async function importBook(searchResult: SearchResult): Promise<ImportBookSuccess | ImportBookFailure> {
  if (typeof window === "undefined") {
    console.warn(logPrefix(searchResult), "import skipped: not in browser");
    return { ok: false, message: "Import is only available in the browser." };
  }

  const tag = logPrefix(searchResult);
  const chapterSlug = searchResult.chapterImport?.chapterSlug;

  if (!ENABLE_REMOTE_IMPORT) {
    console.warn(tag, "IMPORT_SERVICE_NOT_CONNECTED: ENABLE_REMOTE_IMPORT is false (no proxy or direct fetch)");
    return {
      ok: false,
      code: IMPORT_SERVICE_NOT_CONNECTED,
      message: `Could not import ${searchResult.title}. Please try again.`,
    };
  }

  let rawText: string;
  let proxyChapter: string | undefined;

  const proxyOutcome = await tryImportViaProxy(searchResult);
  if (proxyOutcome.ok) {
    rawText = proxyOutcome.rawText;
    proxyChapter = proxyOutcome.chapterText;
    usedProxy = true;
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

  const { chapterBody, errorReason } = resolveChapterBodyForStorage(searchResult, rawText, proxyChapter);
  if (errorReason) {
    clearStoredImport(searchResult.id, chapterSlug);
    console.error(tag, "import failed:", errorReason);
    return { ok: false, message: `Could not import ${searchResult.title}. Please try again.` };
  }

  const outcome = persistImportedText(searchResult, rawText, chapterBody);
  if (!outcome.ok) {
    console.error(tag, "persist failed after successful fetch");
  }
  return outcome;
}
