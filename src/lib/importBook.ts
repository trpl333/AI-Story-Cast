import { extractChapterByMarkers } from "@/lib/chapterMarkers";
import {
  getBookChapterStorageKey,
  getBookTextStorageKey,
  type ImportedShelfBook,
  type SearchResult,
} from "@/lib/importedBookStorage";

function clearStoredImport(bookId: string, chapterSlug: string | undefined) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(getBookTextStorageKey(bookId));
    if (chapterSlug) window.localStorage.removeItem(getBookChapterStorageKey(bookId, chapterSlug));
  } catch {
    /* ignore */
  }
}

export type ImportBookFailure = { ok: false; message: string };
export type ImportBookSuccess = { ok: true; shelfBook: ImportedShelfBook };

/**
 * Fetches plain text from searchResult.sourceUrl, stores it under generic keys, optionally
 * extracts a chapter by markers, then returns a shelf row (caller persists shelf JSON).
 */
export async function importBook(searchResult: SearchResult): Promise<ImportBookSuccess | ImportBookFailure> {
  if (typeof window === "undefined") {
    return { ok: false, message: "Import is only available in the browser." };
  }

  const textKey = getBookTextStorageKey(searchResult.id);
  const chapterSlug = searchResult.chapterImport?.chapterSlug;

  try {
    const response = await fetch(searchResult.sourceUrl, { method: "GET", mode: "cors" });
    if (!response.ok) {
      return { ok: false, message: `Could not import ${searchResult.title}. Please try again.` };
    }
    const text = await response.text();
    if (text.trim().length === 0) {
      return { ok: false, message: `Could not import ${searchResult.title}. Please try again.` };
    }

    if (searchResult.chapterImport) {
      const { startMarker, endMarker, chapterSlug: slug, startMarkerOccurrenceIndex } = searchResult.chapterImport;
      const chapterBody = extractChapterByMarkers(text, startMarker, endMarker, {
        startMarkerOccurrenceIndex,
      });
      if (chapterBody.length === 0) {
        return { ok: false, message: `Could not import ${searchResult.title}. Please try again.` };
      }
      try {
        window.localStorage.setItem(textKey, text);
        window.localStorage.setItem(getBookChapterStorageKey(searchResult.id, slug), chapterBody);
      } catch {
        clearStoredImport(searchResult.id, slug);
        return { ok: false, message: `Could not import ${searchResult.title}. Please try again.` };
      }
    } else {
      try {
        window.localStorage.setItem(textKey, text);
      } catch {
        clearStoredImport(searchResult.id, undefined);
        return { ok: false, message: `Could not import ${searchResult.title}. Please try again.` };
      }
    }

    const shelfBook: ImportedShelfBook = {
      id: searchResult.id,
      title: searchResult.title,
      author: searchResult.author,
      source: searchResult.source,
      sourceUrl: searchResult.sourceUrl,
      status: "ready",
      addedAt: new Date().toISOString(),
    };
    return { ok: true, shelfBook };
  } catch {
    clearStoredImport(searchResult.id, chapterSlug);
    return { ok: false, message: `Could not import ${searchResult.title}. Please try again.` };
  }
}
