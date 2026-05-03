import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getSeededChapter, type ReaderParagraph } from "@/data/curatedChapters";
import { getLibraryBook, isLibraryBookId, readerChapterHref } from "@/data/libraryBooks";
import { chapterBodyToReaderParagraphs } from "@/lib/chapterMarkers";
import {
  getImportedChapterWithLegacyFallback,
  listImportedChapterSlugs,
  sortChapterSlugs,
} from "@/lib/importedBookDb";
import { chapterConfigsForImport, readShelfBookById } from "@/lib/importedBookStorage";
import { getPublicDomainSearchResultById } from "@/lib/publicDomainSearch";

function chapterSlugToLabel(chapterSlug: string): string {
  const m = /^chapter-(\d+)$/.exec(chapterSlug);
  if (m) return `Chapter ${m[1]}`;
  return chapterSlug.replace(/-/g, " ");
}

const btnPrimary =
  "inline-flex items-center justify-center rounded-full bg-[#2C2416] px-5 py-2.5 text-sm font-semibold text-[#FAF8F4] transition-colors hover:bg-[#3D3220] disabled:cursor-not-allowed disabled:opacity-40";

const btnSecondary =
  "inline-flex items-center justify-center rounded-full border border-[#E0D8CC] bg-[#FDFBF7] px-5 py-2.5 text-sm font-semibold text-[#1C1A17] transition-colors hover:border-[#C4873A]/40";

const navDisabledClass = "cursor-not-allowed opacity-40";

function ChapterNavLinks(props: {
  bookId: string;
  prevSlug: string | null;
  nextSlug: string | null;
  layout?: "header" | "footer";
}) {
  const { bookId, prevSlug, nextSlug, layout = "header" } = props;
  const prevTo = prevSlug ? readerChapterHref(bookId, prevSlug) : null;
  const nextTo = nextSlug ? readerChapterHref(bookId, nextSlug) : null;
  const primary = layout === "footer";

  return (
    <div className="flex flex-wrap gap-3">
      {prevTo ? (
        <Link className={btnSecondary} to={prevTo}>
          Previous chapter
        </Link>
      ) : (
        <span className={`${btnSecondary} ${navDisabledClass}`} aria-disabled="true">
          Previous chapter
        </span>
      )}
      {nextTo ? (
        <Link className={btnSecondary} to={nextTo}>
          Next chapter
        </Link>
      ) : (
        <span className={`${btnSecondary} ${navDisabledClass}`} aria-disabled="true">
          Next chapter
        </span>
      )}
      <Link className={primary ? btnPrimary : btnSecondary} to="/app/library">
        Back to Library
      </Link>
    </div>
  );
}

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

  const catalogChapterConfigs = useMemo(() => chapterConfigsForImport(mockMeta), [mockMeta]);

  const [importChapterPending, setImportChapterPending] = useState(true);
  const [importedParagraphs, setImportedParagraphs] = useState<ReaderParagraph[] | null>(null);
  const [importedChapterTitle, setImportedChapterTitle] = useState<string | undefined>(undefined);
  const [idbChapterSlugs, setIdbChapterSlugs] = useState<string[]>([]);

  const canResolveBook = Boolean(displayTitle);

  useEffect(() => {
    if (!bookId || !canResolveBook) {
      setIdbChapterSlugs([]);
      return;
    }
    void listImportedChapterSlugs(bookId).then(setIdbChapterSlugs);
  }, [bookId, canResolveBook]);

  useEffect(() => {
    if (!bookId || !chapterId || !canResolveBook) {
      setImportChapterPending(false);
      setImportedParagraphs(null);
      setImportedChapterTitle(undefined);
      return;
    }
    let cancelled = false;
    setImportChapterPending(true);
    setImportedParagraphs(null);
    setImportedChapterTitle(undefined);
    void (async () => {
      try {
        const { text, title } = await getImportedChapterWithLegacyFallback(bookId, chapterId);
        console.debug("[ReadChapterPage]", { bookId, chapterSlug: chapterId, loadedBodyLength: text?.length ?? 0 });
        if (cancelled) return;
        if (typeof text === "string" && text.trim().length > 0) {
          const parsed = chapterBodyToReaderParagraphs(text);
          setImportedParagraphs(parsed.length > 0 ? parsed : null);
        } else {
          setImportedParagraphs(null);
        }
        if (typeof title === "string" && title.trim().length > 0) {
          setImportedChapterTitle(title.trim());
        }
      } catch {
        if (!cancelled) {
          setImportedParagraphs(null);
          setImportedChapterTitle(undefined);
        }
      } finally {
        if (!cancelled) setImportChapterPending(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId, chapterId, canResolveBook]);

  const paragraphs = importedParagraphs ?? seed?.paragraphs ?? null;

  const catalogTitleForSlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of catalogChapterConfigs) {
      if (c.title) map.set(c.chapterSlug, c.title);
    }
    return map;
  }, [catalogChapterConfigs]);

  const navChapterSlugs = useMemo(() => {
    if (catalogChapterConfigs.length > 0) {
      return catalogChapterConfigs.map((c) => c.chapterSlug);
    }
    return sortChapterSlugs(idbChapterSlugs);
  }, [catalogChapterConfigs, idbChapterSlugs]);

  const navIndex = bookId && chapterId ? navChapterSlugs.indexOf(chapterId) : -1;
  const prevSlug = navIndex > 0 ? navChapterSlugs[navIndex - 1] : null;
  const nextSlug = navIndex >= 0 && navIndex < navChapterSlugs.length - 1 ? navChapterSlugs[navIndex + 1] : null;

  const chapterHeading =
    seed?.title ??
    catalogTitleForSlug.get(chapterId ?? "") ??
    importedChapterTitle ??
    (chapterId ? chapterSlugToLabel(chapterId) : "Chapter");

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
          This title is not in the reader yet. Add it from Discover, upload a .txt from Upload, or import from My Library.
        </p>
        <Link className={`${btnPrimary} mt-8`} to="/app/library">
          Back to Library
        </Link>
      </div>
    );
  }

  if (importChapterPending) {
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
        <div className="rounded-2xl border border-[#E0D8CC] bg-white p-12 text-center shadow-sm">
          <p className="text-sm font-medium text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Loading chapter text…
          </p>
          <p className="mt-2 text-xs text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Checking for imported text in this browser.
          </p>
        </div>
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
          <div className="mt-8 flex justify-center">
            <ChapterNavLinks bookId={bookId} prevSlug={prevSlug} nextSlug={nextSlug} layout="footer" />
          </div>
        </div>
      </div>
    );
  }

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
          <ChapterNavLinks bookId={bookId} prevSlug={prevSlug} nextSlug={nextSlug} />
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

      <div className="flex justify-center pb-8">
        <ChapterNavLinks bookId={bookId} prevSlug={prevSlug} nextSlug={nextSlug} layout="footer" />
      </div>
    </div>
  );
}
