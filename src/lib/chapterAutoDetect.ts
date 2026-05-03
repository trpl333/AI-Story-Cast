/**
 * Heuristic chapter boundary detection for plain Gutenberg-style text when no
 * curated markers exist (live-search imports).
 */

export type AutoDetectedChapter = {
  chapterSlug: string;
  title: string;
  startIndex: number;
  endIndex: number;
  chapterText: string;
};

type HeadingMatch = {
  startIndex: number;
  /** Index immediately after the heading line (start of body). */
  bodyStartIndex: number;
  title: string;
};

/** Minimum span from this heading start to the next heading start (TOC lines are much tighter). */
const MIN_SPAN_TO_NEXT_HEADING = 900;

/** Minimum characters of body between heading line and next heading (after trim). */
const MIN_BODY_CHARS_BETWEEN = 160;

const HEADING_LINE_PATTERNS: ReadonlyArray<{ pattern: RegExp; titleGroup: number }> = [
  // CHAPTER I / CHAPTER II. / CHAPTER XII
  { pattern: /^\s*(CHAPTER\s+[IVXLC]+)\s*\.?\s*$/gim, titleGroup: 1 },
  { pattern: /^\s*(CHAPTER\s+\d+)\s*\.?\s*$/gim, titleGroup: 1 },
  // Chapter I. / Chapter 2
  { pattern: /^\s*(Chapter\s+[IVXLC]+)\s*\.?\s*$/gim, titleGroup: 1 },
  { pattern: /^\s*(Chapter\s+\d+)\s*\.?\s*$/gim, titleGroup: 1 },
  // A Christmas Carol — staves
  {
    pattern: /^\s*(STAVE\s+(?:ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|[IVXLC]+|\d+))\s*\.?\s*$/gim,
    titleGroup: 1,
  },
];

function normalizeRawText(rawText: string): string {
  return rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function collectHeadingMatches(text: string): HeadingMatch[] {
  const raw: HeadingMatch[] = [];
  for (const { pattern, titleGroup } of HEADING_LINE_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags);
    for (const m of text.matchAll(re)) {
      const title = typeof m[titleGroup] === "string" ? m[titleGroup].trim() : "";
      if (!title) continue;
      const startIndex = m.index ?? 0;
      const bodyStartIndex = startIndex + m[0].length;
      raw.push({ startIndex, bodyStartIndex, title });
    }
  }
  raw.sort((a, b) => a.startIndex - b.startIndex);
  const deduped: HeadingMatch[] = [];
  for (const m of raw) {
    const prev = deduped[deduped.length - 1];
    if (prev && Math.abs(prev.startIndex - m.startIndex) < 4) {
      if (m.title.length > prev.title.length) deduped[deduped.length - 1] = m;
      continue;
    }
    deduped.push(m);
  }
  return deduped;
}

function bodyCharCount(text: string, from: number, to: number): number {
  return text.slice(from, to).replace(/\s+/g, " ").trim().length;
}

/**
 * Filters TOC-style runs: requires substantial distance to the next heading and
 * a minimum amount of non-whitespace body before that next heading.
 */
function filterRealChapterStarts(text: string, matches: HeadingMatch[]): HeadingMatch[] {
  const out: HeadingMatch[] = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const next = matches[i + 1];
    const spanToNext = next ? next.startIndex - m.startIndex : text.length - m.startIndex;
    if (spanToNext < MIN_SPAN_TO_NEXT_HEADING) continue;

    const bodyEnd = next ? next.startIndex : text.length;
    const bodyChars = bodyCharCount(text, m.bodyStartIndex, bodyEnd);
    if (bodyChars < MIN_BODY_CHARS_BETWEEN) continue;

    out.push(m);
  }
  return out;
}

/**
 * Detect up to `maxChapters` chapter slices from Gutenberg-style plain text.
 * Returns [] when no reliable headings are found.
 */
export function autoDetectChaptersFromGutenbergText(
  rawText: string,
  maxChapters: number = 3,
): AutoDetectedChapter[] {
  const text = normalizeRawText(rawText);
  if (text.length < 500) return [];

  const all = collectHeadingMatches(text);
  if (all.length === 0) return [];

  const starts = filterRealChapterStarts(text, all);
  if (starts.length === 0) return [];

  const limit = Math.min(maxChapters, starts.length);
  const result: AutoDetectedChapter[] = [];

  for (let i = 0; i < limit; i++) {
    const start = starts[i].startIndex;
    const end = i + 1 < starts.length ? starts[i + 1].startIndex : text.length;
    const chapterText = text.slice(start, end).trim();
    if (chapterText.length < 80) continue;

    const slug = `chapter-${i + 1}`;
    let title = starts[i].title.replace(/\s+/g, " ").trim();
    if (title.length > 120) title = `${title.slice(0, 117)}…`;

    result.push({
      chapterSlug: slug,
      title,
      startIndex: start,
      endIndex: end,
      chapterText,
    });
  }

  return result;
}
