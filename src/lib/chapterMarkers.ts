import type { ReaderParagraph } from "@/data/curatedChapters";

/**
 * Returns the substring from the Nth occurrence of startMarker (inclusive) to the first
 * occurrence of endMarker after that (exclusive), with Windows newlines normalized.
 */
export function extractChapterByMarkers(
  rawText: string,
  startMarker: string,
  endMarker: string,
  options?: { startMarkerOccurrenceIndex?: number },
): string {
  const normalized = rawText.replace(/\r\n/g, "\n");
  const which = options?.startMarkerOccurrenceIndex ?? 0;
  let searchFrom = 0;
  let startIdx = -1;
  for (let i = 0; i <= which; i++) {
    const idx = normalized.indexOf(startMarker, searchFrom);
    if (idx === -1) return "";
    startIdx = idx;
    searchFrom = idx + startMarker.length;
  }
  const endIdx = normalized.indexOf(endMarker, startIdx + startMarker.length);
  if (endIdx === -1) return "";
  return normalized.slice(startIdx, endIdx).trim();
}

/** Split chapter body into reader paragraphs (blank-line separated blocks). */
export function chapterBodyToReaderParagraphs(body: string): ReaderParagraph[] {
  const normalized = body.replace(/\r\n/g, "\n").trim();
  if (normalized.length === 0) return [];
  const chunks = normalized
    .split(/\n{2,}/)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
  if (chunks.length === 0) return [{ label: "Narrator", text: normalized }];
  return chunks.map((text) => ({ label: "Narrator", text }));
}
