/**
 * Large imported book bodies live in IndexedDB (not localStorage) to avoid quota issues
 * with multi‑MB Gutenberg texts.
 */

const LEGACY_MOBY_CHAPTER_1_STORAGE_KEY = "aistorycast-book-chapter-moby-dick-chapter-1";

function legacyLocalTextKey(bookId: string): string {
  return `aistorycast-book-text-${bookId}`;
}

function legacyLocalChapterKey(bookId: string, chapterSlug: string): string {
  return `aistorycast-book-chapter-${bookId}-${chapterSlug}`;
}

import type { ChapterDetectionMeta } from "@/lib/chapterAutoDetect";

const DB_NAME = "aistorycast-imports-v1";
const DB_VERSION = 1;
const STORE_FULL = "fullText";
const STORE_CHAPTER = "chapterText";

export type FullTextRow = {
  bookId: string;
  text: string;
  /** Optional import-time snapshot; omitted on older rows. */
  chapterDetectionMeta?: ChapterDetectionMeta;
};
export type ChapterTextRow = { id: string; bookId: string; chapterSlug: string; text: string; title?: string };

function chapterRowId(bookId: string, chapterSlug: string): string {
  return `${bookId}::${chapterSlug}`;
}

/** Numeric `chapter-N` slugs sort in numeric order; others sort lexicographically. */
export function sortChapterSlugs(slugs: readonly string[]): string[] {
  return [...slugs].sort((a, b) => {
    const ma = /^chapter-(\d+)$/.exec(a);
    const mb = /^chapter-(\d+)$/.exec(b);
    if (ma && mb) return Number(ma[1]) - Number(mb[1]);
    return a.localeCompare(b);
  });
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB is not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("indexedDB open failed"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_FULL)) {
        db.createObjectStore(STORE_FULL, { keyPath: "bookId" });
      }
      if (!db.objectStoreNames.contains(STORE_CHAPTER)) {
        const s = db.createObjectStore(STORE_CHAPTER, { keyPath: "id" });
        s.createIndex("byBookId", "bookId", { unique: false });
      }
    };
  });
}

export async function putFullText(bookId: string, text: string, chapterDetectionMeta?: ChapterDetectionMeta): Promise<void> {
  const db = await openDb();
  const row: FullTextRow = { bookId, text };
  if (chapterDetectionMeta) row.chapterDetectionMeta = chapterDetectionMeta;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_FULL, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("putFullText transaction failed"));
    tx.objectStore(STORE_FULL).put(row);
  });
  db.close();
}

export async function putChapterText(
  bookId: string,
  chapterSlug: string,
  text: string,
  title?: string,
): Promise<void> {
  const db = await openDb();
  const id = chapterRowId(bookId, chapterSlug);
  const row: ChapterTextRow = { id, bookId, chapterSlug, text };
  if (typeof title === "string" && title.length > 0) row.title = title;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_CHAPTER, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("putChapterText transaction failed"));
    tx.objectStore(STORE_CHAPTER).put(row);
  });
  db.close();
}

export async function getFullTextRecord(bookId: string): Promise<FullTextRow | undefined> {
  const db = await openDb();
  const row = await new Promise<FullTextRow | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_FULL, "readonly");
    const req = tx.objectStore(STORE_FULL).get(bookId);
    req.onsuccess = () => resolve(req.result as FullTextRow | undefined);
    req.onerror = () => reject(req.error ?? new Error("getFullTextRecord failed"));
  });
  db.close();
  return row;
}

export async function getFullText(bookId: string): Promise<string | undefined> {
  const row = await getFullTextRecord(bookId);
  return row?.text;
}

export async function getChapterRecord(bookId: string, chapterSlug: string): Promise<ChapterTextRow | undefined> {
  const db = await openDb();
  const id = chapterRowId(bookId, chapterSlug);
  const row = await new Promise<ChapterTextRow | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_CHAPTER, "readonly");
    const req = tx.objectStore(STORE_CHAPTER).get(id);
    req.onsuccess = () => resolve(req.result as ChapterTextRow | undefined);
    req.onerror = () => reject(req.error ?? new Error("getChapterRecord failed"));
  });
  db.close();
  return row;
}

export async function getChapterText(bookId: string, chapterSlug: string): Promise<string | undefined> {
  const row = await getChapterRecord(bookId, chapterSlug);
  return row?.text;
}

/** Chapter slugs that have imported text (IndexedDB); sorted with {@link sortChapterSlugs}. */
export async function listImportedChapterSlugs(bookId: string): Promise<string[]> {
  const db = await openDb();
  const slugs = await new Promise<string[]>((resolve, reject) => {
    const out: string[] = [];
    const tx = db.transaction(STORE_CHAPTER, "readonly");
    const index = tx.objectStore(STORE_CHAPTER).index("byBookId");
    const req = index.openKeyCursor(IDBKeyRange.only(bookId));
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) {
        resolve(out);
        return;
      }
      const pk = String(cursor.primaryKey);
      const prefix = `${bookId}::`;
      if (pk.startsWith(prefix)) {
        out.push(pk.slice(prefix.length));
      }
      cursor.continue();
    };
    req.onerror = () => reject(req.error ?? new Error("listImportedChapterSlugs failed"));
  });
  db.close();
  return sortChapterSlugs(slugs);
}

export async function hasFullText(bookId: string): Promise<boolean> {
  const t = await getFullText(bookId);
  return typeof t === "string" && t.length > 0;
}

export async function hasAnyChapterText(bookId: string): Promise<boolean> {
  const db = await openDb();
  const count = await new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE_CHAPTER, "readonly");
    const index = tx.objectStore(STORE_CHAPTER).index("byBookId");
    const req = index.count(IDBKeyRange.only(bookId));
    req.onsuccess = () => resolve(Number(req.result) || 0);
    req.onerror = () => reject(req.error ?? new Error("hasAnyChapterText failed"));
  });
  db.close();
  return count > 0;
}

export async function deleteAllTextsForBook(bookId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_FULL, STORE_CHAPTER], "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("deleteAllTextsForBook failed"));
    tx.objectStore(STORE_FULL).delete(bookId);
    const chStore = tx.objectStore(STORE_CHAPTER);
    const index = chStore.index("byBookId");
    const req = index.openCursor(IDBKeyRange.only(bookId));
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  });
  db.close();
}

/**
 * One-time migration from pre-IndexedDB localStorage keys into IDB, then removes those keys.
 * Safe to call multiple times (no-op if keys already gone).
 */
export async function migrateLegacyImportTextFromLocalStorage(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k) keys.push(k);
    }

    const textPrefix = "aistorycast-book-text-";
    for (const key of keys) {
      if (key.startsWith(textPrefix)) {
        const bookId = key.slice(textPrefix.length);
        const raw = window.localStorage.getItem(key);
        if (typeof raw === "string" && raw.length > 0) {
          await putFullText(bookId, raw);
        }
        window.localStorage.removeItem(key);
        continue;
      }
      const m = /^aistorycast-book-chapter-(.+)-(chapter-\d+)$/.exec(key);
      if (m) {
        const bookId = m[1];
        const chapterSlug = m[2];
        const raw = window.localStorage.getItem(key);
        if (typeof raw === "string" && raw.length > 0) {
          await putChapterText(bookId, chapterSlug, raw);
        }
        window.localStorage.removeItem(key);
      }
    }

    const legacy = window.localStorage.getItem(LEGACY_MOBY_CHAPTER_1_STORAGE_KEY);
    if (typeof legacy === "string" && legacy.length > 0) {
      await putChapterText("moby-dick", "chapter-1", legacy);
      window.localStorage.removeItem(LEGACY_MOBY_CHAPTER_1_STORAGE_KEY);
    }
  } catch {
    /* ignore migration failures */
  }
}

export type ImportedChapterLoadResult = {
  text: string | undefined;
  /** Present when stored in IndexedDB (legacy localStorage chapter keys have no title). */
  title?: string;
};

/**
 * Chapter body for the reader: IndexedDB first (including optional `title`), then legacy localStorage.
 */
export async function getImportedChapterWithLegacyFallback(
  bookId: string,
  chapterSlug: string,
): Promise<ImportedChapterLoadResult> {
  const row = await getChapterRecord(bookId, chapterSlug);
  if (typeof row?.text === "string" && row.text.trim().length > 0) {
    return { text: row.text, title: row.title };
  }

  if (typeof window === "undefined") return { text: undefined };
  try {
    let raw = window.localStorage.getItem(legacyLocalChapterKey(bookId, chapterSlug));
    if (!raw && bookId === "moby-dick" && chapterSlug === "chapter-1") {
      raw = window.localStorage.getItem(LEGACY_MOBY_CHAPTER_1_STORAGE_KEY);
    }
    const text = typeof raw === "string" && raw.length > 0 ? raw : undefined;
    return { text, title: undefined };
  } catch {
    return { text: undefined };
  }
}

/** @deprecated Prefer {@link getImportedChapterWithLegacyFallback} for optional chapter title. */
export async function getImportedChapterRawWithLegacyFallback(
  bookId: string,
  chapterSlug: string,
): Promise<string | undefined> {
  const { text } = await getImportedChapterWithLegacyFallback(bookId, chapterSlug);
  return text;
}
