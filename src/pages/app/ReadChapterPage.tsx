import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchDemoAlice, type DemoAliceVoiceRecommendations } from "@/api/demoAlice";
import {
  getSeededChapter,
  type ReaderParagraph,
  type StoryRole,
  type StorySegment,
} from "@/data/curatedChapters";
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

/** Label above a paragraph: role display name from cast data when segments align, else seed label. */
function displayLabelForParagraph(
  roles: StoryRole[] | undefined,
  segments: StorySegment[] | undefined,
  paragraphIndex: number,
  block: ReaderParagraph,
): string {
  if (!roles?.length || !segments?.length) return block.label;
  const seg =
    segments.find((s) => s.paragraphIndex === paragraphIndex && s.text === block.text) ??
    segments.find((s) => s.paragraphIndex === paragraphIndex);
  if (!seg) return block.label;
  const role = roles.find((r) => r.id === seg.roleId);
  return role?.displayName ?? block.label;
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
  roles?: StoryRole[];
  segments?: StorySegment[];
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
        roles: seededChapter.roles,
        segments: seededChapter.segments,
      };
    }
    if (remote.status === "ok" && remote.data) {
      const p = remote.data;
      const remoteParagraphs = p.paragraphs.map((text) => ({ label: "Narrator", text }));
      const narratorRoleId = seededChapter.roles?.find((r) => r.roleType === "narrator")?.id;
      const remoteSegments: StorySegment[] | undefined =
        narratorRoleId != null
          ? p.paragraphs.map((text, i) => ({
              id: `alice-remote-seg-${i}`,
              roleId: narratorRoleId,
              text,
              paragraphIndex: i,
            }))
          : undefined;
      return {
        bookId: seededChapter.bookId,
        chapterId: seededChapter.chapterId,
        bookTitle: p.book.title,
        author: p.book.author,
        chapterTitle: p.chapter.title,
        chapterNumberLabel: p.chapter.chapterNumberLabel,
        paragraphs: remoteParagraphs,
        audioSrc: seededChapter.audioSrc,
        audioNote: seededChapter.audioNote ?? null,
        voiceRecommendations: p.voiceRecommendations,
        evolvingFeaturesNote: p.evolvingFeaturesNote,
        roles: seededChapter.roles,
        segments: remoteSegments,
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
      roles: seededChapter.roles,
      segments: seededChapter.segments,
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
          `Enhanced storytelling request failed (${response.status} ${response.statusText}). You can try again shortly.`,
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
    const hasPlaceholderAudioNote = Boolean(seededChapter.audioNote && seededChapter.audioNote.trim().length > 0);
    const shouldLoadBundledChapterAudio = isAlicePilot || !hasPlaceholderAudioNote;
    if (!shouldLoadBundledChapterAudio) {
      setAudioStatus("loading");
      setPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }
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
  }, [bookId, chapterId, seededChapter, isAlicePilot]);

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
          This route is reserved for when storytelling and text are wired for this chapter.
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

  const chapterHasPlaceholderAudioNote = Boolean(chapter.audioNote && chapter.audioNote.trim().length > 0);
  const showBundledChapterNarrationPlayer = isAlicePilot || !chapterHasPlaceholderAudioNote;

  const leftPageCount = Math.ceil(chapter.paragraphs.length / 2);
  const leftParas = chapter.paragraphs.slice(0, leftPageCount);
  const rightParas = chapter.paragraphs.slice(leftPageCount);

  const renderBookParagraph = (block: ReaderParagraph, globalIndex: number) => {
    const highlight = activeParagraphIndex === globalIndex;
    const lineLabel = displayLabelForParagraph(chapter.roles, chapter.segments, globalIndex, block);
    return (
      <div
        key={globalIndex}
        className={`mb-6 last:mb-0 rounded-md px-1 -mx-1 transition-colors ${highlight ? "bg-[#C4873A]/12 ring-1 ring-[#C4873A]/30" : ""}`}
      >
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#6A5E4B]" style={{ fontFamily: "'Inter', sans-serif" }}>
          {lineLabel}
        </p>
        <p className="text-[#2C271F] text-base leading-relaxed md:text-[17px] md:leading-8" style={{ fontFamily: "'Lora', serif" }}>
          {block.text}
        </p>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-7xl pb-10">
      <nav className="mb-4 flex flex-wrap items-center gap-2 text-xs text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
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

      <header className="mb-4 rounded-2xl border border-[#E0D8CC] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-[#1C1A17] md:text-3xl" style={{ fontFamily: "'Playfair Display', serif" }}>
              {chapter.bookTitle}
            </h1>
            <p className="mt-1 text-sm text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
              {chapter.author}
            </p>
            <p className="mt-2 text-lg text-[#3E372B]" style={{ fontFamily: "'Playfair Display', serif" }}>
              <span className="text-[#8B7B6B]">{chapter.chapterNumberLabel}</span>
              <span className="mx-2 text-[#D4C9B8]" aria-hidden>
                ·
              </span>
              {chapter.chapterTitle}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled
                title="Previous chapter — coming when catalog expands"
                className="rounded-full border border-[#E8E0D4] px-3 py-1.5 text-xs font-medium text-[#A89880] cursor-not-allowed"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                <i className="ri-arrow-left-s-line mr-1" aria-hidden />
                Previous
              </button>
              <button
                type="button"
                disabled
                title="Next chapter — coming soon"
                className="rounded-full border border-[#E8E0D4] px-3 py-1.5 text-xs font-medium text-[#A89880] cursor-not-allowed"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Next
                <i className="ri-arrow-right-s-line ml-1" aria-hidden />
              </button>
              {isLibraryBookId(bookId) ? (
                <Link
                  to={libraryBookPath(bookId)}
                  className="inline-flex items-center rounded-full border border-[#E8E0D4] px-3 py-1.5 text-xs font-medium text-[#C4873A] hover:border-[#C4873A]/50"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  <i className="ri-arrow-left-line mr-1" aria-hidden />
                  Book menu
                </Link>
              ) : null}
            </div>
          </div>
          <div className="w-full shrink-0 space-y-3 rounded-xl border border-[#F0EBE3] bg-[#FAF8F4] p-4 lg:w-72">
            <label className="block text-xs font-semibold uppercase tracking-wide text-[#6A5E4B]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Reading Mode
              <select
                className="mt-1.5 w-full rounded-lg border border-[#D9CFBC] bg-white px-3 py-2 text-sm text-[#1C1A17]"
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
                className="w-full rounded-lg bg-[#C4873A] px-3 py-2 text-sm font-semibold text-white hover:bg-[#B9792E] disabled:cursor-not-allowed disabled:opacity-60"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {isRunningHelper ? "Generating…" : "Generate storytelling"}
              </button>
            ) : null}
            {helperError ? (
              <p className="text-sm text-red-700" style={{ fontFamily: "'Inter', sans-serif" }}>
                {helperError}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-5 space-y-4 border-t border-[#E8E0D4] pt-5">
          {showRemoteLoading ? (
            <div
              className="rounded-xl border border-[#C4B89A]/60 bg-[#FDF6EC] px-4 py-3 text-sm text-[#5C5346]"
              style={{ fontFamily: "'Inter', sans-serif" }}
              role="status"
              aria-live="polite"
            >
              Loading chapter text from API ({getReaderApiBaseUrl()})…
            </div>
          ) : null}

          {showRemoteError ? (
            <div
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
              style={{ fontFamily: "'Inter', sans-serif" }}
              role="alert"
            >
              Could not reach the reader API. Showing bundled offline copy. Ensure the backend is running (see{" "}
              <code className="rounded bg-amber-100/80 px-1">backend/</code>) or set <code className="rounded bg-amber-100/80 px-1">VITE_API_BASE_URL</code> in{" "}
              <code className="rounded bg-amber-100/80 px-1">.env.local</code>.
            </div>
          ) : null}

          <div className="rounded-xl border border-[#E8E0D4] bg-[#F5F0E8] px-4 py-3">
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

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#6A5E4B]" style={{ fontFamily: "'Inter', sans-serif" }}>
              <span className="font-medium text-[#3E372B]">{chapter.author}</span>
              <span className="text-[#B5A896]"> · public domain</span>
            </p>
            {isLibraryBookId(bookId) ? (
              <Link
                to={libraryBookPath(bookId)}
                className="text-xs font-medium text-[#C4873A] hover:text-[#A66A2A]"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Choose another chapter →
              </Link>
            ) : null}
          </div>

          {chapter.roles && chapter.roles.length > 0 ? (
            <div className="rounded-xl border border-[#E8E0D4] bg-[#FAF8F4] px-3 py-2.5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6A5E4B]" style={{ fontFamily: "'Inter', sans-serif" }}>
                Cast
              </p>
              <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {chapter.roles.map((role) => (
                  <li
                    key={role.id}
                    className="min-w-0 flex-1 rounded-lg border border-[#E4D8C8] bg-[#FFFCF7] px-2.5 py-2 shadow-sm sm:max-w-[200px] sm:flex-none"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                      <span className="text-xs font-semibold text-[#3E372B]" style={{ fontFamily: "'Inter', sans-serif" }}>
                        {role.displayName}
                      </span>
                      <span
                        className="shrink-0 rounded-full bg-[#EDE6DC] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#5C5346]"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      >
                        {role.roleType === "narrator" ? "Narrator" : "Character"}
                      </span>
                    </div>
                    {role.voiceDescription ? (
                      <p className="mt-1 text-[11px] leading-snug text-[#7A6E5E]" style={{ fontFamily: "'Inter', sans-serif" }}>
                        {role.voiceDescription}
                      </p>
                    ) : null}
                    <p className="mt-1.5 text-[10px] font-medium text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {role.voiceId != null && role.voiceId.trim().length > 0 ? "Voice assigned" : "Voice pending"}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6A5E4B]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Voice focus
            </p>
            <p className="mb-2 text-xs leading-relaxed text-[#7A6E5E]" style={{ fontFamily: "'Inter', sans-serif" }}>
              AIStoryCast can use a narrator plus character voices when cast data is available.
            </p>
            <div className="flex flex-wrap gap-2">
              {voices.map((v) => (
                <button
                  key={v.name}
                  type="button"
                  onClick={() => setActiveVoice(v.name)}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeVoice === v.name
                      ? "border-[#C4873A] bg-[#C4873A]/12 text-[#5C3D1E]"
                      : "border-[#E0D8CC] text-[#5C5346] hover:border-[#C4B89A]"
                  }`}
                  style={{
                    backgroundColor: activeVoice === v.name ? `${v.color}26` : undefined,
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  <i className={`${v.icon} text-xs`} aria-hidden />
                  {v.name}
                </button>
              ))}
            </div>
          </div>

          {activeTip ? (
            <div className="rounded-xl border border-[#E8E0D4] bg-[#FAF8F4] px-4 py-3">
              <p className="text-[#6A5E4B] text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: "'Inter', sans-serif" }}>
                Voice direction — {activeVoice}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
                {activeTip}
              </p>
            </div>
          ) : null}

          {chapter.evolvingFeaturesNote ? (
            <div className="rounded-xl border border-dashed border-[#D9CFBC] bg-[#FFFCF7] px-4 py-3">
              <p className="text-[#6A5E4B] text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: "'Inter', sans-serif" }}>
                Product note
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[#7A6E5E]" style={{ fontFamily: "'Inter', sans-serif" }}>
                {chapter.evolvingFeaturesNote}
              </p>
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6A5E4B]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Storytelling
            </p>
            {showBundledChapterNarrationPlayer ? (
              <>
                {chapter.audioNote ? (
                  <p className="mb-2 text-xs leading-relaxed text-[#7A6E5E]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {chapter.audioNote}
                  </p>
                ) : null}
                <audio ref={audioRef} preload="metadata" className="hidden" />
                {audioStatus === "error" ? (
                  <div className="rounded-xl border border-dashed border-amber-300/80 bg-amber-50/90 px-4 py-3">
                    <p className="text-sm text-amber-950" style={{ fontFamily: "'Inter', sans-serif" }}>
                      Audio unavailable — add <code className="rounded bg-amber-100 px-1 text-xs">public/assets/demo/chapter1.mp3</code> or wire a chapter asset from the API later.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-[#E8E0D4] bg-[#FAF8F4] px-3 py-2.5">
                    {audioStatus === "loading" ? (
                      <p className="mb-2 text-xs text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
                        Loading audio…
                      </p>
                    ) : null}
                    <div className={`flex items-center gap-3 ${audioStatus === "loading" ? "pointer-events-none opacity-60" : ""}`}>
                      <button
                        type="button"
                        onClick={() => void togglePlay()}
                        disabled={audioStatus !== "ready"}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#C4873A] text-white hover:bg-[#D4975A] disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={playing ? "Pause" : "Play"}
                      >
                        <i className={`${playing ? "ri-pause-fill" : "ri-play-fill"} text-base`} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 cursor-pointer items-center rounded-md py-1.5 text-left disabled:cursor-not-allowed"
                        onClick={seekFromBar}
                        disabled={audioStatus !== "ready" || !duration}
                        aria-label="Seek audio"
                      >
                        <div className="pointer-events-none h-1.5 w-full overflow-hidden rounded-full bg-[#E0D4C4]">
                          <div
                            className="h-full rounded-full bg-[#C4873A] transition-[width] duration-150 ease-linear"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </button>
                      <span className="shrink-0 text-[11px] tabular-nums text-[#6A5E4B] whitespace-nowrap" style={{ fontFamily: "'Inter', sans-serif" }}>
                        {formatTime(currentTime)} / {duration > 0 ? formatTime(duration) : "—"}
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-[#E8E0D4] bg-[#FAF8F4] px-3 py-3">
                <p className="text-sm text-[#3E372B]" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Storytelling audio for this chapter has not been generated yet.
                </p>
                <p className="mt-2 text-xs leading-relaxed text-[#7A6E5E]" style={{ fontFamily: "'Inter', sans-serif" }}>
                  For AI-assisted storytelling, open <strong className="font-semibold text-[#3E372B]">Enhanced Story Mode</strong> in the header, then run{" "}
                  <strong className="font-semibold text-[#3E372B]">Generate storytelling</strong> when you are ready to call the helper workflow.
                </p>
              </div>
            )}
          </div>
        </div>
      </header>

      {showEnhancedNarrationBlock ? (
        <div className="mb-6 rounded-2xl border border-[#E0D8CC] bg-[#FDFBF7] p-5 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#6A5E4B]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Generated Storytelling
          </p>
          <p className="whitespace-pre-wrap text-[#2C271F] text-sm leading-8 md:text-base md:leading-9" style={{ fontFamily: "'Lora', serif" }}>
            {helperParsed.narration}
          </p>
          {helperGeneratedAudioSrc ? (
            <div className="mt-4 border-t border-[#E8E0D4] pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#6A5E4B]" style={{ fontFamily: "'Inter', sans-serif" }}>
                Enhanced storytelling audio
              </p>
              <audio ref={helperAudioRef} controls className="w-full rounded-md border border-[#E8E0D4] bg-white" preload="metadata" />
              {helperParsed.audioFileName ? (
                <p className="mt-1 text-[11px] text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {helperParsed.audioFileName}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="rounded-2xl border-2 border-[#D4C4B0] bg-gradient-to-b from-[#EDE6DC] via-[#E8DFD2] to-[#E2D8CA] p-3 shadow-[0_14px_48px_rgba(60,52,40,0.14)] sm:p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:gap-0 lg:rounded-xl lg:border lg:border-[#D4C9BC] lg:bg-[#FFFCF7]/90 lg:shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
            <div className="min-h-[12rem] flex-1 rounded-xl border border-[#E4D8C8] bg-[#FFFCF7] px-5 py-6 shadow-[2px_4px_18px_rgba(50,42,32,0.06)] lg:rounded-none lg:border-0 lg:shadow-none lg:rounded-l-xl lg:border-r lg:border-[#E0D4C4]">
              {showRemoteLoading ? (
                <div className="space-y-4" aria-hidden>
                  <div className="h-3 w-1/3 animate-pulse rounded bg-[#E0D8CC]" />
                  <div className="h-20 animate-pulse rounded-lg bg-[#F0E8DC]" />
                  <div className="h-20 animate-pulse rounded-lg bg-[#F0E8DC]" />
                </div>
              ) : (
                <div className="text-left">{leftParas.map((b, j) => renderBookParagraph(b, j))}</div>
              )}
            </div>
            <div className="min-h-[12rem] flex-1 rounded-xl border border-[#E4D8C8] bg-[#FDF9F3] px-5 py-6 shadow-[2px_4px_18px_rgba(50,42,32,0.06)] lg:rounded-none lg:border-0 lg:shadow-none lg:rounded-r-xl">
              {showRemoteLoading ? (
                <div className="space-y-4" aria-hidden>
                  <div className="h-3 w-[40%] animate-pulse rounded bg-[#E0D8CC] lg:ml-auto" />
                  <div className="h-16 animate-pulse rounded-lg bg-[#F0E8DC]" />
                  <div className="h-24 animate-pulse rounded-lg bg-[#F0E8DC]" />
                </div>
              ) : rightParas.length > 0 ? (
                <div className="text-left">{rightParas.map((b, j) => renderBookParagraph(b, leftPageCount + j))}</div>
              ) : (
                <p className="text-sm italic text-[#9A8E7D]" style={{ fontFamily: "'Lora', serif" }}>
                  This chapter fits on a single page for now — the next spread will appear as the catalog grows.
                </p>
              )}
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-2xl border border-[#E0D8CC] bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#6A5E4B]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Scene image
            </h2>
            {/* Scene image: expects HTTPS image_url from n8n (see block comment on SCENE_IMAGE_WEBHOOK_URL). */}
            <button
              type="button"
              onClick={() => void generateSceneImage()}
              disabled={isGeneratingSceneImage || showRemoteLoading}
              className="w-full rounded-xl border border-[#E0D8CC] bg-[#FAF8F4] px-3 py-2.5 text-xs font-semibold text-[#3E372B] transition-colors hover:border-[#C4873A] hover:bg-[#FFF9F0] disabled:cursor-not-allowed disabled:opacity-50"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {isGeneratingSceneImage ? "Generating scene…" : "Show me this scene"}
            </button>
            {sceneImageError ? (
              <p className="mt-2 text-xs leading-relaxed text-red-700" style={{ fontFamily: "'Inter', sans-serif" }}>
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
                    className="w-full max-w-full rounded-lg border border-[#E8E0D4] object-cover shadow-sm"
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
          </section>

          <section className="flex min-h-[280px] flex-1 flex-col rounded-2xl border border-[#E0D8CC] bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#6A5E4B]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Dissect / insights
            </h2>
            {showStoryInsightsPanel ? (
              <div className="mb-4 space-y-3 rounded-xl border border-[#F0EBE3] bg-[#FAF8F4] p-3">
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    Summary
                  </p>
                  <p className="text-xs leading-relaxed text-[#3E372B]" style={{ fontFamily: "'Inter', sans-serif" }}>
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
                          className="rounded-full border border-[#E0D8CC] bg-white px-2 py-0.5 text-[10px] font-medium text-[#5C5346]"
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
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {helperParsed.imagePrompt ?? "Not provided in response."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mb-4 rounded-xl border border-dashed border-[#E0D8CC] bg-[#FFFCF7] px-3 py-3">
                <p className="text-xs leading-relaxed text-[#6A5E4B]" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Switch to <strong className="font-semibold text-[#3E372B]">Enhanced Story Mode</strong> and run{" "}
                  <strong className="font-semibold text-[#3E372B]">Generate storytelling</strong> to populate summary, characters, and the image prompt used for
                  scenes.
                </p>
              </div>
            )}

            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Discuss
            </p>
            <div className="min-h-[100px] flex-1 space-y-3 overflow-y-auto rounded-xl border border-[#F0EBE3] bg-[#FAF8F4] p-3">
              {discussThread.length === 0 ? (
                <p className="text-xs italic text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Ask about a line or theme — layout only until the discussion service is connected.
                </p>
              ) : (
                discussThread.map((m, idx) => (
                  <div
                    key={idx}
                    className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
                      m.from === "you" ? "border border-[#E8E0D4] bg-white text-[#3E372B]" : "border border-[#C4873A]/25 bg-[#FFF7ED] text-[#3E372B]"
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
                className="min-w-0 flex-1 rounded-xl border border-[#E8E0D4] bg-white px-3 py-2.5 text-xs text-[#1C1A17] outline-none placeholder:text-[#A89880] focus:border-[#C4873A]"
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
          </section>
        </aside>
      </div>
    </div>
  );
}
