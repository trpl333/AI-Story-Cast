import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { getSeededChapter } from "@/data/curatedChapters";

const voices = [
  { name: "Narrator", color: "#8B7355", icon: "ri-mic-2-line" },
  { name: "Alice", color: "#C4873A", icon: "ri-user-smile-line" },
  { name: "White Rabbit", color: "#7A9E7E", icon: "ri-ghost-smile-line" },
] as const;

const PARAGRAPH_END_SEC: number[] = [];

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function progressStorageKey(bookId: string, chapterId: string) {
  return `aistorycast_reader_progress_${bookId}_${chapterId}`;
}

export default function ReadChapterPage() {
  const { bookId = "", chapterId = "" } = useParams();
  const chapter = useMemo(() => getSeededChapter(bookId, chapterId), [bookId, chapterId]);

  const [activeVoice, setActiveVoice] = useState<string>("Narrator");
  const [discussDraft, setDiscussDraft] = useState("");
  const [discussThread, setDiscussThread] = useState<{ from: "you" | "note"; text: string }[]>([]);
  const [readProgressPct, setReadProgressPct] = useState(0);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioStatus, setAudioStatus] = useState<"loading" | "ready" | "error">("loading");
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  let activeParagraphIndex = -1;
  if (chapter && PARAGRAPH_END_SEC.length === chapter.paragraphs.length) {
    const idx = PARAGRAPH_END_SEC.findIndex((end) => currentTime < end);
    activeParagraphIndex = idx === -1 ? chapter.paragraphs.length - 1 : idx;
  }

  useEffect(() => {
    if (!chapter) return;
    try {
      const raw = localStorage.getItem(progressStorageKey(chapter.bookId, chapter.chapterId));
      if (raw) {
        const p = JSON.parse(raw) as { readPct?: number };
        if (typeof p.readPct === "number" && p.readPct >= 0 && p.readPct <= 100) setReadProgressPct(p.readPct);
      }
    } catch {
      /* ignore */
    }
  }, [chapter]);

  const persistReadProgress = useCallback(
    (pct: number) => {
      if (!chapter) return;
      const v = Math.max(0, Math.min(100, pct));
      setReadProgressPct(v);
      localStorage.setItem(progressStorageKey(chapter.bookId, chapter.chapterId), JSON.stringify({ readPct: v }));
    },
    [chapter],
  );

  useEffect(() => {
    const seeded = getSeededChapter(bookId, chapterId);
    if (!seeded) return;
    const el = audioRef.current;
    if (!el) return;

    setAudioStatus("loading");
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    const onLoaded = () => {
      setAudioStatus("ready");
      if (Number.isFinite(el.duration) && el.duration > 0) setDuration(el.duration);
    };
    const onError = () => {
      setAudioStatus("error");
      setPlaying(false);
      setDuration(0);
    };
    const onTimeUpdate = () => setCurrentTime(el.currentTime);
    const onDurationChange = () => {
      if (Number.isFinite(el.duration) && el.duration > 0) setDuration(el.duration);
    };
    const onEnded = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    el.src = seeded.audioSrc;
    el.load();

    el.addEventListener("loadeddata", onLoaded);
    el.addEventListener("canplay", onLoaded);
    el.addEventListener("error", onError);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("durationchange", onDurationChange);
    el.addEventListener("ended", onEnded);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);

    if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && el.error === null) onLoaded();

    return () => {
      el.removeEventListener("loadeddata", onLoaded);
      el.removeEventListener("canplay", onLoaded);
      el.removeEventListener("error", onError);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("durationchange", onDurationChange);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
  }, [bookId, chapterId]);

  const togglePlay = useCallback(async () => {
    const el = audioRef.current;
    if (!el || audioStatus !== "ready") return;
    if (el.paused) {
      try {
        await el.play();
      } catch {
        setPlaying(false);
      }
    } else {
      el.pause();
    }
  }, [audioStatus]);

  const seekFromBar = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const el = audioRef.current;
      if (!el || audioStatus !== "ready" || !duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      el.currentTime = pct * duration;
      setCurrentTime(el.currentTime);
    },
    [audioStatus, duration],
  );

  const sendDiscuss = () => {
    const t = discussDraft.trim();
    if (!t) return;
    setDiscussThread((prev) => [
      ...prev,
      { from: "you", text: t },
      {
        from: "note",
        text: "AI discussion is not connected yet — server-backed threads will replace this placeholder.",
      },
    ]);
    setDiscussDraft("");
  };

  if (!chapter) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <h1 className="text-2xl font-bold text-[#1C1A17]" style={{ fontFamily: "'Playfair Display', serif" }}>
          Chapter not found
        </h1>
        <p className="mt-3 text-sm text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
          There is no seeded content for <code className="text-[#1C1A17]">{bookId}</code> /{" "}
          <code className="text-[#1C1A17]">{chapterId}</code> yet. Only the curated Alice pilot is wired.
        </p>
        <Link
          to="/app/library"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#2C2416] px-6 py-3 text-sm font-semibold text-[#FAF8F4] hover:bg-[#3D3220]"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          <i className="ri-arrow-left-line" aria-hidden />
          Back to library
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
        <Link to="/app" className="hover:text-[#1C1A17]">
          Home
        </Link>
        <span aria-hidden>/</span>
        <Link to="/app/library" className="hover:text-[#1C1A17]">
          Library
        </Link>
        <span aria-hidden>/</span>
        <span className="text-[#1C1A17]">{chapter.bookTitle}</span>
        <span aria-hidden>/</span>
        <span className="font-medium text-[#5C5346]">{chapter.chapterNumberLabel}</span>
      </nav>

      <div className="mb-6 flex flex-col gap-4 border-b border-[#E0D8CC] pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
            In-app reader
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#1C1A17] md:text-3xl" style={{ fontFamily: "'Playfair Display', serif" }}>
            {chapter.bookTitle}
          </h1>
          <p className="mt-1 text-lg text-[#5C5346]" style={{ fontFamily: "'Playfair Display', serif" }}>
            {chapter.chapterNumberLabel} — {chapter.chapterTitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled
            title="Previous chapter — coming when catalog expands"
            className="rounded-full border border-[#E0D8CC] px-4 py-2 text-sm font-medium text-[#A89880] cursor-not-allowed"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            <i className="ri-arrow-left-s-line mr-1" aria-hidden />
            Previous
          </button>
          <button
            type="button"
            disabled
            title="Next chapter — coming soon"
            className="rounded-full border border-[#E0D8CC] px-4 py-2 text-sm font-medium text-[#A89880] cursor-not-allowed"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Next
            <i className="ri-arrow-right-s-line ml-1" aria-hidden />
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-[#E8E0D4] bg-[#F5F0E8] px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
            <strong className="text-[#1C1A17]">Reading progress</strong> — stored in this browser only until accounts sync to the server.
          </p>
          <label className="flex items-center gap-3 text-xs text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
            <span className="shrink-0">Scroll position (mock)</span>
            <input
              type="range"
              min={0}
              max={100}
              value={readProgressPct}
              onChange={(e) => persistReadProgress(Number(e.target.value))}
              className="h-1.5 w-40 accent-[#C4873A] md:w-48"
            />
            <span className="w-8 tabular-nums text-[#1C1A17]">{readProgressPct}%</span>
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-[#3D3220] bg-[#1C1A17] shadow-xl">
        <div className="flex flex-col gap-1 border-b border-[#3D3220]/60 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[#6B6355] text-xs uppercase tracking-widest" style={{ fontFamily: "'Inter', sans-serif" }}>
              Lewis Carroll · public domain
            </p>
            <p className="text-[#E8D9C0] text-sm font-semibold" style={{ fontFamily: "'Playfair Display', serif" }}>
              {chapter.chapterNumberLabel}
            </p>
          </div>
          <Link to="/demo" className="text-xs font-medium text-[#C4873A] hover:text-[#E8C99A]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Compare public demo →
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-[#3D3220]/60 px-5 py-3">
          <span className="w-full text-[#6B6355] text-xs uppercase tracking-widest md:w-auto md:mr-2 md:self-center" style={{ fontFamily: "'Inter', sans-serif" }}>
            Voice focus
          </span>
          {voices.map((v) => (
            <button
              key={v.name}
              type="button"
              onClick={() => setActiveVoice(v.name)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                activeVoice === v.name ? "border-transparent text-white" : "border-[#3D3220] text-[#8B7B6B] hover:border-[#6B6355]"
              }`}
              style={{
                backgroundColor: activeVoice === v.name ? `${v.color}CC` : "transparent",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <i className={`${v.icon} text-xs`} aria-hidden />
              {v.name}
            </button>
          ))}
        </div>

        <div className="border-b border-[#3D3220]/60 px-5 py-4">
          <p className="mb-2 text-[#6B6355] text-xs uppercase tracking-widest" style={{ fontFamily: "'Inter', sans-serif" }}>
            Audio
          </p>
          <audio ref={audioRef} preload="metadata" className="hidden" />
          {audioStatus === "error" ? (
            <div className="rounded-xl border border-dashed border-[#6B6355]/60 bg-[#2C2416]/60 px-4 py-4">
              <p className="text-[#E8D9C0] text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
                Audio unavailable — add <code className="text-[#C4B89A]">public/assets/demo/chapter1.mp3</code> or wire a chapter asset from the API later.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-[#3D3220] bg-[#2C2416]/60 px-4 py-3">
              {audioStatus === "loading" ? (
                <p className="mb-2 text-[#8B7B6B] text-xs" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Loading audio…
                </p>
              ) : null}
              <div className={`flex items-center gap-4 ${audioStatus === "loading" ? "pointer-events-none opacity-60" : ""}`}>
                <button
                  type="button"
                  onClick={() => void togglePlay()}
                  disabled={audioStatus !== "ready"}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C4873A] text-white hover:bg-[#D4975A] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={playing ? "Pause" : "Play"}
                >
                  <i className={`${playing ? "ri-pause-fill" : "ri-play-fill"} text-lg`} aria-hidden />
                </button>
                <button
                  type="button"
                  className="flex flex-1 cursor-pointer items-center rounded-md py-2 text-left disabled:cursor-not-allowed"
                  onClick={seekFromBar}
                  disabled={audioStatus !== "ready" || !duration}
                  aria-label="Seek audio"
                >
                  <div className="pointer-events-none h-1.5 w-full overflow-hidden rounded-full bg-[#3D3220]">
                    <div
                      className="h-full rounded-full bg-[#C4873A] transition-[width] duration-150 ease-linear"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </button>
                <span className="text-[#6B6355] text-xs tabular-nums whitespace-nowrap" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {formatTime(currentTime)} / {duration > 0 ? formatTime(duration) : "—"}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-0 lg:grid-cols-[1fr_300px]">
          <div className="border-b border-[#3D3220]/60 px-5 py-7 lg:border-b-0 lg:border-r">
            <p className="mb-4 text-[#6B6355] text-xs uppercase tracking-widest" style={{ fontFamily: "'Inter', sans-serif" }}>
              Text
            </p>
            <div className="space-y-6 text-left">
              {chapter.paragraphs.map((block, i) => {
                const highlight = activeParagraphIndex === i;
                return (
                  <div
                    key={i}
                    className={`rounded-lg px-1 -mx-1 transition-colors ${highlight ? "bg-[#C4873A]/10 ring-1 ring-[#C4873A]/25" : ""}`}
                  >
                    <p className="mb-2 text-[#6B6355] text-xs font-semibold uppercase tracking-wider" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {block.label}
                    </p>
                    <p className="text-[#E8D9C0] text-sm leading-8 md:text-base md:leading-9" style={{ fontFamily: "'Lora', serif" }}>
                      {block.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col px-5 py-7">
            <p className="mb-2 text-[#6B6355] text-xs uppercase tracking-widest" style={{ fontFamily: "'Inter', sans-serif" }}>
              Discuss / dissect
            </p>
            <div className="min-h-[100px] flex-1 space-y-3 overflow-y-auto rounded-xl border border-[#3D3220] bg-[#2C2416]/50 p-3">
              {discussThread.length === 0 ? (
                <p className="text-[#6B6355] text-xs italic" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Ask about a line or theme — layout only until the discussion service is connected.
                </p>
              ) : (
                discussThread.map((m, idx) => (
                  <div
                    key={idx}
                    className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
                      m.from === "you" ? "bg-[#3D3220]/60 text-[#C4B89A]" : "bg-[#C4873A]/15 text-[#E8D9C0]"
                    }`}
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {m.text}
                  </div>
                ))
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={discussDraft}
                onChange={(e) => setDiscussDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), sendDiscuss())}
                placeholder="Ask about this passage…"
                className="min-w-0 flex-1 rounded-xl border border-[#3D3220] bg-[#2C2416] px-3 py-2.5 text-xs text-[#E8D9C0] outline-none placeholder:text-[#6B6355] focus:border-[#C4873A]"
                style={{ fontFamily: "'Inter', sans-serif" }}
              />
              <button
                type="button"
                onClick={sendDiscuss}
                className="shrink-0 rounded-xl bg-[#C4873A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#D4975A]"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
