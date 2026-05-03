/**
 * Client call to the n8n “generate scene” webhook (same contract as WebhookTestPage).
 * POST JSON: `{ story_text: string }` → response may include `image_url`.
 */

export const AISTORYCAST_SCENE_IMAGE_WEBHOOK_URL =
  "https://n8n.jdpenterprises.ai/webhook/aistorycast-generate-scene";

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Extract a usable image URL from the webhook JSON body (tolerant of wrapper shapes). */
export function parseSceneImageUrlFromResponse(value: unknown): string | null {
  if (!isObject(value)) return null;
  const direct = value.image_url;
  if (typeof direct === "string" && direct.trim().length > 0) return direct.trim();
  const nested = isObject(value.data) ? value.data : isObject(value.output) ? value.output : null;
  if (nested) {
    const u = nested.image_url;
    if (typeof u === "string" && u.trim().length > 0) return u.trim();
  }
  return null;
}

export function parseSceneImageFilenameFromResponse(value: unknown): string | null {
  if (!isObject(value)) return null;
  const fn = value.filename;
  return typeof fn === "string" && fn.length > 0 ? fn : null;
}

export async function requestSceneImage(storyText: string): Promise<{ ok: true; url: string; filename?: string } | { ok: false; error: string }> {
  const trimmed = storyText.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "No text to illustrate." };
  }
  try {
    const response = await fetch(AISTORYCAST_SCENE_IMAGE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ story_text: trimmed }),
      mode: "cors",
    });
    const data = (await response.json()) as unknown;
    if (!response.ok) {
      return { ok: false, error: `Request failed (${response.status} ${response.statusText})` };
    }
    const url = parseSceneImageUrlFromResponse(data);
    if (!url) {
      return { ok: false, error: "No image URL in response." };
    }
    const filename = parseSceneImageFilenameFromResponse(data) ?? undefined;
    return { ok: true, url, filename };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Request failed" };
  }
}
