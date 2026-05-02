import { chapterConfigsForImport, type SearchResult } from "@/lib/importedBookStorage";
import {
  extractGutenbergNumericId,
  fetchLivePublicDomainSearchResults,
  mergeLiveSearchResultsIntoSessionCache,
  readLiveSearchResultById,
} from "@/lib/publicDomainLiveSearch";

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
    chapterImports: [
      {
        chapterSlug: "chapter-1",
        title: "CHAPTER 1. Loomings.",
        startMarker: "CHAPTER 1. Loomings.",
        endMarker: "CHAPTER 2. The Carpet-Bag.",
        startMarkerOccurrenceIndex: 1,
      },
      {
        chapterSlug: "chapter-2",
        title: "CHAPTER 2. The Carpet-Bag.",
        startMarker: "CHAPTER 2. The Carpet-Bag.",
        endMarker: "CHAPTER 3. The Spouter-Inn.",
        startMarkerOccurrenceIndex: 1,
      },
    ],
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
    chapterImports: [
      {
        chapterSlug: "chapter-1",
        title: "Jonathan Harker’s Journal",
        startMarker: "CHAPTER I\n\nJONATHAN HARKER\u2019S JOURNAL\n\n(_Kept in shorthand._)",
        endMarker: "\n\n\n\n\nCHAPTER II\n\nJONATHAN HARKER\u2019S JOURNAL--_continued_",
      },
      {
        chapterSlug: "chapter-2",
        title: "CHAPTER II — Jonathan Harker’s Journal (continued)",
        startMarker: "CHAPTER II\n\nJONATHAN HARKER\u2019S JOURNAL--_continued_",
        endMarker: "\n\n\n\n\nCHAPTER III\n\nJONATHAN HARKER\u2019S JOURNAL--_continued_",
      },
    ],
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
    chapterImports: [
      {
        chapterSlug: "chapter-1",
        title: "Chapter I",
        startMarker:
          "It is a truth universally acknowledged, that a single man in possession\nof a good fortune must be in want of a wife.",
        endMarker: "\n\n\n\n\nCHAPTER II.\n\n\n[Illustration]",
      },
      {
        chapterSlug: "chapter-2",
        title: "Chapter II",
        startMarker: "\n\n\n\n\nCHAPTER II.\n\n\n[Illustration]",
        endMarker: "\n\n\n\n\nCHAPTER III.\n\n\n[Illustration]",
      },
    ],
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
    chapterImports: [
      {
        chapterSlug: "chapter-1",
        title: "A Scandal in Bohemia",
        startMarker: "To Sherlock Holmes she is always _the_ woman.",
        endMarker: "II. THE RED-HEADED LEAGUE",
      },
      {
        chapterSlug: "chapter-2",
        title: "The Red-Headed League",
        startMarker: "II. THE RED-HEADED LEAGUE",
        endMarker: "III. A CASE OF IDENTITY",
      },
    ],
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
    chapterImports: [
      {
        chapterSlug: "chapter-1",
        title: "Chapter 1",
        startMarker: "\n\nChapter 1\n\n",
        endMarker: "\n\nChapter 2\n\n",
      },
      {
        chapterSlug: "chapter-2",
        title: "Chapter 2",
        startMarker: "\n\nChapter 2\n\n",
        endMarker: "\n\nChapter 3\n\n",
      },
    ],
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
    chapterImports: [
      {
        chapterSlug: "chapter-1",
        title: "Chapter I",
        startMarker: "VOLUME I\n\n\n\n\nCHAPTER I\n\n\nEmma Woodhouse, handsome, clever, and rich",
        endMarker: "\n\n\n\n\nCHAPTER II\n\n\nMr. Weston was a native of Highbury",
        startMarkerOccurrenceIndex: 0,
      },
      {
        chapterSlug: "chapter-2",
        title: "Chapter II",
        startMarker: "\n\n\n\n\nCHAPTER II\n\n\nMr. Weston was a native of Highbury",
        endMarker: "\n\n\n\n\nCHAPTER III\n\n\nMr. Woodhouse was fond of society in his own way.",
      },
    ],
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
    chapterImports: [
      {
        chapterSlug: "chapter-1",
        title: "Chapter I",
        startMarker:
          "Chapter I.\n\n\nMy father\u2019s family name being Pirrip, and my Christian name Philip",
        endMarker:
          "\n\n\n\n\nChapter II.\n\n\nMy sister, Mrs. Joe Gargery, was more than twenty years older than I",
        startMarkerOccurrenceIndex: 0,
      },
      {
        chapterSlug: "chapter-2",
        title: "Chapter II",
        startMarker:
          "\n\n\n\n\nChapter II.\n\n\nMy sister, Mrs. Joe Gargery, was more than twenty years older than I",
        endMarker: "\n\n\n\n\nChapter III.\n\n\nIt was a rimy morning, and very damp.",
      },
    ],
  },
];

function haystackFor(result: SearchResult): string {
  const parts = [result.title, result.author, result.description];
  for (const c of chapterConfigsForImport(result)) {
    if (c.title) parts.push(c.title);
  }
  return parts.join(" ").toLowerCase();
}

/**
 * Case-insensitive match: every whitespace-separated token in `query` must appear
 * somewhere in the title, author, or description. Starter catalog matches are always included;
 * when `import.meta.env.VITE_AISTORYCAST_SEARCH_URL` is set, live results from the n8n webhook
 * are appended (deduped by id and by Gutenberg numeric id already covered by the starter list).
 */
export async function searchPublicDomainBooks(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length === 0) return [];

  const tokens = trimmed.split(/\s+/).filter((t) => t.length > 0);
  const starterMatches = PUBLIC_DOMAIN_MOCK_CATALOG.filter((book) => {
    const hay = haystackFor(book);
    return tokens.every((token) => hay.includes(token));
  });

  const merged: SearchResult[] = [...starterMatches];
  const searchUrl = import.meta.env.VITE_AISTORYCAST_SEARCH_URL;
  if (typeof searchUrl === "string" && searchUrl.trim().length > 0) {
    const live = await fetchLivePublicDomainSearchResults(searchUrl.trim(), trimmed);
    mergeLiveSearchResultsIntoSessionCache(live);

    const mockGutenbergIds = new Set(
      PUBLIC_DOMAIN_MOCK_CATALOG.map((b) => extractGutenbergNumericId(b.sourceUrl)).filter(
        (n): n is number => n !== null,
      ),
    );
    const seenIds = new Set(merged.map((m) => m.id));
    for (const row of live) {
      if (seenIds.has(row.id)) continue;
      const gid = extractGutenbergNumericId(row.sourceUrl);
      if (gid !== null && mockGutenbergIds.has(gid)) continue;
      seenIds.add(row.id);
      merged.push(row);
    }
  }

  return merged;
}

/**
 * Resolve display/import metadata for a book id: starter catalog first, then the latest live
 * search rows cached in session (same browser tab/session as Library search).
 */
export function getPublicDomainSearchResultById(id: string): SearchResult | undefined {
  return PUBLIC_DOMAIN_MOCK_CATALOG.find((b) => b.id === id) ?? readLiveSearchResultById(id);
}
