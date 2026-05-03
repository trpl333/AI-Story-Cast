import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { getSeededChapter, type ReaderParagraph } from "@/data/curatedChapters";
import { getLibraryBook, isLibraryBookId } from "@/data/libraryBooks";
import { chapterBodyToReaderParagraphs } from "@/lib/chapterMarkers";
import {
  getImportedChapterWithLegacyFallback,
  listImportedChapterSlugs,
  sortChapterSlugs,
} from "@/lib/importedBookDb";
import { chapterConfigsForImport, readShelfBookById } from "@/lib/importedBookStorage";
import { getPublicDomainSearchResultById } from "@/lib/publicDomainSearch";
import { ImmersiveBookReader } from "@/pages/app/reader/ImmersiveBookReader";
import { ReaderChapterNav } from "@/pages/app/reader/ReaderChapterNav";

function chapterSlugToLabel(chapterSlug: string): string {
  const m = /^chapter-(\d+)$/.exec(chapterSlug);
  if (m) return `Chapter ${m[1]}`;
  return chapterSlug.replace(/-/g, " ");
}

const btnPrimary =
  "inline-flex items-center justify-center rounded-full bg-[#c9a227] px-5 py-2.5 text-sm font-semibold text-[#1a1308] transition-colors hover:from-[#d4ae32] disabled:cursor-not-allowed disabled:opacity-40";

function LibrarySceneFrame(props: { children: ReactNode }) {
  return (
    <div
      className="min-h-[100dvh] w-full px-4 py-10 sm:px-6"
      style={{
        background:
          "radial-gradient(ellipse 100% 70% at 50% 0%, rgba(201,162,39,0.12) 0%, transparent 50%), linear-gradient(165deg, #1a120c 0%, #261a12 100%)",
      }}
    >
      <div className="mx-auto max-w-3xl text-[#e8dcc8]">{props.children}</div>
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
      <LibrarySceneFrame>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#fdf6e9]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Chapter not found
          </h1>
          <p className="mt-3 text-sm text-[#b9a88a]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Missing book or chapter in the URL.
          </p>
          <Link className={`${btnPrimary} mt-8 inline-flex`} to="/app/library">
            Back to Library
          </Link>
        </div>
      </LibrarySceneFrame>
    );
  }

  if (!canResolveBook) {
    return (
      <LibrarySceneFrame>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#fdf6e9]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Book not found
          </h1>
          <p className="mt-3 text-sm text-[#b9a88a]" style={{ fontFamily: "'Inter', sans-serif" }}>
            This title is not in the reader yet. Add it from Discover, upload a .txt from Upload, or import from My Library.
          </p>
          <Link className={`${btnPrimary} mt-8 inline-flex`} to="/app/library">
            Back to Library
          </Link>
        </div>
      </LibrarySceneFrame>
    );
  }

  if (importChapterPending) {
    return (
      <LibrarySceneFrame>
        <nav className="mb-8 flex flex-wrap items-center gap-2 text-xs text-[#9a8470]" style={{ fontFamily: "'Inter', sans-serif" }}>
          <Link to="/app" className="hover:text-[#f0e6d4]">
            Home
          </Link>
          <span aria-hidden>/</span>
          <Link to="/app/library" className="hover:text-[#f0e6d4]">
            Library
          </Link>
          <span aria-hidden>/</span>
          <span className="font-medium text-[#e8dcc8]">{displayTitle}</span>
        </nav>
        <div
          className="rounded-xl border border-[#5c4a2a]/50 p-12 text-center"
          style={{
            background: "linear-gradient(180deg, rgba(42,31,20,0.9) 0%, rgba(26,18,12,0.95) 100%)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
          }}
        >
          <p className="text-sm font-medium text-[#e8dcc8]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Loading chapter text…
          </p>
          <p className="mt-2 text-xs text-[#8a7a66]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Checking for imported text in this browser.
          </p>
        </div>
      </LibrarySceneFrame>
    );
  }

  if (!hasReadableLayer) {
    return (
      <LibrarySceneFrame>
        <nav className="mb-8 flex flex-wrap items-center gap-2 text-xs text-[#9a8470]" style={{ fontFamily: "'Inter', sans-serif" }}>
          <Link to="/app" className="hover:text-[#f0e6d4]">
            Home
          </Link>
          <span aria-hidden>/</span>
          <Link to="/app/library" className="hover:text-[#f0e6d4]">
            Library
          </Link>
          <span aria-hidden>/</span>
          <span className="font-medium text-[#e8dcc8]">{displayTitle}</span>
        </nav>
        <div
          className="rounded-xl border border-[#5c4a2a]/50 p-8 text-center"
          style={{
            background: "linear-gradient(180deg, rgba(42,31,20,0.9) 0%, rgba(26,18,12,0.95) 100%)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
          }}
        >
          <h1 className="text-2xl font-bold text-[#fdf6e9]" style={{ fontFamily: "'Playfair Display', serif" }}>
            {chapterHeading}
          </h1>
          {displayAuthor ? (
            <p className="mt-2 text-sm text-[#c4b49a]" style={{ fontFamily: "'Lora', serif" }}>
              {displayAuthor}
            </p>
          ) : null}
          <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-[#b9a88a]" style={{ fontFamily: "'Inter', sans-serif" }}>
            No text for this chapter yet. If you imported the book, we may still need a chapter slice for this edition;
            curated reader content may also be unavailable for this route.
          </p>
          <div className="mt-8 flex justify-center">
            <ReaderChapterNav bookId={bookId} prevSlug={prevSlug} nextSlug={nextSlug} layout="footer" variant="library" />
          </div>
        </div>
      </LibrarySceneFrame>
    );
  }

  if (!paragraphs || paragraphs.length === 0) {
    return (
      <LibrarySceneFrame>
        <nav className="mb-8 flex flex-wrap items-center gap-2 text-xs text-[#9a8470]" style={{ fontFamily: "'Inter', sans-serif" }}>
          <Link to="/app" className="hover:text-[#f0e6d4]">
            Home
          </Link>
          <span aria-hidden>/</span>
          <Link to="/app/library" className="hover:text-[#f0e6d4]">
            Library
          </Link>
          <span aria-hidden>/</span>
          <span className="font-medium text-[#e8dcc8]">{displayTitle}</span>
        </nav>
        <div
          className="rounded-xl border border-[#5c4a2a]/50 p-8 text-center"
          style={{
            background: "linear-gradient(180deg, rgba(42,31,20,0.9) 0%, rgba(26,18,12,0.95) 100%)",
          }}
        >
          <p className="text-sm text-[#b9a88a]" style={{ fontFamily: "'Inter', sans-serif" }}>
            No reader text is available for this chapter yet.
          </p>
          <div className="mt-8 flex justify-center">
            <ReaderChapterNav bookId={bookId} prevSlug={prevSlug} nextSlug={nextSlug} layout="footer" variant="library" />
          </div>
        </div>
      </LibrarySceneFrame>
    );
  }

  return (
    <ImmersiveBookReader
      bookId={bookId}
      chapterSlug={chapterId}
      bookTitle={displayTitle ?? ""}
      author={displayAuthor}
      chapterHeading={chapterHeading}
      paragraphs={paragraphs}
      prevChapterSlug={prevSlug}
      nextChapterSlug={nextSlug}
    />
  );
}
