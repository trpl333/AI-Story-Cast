import { useState } from "react";

type ChapterHelperPayload = {
  title: string;
  chapterText: string;
  voiceStyle: string;
  targetAge: string;
  readingMode: "enhanced" | "exact";
};

const WEBHOOK_URL = "https://n8n.jdpenterprises.ai/webhook/aistorycast-chapter-helper";
const IMAGE_WEBHOOK_URL = "https://n8n.jdpenterprises.ai/webhook/aistorycast-generate-scene";

const defaultPayload: ChapterHelperPayload = {
  title: "Alice",
  chapterText: "Alice saw a white rabbit.",
  voiceStyle: "warm narrator",
  targetAge: "8",
  readingMode: "enhanced",
};

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStringArray(value: unknown): string[] {
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

function getStringByKeys(obj: JsonObject, keys: string[]): string | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return null;
}

function getArrayByKeys(obj: JsonObject, keys: string[]): string[] {
  for (const key of keys) {
    const value = obj[key];
    const arr = toStringArray(value);
    if (arr.length > 0) return arr;
  }
  return [];
}

function extractDisplayData(responseJson: unknown): {
  summary: string | null;
  narration: string | null;
  characters: string[];
  imagePrompt: string | null;
  audioBase64: string | null;
  audioMimeType: string | null;
  audioFileName: string | null;
} {
  if (!isObject(responseJson)) {
    return {
      summary: null,
      narration: null,
      characters: [],
      imagePrompt: null,
      audioBase64: null,
      audioMimeType: null,
      audioFileName: null,
    };
  }

  const source =
    isObject(responseJson.data) ? responseJson.data : isObject(responseJson.output) ? responseJson.output : responseJson;

  return {
    summary: getStringByKeys(source, ["summary", "storySummary", "chapterSummary"]),
    narration: getStringByKeys(source, ["narration", "narrationText", "storyNarration", "voiceover"]),
    characters: getArrayByKeys(source, ["characters", "characterList", "cast"]),
    imagePrompt: getStringByKeys(source, ["imagePrompt", "image_prompt", "prompt", "artPrompt"]),
    audioBase64: getStringByKeys(source, ["audioBase64"]),
    audioMimeType: getStringByKeys(source, ["audioMimeType"]),
    audioFileName: getStringByKeys(source, ["audioFileName"]),
  };
}

function getSceneImageUrl(value: unknown): string | null {
  if (!isObject(value)) return null;
  const url = value.image_url;
  return typeof url === "string" && url.length > 0 ? url : null;
}

function getSceneImageFilename(value: unknown): string | null {
  if (!isObject(value)) return null;
  const filename = value.filename;
  return typeof filename === "string" && filename.length > 0 ? filename : null;
}

export default function WebhookTestPage() {
  const [payload, setPayload] = useState<ChapterHelperPayload>(defaultPayload);
  const [responseJson, setResponseJson] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [imageResponseJson, setImageResponseJson] = useState<unknown>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setResponseJson(null);
    setImageResponseJson(null);
    setImageError(null);

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as unknown;

      if (!response.ok) {
        setError(`Request failed (${response.status} ${response.statusText})`);
      }

      setResponseJson(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onGenerateImage = async () => {
    if (responseJson == null) return;

    setIsGeneratingImage(true);
    setImageError(null);
    setImageResponseJson(null);

    const { imagePrompt: extractedImagePrompt } = extractDisplayData(responseJson);
    const story_text = extractedImagePrompt || payload.chapterText;

    try {
      const response = await fetch(IMAGE_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ story_text }),
      });

      const data = (await response.json()) as unknown;

      if (!response.ok) {
        setImageError(`Request failed (${response.status} ${response.statusText})`);
      }

      setImageResponseJson(data);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const { summary, narration, characters, imagePrompt, audioBase64, audioMimeType, audioFileName } =
    extractDisplayData(responseJson);
  const hasStructuredContent = Boolean(summary || narration || imagePrompt || characters.length > 0);
  const generatedAudioSrc = audioBase64 && audioMimeType ? `data:${audioMimeType};base64,${audioBase64}` : null;
  const sceneImageUrl = getSceneImageUrl(imageResponseJson);
  const sceneImageFilename = getSceneImageFilename(imageResponseJson);

  return (
    <div className="min-h-screen bg-[#FAF8F4] px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-2xl font-semibold text-[#1C1A17]">AIStoryCast Story Screen</h1>

        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-[#D9CFBC] bg-white p-5 shadow-sm">
          <label className="block text-sm text-[#3E372B]">
            Title
            <input
              type="text"
              className="mt-1 w-full rounded-md border border-[#D9CFBC] px-3 py-2 text-sm"
              value={payload.title}
              onChange={(e) => setPayload((prev) => ({ ...prev, title: e.target.value }))}
            />
          </label>

          <label className="block text-sm text-[#3E372B]">
            Chapter Text
            <textarea
              className="mt-1 w-full rounded-md border border-[#D9CFBC] px-3 py-2 text-sm"
              rows={4}
              value={payload.chapterText}
              onChange={(e) => setPayload((prev) => ({ ...prev, chapterText: e.target.value }))}
            />
          </label>

          <label className="block text-sm text-[#3E372B]">
            Voice Style
            <input
              type="text"
              className="mt-1 w-full rounded-md border border-[#D9CFBC] px-3 py-2 text-sm"
              value={payload.voiceStyle}
              onChange={(e) => setPayload((prev) => ({ ...prev, voiceStyle: e.target.value }))}
            />
          </label>

          <label className="block text-sm text-[#3E372B]">
            Target Age
            <input
              type="text"
              className="mt-1 w-full rounded-md border border-[#D9CFBC] px-3 py-2 text-sm"
              value={payload.targetAge}
              onChange={(e) => setPayload((prev) => ({ ...prev, targetAge: e.target.value }))}
            />
          </label>

          <label className="block text-sm text-[#3E372B]">
            Reading Mode
            <select
              className="mt-1 w-full rounded-md border border-[#D9CFBC] bg-white px-3 py-2 text-sm"
              value={payload.readingMode}
              onChange={(e) =>
                setPayload((prev) => ({
                  ...prev,
                  readingMode: e.target.value as ChapterHelperPayload["readingMode"],
                }))
              }
            >
              <option value="enhanced">Enhanced Story Mode</option>
              <option value="exact">Read Exactly</option>
            </select>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-[#C4873A] px-4 py-2 text-sm font-medium text-white hover:bg-[#B9792E] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Starting..." : "Start Story"}
          </button>
        </form>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        {!responseJson ? (
          <section className="rounded-xl border border-[#D9CFBC] bg-white p-5 shadow-sm">
            <p className="text-sm text-[#5A5040]">Start a story to open the immersive view.</p>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
              <div className="rounded-xl border border-[#D9CFBC] bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-lg font-semibold text-[#1C1A17]">Open Book</h2>
                {generatedAudioSrc ? (
                  <div className="mb-4 rounded-md border border-[#E8DECC] bg-[#FDFBF7] p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6A5E4B]">
                      Generated Narration Audio
                    </p>
                    {audioFileName ? <p className="mb-2 text-xs text-[#6A5E4B]">{audioFileName}</p> : null}
                    <audio controls className="w-full">
                      <source src={generatedAudioSrc} type={audioMimeType ?? undefined} />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                ) : null}

                <div className="rounded-md border border-[#E8DECC] bg-[#FDFBF7] p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6A5E4B]">
                    Generated Narration
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#2C271F]">
                    {narration ?? "Narration is not available in this response yet."}
                  </p>
                </div>

                <div className="mt-3 rounded-md border border-[#E8DECC] bg-[#FBF7F0] p-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#6A5E4B]">
                    Source Passage
                  </p>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-[#5A5040]">
                    {payload.chapterText || "No chapter text entered yet."}
                  </p>
                </div>
              </div>

              <aside className="space-y-4 rounded-xl border border-[#D9CFBC] bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-[#1C1A17]">Story Insights</h3>

                <div className="rounded-md border border-[#E8DECC] bg-[#FDFBF7] p-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#6A5E4B]">Summary</p>
                  <p className="text-sm text-[#2C271F]">{summary ?? "Not provided in response."}</p>
                </div>

                <div className="rounded-md border border-[#E8DECC] bg-[#FDFBF7] p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6A5E4B]">Characters</p>
                  {characters.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {characters.map((name) => (
                        <span
                          key={name}
                          className="rounded-full border border-[#D9CFBC] bg-[#F5EFE3] px-2.5 py-1 text-xs font-medium text-[#3E372B]"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#2C271F]">Not provided in response.</p>
                  )}
                </div>

                <div className="rounded-md border border-[#E8DECC] bg-[#FDFBF7] p-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#6A5E4B]">Image Prompt</p>
                  <p className="whitespace-pre-wrap text-sm text-[#2C271F]">
                    {imagePrompt ?? "Not provided in response."}
                  </p>
                  <button
                    type="button"
                    onClick={() => void onGenerateImage()}
                    disabled={isGeneratingImage}
                    className="mt-3 rounded-md bg-[#C4873A] px-4 py-2 text-sm font-medium text-white hover:bg-[#B9792E] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isGeneratingImage ? "Generating..." : "Generate Scene Image"}
                  </button>
                  {imageError ? <p className="mt-2 text-sm text-red-700">{imageError}</p> : null}
                  {sceneImageUrl ? (
                    <div className="mt-3">
                      <img
                        src={sceneImageUrl}
                        alt="Generated scene"
                        className="max-w-full rounded-md border border-[#D9CFBC]"
                      />
                      {sceneImageFilename ? (
                        <p className="mt-2 text-xs text-[#6A5E4B]">{sceneImageFilename}</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-md border border-[#E8DECC] bg-[#FDFBF7] p-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#6A5E4B]">
                    Hidden Meaning / Easter Egg
                  </p>
                  <p className="text-sm text-[#2C271F]">
                    Coming soon: AI will reveal themes, symbols, and hidden meaning in this passage.
                  </p>
                </div>
              </aside>
            </div>

            <section className="rounded-xl border border-[#D9CFBC] bg-white p-5 shadow-sm">
              {!hasStructuredContent ? (
                <p className="mb-3 text-xs text-[#6A5E4B]">
                  Structured keys were not found; use Raw JSON below to inspect the payload shape.
                </p>
              ) : null}
              <div className="rounded-md border border-[#E8DECC] bg-[#FBF7F0] p-3">
                <button
                  type="button"
                  onClick={() => setShowRawJson((prev) => !prev)}
                  className="text-xs font-semibold text-[#6A5E4B] hover:text-[#3E372B]"
                >
                  {showRawJson ? "Hide Raw JSON" : "Show Raw JSON"}
                </button>
                {showRawJson ? (
                  <pre className="mt-3 overflow-x-auto rounded-md bg-[#F7F4EE] p-3 text-xs text-[#2C271F]">
                    {JSON.stringify(responseJson, null, 2)}
                  </pre>
                ) : null}
              </div>
            </section>
          </section>
        )}
      </div>
    </div>
  );
}
