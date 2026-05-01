import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { publicAsset } from "@/lib/publicAsset";
import { ALICE_CHAPTER_1_PATH } from "@/data/curatedChapters";

const STORAGE_KEY = "aistorycast-library-added-catalog";

type CatalogBookId = "pride" | "sherlock" | "frankenstein" | "oz" | "peter";

type CatalogBook = {
  id: CatalogBookId;
  title: string;
  author: string;
  cover: string;
};

const ALICE_BOOK = {
  id: "alice" as const,
  title: "Alice's Adventures in Wonderland",
  author: "Lewis Carroll",
  cover: publicAsset("assets/home/alice-cover.jpg"),
};

const CATALOG_BOOKS: readonly CatalogBook[] = [
  {
    id: "pride",
    title: "Pride and Prejudice",
    author: "Jane Austen",
    cover: publicAsset("assets/home/feat-05-curated.jpg"),
  },
  {
    id: "sherlock",
    title: "The Adventures of Sherlock Holmes",
    author: "Arthur Conan Doyle",
    cover: publicAsset("assets/home/why-different.jpg"),
  },
  {
    id: "frankenstein",
    title: "Frankenstein",
    author: "Mary Shelley",
    cover: publicAsset("assets/home/feat-04-context.jpg"),
  },
  {
    id: "oz",
    title: "The Wonderful Wizard of Oz",
    author: "L. Frank Baum",
    cover: publicAsset("assets/home/feat-02-voices.jpg"),
  },
  {
    id: "peter",
    title: "Peter Pan",
    author: "J. M. Barrie",
    cover: publicAsset("assets/home/feat-01-synced-text.jpg"),
  },
];

function isCatalogBookId(value: unknown): value is CatalogBookId {
  if (typeof value !== "string") return false;
  return CATALOG_BOOKS.some((b) => b.id === value);
}

function loadAddedCatalogIds(): CatalogBookId[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: CatalogBookId[] = [];
    for (const item of parsed) {
      if (isCatalogBookId(item) && !out.includes(item)) out.push(item);
    }
    return out;
  } catch {
    return [];
  }
}

function saveAddedCatalogIds(ids: readonly CatalogBookId[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

function catalogById(id: CatalogBookId): CatalogBook | undefined {
  return CATALOG_BOOKS.find((b) => b.id === id);
}

export default function LibraryPage() {
  const [addedCatalogIds, setAddedCatalogIds] = useState<CatalogBookId[]>(() => loadAddedCatalogIds());

  const addToLibrary = useCallback((id: CatalogBookId) => {
    setAddedCatalogIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      saveAddedCatalogIds(next);
      return next;
    });
  }, []);

  const addedBooks = addedCatalogIds
    .map((id) => catalogById(id))
    .filter((b): b is CatalogBook => b !== undefined);

  const cardShell =
    "group flex flex-col overflow-hidden rounded-2xl border border-[#E0D8CC] bg-white shadow-sm transition-all hover:border-[#C4B89A]";

  return (
    <div className="mx-auto max-w-5xl">
      <h1
        className="text-3xl font-bold text-[#1C1A17] md:text-4xl"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        My Library
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
        Your saved stories live here. Start with Alice, then add more classics as they become available.
      </p>

      <section className="mt-10">
        <h2
          className="text-xs font-semibold uppercase tracking-widest text-[#8B7B6B]"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          My Library
        </h2>
        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to={ALICE_CHAPTER_1_PATH}
            className={`${cardShell} border-[#C4873A]/40 ring-1 ring-[#C4873A]/20`}
          >
            <div className="aspect-[4/3] overflow-hidden bg-[#F5F0E8]">
              <img
                src={ALICE_BOOK.cover}
                alt=""
                className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="flex flex-1 flex-col p-5">
              <span
                className="mb-2 w-fit rounded-full bg-[#C4873A]/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#A66B2E]"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Chapter I ready
              </span>
              <h3 className="text-lg font-bold text-[#1C1A17]" style={{ fontFamily: "'Playfair Display', serif" }}>
                {ALICE_BOOK.title}
              </h3>
              <p className="mt-1 text-sm text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
                {ALICE_BOOK.author}
              </p>
              <span className="mt-4 text-sm font-semibold text-[#C4873A]" style={{ fontFamily: "'Inter', sans-serif" }}>
                Continue reading →
              </span>
            </div>
          </Link>

          {addedBooks.map((book) => (
            <div key={book.id} className={cardShell}>
              <div className="aspect-[4/3] overflow-hidden bg-[#F5F0E8]">
                <img
                  src={book.cover}
                  alt=""
                  className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <span
                  className="mb-2 w-fit rounded-full bg-[#E8E0D4] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#5C5346]"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  In your library
                </span>
                <h3 className="text-lg font-bold text-[#1C1A17]" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {book.title}
                </h3>
                <p className="mt-1 text-sm text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {book.author}
                </p>
                <span className="mt-4 text-sm font-semibold text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Reader coming soon
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2
          className="text-xs font-semibold uppercase tracking-widest text-[#8B7B6B]"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Add a Book
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
          Tap a title to add it to your shelf. Reader links will arrive as each title is wired into the app.
        </p>
        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CATALOG_BOOKS.map((book) => {
            const inLibrary = addedCatalogIds.includes(book.id);
            return (
              <div key={book.id} className={cardShell}>
                <div className="aspect-[4/3] overflow-hidden bg-[#F5F0E8]">
                  <img
                    src={book.cover}
                    alt=""
                    className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-lg font-bold text-[#1C1A17]" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {book.title}
                  </h3>
                  <p className="mt-1 text-sm text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {book.author}
                  </p>
                  <button
                    type="button"
                    disabled={inLibrary}
                    onClick={() => addToLibrary(book.id)}
                    className="mt-4 w-full rounded-xl border border-[#D9CFBC] bg-[#FDFBF7] px-4 py-2.5 text-sm font-semibold text-[#1C1A17] transition-colors hover:border-[#C4873A] hover:bg-[#F5EFE3] disabled:cursor-not-allowed disabled:border-[#E8E0D4] disabled:bg-[#F5F0E8] disabled:text-[#8B7B6B]"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {inLibrary ? "In your library" : "Add to my library"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
