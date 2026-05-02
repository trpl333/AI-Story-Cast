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

/** Raw full-text import from a public-domain source (e.g. Gutenberg plain .txt). */
export function getBookTextStorageKey(bookId: string): string {
  return `aistorycast-book-text-${bookId}`;
}

/** Extracted chapter body for the reader (overrides curated seed when present). */
export function getBookChapterStorageKey(bookId: string, chapterSlug: string): string {
  return `aistorycast-book-chapter-${bookId}-${chapterSlug}`;
}

/** Pre-refactor key; read-only fallback so existing installs keep chapter text. */
export const LEGACY_MOBY_CHAPTER_1_STORAGE_KEY = "aistorycast-book-chapter-moby-dick-chapter-1";

export function hasImportedBookFullText(bookId: string): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(getBookTextStorageKey(bookId));
  return typeof raw === "string" && raw.length > 0;
}

export function hasImportedBookChapter(bookId: string, chapterSlug: string): boolean {
  if (typeof window === "undefined") return false;
  let raw = window.localStorage.getItem(getBookChapterStorageKey(bookId, chapterSlug));
  if (!raw && bookId === "moby-dick" && chapterSlug === "chapter-1") {
    raw = window.localStorage.getItem(LEGACY_MOBY_CHAPTER_1_STORAGE_KEY);
  }
  return typeof raw === "string" && raw.length > 0;
}

/** True if any `aistorycast-book-chapter-${bookId}-*` key has non-empty text. */
export function hasAnyImportedBookChapter(bookId: string): boolean {
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

/**
 * Removes saved full text and every `aistorycast-book-chapter-${bookId}-*` key (plus legacy Moby chapter key when applicable).
 * Does not modify the shelf JSON array; callers should update shelf state separately.
 */
export function clearImportedBookStoredText(bookId: string): void {
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
