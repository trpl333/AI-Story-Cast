/**
 * Tiered chapter boundary detection for plain Gutenberg-style text when no
 * curated `chapterImports` exist (live search, uploads).
 *
 * Strategy (pattern-based only — no book title, author, or Gutenberg-ID checks):
 * 1. Same-line CHAPTER / Chapter + Roman or Arabic numeral
 * 2. CHAPTER / Chapter + subtitle on following line(s)
 * 3. STAVE (A Christmas Carol–style)
 * 4. Standalone Roman numeral line + title line
 * 5. Standalone Arabic 1–99 + title line
 * 6. PART / BOOK / VOLUME: section context only (never standalone chapters); a matching
 *    section line just above a real heading is prepended to that chapter’s title.
 *
 * When no headings qualify, {@link detectChaptersWithMetadata} returns a
 * single "Full text" slice after the Project Gutenberg START marker when present.
 */

export type AutoDetectedChapter = {
  chapterSlug: string;
  title: string;
  chapterText: string;
};

/** Persisted on full-text IDB rows and returned from {@link detectChaptersWithMetadata}. */
export type ChapterDetectionMethod = "curated" | "heuristic" | "fallback-full-text";

export type ChapterDetectionConfidence = "high" | "medium" | "low";

export type ChapterDetectionMeta = {
  detectedChapterCount: number;
  detectionMethod: ChapterDetectionMethod;
  confidence: ChapterDetectionConfidence;
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
  /** Extra guard after a regex match (e.g. validate Roman numeral token). */
  matchOk?: (m: RegExpMatchArray) => boolean;
};

/** Parse MDCLXVI token to a positive integer, or null if not a valid Roman numeral. */
function parseRomanNumeralToken(token: string): number | null {
  const t = token.trim().toUpperCase();
  if (!t || !/^[MDCLXVI]+$/.test(t)) return null;
  let i = 0;
  let total = 0;
  const pairs: readonly (readonly [string, number])[] = [
    ["M", 1000],
    ["CM", 900],
    ["D", 500],
    ["CD", 400],
    ["C", 100],
    ["XC", 90],
    ["L", 50],
    ["XL", 40],
    ["X", 10],
    ["IX", 9],
    ["V", 5],
    ["IV", 4],
    ["I", 1],
  ] as const;
  while (i < t.length) {
    let step = 0;
    for (const [sym, val] of pairs) {
      if (t.startsWith(sym, i)) {
        total += val;
        step = sym.length;
        break;
      }
    }
    if (step === 0) return null;
    i += step;
  }
  if (total < 1 || total > 3999) return null;
  return total;
}

/** Ignore headings before this index (Gutenberg boilerplate / TOC before body). */
export function findContentStartAfterGutenbergMarker(text: string): number {
  const marker =
    /(?:^|\r?\n)\s*\*{3}\s*START OF (?:THE PROJECT GUTENBERG EBOOK|THIS PROJECT GUTENBERG EBOOK)[^\n]*\r?\n/i;
  const m = marker.exec(text);
  if (m) return m.index + m[0].length;
  return 0;
}

/**
 * Body slice for reader fallback: text after the Gutenberg START marker when
 * present, else full normalized text (trimmed).
 */
export function extractDefaultReadableSlice(normalizedText: string): string {
  const start = findContentStartAfterGutenbergMarker(normalizedText);
  const body = normalizedText.slice(start).trim();
  return body.length > 0 ? body : normalizedText.trim();
}

/** Minimum prose (after heading block) before the next heading or EOF. */
const MIN_CHAPTER_BODY_CHARS = 700;

/** Minimum distance between consecutive heading *starts* (TOC lines sit closer). */
const MIN_HEADING_START_GAP = 700;

/**
 * A line that declares a major section (PART / BOOK / VOLUME + ordinal), optionally with
 * an em-dash or hyphen title tail — generic in public-domain texts, not a chapter slug.
 */
const SECTION_HEADING_LINE =
  /^\s*(PART|BOOK|VOLUME)\s+(?:(?:THE\s+)?(?:FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH|ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|ELEVEN|TWELVE|THIRTEEN|FOURTEEN|FIFTEEN|SIXTEEN|SEVENTEEN|EIGHTEEN|NINETEEN|TWENTY|THIRTY|FORTY|[IVXLC]{1,8}|\d{1,3}))(?:\s*[—–\-]{1,3}\s*[^\n]+)?\s*$/i;

/** How far above a chapter heading we scan for a section line (blank lines allowed between). */
const SECTION_CONTEXT_LOOKBACK_CHARS = 1400;

function findSectionContextLineAbove(text: string, chapterHeadingStart: number): string | null {
  const from = Math.max(0, chapterHeadingStart - SECTION_CONTEXT_LOOKBACK_CHARS);
  const chunk = text.slice(from, chapterHeadingStart);
  const lines = chunk.split("\n");
  let i = lines.length - 1;
  while (i >= 0 && lines[i].trim() === "") i--;
  if (i < 0) return null;
  const candidate = lines[i].trim();
  if (candidate.length < 6 || candidate.length > 220) return null;
  if (!SECTION_HEADING_LINE.test(candidate)) return null;
  return candidate.replace(/\s+/g, " ").trim();
}

/** Same-line: CHAPTER I / CHAPTER 1 / Chapter I (generic class). */
const CHAPTER_HEADING_SAME_LINE: readonly HeadingPattern[] = [
  { pattern: /^\s*(CHAPTER\s+[IVXLC]+)\s*\.?\s*$/gim, titleGroup: 1 },
  { pattern: /^\s*(CHAPTER\s+\d+)\s*\.?\s*$/gim, titleGroup: 1 },
  { pattern: /^\s*(Chapter\s+[IVXLC]+)\s*\.?\s*$/gim, titleGroup: 1 },
  { pattern: /^\s*(Chapter\s+\d+)\s*\.?\s*$/gim, titleGroup: 1 },
];

/** CHAPTER / Chapter + subtitle on the following line(s) (generic class). */
const CHAPTER_HEADING_WITH_SUBTITLE: readonly HeadingPattern[] = [
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
];

/** STAVE I / STAVE ONE, etc. (generic class). */
const STAVE_HEADING: readonly HeadingPattern[] = [
  {
    pattern: /^\s*(STAVE\s+(?:ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|[IVXLC]+|\d+))\s*\.?\s*$/gim,
    titleGroup: 1,
  },
];

/** Standalone Roman line + title line (generic class; validated in matchOk). */
const STANDALONE_ROMAN_TITLE_LINE: readonly HeadingPattern[] = [
  {
    pattern:
      /(?:^|\r?\n)\s*([MDCLXVI]{1,8})\s*\r?\n(?:\r?\n){0,2}[ \t]*(\S[^\n]{3,220})\s*\r?\n/gi,
    titleGroup: 1,
    subtitleGroup: 2,
    matchOk: (m) => {
      const roman = typeof m[1] === "string" ? m[1].trim() : "";
      const sub = typeof m[2] === "string" ? m[2].trim() : "";
      if (!roman || !sub) return false;
      const n = parseRomanNumeralToken(roman);
      if (n == null || n > 199) return false;
      if (/^[MDCLXVI]{1,8}$/i.test(sub)) return false;
      return true;
    },
  },
];

/** Standalone Arabic 1–99 + title line (generic class). */
const STANDALONE_ARABIC_TITLE_LINE: readonly HeadingPattern[] = [
  {
    pattern:
      /(?:^|\r?\n)\s*((?:[1-9]\d?))\s*\r?\n(?:\r?\n){0,2}[ \t]*(\S[^\n]{3,220})\s*\r?\n/g,
    titleGroup: 1,
    subtitleGroup: 2,
  },
];

const HEADING_PATTERNS: readonly HeadingPattern[] = [
  ...CHAPTER_HEADING_SAME_LINE,
  ...CHAPTER_HEADING_WITH_SUBTITLE,
  ...STAVE_HEADING,
  ...STANDALONE_ROMAN_TITLE_LINE,
  ...STANDALONE_ARABIC_TITLE_LINE,
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
      if (spec.matchOk && !spec.matchOk(m)) continue;
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

function filterRealChapterStarts(text: string, matches: HeadingMatch[], bookId: string): HeadingMatch[] {
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

const DEFAULT_MAX_CHAPTERS = 50;

function inferHeuristicConfidence(chapterCount: number): ChapterDetectionConfidence {
  if (chapterCount >= 8) return "high";
  if (chapterCount >= 3) return "medium";
  return "low";
}

/**
 * Heuristic-only pass: up to `maxChapters` chapter slices, or [] when none qualify
 * (no fallback slice).
 */
function runHeuristicChapterDetection(
  text: string,
  opts: AutoDetectChaptersOptions,
): { chapters: AutoDetectedChapter[]; patternHitsPreDedupe: number; contentStart: number } {
  const maxChapters = opts.maxChapters ?? DEFAULT_MAX_CHAPTERS;
  const bookId = opts.bookId ?? "";
  const idLabel = bookId || "(unknown)";

  if (text.length < 2000) {
    console.debug(
      `[chapterAutoDetect] ${idLabel}: detectionMethod=heuristic chapterCount=0 reason=text_too_short (len=${text.length})`,
    );
    return { chapters: [], patternHitsPreDedupe: 0, contentStart: findContentStartAfterGutenbergMarker(text) };
  }

  const contentStart = findContentStartAfterGutenbergMarker(text);
  const { deduped: allRaw, patternHitsPreDedupe } = collectHeadingMatches(text);

  console.debug(
    `[chapterAutoDetect] ${idLabel}: total_raw_heading_matches=${patternHitsPreDedupe} after_dedupe=${allRaw.length} contentStart=${contentStart}`,
  );

  const preview = allRaw
    .slice(0, 10)
    .map((m, i) => `[${i}] start=${m.startIndex} title="${m.title.replace(/"/g, "'")}"`);
  console.debug(`[chapterAutoDetect] ${idLabel}: raw_headings_preview (first 10): ${preview.join(" | ")}`);

  const all = allRaw.filter((m) => m.startIndex >= contentStart);
  if (all.length === 0) {
    console.debug(
      `[chapterAutoDetect] ${idLabel}: detectionMethod=heuristic chapterCount=0 reason=no_headings_after_marker (deduped=${allRaw.length}, pattern_hits=${patternHitsPreDedupe})`,
    );
    return { chapters: [], patternHitsPreDedupe, contentStart };
  }

  const starts = filterRealChapterStarts(text, all, idLabel);
  console.debug(
    `[chapterAutoDetect] ${idLabel}: after_real_chapter_filter count=${starts.length} (from ${all.length} post-marker matches)`,
  );

  if (starts.length === 0) {
    console.debug(
      `[chapterAutoDetect] ${idLabel}: detectionMethod=heuristic chapterCount=0 reason=no_headings_passed_filters`,
    );
    return { chapters: [], patternHitsPreDedupe, contentStart };
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
    const sectionLine = findSectionContextLineAbove(text, start);
    if (sectionLine) {
      title = `${sectionLine} — ${title}`.replace(/\s+/g, " ").trim();
    }
    if (title.length > 120) title = `${title.slice(0, 117)}…`;

    result.push({
      chapterSlug: `chapter-${result.length + 1}`,
      title,
      chapterText,
    });
  }

  const confidence = inferHeuristicConfidence(result.length);
  console.debug(
    `[chapterAutoDetect] ${idLabel}: detectionMethod=heuristic chapterCount=${result.length} confidence=${confidence}`,
  );
  return { chapters: result, patternHitsPreDedupe, contentStart };
}

/**
 * Detect chapters plus metadata. When the heuristic finds no qualifying chapters
 * but the text has readable body, returns a single chapter titled "Full text"
 * (slice after the Gutenberg START marker when present).
 */
export function detectChaptersWithMetadata(
  rawText: string,
  options: AutoDetectChaptersOptions | number = {},
): { chapters: AutoDetectedChapter[]; meta: ChapterDetectionMeta } {
  const opts: AutoDetectChaptersOptions = typeof options === "number" ? { maxChapters: options } : options;
  const bookId = opts.bookId ?? "";
  const idLabel = bookId || "(unknown)";

  const text = normalizeRawText(rawText);
  if (text.trim().length === 0) {
    console.debug(`[chapterAutoDetect] ${idLabel}: detectionMethod=fallback-full-text chapterCount=0 reason=empty_text`);
    return {
      chapters: [],
      meta: { detectedChapterCount: 0, detectionMethod: "fallback-full-text", confidence: "low" },
    };
  }

  const { chapters: heuristicChapters } = runHeuristicChapterDetection(text, opts);

  if (heuristicChapters.length > 0) {
    const meta: ChapterDetectionMeta = {
      detectedChapterCount: heuristicChapters.length,
      detectionMethod: "heuristic",
      confidence: inferHeuristicConfidence(heuristicChapters.length),
    };
    return { chapters: heuristicChapters, meta };
  }

  const body = extractDefaultReadableSlice(text);
  if (body.length === 0) {
    console.debug(
      `[chapterAutoDetect] ${idLabel}: detectionMethod=fallback-full-text chapterCount=0 reason=no_readable_body`,
    );
    return {
      chapters: [],
      meta: { detectedChapterCount: 0, detectionMethod: "fallback-full-text", confidence: "low" },
    };
  }

  const meta: ChapterDetectionMeta = {
    detectedChapterCount: 1,
    detectionMethod: "fallback-full-text",
    confidence: "low",
  };
  console.debug(
    `[chapterAutoDetect] ${idLabel}: detectionMethod=fallback-full-text chapterCount=1 bodyLen=${body.length} confidence=low`,
  );
  return {
    chapters: [{ chapterSlug: "chapter-1", title: "Full text", chapterText: body }],
    meta,
  };
}

/**
 * Heuristic-only API (no single-chapter fallback). Prefer
 * {@link detectChaptersWithMetadata} for imports that must always be readable.
 */
export function autoDetectChaptersFromGutenbergText(
  rawText: string,
  options: AutoDetectChaptersOptions | number = {},
): AutoDetectedChapter[] {
  const opts: AutoDetectChaptersOptions = typeof options === "number" ? { maxChapters: options } : options;
  const text = normalizeRawText(rawText);
  return runHeuristicChapterDetection(text, opts).chapters;
}
