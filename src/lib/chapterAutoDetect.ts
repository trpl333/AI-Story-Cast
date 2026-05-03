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
  /** Index immediately after the heading block (start of body). */
  bodyStartIndex: number;
  title: string;
};

type HeadingPattern = {
  pattern: RegExp;
  titleGroup: number;
  /** Optional second capture (e.g. subtitle on the following line). */
  subtitleGroup?: number;
};

/** Ignore headings before this index (Gutenberg boilerplate / TOC before body). */
function findContentStartAfterGutenbergMarker(text: string): number {
  const marker =
    /(?:^|\r?\n)\s*\*{3}\s*START OF (?:THE PROJECT GUTENBERG EBOOK|THIS PROJECT GUTENBERG EBOOK)[^\n]*\r?\n/i;
  const m = marker.exec(text);
  if (m) return m.index + m[0].length;
  return 0;
}

/** Minimum prose (after heading block) before the next heading or EOF. */
const MIN_CHAPTER_BODY_CHARS = 700;

/** Minimum distance between consecutive heading *starts* (TOC lines sit closer). */
const MIN_HEADING_START_GAP = 700;

const HEADING_PATTERNS: readonly HeadingPattern[] = [
  // Same-line: CHAPTER I / CHAPTER I. / CHAPTER II.
  { pattern: /^\s*(CHAPTER\s+[IVXLC]+)\s*\.?\s*$/gim, titleGroup: 1 },
  { pattern: /^\s*(CHAPTER\s+\d+)\s*\.?\s*$/gim, titleGroup: 1 },
  { pattern: /^\s*(Chapter\s+[IVXLC]+)\s*\.?\s*$/gim, titleGroup: 1 },
  { pattern: /^\s*(Chapter\s+\d+)\s*\.?\s*$/gim, titleGroup: 1 },
  // CHAPTER I + subtitle on next line(s), e.g. Scarlet Pimpernel "THE FISHERMAN'S COTTAGE"
  {
    pattern:
      /^\s*(CHAPTER\s+[IVXLC]+)\s*\.?\s*(?:\r?\n){1,3}(?!\s*CHAPTER\s)([^\n]{2,200})\s*\r?\n/gim,
    titleGroup: 1,
    subtitleGroup: 2,
  },
  {
    pattern:
      /^\s*(Chapter\s+[IVXLC]+)\s*\.?\s*(?:\r?\n){1,3}(?!\s*Chapter\s)([^\n]{2,200})\s*\r?\n/gim,
    titleGroup: 1,
    subtitleGroup: 2,
  },
  {
    pattern: /^\s*(STAVE\s+(?:ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|[IVXLC]+|\d+))\s*\.?\s*$/gim,
    titleGroup: 1,
  },
];

function normalizeRawText(rawText: string): string {
  return rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function buildTitleFromMatch(m: RegExpMatchArray, spec: HeadingPattern): string {
  const main = typeof m[spec.titleGroup] === "string" ? m[spec.titleGroup].trim() : "";
  if (spec.subtitleGroup != null) {
    const sub = typeof m[spec.subtitleGroup] === "string" ? m[spec.subtitleGroup].trim() : "";
    if (sub) return `${main} · ${sub}`.replace(/\s+/g, " ").trim();
  }
  return main;
}

function collectHeadingMatches(text: string): { deduped: HeadingMatch[]; patternHitsPreDedupe: number } {
  const raw: HeadingMatch[] = [];
  for (const spec of HEADING_PATTERNS) {
    const re = new RegExp(spec.pattern.source, spec.pattern.flags);
    for (const m of text.matchAll(re)) {
      const title = buildTitleFromMatch(m, spec);
      if (!title) continue;
      const startIndex = m.index ?? 0;
      const bodyStartIndex = startIndex + m[0].length;
      raw.push({ startIndex, bodyStartIndex, title });
    }
  }
  const patternHitsPreDedupe = raw.length;
  raw.sort((a, b) => a.startIndex - b.startIndex);
  const deduped: HeadingMatch[] = [];
  for (const m of raw) {
    const prev = deduped[deduped.length - 1];
    if (prev && Math.abs(prev.startIndex - m.startIndex) < 4) {
      if (m.bodyStartIndex >= prev.bodyStartIndex) deduped[deduped.length - 1] = m;
      else if (m.title.length > prev.title.length) deduped[deduped.length - 1] = m;
      continue;
    }
    deduped.push(m);
  }
  return { deduped, patternHitsPreDedupe };
}

function bodyCharCount(text: string, from: number, to: number): number {
  return text.slice(from, to).replace(/\s+/g, " ").trim().length;
}

const REJECTION_LOG_CAP = 14;

function filterRealChapterStarts(
  text: string,
  matches: HeadingMatch[],
  bookId: string,
): HeadingMatch[] {
  const out: HeadingMatch[] = [];
  let rejectLogged = 0;

  const logReject = (msg: string) => {
    if (rejectLogged >= REJECTION_LOG_CAP) return;
    console.debug(`[chapterAutoDetect] reject ${bookId || "(unknown)"}: ${msg}`);
    rejectLogged++;
  };

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const next = matches[i + 1];
    const titleShort = m.title.length > 48 ? `${m.title.slice(0, 45)}…` : m.title;

    if (next) {
      const gap = next.startIndex - m.startIndex;
      if (gap < MIN_HEADING_START_GAP) {
        logReject(
          `idx=${i} start=${m.startIndex} title="${titleShort}" → gap_too_small (gap=${gap}, need>=${MIN_HEADING_START_GAP})`,
        );
        continue;
      }

      const bodyChars = bodyCharCount(text, m.bodyStartIndex, next.startIndex);
      if (bodyChars < MIN_CHAPTER_BODY_CHARS) {
        logReject(
          `idx=${i} start=${m.startIndex} title="${titleShort}" → body_too_short (bodyChars=${bodyChars}, need>=${MIN_CHAPTER_BODY_CHARS})`,
        );
        continue;
      }
    } else {
      const tailBody = bodyCharCount(text, m.bodyStartIndex, text.length);
      if (tailBody < MIN_CHAPTER_BODY_CHARS) {
        logReject(
          `idx=${i} start=${m.startIndex} title="${titleShort}" → tail_body_too_short (bodyChars=${tailBody}, need>=${MIN_CHAPTER_BODY_CHARS})`,
        );
        continue;
      }
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
  const idLabel = bookId || "(unknown)";

  const text = normalizeRawText(rawText);
  if (text.length < 2000) {
    console.debug(
      `[chapterAutoDetect] ${idLabel}: text_too_short (len=${text.length}), detected 0 chapters`,
    );
    return [];
  }

  const contentStart = findContentStartAfterGutenbergMarker(text);
  const { deduped: allRaw, patternHitsPreDedupe } = collectHeadingMatches(text);

  console.debug(
    `[chapterAutoDetect] ${idLabel}: total_raw_heading_matches=${patternHitsPreDedupe} after_dedupe=${allRaw.length} contentStart=${contentStart}`,
  );

  const preview = allRaw.slice(0, 10).map((m, i) => `[${i}] start=${m.startIndex} title="${m.title.replace(/"/g, "'")}"`);
  console.debug(`[chapterAutoDetect] ${idLabel}: raw_headings_preview (first 10): ${preview.join(" | ")}`);

  const all = allRaw.filter((m) => m.startIndex >= contentStart);
  if (all.length === 0) {
    console.debug(
      `[chapterAutoDetect] ${idLabel}: no_headings_after_gutenberg_marker (post_marker=0, deduped=${allRaw.length}, pattern_hits_pre_dedupe=${patternHitsPreDedupe}), detected 0 chapters`,
    );
    return [];
  }

  const starts = filterRealChapterStarts(text, all, idLabel);
  console.debug(
    `[chapterAutoDetect] ${idLabel}: after_real_chapter_filter count=${starts.length} (from ${all.length} post-marker matches)`,
  );

  if (starts.length === 0) {
    console.debug(`[chapterAutoDetect] detected 0 chapters for ${idLabel}`);
    return [];
  }

  const limit = Math.min(maxChapters, starts.length);
  const result: AutoDetectedChapter[] = [];

  for (let i = 0; i < limit; i++) {
    const start = starts[i].startIndex;
    const end = i + 1 < starts.length ? starts[i + 1].startIndex : text.length;
    const chapterText = text.slice(start, end).trim();
    if (chapterText.length < 200) {
      console.debug(
        `[chapterAutoDetect] ${idLabel}: skip_slice idx=${i} chapterText_len=${chapterText.length} (min 200)`,
      );
      continue;
    }

    let title = starts[i].title.replace(/\s+/g, " ").trim();
    if (title.length > 120) title = `${title.slice(0, 117)}…`;

    result.push({
      chapterSlug: `chapter-${result.length + 1}`,
      title,
      chapterText,
    });
  }

  console.debug(`[chapterAutoDetect] detected ${result.length} chapters for ${idLabel}`);
  return result;
}
