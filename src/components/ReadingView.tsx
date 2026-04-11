import { useState, useCallback, useEffect, useRef } from 'react';
import type { Book, PlaybackState } from '../types';
import { BookReader } from './BookReader';
import { PlaybackControls } from './PlaybackControls';
import { CompanionPanel } from './CompanionPanel';
import { CharacterRoster } from './CharacterRoster';
import { useSpeech } from '../hooks/useSpeech';

interface Props {
  book: Book;
  onClose: () => void;
}

export function ReadingView({ book, onClose }: Props) {
  const [chapterIdx, setChapterIdx] = useState(0);
  const [paraIdx, setParaIdx] = useState(0);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [rate, setRate] = useState(1);
  const [activeCharacter, setActiveCharacter] = useState<string | undefined>();
  const [showCompanion, setShowCompanion] = useState(true);
  const { speak, pause, resume, cancel } = useSpeech();
  const rateRef = useRef(rate);
  const paraIdxRef = useRef(paraIdx);
  const chapterIdxRef = useRef(chapterIdx);

  useEffect(() => { rateRef.current = rate; }, [rate]);
  useEffect(() => { paraIdxRef.current = paraIdx; }, [paraIdx]);
  useEffect(() => { chapterIdxRef.current = chapterIdx; }, [chapterIdx]);

  const chapter = book.chapters[chapterIdx];
  const paragraphs = chapter.paragraphs;
  const currentParagraph = paragraphs[paraIdx];

  // Scroll active paragraph into view
  useEffect(() => {
    if (currentParagraph) {
      const el = document.getElementById(`para-${currentParagraph.id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentParagraph]);

  const getCharacter = useCallback(
    (name: string | undefined) => {
      return book.characters.find((c) => c.name === name) ?? book.characters[0];
    },
    [book.characters],
  );

  // Use a ref so the callback can call itself without a circular declaration
  const speakParagraphRef = useRef<(pIdx: number, cIdx: number) => void>(() => {});

  const speakParagraph = useCallback(
    (pIdx: number, cIdx: number) => {
      const ch = book.chapters[cIdx];
      if (!ch) { setPlaybackState('idle'); return; }
      const para = ch.paragraphs[pIdx];
      if (!para) { setPlaybackState('idle'); setActiveCharacter(undefined); return; }

      const character = getCharacter(para.speaker);
      setActiveCharacter(character.name);

      // Adjust rate on the character object
      const charWithRate = { ...character, voiceRate: character.voiceRate * rateRef.current };

      speak(para.text, charWithRate, () => {
        // On end, advance to next paragraph
        const nextPIdx = paraIdxRef.current + 1;
        if (nextPIdx < book.chapters[chapterIdxRef.current].paragraphs.length) {
          setParaIdx(nextPIdx);
          paraIdxRef.current = nextPIdx;
          speakParagraphRef.current(nextPIdx, chapterIdxRef.current);
        } else {
          // Try next chapter
          const nextCIdx = chapterIdxRef.current + 1;
          if (nextCIdx < book.chapters.length) {
            setChapterIdx(nextCIdx);
            setParaIdx(0);
            chapterIdxRef.current = nextCIdx;
            paraIdxRef.current = 0;
            speakParagraphRef.current(0, nextCIdx);
          } else {
            setPlaybackState('idle');
            setActiveCharacter(undefined);
          }
        }
      });
    },
    [book, speak, getCharacter],
  );

  // Keep the ref in sync with the latest callback
  useEffect(() => {
    speakParagraphRef.current = speakParagraph;
  });

  const handlePlay = useCallback(() => {
    setPlaybackState('playing');
    speakParagraph(paraIdxRef.current, chapterIdxRef.current);
  }, [speakParagraph]);

  const handlePause = useCallback(() => {
    pause();
    setPlaybackState('paused');
  }, [pause]);

  const handleResume = useCallback(() => {
    resume();
    setPlaybackState('playing');
  }, [resume]);

  const handleStop = useCallback(() => {
    cancel();
    setPlaybackState('idle');
    setActiveCharacter(undefined);
  }, [cancel]);

  const handleNext = useCallback(() => {
    cancel();
    const nextP = paraIdxRef.current + 1;
    if (nextP < book.chapters[chapterIdxRef.current].paragraphs.length) {
      setParaIdx(nextP);
      paraIdxRef.current = nextP;
      if (playbackState === 'playing') speakParagraph(nextP, chapterIdxRef.current);
    } else {
      const nextC = chapterIdxRef.current + 1;
      if (nextC < book.chapters.length) {
        setChapterIdx(nextC);
        setParaIdx(0);
        chapterIdxRef.current = nextC;
        paraIdxRef.current = 0;
        if (playbackState === 'playing') speakParagraph(0, nextC);
      }
    }
  }, [book, cancel, speakParagraph, playbackState]);

  const handlePrev = useCallback(() => {
    cancel();
    const prevP = paraIdxRef.current - 1;
    if (prevP >= 0) {
      setParaIdx(prevP);
      paraIdxRef.current = prevP;
      if (playbackState === 'playing') speakParagraph(prevP, chapterIdxRef.current);
    } else {
      const prevC = chapterIdxRef.current - 1;
      if (prevC >= 0) {
        const lastP = book.chapters[prevC].paragraphs.length - 1;
        setChapterIdx(prevC);
        setParaIdx(lastP);
        chapterIdxRef.current = prevC;
        paraIdxRef.current = lastP;
        if (playbackState === 'playing') speakParagraph(lastP, prevC);
      }
    }
  }, [book, cancel, speakParagraph, playbackState]);

  const handleRateChange = useCallback(
    (r: number) => {
      setRate(r);
      rateRef.current = r;
      if (playbackState === 'playing') {
        cancel();
        setTimeout(() => speakParagraph(paraIdxRef.current, chapterIdxRef.current), 100);
      }
    },
    [cancel, speakParagraph, playbackState],
  );

  const handleCompanionSpeak = useCallback(
    (text: string) => {
      if (playbackState === 'playing') {
        pause();
        setPlaybackState('paused');
      }
      const narratorChar = getCharacter('Narrator');
      speak(text, narratorChar);
    },
    [speak, pause, playbackState, getCharacter],
  );

  const hasPrev = chapterIdx > 0 || paraIdx > 0;
  const hasNext =
    chapterIdx < book.chapters.length - 1 ||
    paraIdx < paragraphs.length - 1;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top nav */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 transition-colors"
            title="Back to library"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-slate-900 truncate font-serif">{book.title}</h1>
            <p className="text-xs text-slate-500">{book.author} • {chapter.title}</p>
          </div>

          {/* Chapter selector */}
          <select
            value={chapterIdx}
            onChange={(e) => {
              const idx = Number(e.target.value);
              cancel();
              setChapterIdx(idx);
              setParaIdx(0);
              chapterIdxRef.current = idx;
              paraIdxRef.current = 0;
              setPlaybackState('idle');
              setActiveCharacter(undefined);
            }}
            className="text-sm border border-slate-200 rounded-lg px-2 py-1 text-slate-700 bg-white hidden sm:block"
          >
            {book.chapters.map((ch, i) => (
              <option key={ch.id} value={i}>{ch.title}</option>
            ))}
          </select>

          {/* Toggle companion */}
          <button
            onClick={() => setShowCompanion((v) => !v)}
            className={`p-2 rounded-full transition-colors ${
              showCompanion ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
            title="Toggle Story Companion"
          >
            <span className="text-lg">🦉</span>
          </button>
        </div>

        {/* Playback bar */}
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5">
          <div className="max-w-7xl mx-auto">
            <PlaybackControls
              state={playbackState}
              rate={rate}
              onPlay={handlePlay}
              onPause={handlePause}
              onResume={handleResume}
              onStop={handleStop}
              onRateChange={handleRateChange}
              onNext={handleNext}
              onPrev={handlePrev}
              hasNext={hasNext}
              hasPrev={hasPrev}
            />
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 flex gap-6">
        {/* Reading area */}
        <div className="flex-1 min-w-0">
          {/* Character roster */}
          <div className="mb-6 bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <CharacterRoster characters={book.characters} activeCharacter={activeCharacter} />
          </div>

          {/* Book content */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6 font-serif border-b border-slate-100 pb-4">
              {chapter.title}
            </h2>
            <BookReader
              paragraphs={paragraphs}
              activeParagraphId={
                playbackState !== 'idle' ? (currentParagraph?.id ?? null) : null
              }
              characters={book.characters}
            />
          </div>
        </div>

        {/* Companion panel */}
        {showCompanion && (
          <aside className="hidden lg:flex flex-col w-80 shrink-0 sticky top-36 self-start h-[calc(100vh-9rem)]">
            <CompanionPanel
              currentPassage={currentParagraph?.text ?? ''}
              onCompanionSpeak={handleCompanionSpeak}
            />
          </aside>
        )}
      </div>

      {/* Mobile companion toggle */}
      {!showCompanion && (
        <button
          onClick={() => setShowCompanion(true)}
          className="lg:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full bg-violet-600 text-white shadow-lg flex items-center justify-center text-2xl hover:bg-violet-700 transition-colors"
          title="Open Story Companion"
        >
          🦉
        </button>
      )}

      {/* Mobile companion drawer */}
      {showCompanion && (
        <div className="lg:hidden fixed inset-0 z-20 bg-black/40 flex items-end" onClick={() => setShowCompanion(false)}>
          <div
            className="w-full h-3/4 bg-white rounded-t-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 pt-3">
              <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto" />
            </div>
            <div className="flex-1 min-h-0">
              <CompanionPanel
                currentPassage={currentParagraph?.text ?? ''}
                onCompanionSpeak={handleCompanionSpeak}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
