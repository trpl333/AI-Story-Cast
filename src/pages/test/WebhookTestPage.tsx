import { useState } from "react";

type ChapterHelperPayload = {
  title: string;
  chapterText: string;
  voiceStyle: string;
  targetAge: string;
};

const WEBHOOK_URL = "https://n8n.jdpenterprises.ai/webhook/aistorycast-chapter-helper";

const defaultPayload: ChapterHelperPayload = {
  title: "Alice",
  chapterText: "Alice saw a white rabbit.",
  voiceStyle: "warm narrator",
  targetAge: "8",
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
} {
  if (!isObject(responseJson)) {
    return { summary: null, narration: null, characters: [], imagePrompt: null };
  }

  const source =
    isObject(responseJson.data) ? responseJson.data : isObject(responseJson.output) ? responseJson.output : responseJson;

  return {
    summary: getStringByKeys(source, ["summary", "storySummary", "chapterSummary"]),
    narration: getStringByKeys(source, ["narration", "narrationText", "storyNarration", "voiceover"]),
    characters: getArrayByKeys(source, ["characters", "characterList", "cast"]),
    imagePrompt: getStringByKeys(source, ["imagePrompt", "image_prompt", "prompt", "artPrompt"]),
  };
}

export default function WebhookTestPage() {
  const [payload, setPayload] = useState<ChapterHelperPayload>(defaultPayload);
  const [responseJson, setResponseJson] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setResponseJson(null);

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

  const { summary, narration, characters, imagePrompt } = extractDisplayData(responseJson);
  const hasStructuredContent = Boolean(summary || narration || imagePrompt || characters.length > 0);

  return (
    <div className="min-h-screen bg-[#FAF8F4] px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-semibold text-[#1C1A17]">n8n Webhook Test</h1>

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

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-[#C4873A] px-4 py-2 text-sm font-medium text-white hover:bg-[#B9792E] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Sending..." : "Send Test Request"}
          </button>
        </form>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <section className="rounded-xl border border-[#D9CFBC] bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-medium text-[#1C1A17]">Response Preview</h2>

          {!responseJson ? (
            <p className="text-sm text-[#5A5040]">No response yet.</p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border border-[#E8DECC] bg-[#FDFBF7] p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#6A5E4B]">Summary</p>
                <p className="text-sm text-[#2C271F]">{summary ?? "Not provided in response."}</p>
              </div>

              <div className="rounded-md border border-[#E8DECC] bg-[#FDFBF7] p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#6A5E4B]">Narration</p>
                <p className="whitespace-pre-wrap text-sm text-[#2C271F]">{narration ?? "Not provided in response."}</p>
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
                <p className="whitespace-pre-wrap text-sm text-[#2C271F]">{imagePrompt ?? "Not provided in response."}</p>
              </div>

              {!hasStructuredContent ? (
                <p className="text-xs text-[#6A5E4B]">
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
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
