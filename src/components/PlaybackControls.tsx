import type { PlaybackState } from '../types';

interface Props {
  state: PlaybackState;
  rate: number;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRateChange: (r: number) => void;
  onNext: () => void;
  onPrev: () => void;
  hasNext: boolean;
  hasPrev: boolean;
}

const RATES = [0.75, 1, 1.25, 1.5, 1.75];

export function PlaybackControls({
  state,
  rate,
  onPlay,
  onPause,
  onResume,
  onStop,
  onRateChange,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
}: Props) {
  const isPlaying = state === 'playing';
  const isPaused  = state === 'paused';

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Previous */}
      <button
        onClick={onPrev}
        disabled={!hasPrev}
        title="Previous paragraph"
        className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-30 transition-colors"
      >
        <svg className="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
        </svg>
      </button>

      {/* Play / Pause / Resume */}
      {!isPlaying && !isPaused && (
        <button
          onClick={onPlay}
          title="Play"
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-md transition-all"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
          Play
        </button>
      )}

      {isPlaying && (
        <button
          onClick={onPause}
          title="Pause"
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-700 hover:bg-slate-800 text-white font-semibold shadow-md transition-all"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Pause
        </button>
      )}

      {isPaused && (
        <button
          onClick={onResume}
          title="Resume"
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-md transition-all"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
          Resume
        </button>
      )}

      {/* Stop */}
      {(isPlaying || isPaused) && (
        <button
          onClick={onStop}
          title="Stop"
          className="p-2 rounded-full bg-red-100 hover:bg-red-200 transition-colors"
        >
          <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
          </svg>
        </button>
      )}

      {/* Next */}
      <button
        onClick={onNext}
        disabled={!hasNext}
        title="Next paragraph"
        className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-30 transition-colors"
      >
        <svg className="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798L4.555 5.168z" />
        </svg>
      </button>

      {/* Speed selector */}
      <div className="flex items-center gap-1 ml-2">
        <span className="text-xs text-slate-500 font-medium">Speed:</span>
        {RATES.map((r) => (
          <button
            key={r}
            onClick={() => onRateChange(r)}
            className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
              rate === r
                ? 'bg-amber-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {r}×
          </button>
        ))}
      </div>
    </div>
  );
}
