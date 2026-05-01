import { publicAsset } from "@/lib/publicAsset";

export type ReaderParagraph = {
  label: string;
  text: string;
};

export type StoryRole = {
  id: string;
  displayName: string;
  roleType: "narrator" | "character";
  voiceId?: string;
  voiceDescription?: string;
};

export type StorySegment = {
  id: string;
  roleId: string;
  text: string;
  paragraphIndex: number;
  startSec?: number;
  endSec?: number;
};

/** Seeded in-app chapter until a catalog API exists. */
export type ChapterSeed = {
  bookId: string;
  chapterId: string;
  bookTitle: string;
  author: string;
  chapterTitle: string;
  chapterNumberLabel: string;
  paragraphs: ReaderParagraph[];
  /** Resolved URL for bundled sample audio (same clip as public demo for now). */
  audioSrc: string;
  /** When set, reader shows this near the audio controls (e.g. placeholder clip notice). */
  audioNote?: string;
  /** Cast / voice lanes for storytelling (narrator + characters). */
  roles?: StoryRole[];
  /** Text spans tied to roles and paragraph indices; optional time range for audio sync. */
  segments?: StorySegment[];
};

const ALICE_CHAPTER_1_PARAGRAPHS: ReaderParagraph[] = [
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
];

const ALICE_CHAPTER_1_ROLES: StoryRole[] = [
  {
    id: "alice-narrator",
    displayName: "Narrator",
    roleType: "narrator",
    voiceDescription: "Warm, clear storybook narrator",
  },
  {
    id: "alice-alice",
    displayName: "Alice",
    roleType: "character",
    voiceDescription: "Curious young girl, bright and expressive",
  },
  {
    id: "alice-white-rabbit",
    displayName: "White Rabbit",
    roleType: "character",
    voiceDescription: "Quick, anxious, fussy character voice",
  },
];

const ALICE_CHAPTER_1_SEGMENTS: StorySegment[] = ALICE_CHAPTER_1_PARAGRAPHS.map((p, i) => ({
  id: `alice-ch1-seg-${i}`,
  roleId: "alice-narrator",
  text: p.text,
  paragraphIndex: i,
}));

const ALICE_CHAPTER_1: ChapterSeed = {
  bookId: "alice",
  chapterId: "chapter-1",
  bookTitle: "Alice's Adventures in Wonderland",
  author: "Lewis Carroll",
  chapterTitle: "Down the Rabbit-Hole",
  chapterNumberLabel: "Chapter I",
  audioSrc: publicAsset("assets/demo/chapter1.mp3"),
  paragraphs: ALICE_CHAPTER_1_PARAGRAPHS,
  roles: ALICE_CHAPTER_1_ROLES,
  segments: ALICE_CHAPTER_1_SEGMENTS,
};

const SHERLOCK_CHAPTER_1_PARAGRAPHS: ReaderParagraph[] = [
  {
    label: "Watson",
    text: "To Sherlock Holmes she is always the woman. I have seldom heard him mention her under any other name. In his eyes she eclipses and predominates the whole of her sex. It was not that he felt any emotion akin to love for Irene Adler.",
  },
  {
    label: "Watson",
    text: "All emotions, and that one particularly, were abhorrent to his cold, precise but admirably balanced mind. He was, I take it, the most perfect reasoning and observing machine that the world has seen, but as a lover he would have placed himself in a false position.",
  },
  {
    label: "Watson",
    text: "He never spoke of the softer passions, save with a gibe and a sneer. They were admirable things for the observer—excellent for drawing the veil from men's motives and actions. But for the trained reasoner to admit such intrusions into his own delicate and finely adjusted temperament was to introduce a distracting factor which might throw a doubt upon all his mental results.",
  },
];

const SHERLOCK_CHAPTER_1_ROLES: StoryRole[] = [
  {
    id: "sherlock-watson",
    displayName: "Dr. Watson",
    roleType: "narrator",
    voiceDescription: "Calm Victorian narrator, observant and grounded",
  },
  {
    id: "sherlock-holmes",
    displayName: "Sherlock Holmes",
    roleType: "character",
    voiceDescription: "Precise, cool, analytical male voice",
  },
  {
    id: "sherlock-irene-adler",
    displayName: "Irene Adler",
    roleType: "character",
    voiceDescription: "Confident, intelligent, elegant female voice",
  },
];

const SHERLOCK_CHAPTER_1_SEGMENTS: StorySegment[] = SHERLOCK_CHAPTER_1_PARAGRAPHS.map((p, i) => ({
  id: `sherlock-ch1-seg-${i}`,
  roleId: "sherlock-watson",
  text: p.text,
  paragraphIndex: i,
}));

/** Opening of “A Scandal in Bohemia” (public domain); abridged for the in-app seed. */
const SHERLOCK_CHAPTER_1: ChapterSeed = {
  bookId: "sherlock",
  chapterId: "chapter-1",
  bookTitle: "The Adventures of Sherlock Holmes",
  author: "Arthur Conan Doyle",
  chapterTitle: "A Scandal in Bohemia",
  chapterNumberLabel: "Chapter I",
  audioSrc: publicAsset("assets/demo/chapter1.mp3"),
  audioNote: "Sample audio is from the bundled Alice pilot clip — Sherlock-specific narration is not wired yet.",
  paragraphs: SHERLOCK_CHAPTER_1_PARAGRAPHS,
  roles: SHERLOCK_CHAPTER_1_ROLES,
  segments: SHERLOCK_CHAPTER_1_SEGMENTS,
};

const SEED_BY_KEY = new Map<string, ChapterSeed>([
  ["alice/chapter-1", ALICE_CHAPTER_1],
  ["sherlock/chapter-1", SHERLOCK_CHAPTER_1],
]);

export function getSeededChapter(bookId: string, chapterId: string): ChapterSeed | null {
  return SEED_BY_KEY.get(`${bookId}/${chapterId}`) ?? null;
}

/** Canonical URL path for the first seeded reader experience. */
export const ALICE_CHAPTER_1_PATH = "/app/read/alice/chapter-1";
