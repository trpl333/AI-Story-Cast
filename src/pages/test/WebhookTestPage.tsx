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

export default function WebhookTestPage() {
  const [payload, setPayload] = useState<ChapterHelperPayload>(defaultPayload);
  const [responseJson, setResponseJson] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          <h2 className="mb-2 text-base font-medium text-[#1C1A17]">JSON Response</h2>
          <pre className="overflow-x-auto rounded-md bg-[#F7F4EE] p-3 text-xs text-[#2C271F]">
            {responseJson ? JSON.stringify(responseJson, null, 2) : "No response yet."}
          </pre>
        </section>
      </div>
    </div>
  );
}
