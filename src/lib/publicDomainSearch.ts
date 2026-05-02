import type { SearchResult } from "@/lib/importedBookStorage";

/**
 * Early curated public-domain starter catalog (local only). `source` / `sourceUrl` are kept for
 * import/proxy; Library UI shows `USER_FACING_SOURCE_LABEL` from `importedBookStorage` instead of `source`.
 */
const PUBLIC_DOMAIN_MOCK_CATALOG: readonly SearchResult[] = [
  {
    id: "moby-dick",
    title: "Moby-Dick; or, The Whale",
    author: "Herman Melville",
    source: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/files/2701/2701-0.txt",
    description:
      "A public domain classic about Captain Ahab’s obsessive hunt for the white whale.",
    chapterImport: {
      chapterSlug: "chapter-1",
      title: "CHAPTER 1. Loomings.",
      startMarker: "CHAPTER 1. Loomings.",
      endMarker: "CHAPTER 2. The Carpet-Bag.",
      startMarkerOccurrenceIndex: 1,
    },
  },
  {
    id: "dracula",
    title: "Dracula",
    author: "Bram Stoker",
    source: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/files/345/345-0.txt",
    description: "Gothic horror: Jonathan Harker, Van Helsing, and the Count in Transylvania and England.",
    chapterImport: {
      chapterSlug: "chapter-1",
      title: "Jonathan Harker’s Journal",
      // Gutenberg #345 (UTF-8): body uses “CHAPTER I” without a period (TOC uses “CHAPTER I.”); curly apostrophe in HARKER’S.
      startMarker: "CHAPTER I\n\nJONATHAN HARKER\u2019S JOURNAL\n\n(_Kept in shorthand._)",
      endMarker: "\n\n\n\n\nCHAPTER II\n\nJONATHAN HARKER\u2019S JOURNAL--_continued_",
    },
  },
  {
    id: "pride-and-prejudice",
    title: "Pride and Prejudice",
    author: "Jane Austen",
    source: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/files/1342/1342-0.txt",
    description: "The courtship and misunderstandings between Elizabeth Bennet and Fitzwilliam Darcy.",
    chapterImport: {
      chapterSlug: "chapter-1",
      title: "Chapter I",
      // George Allen 1894 illustrated edition on Gutenberg #1342: chapter I opens with the famous line; chapter II is preceded by extra blank lines before the heading.
      startMarker:
        "It is a truth universally acknowledged, that a single man in possession\nof a good fortune must be in want of a wife.",
      endMarker: "\n\n\n\n\nCHAPTER II.\n\n\n[Illustration]",
    },
  },
  {
    id: "sherlock-holmes-adventures",
    title: "The Adventures of Sherlock Holmes",
    author: "Arthur Conan Doyle",
    source: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/files/1661/1661-0.txt",
    description: "Twelve short mysteries featuring Sherlock Holmes and Dr. Watson.",
    chapterImport: {
      chapterSlug: "chapter-1",
      title: "A Scandal in Bohemia",
      // #1661: first adventure; TOC uses sentence case; story body uses small caps style headings. Watson’s opening is unique.
      startMarker: "To Sherlock Holmes she is always _the_ woman.",
      endMarker: "II. THE RED-HEADED LEAGUE",
    },
  },
  {
    id: "frankenstein",
    title: "Frankenstein; or, The Modern Prometheus",
    author: "Mary Wollstonecraft Shelley",
    source: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/files/84/84-0.txt",
    description: "Victor Frankenstein’s ambition and the creature he brings to life.",
    chapterImport: {
      chapterSlug: "chapter-1",
      title: "Chapter 1",
      // Gutenberg #84: letters precede Volume I; first numbered chapter uses “Chapter 1” with blank lines (distinct from one-line TOC list).
      startMarker: "\n\nChapter 1\n\n",
      endMarker: "\n\nChapter 2\n\n",
    },
  },
  {
    id: "emma",
    title: "Emma",
    author: "Jane Austen",
    source: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/files/158/158-0.txt",
    description: "Jane Austen’s comedy of manners about matchmaking, self-deception, and growing up.",
    chapterImport: {
      chapterSlug: "chapter-1",
      title: "Chapter I",
      // Gutenberg #158: TOC then body; Volume I Chapter I opens with Emma’s introduction; Chapter II follows.
      startMarker: "VOLUME I\n\n\n\n\nCHAPTER I\n\n\nEmma Woodhouse, handsome, clever, and rich",
      endMarker: "\n\n\n\n\nCHAPTER II\n\n\nMr. Weston was a native of Highbury",
      startMarkerOccurrenceIndex: 0,
    },
  },
  {
    id: "great-expectations",
    title: "Great Expectations",
    author: "Charles Dickens",
    source: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/files/1400/1400-0.txt",
    description: "A coming-of-age novel about Pip, fortune, ambition, love, and class.",
    chapterImport: {
      chapterSlug: "chapter-1",
      title: "Chapter I",
      // Gutenberg #1400 (1867 ed., UTF-8): Contents list uses leading spaces; body “Chapter I.” is followed by Pip’s opening; curly apostrophe in father’s.
      startMarker:
        "Chapter I.\n\n\nMy father\u2019s family name being Pirrip, and my Christian name Philip",
      endMarker:
        "\n\n\n\n\nChapter II.\n\n\nMy sister, Mrs. Joe Gargery, was more than twenty years older than I",
      startMarkerOccurrenceIndex: 0,
    },
  },
];

function haystackFor(result: SearchResult): string {
  return `${result.title} ${result.author} ${result.description}`.toLowerCase();
}

/**
 * Case-insensitive match: every whitespace-separated token in `query` must appear
 * somewhere in the title, author, or description. Only titles in the starter catalog match
 * (e.g. “lord of the flies” returns no rows — copyrighted works are not listed).
 */
export async function searchPublicDomainBooks(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length === 0) return [];

  const tokens = trimmed.split(/\s+/).filter((t) => t.length > 0);
  const matches = PUBLIC_DOMAIN_MOCK_CATALOG.filter((book) => {
    const hay = haystackFor(book);
    return tokens.every((token) => hay.includes(token));
  });

  return Promise.resolve([...matches]);
}

/** Resolve display/import metadata for a book id when it is not on the app catalog shelf shape yet. */
export function getPublicDomainSearchResultById(id: string): SearchResult | undefined {
  return PUBLIC_DOMAIN_MOCK_CATALOG.find((b) => b.id === id);
}
