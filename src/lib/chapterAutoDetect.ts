/**
 * Heuristic chapter boundary detection for plain Gutenberg-style text when no
 * curated markers exist (live-search imports).
 */

export type AutoDetectedChapter = {
  chapterSlug: string;
  title: string;
  chapterText: string;
};

type HeadingMatch = {
  startIndex: number;
  /** Index immediately after the heading line (start of body). */
  bodyStartIndex: number;
  title: string;
};

/** Ignore headings before this index (Gutenberg boilerplate / TOC before body). */
function findContentStartAfterGutenbergMarker(text: string): number {
  const marker =
    /(?:^|\r?\n)\s*\*{3}\s*START OF (?:THE PROJECT GUTENBERG EBOOK|THIS PROJECT GUTENBERG EBOOK)[^\n]*\r?\n/i;
  const m = marker.exec(text);
  if (m) return m.index + m[0].length;
  return 0;
}

/** Minimum prose (after heading line) before the next heading or EOF. */
const MIN_CHAPTER_BODY_CHARS = 1500;

/** Minimum distance between consecutive heading *starts* (TOC lines sit closer). */
const MIN_HEADING_START_GAP = 1400;

const HEADING_LINE_PATTERNS: ReadonlyArray<{ pattern: RegExp; titleGroup: number }> = [
  { pattern: /^\s*(CHAPTER\s+[IVXLC]+)\s*\.?\s*$/gim, titleGroup: 1 },
  { pattern: /^\s*(CHAPTER\s+\d+)\s*\.?\s*$/gim, titleGroup: 1 },
  { pattern: /^\s*(Chapter\s+[IVXLC]+)\s*\.?\s*$/gim, titleGroup: 1 },
  { pattern: /^\s*(Chapter\s+\d+)\s*\.?\s*$/gim, titleGroup: 1 },
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
 * Drops TOC-style clusters: needs large body after heading and sufficient gap to next heading start.
 */
function filterRealChapterStarts(text: string, matches: HeadingMatch[]): HeadingMatch[] {
  const out: HeadingMatch[] = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const next = matches[i + 1];

    if (next) {
      const gap = next.startIndex - m.startIndex;
      if (gap < MIN_HEADING_START_GAP) continue;

      const bodyChars = bodyCharCount(text, m.bodyStartIndex, next.startIndex);
      if (bodyChars < MIN_CHAPTER_BODY_CHARS) continue;
    } else {
      const tailBody = bodyCharCount(text, m.bodyStartIndex, text.length);
      if (tailBody < MIN_CHAPTER_BODY_CHARS) continue;
    }

    out.push(m);
  }
  return out;
}

export type AutoDetectChaptersOptions = {
  maxChapters?: number;
  /** For logging: `[chapterAutoDetect] detected N chapters for <bookId>` */
  bookId?: string;
};

const DEFAULT_MAX_CHAPTERS = 5;

/**
 * Detect up to `maxChapters` chapter slices from Gutenberg-style plain text.
 * Prefers headings after the Project Gutenberg START marker; returns [] when none qualify.
 */
export function autoDetectChaptersFromGutenbergText(
  rawText: string,
  options: AutoDetectChaptersOptions | number = {},
): AutoDetectedChapter[] {
  const opts: AutoDetectChaptersOptions = typeof options === "number" ? { maxChapters: options } : options;
  const maxChapters = opts.maxChapters ?? DEFAULT_MAX_CHAPTERS;
  const bookId = opts.bookId ?? "";

  const text = normalizeRawText(rawText);
  if (text.length < 2000) {
    console.debug(`[chapterAutoDetect] detected 0 chapters for ${bookId || "(unknown)"}`);
    return [];
  }

  const contentStart = findContentStartAfterGutenbergMarker(text);
  const all = collectHeadingMatches(text).filter((m) => m.startIndex >= contentStart);
  if (all.length === 0) {
    console.debug(`[chapterAutoDetect] detected 0 chapters for ${bookId || "(unknown)"}`);
    return [];
  }

  const starts = filterRealChapterStarts(text, all);
  if (starts.length === 0) {
    console.debug(`[chapterAutoDetect] detected 0 chapters for ${bookId || "(unknown)"}`);
    return [];
  }

  const limit = Math.min(maxChapters, starts.length);
  const result: AutoDetectedChapter[] = [];

  for (let i = 0; i < limit; i++) {
    const start = starts[i].startIndex;
    const end = i + 1 < starts.length ? starts[i + 1].startIndex : text.length;
    const chapterText = text.slice(start, end).trim();
    if (chapterText.length < 200) continue;

    let title = starts[i].title.replace(/\s+/g, " ").trim();
    if (title.length > 120) title = `${title.slice(0, 117)}…`;

    result.push({
      chapterSlug: `chapter-${result.length + 1}`,
      title,
      chapterText,
    });
  }

  console.debug(`[chapterAutoDetect] detected ${result.length} chapters for ${bookId || "(unknown)"}`);
  return result;
}
