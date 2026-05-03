import type { ReaderParagraph } from "@/data/curatedChapters";

/** Build page-sized runs of paragraphs for book spreads (character budget per page). */
export function chunkParagraphsIntoPages(paragraphs: ReaderParagraph[], maxCharsPerPage: number): ReaderParagraph[][] {
  if (paragraphs.length === 0) return [];
  const pages: ReaderParagraph[][] = [];
  let current: ReaderParagraph[] = [];
  let running = 0;

  for (const p of paragraphs) {
    const blockLen = p.text.length + p.label.length + 8;
    if (running + blockLen > maxCharsPerPage && current.length > 0) {
      pages.push(current);
      current = [];
      running = 0;
    }
    current.push(p);
    running += blockLen;
  }
  if (current.length > 0) pages.push(current);
  return pages;
}

export function paragraphsToPlainText(blocks: ReaderParagraph[]): string {
  return blocks.map((b) => (b.label ? `${b.label}: ` : "") + b.text).join("\n\n");
}
