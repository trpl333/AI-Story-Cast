import { useEffect, useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { readerChapterHref } from "@/data/libraryBooks";
import {
  readShelfBooksFromStorage,
  writeShelfBooksToStorage,
  type ImportedShelfBook,
  type SearchResult,
} from "@/lib/importedBookStorage";
import {
  discoverPlainTextLikely,
  discoverSourceBadgeFor,
  filterImportableDiscoverResults,
} from "@/lib/discoverImportability";
import { importBook, IMPORT_SERVICE_NOT_CONNECTED } from "@/lib/importBook";
import { searchPublicDomainBooks } from "@/lib/publicDomainSearch";
import { extractGutenbergNumericId } from "@/lib/publicDomainLiveSearch";

const panelClass =
  "rounded-2xl border border-[#E0D8CC] bg-white p-6 shadow-sm";

const btnPrimary =
  "inline-flex items-center justify-center rounded-full bg-[#2C2416] px-5 py-2.5 text-sm font-semibold text-[#FAF8F4] transition-colors hover:bg-[#3D3220] disabled:cursor-not-allowed disabled:opacity-50";

const btnSecondary =
  "inline-flex items-center justify-center rounded-full border border-[#E0D8CC] bg-[#FDFBF7] px-5 py-2.5 text-sm font-semibold text-[#1C1A17] transition-colors hover:border-[#C4873A]/40";

const badgeGutenberg =
  "inline-flex items-center rounded-full border border-[#C4873A]/35 bg-[#FDF6EC] px-2.5 py-0.5 text-xs font-semibold text-[#8B5A2B]";
const badgePublic =
  "inline-flex items-center rounded-full border border-[#E0D8CC] bg-[#F5F2EC] px-2.5 py-0.5 text-xs font-semibold text-[#5C5346]";

function sourceEditionLine(sourceUrl: string): string {
  try {
    const u = new URL(sourceUrl);
    const path = u.pathname.length > 120 ? `${u.pathname.slice(0, 120)}…` : u.pathname;
    return `${u.hostname}${path}`;
  } catch {
    return sourceUrl;
  }
}

function filenamePathHint(sourceUrl: string): string {
  try {
    const u = new URL(sourceUrl);
    const parts = u.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1] ?? u.pathname;
    return last.length > 0 ? last : u.pathname;
  } catch {
    return sourceUrl;
  }
}

export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchDone, setSearchDone] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [shelfBooks, setShelfBooks] = useState<ImportedShelfBook[]>(() => readShelfBooksFromStorage());
  const [importingByBookId, setImportingByBookId] = useState<Record<string, boolean>>({});
  const [importErrorByBookId, setImportErrorByBookId] = useState<Record<string, string>>({});
  const [importSuccessByBookId, setImportSuccessByBookId] = useState<Record<string, string>>({});
  const [expandedPreviewId, setExpandedPreviewId] = useState<string | null>(null);
  const importLocksRef = useRef<Set<string>>(new Set());

  const displayResults = useMemo(() => filterImportableDiscoverResults(searchResults), [searchResults]);
  const hiddenEditionCount = searchResults.length - displayResults.length;

  useEffect(() => {
    writeShelfBooksToStorage(shelfBooks);
  }, [shelfBooks]);

  function isBookOnShelf(bookId: string): boolean {
    return shelfBooks.some((b) => b.id === bookId);
  }

  async function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setImportErrorByBookId({});
    setImportSuccessByBookId({});
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setSearchResults([]);
      setSearchDone(false);
      return;
    }
    setSearchLoading(true);
    setSearchDone(false);
    setExpandedPreviewId(null);
    try {
      const results = await searchPublicDomainBooks(trimmed);
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
          [searchResult.id]: `${searchResult.title} is now in My Library.`,
        }));
      } else {
        const msg =
          outcome.code === IMPORT_SERVICE_NOT_CONNECTED
            ? "Import service is not connected yet."
            : outcome.message;
        setImportErrorByBookId((prev) => ({ ...prev, [searchResult.id]: msg }));
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

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
          Discover
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[#1C1A17] md:text-4xl" style={{ fontFamily: "'Playfair Display', serif" }}>
          Discover books
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
          Search like a bookstore chooser: each card is one catalog edition (URL). Compare sources, preview metadata,
          then add to{" "}
          <Link to="/app/library" className="font-medium text-[#C4873A] underline-offset-2 hover:underline">
            My Library
          </Link>
          . Non-book file links (e.g. README) are hidden here.
        </p>
      </div>

      <section className={panelClass}>
        <form className="space-y-4" onSubmit={handleSearchSubmit}>
          <label className="block">
            <span className="text-xs font-medium text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Search
            </span>
            <input
              className="mt-1 w-full rounded-xl border border-[#E0D8CC] bg-white px-4 py-2.5 text-sm text-[#1C1A17] outline-none ring-[#C4873A]/25 transition-shadow focus:ring-2"
              style={{ fontFamily: "'Inter', sans-serif" }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Title or author — e.g. scarlet pimpernel"
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
          <div className="mt-8 space-y-6 border-t border-[#E8E0D4] pt-8">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Results
            </h2>
            {hiddenEditionCount > 0 ? (
              <p className="text-xs text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
                {hiddenEditionCount} edition{hiddenEditionCount === 1 ? "" : "s"} hidden (README or non-text artifact
                URL).
              </p>
            ) : null}
            {displayResults.length === 0 ? (
              <p className="text-sm text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
                No importable matches in the starter catalog or live search yet.
              </p>
            ) : (
              <ul className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
                {displayResults.map((result) => {
                  const onShelf = isBookOnShelf(result.id);
                  const busy = Boolean(importingByBookId[result.id]);
                  const gid = extractGutenbergNumericId(result.sourceUrl);
                  const badge = discoverSourceBadgeFor(result);
                  const previewOpen = expandedPreviewId === result.id;
                  const plainOk = discoverPlainTextLikely(result.sourceUrl);
                  return (
                    <li
                      key={result.id}
                      className="flex flex-col rounded-xl border border-l-4 border-[#F0EBE3] border-l-[#C4873A] bg-[#FDFBF7] p-5 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-lg font-semibold text-[#1C1A17]" style={{ fontFamily: "'Playfair Display', serif" }}>
                          {result.title}
                        </p>
                        <span className={badge === "Gutenberg" ? badgeGutenberg : badgePublic}>
                          {badge === "Gutenberg" ? "Gutenberg" : "Public domain"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
                        {result.author}
                      </p>
                      <p className="mt-2 font-mono text-[10px] leading-snug text-[#6B6355]" title={result.sourceUrl}>
                        Edition <span className="text-[#1C1A17]">{result.id}</span>
                        {gid !== null ? (
                          <>
                            {" "}
                            · Gutenberg #{gid} · file <span className="break-all">{filenamePathHint(result.sourceUrl)}</span>
                          </>
                        ) : (
                          <>
                            {" "}
                            · file <span className="break-all">{filenamePathHint(result.sourceUrl)}</span>
                          </>
                        )}
                      </p>
                      <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
                        {result.description}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={btnSecondary}
                          onClick={() => setExpandedPreviewId((id) => (id === result.id ? null : result.id))}
                        >
                          {previewOpen ? "Hide preview" : "Preview"}
                        </button>
                        <button
                          type="button"
                          className={btnPrimary}
                          onClick={() => void handleAddToLibrary(result)}
                          disabled={onShelf || busy}
                        >
                          {onShelf ? "In My Library" : busy ? "Importing…" : "Add to My Library"}
                        </button>
                        {onShelf ? (
                          <Link className={btnSecondary} to={readerChapterHref(result.id, "chapter-1")}>
                            Start Reading
                          </Link>
                        ) : null}
                      </div>

                      {previewOpen ? (
                        <div className="mt-4 rounded-lg border border-[#E0D8CC] bg-white p-4 text-sm text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
                          <p className="text-xs font-semibold uppercase tracking-wide text-[#8B7B6B]">Source</p>
                          <p className="mt-1 font-mono text-xs text-[#6B6355] break-all">{sourceEditionLine(result.sourceUrl)}</p>
                          <p className="mt-3 text-xs">
                            <span className="font-semibold text-[#1C1A17]">Gutenberg ID:</span>{" "}
                            {gid !== null ? <span className="font-mono">{gid}</span> : <span className="text-[#8B7B6B]">—</span>}
                          </p>
                          <p className="mt-2 text-xs">
                            <span className="font-semibold text-[#1C1A17]">Plain text URL:</span>{" "}
                            {plainOk ? (
                              <span className="text-[#5C7A5C]">Yes (likely .txt / UTF-8 text)</span>
                            ) : (
                              <span className="text-[#8B4513]">Uncertain — import may still work</span>
                            )}
                          </p>
                          <p className="mt-3 text-xs leading-relaxed text-[#5C5346]">
                            Chapter detection happens after import and may vary by edition. Full text is not downloaded
                            for this preview.
                          </p>
                        </div>
                      ) : null}

                      {importErrorByBookId[result.id] ? (
                        <p className="mt-3 text-sm text-[#8B4513]" style={{ fontFamily: "'Inter', sans-serif" }}>
                          {importErrorByBookId[result.id]}
                        </p>
                      ) : null}
                      {importSuccessByBookId[result.id] ? (
                        <p className="mt-3 text-sm text-[#5C7A5C]" style={{ fontFamily: "'Inter', sans-serif" }}>
                          {importSuccessByBookId[result.id]}{" "}
                          <Link to="/app/library" className="font-medium text-[#C4873A] underline-offset-2 hover:underline">
                            Open library
                          </Link>
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
