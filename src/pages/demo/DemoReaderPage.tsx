import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import Navbar from "../home/components/Navbar";
import Footer from "../home/components/Footer";
import { publicAsset } from "@/lib/publicAsset";

const voices = [
  { name: "Narrator", color: "#8B7355", icon: "ri-mic-2-line" },
  { name: "Alice", color: "#C4873A", icon: "ri-user-smile-line" },
  { name: "White Rabbit", color: "#7A9E7E", icon: "ri-ghost-smile-line" },
] as const;

/** Resolved URL for `public/assets/demo/chapter1.mp3` (respects Vite `base`). */
const CHAPTER1_AUDIO_SRC = publicAsset("assets/demo/chapter1.mp3");

/**
 * Future paragraph sync: end time in seconds for each passage block above (same length as `passageParagraphs`).
 * Active paragraph = first index where `currentTime < end`; if none, last block is active when past final end.
 * Leave empty until you have real alignment from narration tooling.
 */
const CHAPTER1_PARAGRAPH_END_SEC: number[] = [];

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Abridged, lightly modernized punctuation from the public-domain opening of Chapter I (Lewis Carroll). */
const passageParagraphs = [
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

export default function DemoReaderPage() {
  const [activeVoice, setActiveVoice] = useState<string>("Narrator");
  const [discussDraft, setDiscussDraft] = useState("");
  const [discussThread, setDiscussThread] = useState<{ from: "you" | "note"; text: string }[]>([]);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioStatus, setAudioStatus] = useState<"loading" | "ready" | "error">("loading");
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  let activeParagraphIndex = -1;
  if (CHAPTER1_PARAGRAPH_END_SEC.length === passageParagraphs.length) {
    const idx = CHAPTER1_PARAGRAPH_END_SEC.findIndex((end) => currentTime < end);
    activeParagraphIndex = idx === -1 ? passageParagraphs.length - 1 : idx;
  }

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onLoaded = () => {
      setAudioStatus("ready");
      if (Number.isFinite(el.duration) && el.duration > 0) {
        setDuration(el.duration);
      }
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

    el.addEventListener("loadeddata", onLoaded);
    el.addEventListener("canplay", onLoaded);
    el.addEventListener("error", onError);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("durationchange", onDurationChange);
    el.addEventListener("ended", onEnded);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);

    if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && el.error === null) {
      onLoaded();
    }

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
  }, []);

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
        text: "AI replies are not connected in this build — this is a layout preview. Synced discussion will plug in here later.",
      },
    ]);
    setDiscussDraft("");
  };

  return (
    <div className="min-h-screen bg-[#FAF8F4]">
      <Navbar />
      <main className="pt-24 md:pt-28 pb-20 px-6 md:px-10">
        <div className="max-w-3xl mx-auto mb-8 text-center">
          <p
            className="inline-flex items-center gap-2 rounded-full border border-[#C4B89A]/80 bg-[#F5F0E8] px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-[#5C5346]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            <span className="h-2 w-2 shrink-0 rounded-full bg-[#C4873A]" aria-hidden />
            Early interactive demo preview
          </p>
          <p
            className="mt-4 text-sm leading-relaxed text-[#5C5346]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            You&apos;re on a front-end slice only: text is public domain, passage chat is not wired to a model yet, and
            synced word-level highlighting is still evolving. When <code className="text-[#1C1A17]">chapter1.mp3</code> is
            present, you can play a bundled local sample below.
          </p>
        </div>

        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-[#3D3220] bg-[#1C1A17] shadow-2xl">
          <div className="flex flex-col gap-1 border-b border-[#3D3220]/60 px-6 py-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[#6B6355] text-xs uppercase tracking-widest" style={{ fontFamily: "'Inter', sans-serif" }}>
                Public domain · demo reader
              </p>
              <h1
                className="mt-1 text-2xl font-bold text-[#E8D9C0] md:text-3xl"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Alice&apos;s Adventures in Wonderland
              </h1>
              <p className="mt-1 text-sm text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
                Lewis Carroll · Chapter I — Down the Rabbit-Hole
              </p>
            </div>
            <Link
              to="/"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#C4873A] hover:text-[#E8C99A] md:mt-0"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              <i className="ri-arrow-left-line" aria-hidden />
              Back to home
            </Link>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-[#3D3220]/60 px-6 py-4">
            <span className="w-full text-[#6B6355] text-xs uppercase tracking-widest md:w-auto md:mr-2 md:self-center" style={{ fontFamily: "'Inter', sans-serif" }}>
              Voice focus
            </span>
            {voices.map((v) => (
              <button
                key={v.name}
                type="button"
                onClick={() => setActiveVoice(v.name)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeVoice === v.name
                    ? "border-transparent text-white"
                    : "border-[#3D3220] text-[#8B7B6B] hover:border-[#6B6355]"
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

          <div className="border-b border-[#3D3220]/60 px-6 py-5">
            <p className="mb-3 text-[#6B6355] text-xs uppercase tracking-widest" style={{ fontFamily: "'Inter', sans-serif" }}>
              Audio sample
            </p>

            <audio ref={audioRef} src={CHAPTER1_AUDIO_SRC} preload="metadata" className="hidden" />

            {audioStatus === "error" ? (
              <div className="rounded-2xl border border-dashed border-[#6B6355]/60 bg-[#2C2416]/60 px-4 py-5">
                <p className="text-[#E8D9C0] text-sm font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Audio sample coming next
                </p>
                <p className="mt-2 text-[#8B7B6B] text-xs leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                  We couldn&apos;t load <code className="text-[#C4B89A]">public/assets/demo/chapter1.mp3</code>. Add that
                  file (MP3) and refresh — the player will appear automatically.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-[#3D3220] bg-[#2C2416]/60 px-4 py-4">
                {audioStatus === "loading" ? (
                  <p className="mb-3 text-[#8B7B6B] text-xs" style={{ fontFamily: "'Inter', sans-serif" }}>
                    Loading audio…
                  </p>
                ) : (
                  <p className="mb-3 text-[#8B7B6B] text-xs leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                    Replace <code className="text-[#C4B89A]">chapter1.mp3</code> with your Chapter I narration when ready;
                    the bundled file is only a short sample for wiring tests.
                  </p>
                )}

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

          <div className="grid gap-0 lg:grid-cols-[1fr_320px]">
            <div className="border-b border-[#3D3220]/60 px-6 py-8 lg:border-b-0 lg:border-r">
              <p className="mb-4 text-[#6B6355] text-xs uppercase tracking-widest" style={{ fontFamily: "'Inter', sans-serif" }}>
                Reading text
              </p>
              <div className="space-y-6 text-left">
                {passageParagraphs.map((block, i) => {
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

            <div className="flex flex-col bg-[#1C1A17] px-6 py-8">
              <p className="mb-3 text-[#6B6355] text-xs uppercase tracking-widest" style={{ fontFamily: "'Inter', sans-serif" }}>
                Discuss this passage
              </p>
              <div className="min-h-[120px] flex-1 space-y-3 overflow-y-auto rounded-xl border border-[#3D3220] bg-[#2C2416]/50 p-3">
                {discussThread.length === 0 ? (
                  <p className="text-[#6B6355] text-xs italic" style={{ fontFamily: "'Inter', sans-serif" }}>
                    Ask about a line, a word, or why Alice reacts the way she does — you&apos;ll see how the thread
                    could look once AI is connected.
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
                  placeholder="e.g. What does Alice mean by pictures or conversations?"
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
      </main>
      <Footer />
    </div>
  );
}
