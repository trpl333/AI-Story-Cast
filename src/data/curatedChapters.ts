import { publicAsset } from "@/lib/publicAsset";

export type ReaderParagraph = {
  label: string;
  text: string;
};

/** Seeded in-app chapter until a catalog API exists. */
export type ChapterSeed = {
  bookId: string;
  chapterId: string;
  bookTitle: string;
  chapterTitle: string;
  chapterNumberLabel: string;
  paragraphs: ReaderParagraph[];
  /** Resolved URL for bundled sample audio (same clip as public demo for now). */
  audioSrc: string;
};

const ALICE_CHAPTER_1: ChapterSeed = {
  bookId: "alice",
  chapterId: "chapter-1",
  bookTitle: "Alice's Adventures in Wonderland",
  chapterTitle: "Down the Rabbit-Hole",
  chapterNumberLabel: "Chapter I",
  audioSrc: publicAsset("assets/demo/chapter1.mp3"),
  paragraphs: [
    {
      label: "Narrator",
      text: 'Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it. "What is the use of a book," thought Alice, "without pictures or conversations?"',
    },
    {
      label: "Narrator",
      text: "So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid) whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.",
    },
    {
      label: "Narrator",
      text: 'There was nothing so very remarkable in that; nor did Alice think it so very much out of the way to hear the Rabbit say to itself, "Oh dear! Oh dear! I shall be late!" But when the Rabbit actually took a watch out of its waistcoat-pocket and hurried on, Alice started to her feet and ran across the field after it, burning with curiosity.',
    },
  ],
};

const SEED_BY_KEY = new Map<string, ChapterSeed>([["alice/chapter-1", ALICE_CHAPTER_1]]);

export function getSeededChapter(bookId: string, chapterId: string): ChapterSeed | null {
  return SEED_BY_KEY.get(`${bookId}/${chapterId}`) ?? null;
}

/** Canonical URL path for the first seeded reader experience. */
export const ALICE_CHAPTER_1_PATH = "/app/read/alice/chapter-1";
