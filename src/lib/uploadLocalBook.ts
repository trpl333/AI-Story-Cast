import { detectChaptersWithMetadata } from "@/lib/chapterAutoDetect";
import { deleteAllTextsForBook, putChapterText, putFullText } from "@/lib/importedBookDb";
import { UPLOADED_FILE_SOURCE_LABEL, type ImportedShelfBook } from "@/lib/importedBookStorage";

/** Shelf / IndexedDB ids for locally uploaded .txt books use this prefix. */
export const UPLOADED_BOOK_ID_PREFIX = "uploaded-" as const;

export function isUploadedShelfBookId(bookId: string): boolean {
  return bookId.startsWith(UPLOADED_BOOK_ID_PREFIX);
}

/**
 * Filename (no path) → slug segment for `uploaded-<slug>-<timestamp>`.
 */
export function slugifyUploadBase(filename: string): string {
  const base = filename.replace(/[/\\]/g, "").replace(/\.[^.]+$/, "").trim().toLowerCase();
  const slug = base
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug.length > 0 ? slug : "book";
}

export function makeUploadedBookId(slug: string): string {
  return `${UPLOADED_BOOK_ID_PREFIX}${slug}-${Date.now()}`;
}

export type PersistUploadedTxtOutcome =
  | { ok: true; shelfBook: ImportedShelfBook; chapterCount: number }
  | { ok: false; message: string };

/**
 * Persists full text and chapter slices for a user-selected .txt file (IndexedDB).
 * Caller merges `shelfBook` into shelf JSON via `writeShelfBooksToStorage`.
 */
export async function persistUploadedTxtBook(params: {
  rawText: string;
  title: string;
  author: string;
  originalFilename: string;
}): Promise<PersistUploadedTxtOutcome> {
  const { rawText, originalFilename } = params;
  const trimmed = rawText.replace(/^\uFEFF/, "").trim();
  if (trimmed.length === 0) {
    return { ok: false, message: "File is empty." };
  }

  const titleIn = params.title.trim();
  const authorIn = params.author.trim();
  const slug = slugifyUploadBase(originalFilename);
  const bookId = makeUploadedBookId(slug);
  const stem = originalFilename.replace(/[/\\]/g, "").replace(/\.[^.]+$/i, "").trim();
  const defaultTitle =
    stem.length > 0 ? stem.replace(/_/g, " ") : slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  try {
    const { chapters, meta } = detectChaptersWithMetadata(rawText, { bookId });
    await putFullText(bookId, rawText, meta);
    const chapterBodies = chapters.map((d) => ({ slug: d.chapterSlug, body: d.chapterText, title: d.title }));

    for (const ch of chapterBodies) {
      await putChapterText(bookId, ch.slug, ch.body, ch.title);
    }

    const shelfBook: ImportedShelfBook = {
      id: bookId,
      title: titleIn.length > 0 ? titleIn : defaultTitle,
      author: authorIn.length > 0 ? authorIn : "Unknown author",
      source: UPLOADED_FILE_SOURCE_LABEL,
      sourceUrl: "",
      status: "ready",
      addedAt: new Date().toISOString(),
    };

    return { ok: true, shelfBook, chapterCount: chapterBodies.length };
  } catch (e) {
    await deleteAllTextsForBook(bookId);
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[uploadLocalBook] persist failed:", msg);
    return { ok: false, message: "Could not save this file. Please try again." };
  }
}
