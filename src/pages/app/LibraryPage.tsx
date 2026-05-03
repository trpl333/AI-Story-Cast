import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { readerChapterHref } from "@/data/libraryBooks";
import { listImportedChapterSlugs, migrateLegacyImportTextFromLocalStorage } from "@/lib/importedBookDb";
import {
  clearImportedBookStoredText,
  hasAnyImportedBookChapter,
  hasImportedBookFullText,
  readShelfBooksFromStorage,
  UPLOADED_FILE_SOURCE_LABEL,
  USER_FACING_SOURCE_LABEL,
  writeShelfBooksToStorage,
  shelfBookToSearchResult,
  type ImportedShelfBook,
} from "@/lib/importedBookStorage";
import { importBook, IMPORT_SERVICE_NOT_CONNECTED } from "@/lib/importBook";
import { getPublicDomainSearchResultById } from "@/lib/publicDomainSearch";
import { extractGutenbergNumericId } from "@/lib/publicDomainLiveSearch";
import { isUploadedShelfBookId } from "@/lib/uploadLocalBook";

const panelClass =
  "rounded-2xl border border-[#E0D8CC] bg-white p-6 shadow-sm";

const btnPrimary =
  "inline-flex items-center justify-center rounded-full bg-[#2C2416] px-5 py-2.5 text-sm font-semibold text-[#FAF8F4] transition-colors hover:bg-[#3D3220]";

const btnSecondary =
  "inline-flex items-center justify-center rounded-full border border-[#E0D8CC] bg-[#FDFBF7] px-5 py-2.5 text-sm font-semibold text-[#1C1A17] transition-colors hover:border-[#C4873A]/40";

const btnDanger =
  "inline-flex items-center justify-center rounded-full border border-[#E8C4C4] bg-[#FFF8F8] px-5 py-2.5 text-sm font-semibold text-[#8B2E2E] transition-colors hover:border-[#C4873A]/40";

export default function LibraryPage() {
  const [shelfBooks, setShelfBooks] = useState<ImportedShelfBook[]>(() => readShelfBooksFromStorage());
  const [importingByBookId, setImportingByBookId] = useState<Record<string, boolean>>({});
  const [importSuccessByBookId, setImportSuccessByBookId] = useState<Record<string, string>>({});
  const [reimportErrorByBookId, setReimportErrorByBookId] = useState<Record<string, string>>({});
  const importLocksRef = useRef<Set<string>>(new Set());
  const [shelfTextFlags, setShelfTextFlags] = useState<Record<string, { full: boolean; chapter: boolean }>>({});
  const [chapterCountByBookId, setChapterCountByBookId] = useState<Record<string, number>>({});

  useEffect(() => {
    void migrateLegacyImportTextFromLocalStorage();
  }, []);

  useEffect(() => {
    writeShelfBooksToStorage(shelfBooks);
  }, [shelfBooks]);

  const shelfIdsKey = shelfBooks.map((b) => b.id).join("\u0000");

  // eslint-disable-next-line react-hooks/exhaustive-deps -- shelfIdsKey encodes shelf membership
  useEffect(() => {
    if (shelfBooks.length === 0) {
      setShelfTextFlags({});
      setChapterCountByBookId({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const nextFlags: Record<string, { full: boolean; chapter: boolean }> = {};
      const nextCounts: Record<string, number> = {};
      await Promise.all(
        shelfBooks.map(async (b) => {
          const [full, chapter, slugs] = await Promise.all([
            hasImportedBookFullText(b.id),
            hasAnyImportedBookChapter(b.id),
            listImportedChapterSlugs(b.id),
          ]);
          nextFlags[b.id] = { full, chapter };
          nextCounts[b.id] = slugs.length;
        }),
      );
      if (!cancelled) {
        setShelfTextFlags(
          Object.fromEntries(shelfBooks.map((b) => [b.id, nextFlags[b.id]])) as Record<
            string,
            { full: boolean; chapter: boolean }
          >,
        );
        setChapterCountByBookId(Object.fromEntries(shelfBooks.map((b) => [b.id, nextCounts[b.id] ?? 0])));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shelfIdsKey]);

  async function handleRemoveFromShelf(book: ImportedShelfBook) {
    await clearImportedBookStoredText(book.id);
    setShelfTextFlags((prev) => {
      const next = { ...prev };
      delete next[book.id];
      return next;
    });
    setChapterCountByBookId((prev) => {
      const next = { ...prev };
      delete next[book.id];
      return next;
    });
    setShelfBooks((prev) => prev.filter((b) => b.id !== book.id));
    setReimportErrorByBookId((prev) => {
      const next = { ...prev };
      delete next[book.id];
      return next;
    });
    setImportSuccessByBookId((prev) => {
      const next = { ...prev };
      delete next[book.id];
      return next;
    });
  }

  async function handleReimportFromShelf(book: ImportedShelfBook) {
    if (importLocksRef.current.has(book.id)) return;
    const catalog = getPublicDomainSearchResultById(book.id) ?? shelfBookToSearchResult(book);

    importLocksRef.current.add(book.id);
    setImportingByBookId((prev) => ({ ...prev, [book.id]: true }));
    setReimportErrorByBookId((prev) => {
      const next = { ...prev };
      delete next[book.id];
      return next;
    });

    try {
      const outcome = await importBook(catalog);
      if (outcome.ok) {
        setShelfBooks((prev) => {
          const idx = prev.findIndex((b) => b.id === outcome.shelfBook.id);
          if (idx === -1) return [...prev, outcome.shelfBook];
          const next = [...prev];
          next[idx] = outcome.shelfBook;
          return next;
        });
        const [full, chapter, slugs] = await Promise.all([
          hasImportedBookFullText(book.id),
          hasAnyImportedBookChapter(book.id),
          listImportedChapterSlugs(book.id),
        ]);
        setShelfTextFlags((prev) => ({ ...prev, [book.id]: { full, chapter } }));
        setChapterCountByBookId((prev) => ({ ...prev, [book.id]: slugs.length }));
        setImportSuccessByBookId((prev) => ({
          ...prev,
          [book.id]: `${book.title} has been re-imported.`,
        }));
      } else {
        const msg =
          outcome.code === IMPORT_SERVICE_NOT_CONNECTED
            ? "Import service is not connected yet."
            : outcome.message;
        setReimportErrorByBookId((prev) => ({ ...prev, [book.id]: msg }));
      }
    } finally {
      importLocksRef.current.delete(book.id);
      setImportingByBookId((prev) => {
        const next = { ...prev };
        delete next[book.id];
        return next;
      });
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
          Library
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[#1C1A17] md:text-4xl" style={{ fontFamily: "'Playfair Display', serif" }}>
          My Library
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
          Saved titles and text stay in this browser only. Use Discover to add public-domain editions, or Upload when
          file import is available.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/app/discover" className={btnPrimary} style={{ fontFamily: "'Inter', sans-serif" }}>
            Discover books
          </Link>
          <Link to="/app/upload" className={btnSecondary} style={{ fontFamily: "'Inter', sans-serif" }}>
            Upload book
          </Link>
        </div>
      </div>

      <section className={panelClass}>
        <div className="space-y-6">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
              My shelf
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Open the reader, re-import catalog titles when markers change, or remove a title from this device.
            </p>
          </div>

          {Object.keys(importSuccessByBookId).length > 0 ? (
            <ul className="space-y-2">
              {Object.entries(importSuccessByBookId).map(([bookId, msg]) => (
                <li key={bookId} className="text-sm text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {msg}
                </li>
              ))}
            </ul>
          ) : null}

          {shelfBooks.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
                No books on your shelf yet.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/app/discover"
                  className="inline-flex items-center justify-center rounded-full bg-[#2C2416] px-5 py-2.5 text-sm font-semibold text-[#FAF8F4] transition-colors hover:bg-[#3D3220]"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  Discover books
                </Link>
                <Link
                  to="/app/upload"
                  className="inline-flex items-center justify-center rounded-full border border-[#E0D8CC] bg-[#FDFBF7] px-5 py-2.5 text-sm font-semibold text-[#1C1A17] transition-colors hover:border-[#C4873A]/40"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  Upload book
                </Link>
              </div>
            </div>
          ) : (
            <ul className="space-y-6">
              {shelfBooks.map((book) => {
                const flags = shelfTextFlags[book.id];
                const nChapters = chapterCountByBookId[book.id];
                const shelfBusy = Boolean(importingByBookId[book.id]);
                const uploaded = isUploadedShelfBookId(book.id);
                const sourceKind = uploaded
                  ? UPLOADED_FILE_SOURCE_LABEL
                  : extractGutenbergNumericId(book.sourceUrl) !== null
                    ? "Gutenberg"
                    : "Public domain";
                const parts: string[] = [];
                if (!flags) {
                  parts.push("Checking stored text…");
                } else {
                  parts.push(flags.full ? "Full text: saved" : "Full text: not stored");
                  parts.push(flags.chapter ? "Chapter text: saved" : "Chapter text: not ready");
                  if (typeof nChapters === "number" && nChapters > 0) {
                    parts.push(`${nChapters} chapter${nChapters === 1 ? "" : "s"} imported`);
                  }
                }
                const shelfStatus = parts.join(" · ");
                return (
                  <li key={book.id} className="space-y-2 border-b border-[#F0EBE3] pb-6 last:border-0 last:pb-0">
                    <p className="font-semibold text-[#1C1A17]" style={{ fontFamily: "'Playfair Display', serif" }}>
                      {book.title}
                    </p>
                    <p className="text-sm text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
                      <span
                        className={`mr-2 inline-block max-w-[11rem] truncate rounded-full border border-[#E0D8CC] bg-[#FDFBF7] px-2 py-0.5 text-[10px] font-semibold text-[#5C5346] ${uploaded ? "normal-case tracking-normal" : "font-bold uppercase tracking-wide"}`}
                        style={{ fontFamily: "'Inter', sans-serif" }}
                        title={sourceKind}
                      >
                        {sourceKind}
                      </span>
                      {book.author}
                    </p>
                    <p className="text-xs text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {book.source || USER_FACING_SOURCE_LABEL}
                    </p>
                    <p className="text-xs text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {shelfStatus}
                    </p>
                    {reimportErrorByBookId[book.id] ? (
                      <p className="text-sm text-[#8B4513]" style={{ fontFamily: "'Inter', sans-serif" }}>
                        {reimportErrorByBookId[book.id]}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-3">
                      <Link className={btnSecondary} to={readerChapterHref(book.id, "chapter-1")}>
                        Open in reader
                      </Link>
                      {uploaded ? null : (
                        <button
                          className={btnSecondary}
                          type="button"
                          disabled={shelfBusy}
                          onClick={() => void handleReimportFromShelf(book)}
                        >
                          {shelfBusy ? "Re-importing…" : "Re-import"}
                        </button>
                      )}
                      <button
                        className={btnDanger}
                        type="button"
                        disabled={shelfBusy}
                        onClick={() => void handleRemoveFromShelf(book)}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
