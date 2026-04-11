export interface Character {
  name: string;
  voicePitch: number;   // 0.1 – 2.0 (Web Speech API)
  voiceRate: number;    // 0.1 – 10
  color: string;        // Tailwind bg class for badge
  description: string;
}

export interface Paragraph {
  id: string;
  text: string;
  speaker?: string;     // character name if dialogue
  isDialogue: boolean;
}

export interface Chapter {
  id: string;
  title: string;
  paragraphs: Paragraph[];
}

export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  coverGradient: string;
  characters: Character[];
  chapters: Chapter[];
}

export interface CompanionMessage {
  id: string;
  role: 'user' | 'companion';
  text: string;
  timestamp: number;
}

export type PlaybackState = 'idle' | 'playing' | 'paused' | 'listening';

export interface ReadingSession {
  bookId: string;
  chapterIndex: number;
  paragraphIndex: number;
  playbackState: PlaybackState;
  rate: number;
}
