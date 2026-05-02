import {
  getChapterText,
  hasAnyChapterText as idbHasAnyChapterText,
  hasFullText as idbHasFullText,
  deleteAllTextsForBook as idbDeleteAllTextsForBook,
} from "@/lib/importedBookDb";

/** Shelf JSON in localStorage (same key as Library page). */
export const LIBRARY_SHELF_STORAGE_KEY = "aistorycast-library-shelf-v1";

export type ImportedShelfBookStatus = "ready" | "importing" | "error";

/** Shelf row persisted in localStorage after a successful import. */
export type ImportedShelfBook = {
  id: string;
  title: string;
  author: string;
  source: string;
  sourceUrl: string;
  status: ImportedShelfBookStatus;
  addedAt: string;
};

/** Optional first-chapter extraction (marker-based slice of raw source text). */
export type ChapterImportConfig = {
  chapterSlug: string;
  /** Reader heading when there is no curated chapter seed. */
  title?: string;
  startMarker: string;
  endMarker: string;
  /**
   * 0 = first occurrence of startMarker. Use 1 when a table-of-contents repeats the same
   * heading before the real chapter body (e.g. Project Gutenberg Moby-Dick #2701).
   */
  startMarkerOccurrenceIndex?: number;
};

/** Search / discovery row (mock adapter today). */
export type SearchResult = {
  id: string;
  title: string;
  author: string;
  /** Internal catalog / rights provenance (not shown in Library UI). */
  source: string;
  sourceUrl: string;
  description: string;
  chapterImport?: ChapterImportConfig;
};

/** Shown on Library cards and shelf; upstream names stay in `SearchResult.source` only. */
export const USER_FACING_SOURCE_LABEL = "Public domain classic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseShelfBookRow(value: unknown): ImportedShelfBook | null {
  if (!isRecord(value)) return null;
  const id = value.id;
  const title = value.title;
  const author = value.author;
  const source = value.source;
  const addedAt = value.addedAt;
  if (typeof id !== "string" || id.length === 0) return null;
  if (typeof title !== "string" || title.length === 0) return null;
  if (typeof author !== "string" || author.length === 0) return null;
  if (typeof source !== "string" || source.length === 0) return null;
  if (typeof addedAt !== "string" || addedAt.length === 0) return null;

  const sourceUrl = typeof value.sourceUrl === "string" ? value.sourceUrl : "";
  const statusRaw = value.status;
  const status =
    statusRaw === "ready" || statusRaw === "importing" || statusRaw === "error" ? statusRaw : "ready";

  return { id, title, author, source, sourceUrl, status, addedAt };
}

/** Read shelf rows from storage (browser only). */
export function readShelfBooksFromStorage(): ImportedShelfBook[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LIBRARY_SHELF_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parseShelfBookRow).filter((b): b is ImportedShelfBook => b !== null);
  } catch {
    return [];
  }
}

export function readShelfBookById(bookId: string): ImportedShelfBook | null {
  const books = readShelfBooksFromStorage();
  return books.find((b) => b.id === bookId) ?? null;
}

export function writeShelfBooksToStorage(books: ImportedShelfBook[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LIBRARY_SHELF_STORAGE_KEY, JSON.stringify(books));
  } catch {
    /* ignore */
  }
}

/** Legacy localStorage key for full text (migration / cleanup only). */
export function getBookTextStorageKey(bookId: string): string {
  return `aistorycast-book-text-${bookId}`;
}

/** Legacy localStorage key for chapter body (migration / cleanup only). */
export function getBookChapterStorageKey(bookId: string, chapterSlug: string): string {
  return `aistorycast-book-chapter-${bookId}-${chapterSlug}`;
}

/** Pre-refactor key; read-only fallback so existing installs keep chapter text. */
export const LEGACY_MOBY_CHAPTER_1_STORAGE_KEY = "aistorycast-book-chapter-moby-dick-chapter-1";

function legacyHasFullTextInLocalStorage(bookId: string): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(getBookTextStorageKey(bookId));
  return typeof raw === "string" && raw.length > 0;
}

function legacyHasAnyChapterInLocalStorage(bookId: string): boolean {
  if (typeof window === "undefined") return false;
  const prefix = `aistorycast-book-chapter-${bookId}-`;
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (!k || !k.startsWith(prefix)) continue;
    const v = window.localStorage.getItem(k);
    if (typeof v === "string" && v.length > 0) return true;
  }
  if (bookId === "moby-dick") {
    const legacy = window.localStorage.getItem(LEGACY_MOBY_CHAPTER_1_STORAGE_KEY);
    if (typeof legacy === "string" && legacy.length > 0) return true;
  }
  return false;
}

function legacyHasChapterInLocalStorage(bookId: string, chapterSlug: string): boolean {
  if (typeof window === "undefined") return false;
  let raw = window.localStorage.getItem(getBookChapterStorageKey(bookId, chapterSlug));
  if (!raw && bookId === "moby-dick" && chapterSlug === "chapter-1") {
    raw = window.localStorage.getItem(LEGACY_MOBY_CHAPTER_1_STORAGE_KEY);
  }
  return typeof raw === "string" && raw.length > 0;
}

/** True when full raw text exists in IndexedDB (or legacy localStorage before migration). */
export async function hasImportedBookFullText(bookId: string): Promise<boolean> {
  if (await idbHasFullText(bookId)) return true;
  return legacyHasFullTextInLocalStorage(bookId);
}

/** True when extracted chapter text exists in IndexedDB (or legacy localStorage). */
export async function hasImportedBookChapter(bookId: string, chapterSlug: string): Promise<boolean> {
  const fromIdb = await getChapterText(bookId, chapterSlug);
  if (typeof fromIdb === "string" && fromIdb.length > 0) return true;
  return legacyHasChapterInLocalStorage(bookId, chapterSlug);
}

/** True if any chapter slice exists for the book (IndexedDB or legacy keys). */
export async function hasAnyImportedBookChapter(bookId: string): Promise<boolean> {
  if (await idbHasAnyChapterText(bookId)) return true;
  return legacyHasAnyChapterInLocalStorage(bookId);
}

/**
 * Removes all large text for this book from IndexedDB and clears legacy localStorage keys.
 * Does not modify the shelf JSON array; callers should update shelf state separately.
 */
export async function clearImportedBookStoredText(bookId: string): Promise<void> {
  await idbDeleteAllTextsForBook(bookId);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(getBookTextStorageKey(bookId));
    const prefix = `aistorycast-book-chapter-${bookId}-`;
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k || !k.startsWith(prefix)) continue;
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
