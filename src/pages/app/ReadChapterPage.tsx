import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { getSeededChapter, type ReaderParagraph } from "@/data/curatedChapters";
import { getLibraryBook, isLibraryBookId, readerChapterPath } from "@/data/libraryBooks";
import { chapterBodyToReaderParagraphs } from "@/lib/chapterMarkers";
import {
  getBookChapterStorageKey,
  LEGACY_MOBY_CHAPTER_1_STORAGE_KEY,
  readShelfBookById,
} from "@/lib/importedBookStorage";
import { getPublicDomainSearchResultById } from "@/lib/publicDomainSearch";

function readImportedChapterParagraphs(bookId: string, chapterSlug: string): ReaderParagraph[] | null {
  if (typeof window === "undefined") return null;
  try {
    let raw = window.localStorage.getItem(getBookChapterStorageKey(bookId, chapterSlug));
    if (!raw && bookId === "moby-dick" && chapterSlug === "chapter-1") {
      raw = window.localStorage.getItem(LEGACY_MOBY_CHAPTER_1_STORAGE_KEY);
    }
    if (!raw) return null;
    const paragraphs = chapterBodyToReaderParagraphs(raw);
    return paragraphs.length > 0 ? paragraphs : null;
  } catch {
    return null;
  }
}

function chapterSlugToLabel(chapterSlug: string): string {
  const m = /^chapter-(\d+)$/.exec(chapterSlug);
  if (m) return `Chapter ${m[1]}`;
  return chapterSlug.replace(/-/g, " ");
}

const btnPrimary =
  "inline-flex items-center justify-center rounded-full bg-[#2C2416] px-5 py-2.5 text-sm font-semibold text-[#FAF8F4] transition-colors hover:bg-[#3D3220]";

const btnSecondary =
  "inline-flex items-center justify-center rounded-full border border-[#E0D8CC] bg-[#FDFBF7] px-5 py-2.5 text-sm font-semibold text-[#1C1A17] transition-colors hover:border-[#C4873A]/40";

export default function ReadChapterPage() {
  const { bookId, chapterId } = useParams();

  const catalogBook = useMemo(() => {
    if (!bookId || !isLibraryBookId(bookId)) return undefined;
    return getLibraryBook(bookId);
  }, [bookId]);

  const shelfBook = useMemo(() => {
    if (!bookId) return null;
    return readShelfBookById(bookId);
  }, [bookId]);

  const mockMeta = useMemo(() => {
    if (!bookId) return undefined;
    return getPublicDomainSearchResultById(bookId);
  }, [bookId]);

  const displayTitle = catalogBook?.title ?? shelfBook?.title ?? mockMeta?.title;
  const displayAuthor = catalogBook?.author ?? shelfBook?.author ?? mockMeta?.author ?? "";

  const seed = useMemo(() => {
    if (!bookId || !chapterId || !isLibraryBookId(bookId)) return null;
    return getSeededChapter(bookId, chapterId);
  }, [bookId, chapterId]);

  const importedParagraphs = useMemo(() => {
    if (!bookId || !chapterId) return null;
    return readImportedChapterParagraphs(bookId, chapterId);
  }, [bookId, chapterId]);

  const paragraphs = importedParagraphs ?? seed?.paragraphs ?? null;

  const importChapterTitle = mockMeta?.chapterImport?.title;
  const chapterHeading =
    seed?.title ?? importChapterTitle ?? (chapterId ? chapterSlugToLabel(chapterId) : "Chapter");

  const canResolveBook = Boolean(displayTitle);
  const hasImportedBody = Boolean(importedParagraphs && importedParagraphs.length > 0);
  const hasReadableLayer = hasImportedBody || Boolean(seed);

  if (!bookId || !chapterId) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <h1 className="text-2xl font-bold text-[#1C1A17]" style={{ fontFamily: "'Playfair Display', serif" }}>
          Chapter not found
        </h1>
        <p className="mt-3 text-sm text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
          Missing book or chapter in the URL.
        </p>
        <Link className={`${btnPrimary} mt-8`} to="/app/library">
          Back to Library
        </Link>
      </div>
    );
  }

  if (!canResolveBook) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <h1 className="text-2xl font-bold text-[#1C1A17]" style={{ fontFamily: "'Playfair Display', serif" }}>
          Book not found
        </h1>
        <p className="mt-3 text-sm text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
          This title is not in the reader yet. Search and import it from the Library first.
        </p>
        <Link className={`${btnPrimary} mt-8`} to="/app/library">
          Back to Library
        </Link>
      </div>
    );
  }

  if (!hasReadableLayer) {
    return (
      <div className="mx-auto max-w-3xl space-y-8">
        <nav className="flex flex-wrap items-center gap-2 text-xs text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
          <Link to="/app" className="hover:text-[#1C1A17]">
            Home
          </Link>
          <span aria-hidden>/</span>
          <Link to="/app/library" className="hover:text-[#1C1A17]">
            Library
          </Link>
          <span aria-hidden>/</span>
          <span className="font-medium text-[#1C1A17]">{displayTitle}</span>
        </nav>
        <div className="rounded-2xl border border-[#E0D8CC] bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-[#1C1A17]" style={{ fontFamily: "'Playfair Display', serif" }}>
            {chapterHeading}
          </h1>
          <p className="mt-2 text-sm text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
            {displayAuthor}
          </p>
          <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
            No text for this chapter yet. If you imported the book, we may still need a chapter slice for this edition;
            curated reader content may also be unavailable for this route.
          </p>
          <Link className={`${btnPrimary} mt-8 inline-flex`} to="/app/library">
            Back to Library
          </Link>
        </div>
      </div>
    );
  }

  const next =
    catalogBook && seed?.nextChapterId ? readerChapterPath(catalogBook.id, seed.nextChapterId) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <nav className="flex flex-wrap items-center gap-2 text-xs text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
        <Link to="/app" className="hover:text-[#1C1A17]">
          Home
        </Link>
        <span aria-hidden>/</span>
        <Link to="/app/library" className="hover:text-[#1C1A17]">
          Library
        </Link>
        <span aria-hidden>/</span>
        <span className="font-medium text-[#1C1A17]">{displayTitle}</span>
        <span aria-hidden>/</span>
        <span className="font-medium text-[#1C1A17]">{chapterHeading}</span>
      </nav>

      <div className="rounded-2xl border border-[#E0D8CC] bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Chapter
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[#1C1A17] md:text-3xl" style={{ fontFamily: "'Playfair Display', serif" }}>
              {chapterHeading}
            </h1>
            {displayAuthor ? (
              <p className="mt-2 text-sm text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
                {displayAuthor}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className={btnSecondary} to="/app/library">
              Library
            </Link>
            {next ? (
              <Link className={btnPrimary} to={next}>
                Next chapter
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E0D8CC] bg-white p-6 shadow-sm">
        <div className="space-y-6">
          {paragraphs && paragraphs.length > 0 ? (
            paragraphs.map((p, idx) => (
              <div key={idx}>
                <p className="text-xs font-medium uppercase tracking-wide text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {p.label}
                </p>
                <p
                  className="mt-2 text-[15px] leading-relaxed text-[#1C1A17] whitespace-pre-wrap"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {p.text}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
              No reader text is available for this chapter yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
