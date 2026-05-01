import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchDemoAlice, type DemoAliceVoiceRecommendations } from "@/api/demoAlice";
import { getSeededChapter, type ReaderParagraph } from "@/data/curatedChapters";
import { isLibraryBookId, libraryBookPath } from "@/data/libraryBooks";
import { getReaderApiBaseUrl } from "@/lib/apiBase";

const voices = [
  { name: "Narrator", color: "#8B7355", icon: "ri-mic-2-line" },
  { name: "Alice", color: "#C4873A", icon: "ri-user-smile-line" },
  { name: "White Rabbit", color: "#7A9E7E", icon: "ri-ghost-smile-line" },
] as const;

const PARAGRAPH_END_SEC: number[] = [];

const SCENE_IMAGE_WEBHOOK_URL = "https://n8n.jdpenterprises.ai/webhook/aistorycast-generate-scene";
const CHAPTER_HELPER_WEBHOOK_URL = "https://n8n.jdpenterprises.ai/webhook/aistorycast-chapter-helper";

/**
 * Scene images are rendered with a plain <img src={image_url} /> on pages served over HTTPS.
 * Browsers block mixed content when image_url is plain HTTP (e.g. raw ComfyUI view URLs).
 *
 * Production contract: n8n must return an HTTPS image_url — typically a reverse-proxy or signed
 * HTTPS URL to the asset — not the direct HTTP URL from the ComfyUI host. This app does not
 * proxy or fetch HTTP images in the browser; fixing the URL belongs in n8n / infrastructure.
 */
type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** n8n often returns `[{ json: { ... } }]` or a bare `{ json: ... }` wrapper. */
function unwrapSceneImageRoot(value: unknown): JsonObject | null {
  if (isJsonObject(value)) {
    if (isJsonObject(value.json)) return value.json;
    if (isJsonObject(value.body)) return value.body;
    if (isJsonObject(value.data)) return value.data;
    return value;
  }
  if (Array.isArray(value) && value.length > 0) {
    return unwrapSceneImageRoot(value[0]);
  }
  return null;
}

function readNonEmptyString(obj: JsonObject, keys: readonly string[]): string | null {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string") {
      const t = v.trim();
      if (t.length > 0) return t;
    }
  }
  return null;
}

function parseSceneImagePayload(value: unknown): { imageUrl: string | null; filename: string | null } {
  const root = unwrapSceneImageRoot(value);
  if (!root) return { imageUrl: null, filename: null };
  return {
    imageUrl: readNonEmptyString(root, ["image_url", "imageUrl", "imageURL"]),
    filename: readNonEmptyString(root, ["filename", "file_name", "fileName"]),
  };
}

function helperToStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : ""))
      .filter((item) => item.length > 0);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  return [];
}

function helperGetStringByKeys(obj: JsonObject, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return null;
}

function helperGetArrayByKeys(obj: JsonObject, keys: readonly string[]): string[] {
  for (const key of keys) {
    const value = obj[key];
    const arr = helperToStringArray(value);
    if (arr.length > 0) return arr;
  }
  return [];
}

/** Unwrap n8n chapter-helper payloads (flat, array, json/data/output). */
function unwrapChapterHelperRoot(value: unknown): JsonObject | null {
  if (isJsonObject(value)) {
    if (isJsonObject(value.data)) return value.data;
    if (isJsonObject(value.output)) return value.output;
    if (isJsonObject(value.json)) return value.json;
    if (isJsonObject(value.body)) return value.body;
    return value;
  }
  if (Array.isArray(value) && value.length > 0) {
    return unwrapChapterHelperRoot(value[0]);
  }
  return null;
}

type ChapterHelperParsed = {
  summary: string | null;
  narration: string | null;
  characters: string[];
  imagePrompt: string | null;
  audioBase64: string | null;
  audioMimeType: string | null;
  audioFileName: string | null;
};

function extractChapterHelperDisplay(responseJson: unknown): ChapterHelperParsed {
  const empty: ChapterHelperParsed = {
    summary: null,
    narration: null,
    characters: [],
    imagePrompt: null,
    audioBase64: null,
    audioMimeType: null,
    audioFileName: null,
  };
  const source = unwrapChapterHelperRoot(responseJson);
  if (!source) return empty;
  return {
    summary: helperGetStringByKeys(source, ["summary", "storySummary", "chapterSummary"]),
    narration: helperGetStringByKeys(source, ["narration", "narrationText", "storyNarration", "voiceover"]),
    characters: helperGetArrayByKeys(source, ["characters", "characterList", "cast"]),
    imagePrompt: helperGetStringByKeys(source, ["imagePrompt", "image_prompt", "prompt", "artPrompt"]),
    audioBase64: helperGetStringByKeys(source, ["audioBase64"]),
    audioMimeType: helperGetStringByKeys(source, ["audioMimeType"]),
    audioFileName: helperGetStringByKeys(source, ["audioFileName"]),
  };
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function progressStorageKey(bookId: string, chapterId: string) {
  return `aistorycast_reader_progress_${bookId}_${chapterId}`;
}

function voiceTip(vr: DemoAliceVoiceRecommendations | null, active: string): string | null {
  if (!vr) return null;
  if (active === "Narrator") return vr.narrator;
  if (active === "Alice") return vr.alice;
  if (active === "White Rabbit") return vr.whiteRabbit;
  return null;
}

type ReaderView = {
  bookId: string;
  chapterId: string;
  bookTitle: string;
  author: string;
  chapterTitle: string;
  chapterNumberLabel: string;
  paragraphs: ReaderParagraph[];
  audioSrc: string;
  audioNote: string | null;
  voiceRecommendations: DemoAliceVoiceRecommendations | null;
  evolvingFeaturesNote: string | null;
};

export default function ReadChapterPage() {
  const { bookId = "", chapterId = "" } = useParams();
  const seededChapter = useMemo(() => getSeededChapter(bookId, chapterId), [bookId, chapterId]);
  const isAlicePilot = bookId === "alice" && chapterId === "chapter-1";

  const [remote, setRemote] = useState<{
    status: "idle" | "loading" | "ok" | "error";
    data: Awaited<ReturnType<typeof fetchDemoAlice>> | null;
  }>({ status: "idle", data: null });

  useEffect(() => {
    if (!isAlicePilot) {
      setRemote({ status: "idle", data: null });
      return;
    }
    let cancelled = false;
    setRemote({ status: "loading", data: null });
    void fetchDemoAlice(getReaderApiBaseUrl())
      .then((data) => {
        if (!cancelled) setRemote({ status: "ok", data });
      })
      .catch(() => {
        if (!cancelled) setRemote({ status: "error", data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [isAlicePilot]);

  const chapter = useMemo((): ReaderView | null => {
    if (!seededChapter) return null;
    if (!isAlicePilot) {
      return {
        bookId: seededChapter.bookId,
        chapterId: seededChapter.chapterId,
        bookTitle: seededChapter.bookTitle,
        author: seededChapter.author,
        chapterTitle: seededChapter.chapterTitle,
        chapterNumberLabel: seededChapter.chapterNumberLabel,
        paragraphs: seededChapter.paragraphs,
        audioSrc: seededChapter.audioSrc,
        audioNote: seededChapter.audioNote ?? null,
        voiceRecommendations: null,
        evolvingFeaturesNote: null,
      };
    }
    if (remote.status === "ok" && remote.data) {
      const p = remote.data;
      return {
        bookId: seededChapter.bookId,
        chapterId: seededChapter.chapterId,
        bookTitle: p.book.title,
        author: p.book.author,
        chapterTitle: p.chapter.title,
        chapterNumberLabel: p.chapter.chapterNumberLabel,
        paragraphs: p.paragraphs.map((text) => ({ label: "Narrator", text })),
        audioSrc: seededChapter.audioSrc,
        audioNote: seededChapter.audioNote ?? null,
        voiceRecommendations: p.voiceRecommendations,
        evolvingFeaturesNote: p.evolvingFeaturesNote,
      };
    }
    return {
      bookId: seededChapter.bookId,
      chapterId: seededChapter.chapterId,
      bookTitle: seededChapter.bookTitle,
      author: seededChapter.author,
      chapterTitle: seededChapter.chapterTitle,
      chapterNumberLabel: seededChapter.chapterNumberLabel,
      paragraphs: seededChapter.paragraphs,
      audioSrc: seededChapter.audioSrc,
      audioNote: seededChapter.audioNote ?? null,
      voiceRecommendations: null,
      evolvingFeaturesNote: null,
    };
  }, [seededChapter, isAlicePilot, remote.status, remote.data]);

  const [activeVoice, setActiveVoice] = useState<string>("Narrator");
  const [discussDraft, setDiscussDraft] = useState("");
  const [discussThread, setDiscussThread] = useState<{ from: "you" | "note"; text: string }[]>([]);
  const [readProgressPct, setReadProgressPct] = useState(0);

  const [sceneImageUrl, setSceneImageUrl] = useState<string | null>(null);
  const [sceneImageFilename, setSceneImageFilename] = useState<string | null>(null);
  const [sceneImageError, setSceneImageError] = useState<string | null>(null);
  const [isGeneratingSceneImage, setIsGeneratingSceneImage] = useState(false);

  const [readingMode, setReadingMode] = useState<"enhanced" | "exact">("exact");
  const [helperResponseJson, setHelperResponseJson] = useState<unknown>(null);
  const [helperError, setHelperError] = useState<string | null>(null);
  const [isRunningHelper, setIsRunningHelper] = useState(false);

  const helperParsed = useMemo(() => extractChapterHelperDisplay(helperResponseJson), [helperResponseJson]);
  const helperGeneratedAudioSrc =
    helperParsed.audioBase64 && helperParsed.audioMimeType
      ? `data:${helperParsed.audioMimeType};base64,${helperParsed.audioBase64}`
      : null;

  const audioRef = useRef<HTMLAudioElement>(null);
  const helperAudioRef = useRef<HTMLAudioElement>(null);
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

  const showRemoteLoading = isAlicePilot && (remote.status === "loading" || remote.status === "idle");
  const showRemoteError = isAlicePilot && remote.status === "error";

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
    setSceneImageUrl(null);
    setSceneImageFilename(null);
    setSceneImageError(null);
    setIsGeneratingSceneImage(false);
    setHelperResponseJson(null);
    setHelperError(null);
    setIsRunningHelper(false);
    setReadingMode("exact");
  }, [bookId, chapterId]);

  const runChapterHelper = useCallback(async () => {
    if (!chapter) return;
    setIsRunningHelper(true);
    setHelperError(null);
    setHelperResponseJson(null);

    const body = {
      title: chapter.bookTitle,
      chapterText: chapter.paragraphs.map((p) => p.text).join("\n\n"),
      voiceStyle: "warm narrator",
      targetAge: "8",
      readingMode,
    };

    try {
      const response = await fetch(CHAPTER_HELPER_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        setHelperError(
          `Enhanced narration request failed (${response.status} ${response.statusText}). You can try again shortly.`,
        );
      }

      setHelperResponseJson(data);
    } catch (err) {
      setHelperError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsRunningHelper(false);
    }
  }, [chapter, readingMode]);

  const generateSceneImage = useCallback(async () => {
    if (!chapter) return;
    setIsGeneratingSceneImage(true);
    setSceneImageError(null);
    setSceneImageUrl(null);
    setSceneImageFilename(null);

    const helperForScene = extractChapterHelperDisplay(helperResponseJson);
    const prompt = helperForScene.imagePrompt?.trim() ?? "";
    const firstVisible = chapter.paragraphs[0]?.text ?? "";
    const story_text =
      prompt.length > 0
        ? prompt
        : `${chapter.bookTitle}, ${chapter.chapterNumberLabel} — ${chapter.chapterTitle}. Scene: ${firstVisible}`;

    try {
      const response = await fetch(SCENE_IMAGE_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ story_text }),
      });

      const data: unknown = await response.json();
      const { imageUrl, filename } = parseSceneImagePayload(data);

      if (!response.ok) {
        setSceneImageError(
          `We couldn’t generate a scene just now (${response.status} ${response.statusText}). Please try again shortly.`,
        );
        return;
      }

      if (imageUrl) {
        setSceneImageUrl(imageUrl.trim());
        setSceneImageFilename(filename);
      } else if (filename) {
        setSceneImageFilename(filename);
        setSceneImageError("The service did not return an image URL. Please try again.");
      } else {
        setSceneImageError("The service did not return an image. Please try again.");
      }
    } catch (err) {
      setSceneImageError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsGeneratingSceneImage(false);
    }
  }, [chapter, helperResponseJson]);

  useEffect(() => {
    const el = helperAudioRef.current;
    if (!el || !helperGeneratedAudioSrc) return;
    el.src = helperGeneratedAudioSrc;
    el.load();
  }, [helperGeneratedAudioSrc]);

  useEffect(() => {
    if (!seededChapter) return;
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

    el.src = seededChapter.audioSrc;
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
  }, [bookId, chapterId, seededChapter]);

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
    const bookBackHref = isLibraryBookId(bookId) ? libraryBookPath(bookId) : "/app/library";
    const bookBackLabel = isLibraryBookId(bookId) ? "Back to book" : "Back to library";
    return (
      <div className="mx-auto max-w-lg text-center">
        <h1 className="text-2xl font-bold text-[#1C1A17]" style={{ fontFamily: "'Playfair Display', serif" }}>
          Chapter not available yet
        </h1>
        <p className="mt-3 text-sm text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
          There is no reader content seeded for{" "}
          <code className="text-[#1C1A17]">{bookId || "—"}</code> / <code className="text-[#1C1A17]">{chapterId || "—"}</code> yet.
          This route is reserved for when narration and text are wired for this chapter.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to={bookBackHref}
            className="inline-flex items-center gap-2 rounded-full bg-[#2C2416] px-6 py-3 text-sm font-semibold text-[#FAF8F4] hover:bg-[#3D3220]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            <i className="ri-arrow-left-line" aria-hidden />
            {bookBackLabel}
          </Link>
          <Link
            to="/app/library"
            className="inline-flex items-center gap-2 rounded-full border border-[#E0D8CC] bg-white px-6 py-3 text-sm font-semibold text-[#1C1A17] hover:border-[#C4B89A]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Library
          </Link>
        </div>
      </div>
    );
  }

  const activeTip = voiceTip(chapter.voiceRecommendations, activeVoice);

  const showEnhancedNarrationBlock =
    readingMode === "enhanced" &&
    typeof helperParsed.narration === "string" &&
    helperParsed.narration.trim().length > 0;
  const showStoryInsightsPanel = readingMode === "enhanced" && helperResponseJson !== null;

  const paragraphBlocks = chapter.paragraphs.map((block, i) => {
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
  });

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
        {isLibraryBookId(bookId) ? (
          <Link to={libraryBookPath(bookId)} className="hover:text-[#1C1A17]">
            {chapter.bookTitle}
          </Link>
        ) : (
          <span className="text-[#1C1A17]">{chapter.bookTitle}</span>
        )}
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
          <p className="mt-1 text-sm text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
            {chapter.author}
          </p>
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

      <div className="mb-4 rounded-xl border border-[#E8E0D4] bg-[#FDFBF7] px-4 py-3">
        <label className="block text-sm text-[#3E372B]" style={{ fontFamily: "'Inter', sans-serif" }}>
          Reading Mode
          <select
            className="mt-1 w-full max-w-xs rounded-md border border-[#D9CFBC] bg-white px-3 py-2 text-sm"
            value={readingMode}
            onChange={(e) => setReadingMode(e.target.value === "enhanced" ? "enhanced" : "exact")}
          >
            <option value="exact">Read Exactly</option>
            <option value="enhanced">Enhanced Story Mode</option>
          </select>
        </label>
        {readingMode === "enhanced" ? (
          <button
            type="button"
            onClick={() => void runChapterHelper()}
            disabled={isRunningHelper || showRemoteLoading}
            className="mt-3 rounded-md bg-[#C4873A] px-4 py-2 text-sm font-medium text-white hover:bg-[#B9792E] disabled:cursor-not-allowed disabled:opacity-60"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {isRunningHelper ? "Generating…" : "Generate enhanced narration"}
          </button>
        ) : null}
        {helperError ? (
          <p className="mt-2 text-sm text-red-700" style={{ fontFamily: "'Inter', sans-serif" }}>
            {helperError}
          </p>
        ) : null}
      </div>

      {showRemoteLoading ? (
        <div
          className="mb-4 rounded-xl border border-[#C4B89A]/60 bg-[#FDF6EC] px-4 py-3 text-sm text-[#5C5346]"
          style={{ fontFamily: "'Inter', sans-serif" }}
          role="status"
          aria-live="polite"
        >
          Loading chapter text from API ({getReaderApiBaseUrl()})…
        </div>
      ) : null}

      {showRemoteError ? (
        <div
          className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          style={{ fontFamily: "'Inter', sans-serif" }}
          role="alert"
        >
          Could not reach the reader API. Showing bundled offline copy. Ensure the backend is running (see{" "}
          <code className="rounded bg-amber-100/80 px-1">backend/</code>) or set <code className="rounded bg-amber-100/80 px-1">VITE_API_BASE_URL</code> in{" "}
          <code className="rounded bg-amber-100/80 px-1">.env.local</code>.
        </div>
      ) : null}

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
              {chapter.author} · public domain
            </p>
            <p className="text-[#E8D9C0] text-sm font-semibold" style={{ fontFamily: "'Playfair Display', serif" }}>
              {chapter.chapterNumberLabel}
            </p>
          </div>
          {isLibraryBookId(bookId) ? (
            <Link
              to={libraryBookPath(bookId)}
              className="text-xs font-medium text-[#C4873A] hover:text-[#E8C99A]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Choose another chapter →
            </Link>
          ) : null}
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

        {activeTip ? (
          <div className="border-b border-[#3D3220]/60 px-5 py-3">
            <p className="text-[#6B6355] text-xs uppercase tracking-widest" style={{ fontFamily: "'Inter', sans-serif" }}>
              Voice direction — {activeVoice}
            </p>
            <p className="mt-2 text-[#C4B89A] text-sm leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
              {activeTip}
            </p>
          </div>
        ) : null}

        {chapter.evolvingFeaturesNote ? (
          <div className="border-b border-[#3D3220]/60 px-5 py-3">
            <p className="text-[#6B6355] text-xs uppercase tracking-widest" style={{ fontFamily: "'Inter', sans-serif" }}>
              Product note
            </p>
            <p className="mt-2 text-[#8B7B6B] text-xs leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
              {chapter.evolvingFeaturesNote}
            </p>
          </div>
        ) : null}

        <div className="border-b border-[#3D3220]/60 px-5 py-4">
          <p className="mb-2 text-[#6B6355] text-xs uppercase tracking-widest" style={{ fontFamily: "'Inter', sans-serif" }}>
            Audio
          </p>
          {chapter.audioNote ? (
            <p className="mb-3 text-[#8B7B6B] text-xs leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
              {chapter.audioNote}
            </p>
          ) : null}
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
            {showRemoteLoading ? (
              <div className="space-y-4" aria-hidden>
                <div className="h-3 w-1/3 animate-pulse rounded bg-[#3D3220]" />
                <div className="h-20 animate-pulse rounded-lg bg-[#2C2416]/80" />
                <div className="h-20 animate-pulse rounded-lg bg-[#2C2416]/80" />
                <div className="h-16 animate-pulse rounded-lg bg-[#2C2416]/80" />
              </div>
            ) : (
              <div className="space-y-6 text-left">
                {showEnhancedNarrationBlock ? (
                  <>
                    <div className="rounded-lg border border-[#3D3220]/60 bg-[#2C2416]/40 px-3 py-4">
                      <p className="mb-2 text-[#6B6355] text-xs font-semibold uppercase tracking-wider" style={{ fontFamily: "'Inter', sans-serif" }}>
                        Generated Narration
                      </p>
                      <p className="whitespace-pre-wrap text-[#E8D9C0] text-sm leading-8 md:text-base md:leading-9" style={{ fontFamily: "'Lora', serif" }}>
                        {helperParsed.narration}
                      </p>
                      {helperGeneratedAudioSrc ? (
                        <div className="mt-4 border-t border-[#3D3220]/50 pt-4">
                          <p className="mb-2 text-[#6B6355] text-xs font-semibold uppercase tracking-wider" style={{ fontFamily: "'Inter', sans-serif" }}>
                            Enhanced narration audio
                          </p>
                          <audio ref={helperAudioRef} controls className="w-full rounded-md" preload="metadata" />
                          {helperParsed.audioFileName ? (
                            <p className="mt-1 text-[11px] text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
                              {helperParsed.audioFileName}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <p className="text-[#6B6355] text-xs font-semibold uppercase tracking-wider" style={{ fontFamily: "'Inter', sans-serif" }}>
                      Source passage
                    </p>
                    {paragraphBlocks}
                  </>
                ) : (
                  paragraphBlocks
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col px-5 py-7">
            {showStoryInsightsPanel ? (
              <div className="mb-4 space-y-3 rounded-xl border border-[#3D3220] bg-[#2C2416]/50 p-3">
                <p className="text-[#6B6355] text-xs font-semibold uppercase tracking-widest" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Story insights
                </p>
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    Summary
                  </p>
                  <p className="text-xs leading-relaxed text-[#E8D9C0]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {helperParsed.summary ?? "Not provided in response."}
                  </p>
                </div>
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    Characters
                  </p>
                  {helperParsed.characters.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {helperParsed.characters.map((name, idx) => (
                        <span
                          key={`${name}-${idx}`}
                          className="rounded-full border border-[#3D3220] bg-[#2C2416] px-2 py-0.5 text-[10px] font-medium text-[#C4B89A]"
                          style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
                      Not provided in response.
                    </p>
                  )}
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    Image prompt
                  </p>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-[#C4B89A]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {helperParsed.imagePrompt ?? "Not provided in response."}
                  </p>
                </div>
              </div>
            ) : null}
            <p className="mb-2 text-[#6B6355] text-xs uppercase tracking-widest" style={{ fontFamily: "'Inter', sans-serif" }}>
              Discuss / dissect
            </p>
            {/* Scene image: expects HTTPS image_url from n8n (see block comment on SCENE_IMAGE_WEBHOOK_URL). */}
            <button
              type="button"
              onClick={() => void generateSceneImage()}
              disabled={isGeneratingSceneImage || showRemoteLoading}
              className="w-full rounded-xl border border-[#3D3220] bg-[#2C2416]/80 px-3 py-2.5 text-xs font-semibold text-[#E8D9C0] transition-colors hover:border-[#C4873A] hover:bg-[#3D3220] disabled:cursor-not-allowed disabled:opacity-50"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {isGeneratingSceneImage ? "Generating scene…" : "Show me this scene"}
            </button>
            {sceneImageError ? (
              <p className="mt-2 text-xs leading-relaxed text-amber-200/95" style={{ fontFamily: "'Inter', sans-serif" }}>
                {sceneImageError}
              </p>
            ) : null}
            {sceneImageUrl || sceneImageFilename ? (
              <div className="mt-3">
                {sceneImageUrl ? (
                  <img
                    src={sceneImageUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-full max-w-full rounded-lg border border-[#3D3220] object-cover"
                    onError={() => {
                      setSceneImageError(
                        "The scene was generated, but the image URL was blocked by the browser. The image service must return an HTTPS URL.",
                      );
                      setSceneImageUrl(null);
                    }}
                  />
                ) : null}
                {sceneImageFilename ? (
                  <p className={`text-[11px] text-[#8B7B6B] ${sceneImageUrl ? "mt-2" : ""}`} style={{ fontFamily: "'Inter', sans-serif" }}>
                    {sceneImageFilename}
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="mt-3 min-h-[100px] flex-1 space-y-3 overflow-y-auto rounded-xl border border-[#3D3220] bg-[#2C2416]/50 p-3">
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
