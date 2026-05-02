import { publicAsset } from "@/lib/publicAsset";

export type CatalogBookId = "pride" | "sherlock" | "frankenstein" | "oz" | "peter";
export type LibraryBookId = "alice" | "moby-dick" | CatalogBookId;

/** Chapter row on book detail; `readerEnabled` false = disabled “Coming soon” in MVP. */
export type ChapterListEntry = {
  chapterId: string;
  label: string;
  hasSeed: boolean;
  readerEnabled: boolean;
};

export type LibraryBookDisplay = {
  id: LibraryBookId;
  title: string;
  author: string;
  cover: string;
  description: string;
  chapters: readonly ChapterListEntry[];
};

const PLACEHOLDER_CHAPTERS: readonly ChapterListEntry[] = [
  { chapterId: "chapter-1", label: "Chapter I", hasSeed: false, readerEnabled: false },
  { chapterId: "chapter-2", label: "Chapter II", hasSeed: false, readerEnabled: false },
  { chapterId: "chapter-3", label: "Chapter III", hasSeed: false, readerEnabled: false },
];

export const ALICE_LIBRARY_BOOK: LibraryBookDisplay = {
  id: "alice",
  title: "Alice's Adventures in Wonderland",
  author: "Lewis Carroll",
  cover: publicAsset("assets/home/alice-cover.jpg"),
  description:
    "Follow Alice into a world of curious creatures and dreamlike logic. Chapter I is ready with synced narration; more chapters will appear as we expand the pilot.",
  chapters: [
    {
      chapterId: "chapter-1",
      label: "Chapter I — Down the Rabbit-Hole",
      hasSeed: true,
      readerEnabled: true,
    },
    {
      chapterId: "chapter-2",
      label: "Chapter II — The Pool of Tears",
      hasSeed: false,
      readerEnabled: true,
    },
    {
      chapterId: "chapter-3",
      label: "Chapter III — A Caucus-Race and a Long Tale",
      hasSeed: false,
      readerEnabled: true,
    },
  ],
};

const PRIDE: LibraryBookDisplay = {
  id: "pride",
  title: "Pride and Prejudice",
  author: "Jane Austen",
  cover: publicAsset("assets/home/feat-05-curated.jpg"),
  description:
    "Elizabeth Bennet and Mr. Darcy navigate manners, misunderstanding, and marriage in Regency England. Reader chapters will arrive with the next ingestion milestone.",
  chapters: PLACEHOLDER_CHAPTERS,
};

const SHERLOCK_CHAPTERS: readonly ChapterListEntry[] = [
  {
    chapterId: "chapter-1",
    label: "Chapter I — A Scandal in Bohemia",
    hasSeed: true,
    readerEnabled: true,
  },
  {
    chapterId: "chapter-2",
    label: "Chapter II",
    hasSeed: false,
    readerEnabled: false,
  },
  {
    chapterId: "chapter-3",
    label: "Chapter III",
    hasSeed: false,
    readerEnabled: false,
  },
];

const SHERLOCK: LibraryBookDisplay = {
  id: "sherlock",
  title: "The Adventures of Sherlock Holmes",
  author: "Arthur Conan Doyle",
  cover: publicAsset("assets/home/why-different.jpg"),
  description:
    "Classic detective short stories featuring Holmes and Watson. “A Scandal in Bohemia” opens the collection — Chapter I is ready to read; more cases will follow.",
  chapters: SHERLOCK_CHAPTERS,
};

const MOBY_DICK_CHAPTERS: readonly ChapterListEntry[] = [
  {
    chapterId: "chapter-1",
    label: "Chapter I — Loomings",
    hasSeed: true,
    readerEnabled: true,
  },
  { chapterId: "chapter-2", label: "Chapter II", hasSeed: false, readerEnabled: false },
  { chapterId: "chapter-3", label: "Chapter III", hasSeed: false, readerEnabled: false },
];

const MOBY_DICK: LibraryBookDisplay = {
  id: "moby-dick",
  title: "Moby-Dick; or, The Whale",
  author: "Herman Melville",
  cover: publicAsset("assets/home/feat-04-context.jpg"),
  description:
    "A public domain classic about Captain Ahab’s obsessive hunt for the white whale. Chapter I opens with Ishmael’s famous call to the sea.",
  chapters: MOBY_DICK_CHAPTERS,
};

const FRANKENSTEIN: LibraryBookDisplay = {
  id: "frankenstein",
  title: "Frankenstein",
  author: "Mary Shelley",
  cover: publicAsset("assets/home/feat-04-context.jpg"),
  description:
    "Victor Frankenstein and his creation wrestle with ambition and alienation. Chapters will unlock here as we add Gothic-era narration experiments.",
  chapters: PLACEHOLDER_CHAPTERS,
};

const OZ: LibraryBookDisplay = {
  id: "oz",
  title: "The Wonderful Wizard of Oz",
  author: "L. Frank Baum",
  cover: publicAsset("assets/home/feat-02-voices.jpg"),
  description:
    "Dorothy’s journey down the yellow brick road. A whimsical candidate for multi-voice casting when we extend the library beyond the Alice pilot.",
  chapters: PLACEHOLDER_CHAPTERS,
};

const PETER: LibraryBookDisplay = {
  id: "peter",
  title: "Peter Pan",
  author: "J. M. Barrie",
  cover: publicAsset("assets/home/feat-01-synced-text.jpg"),
  description:
    "Neverland, pirates, and eternal childhood. Placeholder listing until we wire a Peter Pan reading path into the app.",
  chapters: PLACEHOLDER_CHAPTERS,
};

const BOOKS_BY_ID: ReadonlyMap<LibraryBookId, LibraryBookDisplay> = new Map([
  ["alice", ALICE_LIBRARY_BOOK],
  ["moby-dick", MOBY_DICK],
  ["pride", PRIDE],
  ["sherlock", SHERLOCK],
  ["frankenstein", FRANKENSTEIN],
  ["oz", OZ],
  ["peter", PETER],
]);

/** Catalog titles shown on Library “Add a Book” (same order as before). */
export const CATALOG_LIBRARY_BOOKS: readonly LibraryBookDisplay[] = [PRIDE, SHERLOCK, FRANKENSTEIN, OZ, PETER];

export function isLibraryBookId(value: string): value is LibraryBookId {
  return (
    value === "alice" ||
    value === "moby-dick" ||
    value === "pride" ||
    value === "sherlock" ||
    value === "frankenstein" ||
    value === "oz" ||
    value === "peter"
  );
}

export function isCatalogBookId(value: unknown): value is CatalogBookId {
  if (typeof value !== "string") return false;
  return CATALOG_LIBRARY_BOOKS.some((b) => b.id === value);
}

export function getLibraryBook(bookId: string): LibraryBookDisplay | undefined {
  if (!isLibraryBookId(bookId)) return undefined;
  return BOOKS_BY_ID.get(bookId);
}

export function libraryBookPath(bookId: LibraryBookId): string {
  return `/app/books/${bookId}`;
}

/** Reader URL for any book id (catalog or imported public-domain id). */
export function readerChapterHref(bookId: string, chapterId: string): string {
  return `/app/read/${bookId}/${chapterId}`;
}

export function readerChapterPath(bookId: LibraryBookId, chapterId: string): string {
  return readerChapterHref(bookId, chapterId);
}
