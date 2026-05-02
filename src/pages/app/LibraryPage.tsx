import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { readerChapterHref } from "@/data/libraryBooks";
import {
  hasAnyImportedBookChapter,
  hasImportedBookFullText,
  readShelfBooksFromStorage,
  USER_FACING_SOURCE_LABEL,
  writeShelfBooksToStorage,
  type ImportedShelfBook,
  type SearchResult,
} from "@/lib/importedBookStorage";
import { importBook } from "@/lib/importBook";
import { searchPublicDomainBooks } from "@/lib/publicDomainSearch";

const panelClass =
  "rounded-2xl border border-[#E0D8CC] bg-white p-6 shadow-sm";

const btnPrimary =
  "inline-flex items-center justify-center rounded-full bg-[#2C2416] px-5 py-2.5 text-sm font-semibold text-[#FAF8F4] transition-colors hover:bg-[#3D3220] disabled:cursor-not-allowed disabled:opacity-50";

const btnSecondary =
  "inline-flex items-center justify-center rounded-full border border-[#E0D8CC] bg-[#FDFBF7] px-5 py-2.5 text-sm font-semibold text-[#1C1A17] transition-colors hover:border-[#C4873A]/40";

export default function LibraryPage() {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchDone, setSearchDone] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [shelfBooks, setShelfBooks] = useState<ImportedShelfBook[]>(() => readShelfBooksFromStorage());
  const [importingByBookId, setImportingByBookId] = useState<Record<string, boolean>>({});
  const [importErrorByBookId, setImportErrorByBookId] = useState<Record<string, string>>({});
  const [importSuccessByBookId, setImportSuccessByBookId] = useState<Record<string, string>>({});
  const importLocksRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    writeShelfBooksToStorage(shelfBooks);
  }, [shelfBooks]);

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;

  function isBookOnShelf(bookId: string): boolean {
    return shelfBooks.some((b) => b.id === bookId);
  }

  async function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setImportErrorByBookId({});
    setImportSuccessByBookId({});
    if (!hasQuery) {
      setSearchResults([]);
      setSearchDone(false);
      return;
    }
    setSearchLoading(true);
    setSearchDone(false);
    try {
      const results = await searchPublicDomainBooks(trimmedQuery);
      setSearchResults(results);
      setSearchDone(true);
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleAddToLibrary(searchResult: SearchResult) {
    if (importLocksRef.current.has(searchResult.id)) return;
    if (isBookOnShelf(searchResult.id)) return;

    importLocksRef.current.add(searchResult.id);
    setImportingByBookId((prev) => ({ ...prev, [searchResult.id]: true }));
    setImportErrorByBookId((prev) => {
      const next = { ...prev };
      delete next[searchResult.id];
      return next;
    });

    try {
      const outcome = await importBook(searchResult);
      if (outcome.ok) {
        setShelfBooks((prev) => {
          if (prev.some((b) => b.id === outcome.shelfBook.id)) return prev;
          return [...prev, outcome.shelfBook];
        });
        setImportSuccessByBookId((prev) => ({
          ...prev,
          [searchResult.id]: `${searchResult.title} has been imported and added to your library.`,
        }));
      } else {
        setImportErrorByBookId((prev) => ({ ...prev, [searchResult.id]: outcome.message }));
      }
    } finally {
      importLocksRef.current.delete(searchResult.id);
      setImportingByBookId((prev) => {
        const next = { ...prev };
        delete next[searchResult.id];
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
          Search and import
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
          Search the starter public-domain catalog. More titles coming soon. Import plain text into this browser, then
          open chapter 1 in the reader.
        </p>
      </div>

      <section className={panelClass}>
        <div className="space-y-6">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Search
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
              This is an early curated public-domain catalog, not a full web search. Try words from the title or author
              (e.g. <span className="font-medium text-[#1C1A17]">emma</span>,{" "}
              <span className="font-medium text-[#1C1A17]">dracula</span>,{" "}
              <span className="font-medium text-[#1C1A17]">moby</span>).
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSearchSubmit}>
            <label className="block">
              <span className="text-xs font-medium text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
                Query
              </span>
              <input
                className="mt-1 w-full rounded-xl border border-[#E0D8CC] bg-white px-4 py-2.5 text-sm text-[#1C1A17] outline-none ring-[#C4873A]/25 transition-shadow focus:ring-2"
                style={{ fontFamily: "'Inter', sans-serif" }}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Pride and Prejudice"
                autoComplete="off"
              />
            </label>

            <div className="flex justify-end gap-3">
              <button className={btnPrimary} type="submit" disabled={!hasQuery || searchLoading}>
                {searchLoading ? "Searching…" : "Search"}
              </button>
            </div>
          </form>

          {searchDone ? (
            <div className="space-y-4 border-t border-[#E8E0D4] pt-6">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
                Results
              </h2>
              {searchResults.length === 0 ? (
                <p className="text-sm text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
                  No match in the starter catalog yet.
                </p>
              ) : (
                <ul className="space-y-8">
                  {searchResults.map((result) => {
                    const onShelf = isBookOnShelf(result.id);
                    const busy = Boolean(importingByBookId[result.id]);
                    return (
                      <li key={result.id} className="space-y-3 border-b border-[#F0EBE3] pb-8 last:border-0 last:pb-0">
                        <p className="text-lg font-semibold text-[#1C1A17]" style={{ fontFamily: "'Playfair Display', serif" }}>
                          {result.title}
                        </p>
                        <p className="text-sm text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
                          {result.author} · {USER_FACING_SOURCE_LABEL}
                        </p>
                        <p className="text-sm leading-relaxed text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
                          {result.description}
                        </p>
                        <div className="flex flex-wrap gap-3">
                          <button
                            className={btnPrimary}
                            type="button"
                            onClick={() => void handleAddToLibrary(result)}
                            disabled={onShelf || busy}
                          >
                            {onShelf ? "Already in my library" : busy ? "Importing…" : "Add to my library"}
                          </button>
                          <Link className={btnSecondary} to={readerChapterHref(result.id, "chapter-1")}>
                            Start reading
                          </Link>
                        </div>
                        {importErrorByBookId[result.id] ? (
                          <p className="text-sm text-[#8B4513]" style={{ fontFamily: "'Inter', sans-serif" }}>
                            {importErrorByBookId[result.id]}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      </section>

      <section className={panelClass}>
        <div className="space-y-6">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
              My shelf
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Imported books are stored locally in this browser for now.
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
            <p className="text-sm text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
              No books on your shelf yet.
            </p>
          ) : (
            <ul className="space-y-6">
              {shelfBooks.map((book) => (
                <li key={book.id} className="space-y-2 border-b border-[#F0EBE3] pb-6 last:border-0 last:pb-0">
                  <p className="font-semibold text-[#1C1A17]" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {book.title}
                  </p>
                  <p className="text-sm text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {book.author} · {USER_FACING_SOURCE_LABEL}
                  </p>
                  {hasImportedBookFullText(book.id) ? (
                    <p className="text-xs text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
                      Full text saved locally for this book.
                    </p>
                  ) : null}
                  {hasAnyImportedBookChapter(book.id) ? (
                    <p className="text-xs text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
                      Imported chapter text is ready for the reader.
                    </p>
                  ) : null}
                  <Link className={`${btnSecondary} mt-2 inline-flex`} to={readerChapterHref(book.id, "chapter-1")}>
                    Open in reader
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
