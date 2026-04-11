/** `GET /api/demo/alice` — matches `backend/main.py` payload. */

export type DemoAliceBook = {
  title: string;
  author: string;
};

export type DemoAliceChapter = {
  id: string;
  title: string;
  chapterNumberLabel: string;
};

export type DemoAliceVoiceRecommendations = {
  narrator: string;
  alice: string;
  whiteRabbit: string;
};

export type DemoAliceResponse = {
  book: DemoAliceBook;
  chapter: DemoAliceChapter;
  paragraphs: string[];
  voiceRecommendations: DemoAliceVoiceRecommendations;
  evolvingFeaturesNote: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

/** Minimal runtime check so a misconfigured proxy fails loudly instead of crashing the reader. */
export function parseDemoAliceResponse(json: unknown): DemoAliceResponse | null {
  if (!isRecord(json)) return null;
  const book = json.book;
  const chapter = json.chapter;
  const paragraphs = json.paragraphs;
  const voiceRecommendations = json.voiceRecommendations;
  const evolvingFeaturesNote = asString(json.evolvingFeaturesNote);
  if (!isRecord(book) || !isRecord(chapter) || !Array.isArray(paragraphs) || !isRecord(voiceRecommendations) || !evolvingFeaturesNote) {
    return null;
  }
  const title = asString(book.title);
  const author = asString(book.author);
  const id = asString(chapter.id);
  const chTitle = asString(chapter.title);
  const chapterNumberLabel = asString(chapter.chapterNumberLabel);
  if (!title || !author || !id || !chTitle || !chapterNumberLabel) return null;
  const texts = paragraphs.filter((p): p is string => typeof p === "string");
  if (texts.length === 0) return null;
  const narrator = asString(voiceRecommendations.narrator);
  const alice = asString(voiceRecommendations.alice);
  const whiteRabbit = asString(voiceRecommendations.whiteRabbit);
  if (!narrator || !alice || !whiteRabbit) return null;
  return {
    book: { title, author },
    chapter: { id, title: chTitle, chapterNumberLabel },
    paragraphs: texts,
    voiceRecommendations: { narrator, alice, whiteRabbit },
    evolvingFeaturesNote,
  };
}

export async function fetchDemoAlice(baseUrl: string): Promise<DemoAliceResponse> {
  const url = `${baseUrl.replace(/\/$/, "")}/api/demo/alice`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Demo chapter request failed (${res.status})`);
  }
  const json: unknown = await res.json();
  const parsed = parseDemoAliceResponse(json);
  if (!parsed) {
    throw new Error("Unexpected demo chapter response shape");
  }
  return parsed;
}
