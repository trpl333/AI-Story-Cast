/**
 * Client call to the n8n “generate scene” webhook.
 * POST JSON: `{ story_text: string }` → response may be JSON (`image_url`) or raw image bytes (e.g. PNG).
 */

export const AISTORYCAST_SCENE_IMAGE_WEBHOOK_URL =
  "https://n8n.jdpenterprises.ai/webhook/aistorycast-generate-scene";

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** PNG file signature */
function isPngMagic(buf: ArrayBuffer): boolean {
  const u8 = new Uint8Array(buf);
  return u8.length >= 8 && u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47 && u8[4] === 0x0d && u8[5] === 0x0a && u8[6] === 0x1a && u8[7] === 0x0a;
}

function isJpegMagic(buf: ArrayBuffer): boolean {
  const u8 = new Uint8Array(buf);
  return u8.length >= 3 && u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff;
}

function sniffImageMime(buf: ArrayBuffer): string | null {
  if (isPngMagic(buf)) return "image/png";
  if (isJpegMagic(buf)) return "image/jpeg";
  const u8 = new Uint8Array(buf);
  if (u8.length >= 6 && u8[0] === 0x47 && u8[1] === 0x49 && u8[2] === 0x46 && u8[3] === 0x38) return "image/gif";
  if (
    u8.length >= 12 &&
    u8[0] === 0x52 &&
    u8[1] === 0x49 &&
    u8[2] === 0x46 &&
    u8[3] === 0x46 &&
    u8[8] === 0x57 &&
    u8[9] === 0x45 &&
    u8[10] === 0x42 &&
    u8[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
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

/**
 * Revoke a blob: URL created by {@link requestSceneImage} when you no longer need the image.
 */
export function revokeSceneObjectUrl(url: string | null | undefined): void {
  if (url && url.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }
}

export async function requestSceneImage(
  storyText: string,
): Promise<{ ok: true; url: string; filename?: string } | { ok: false; error: string }> {
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

    const buf = await response.arrayBuffer();
    const ctRaw = response.headers.get("content-type") ?? "";
    const ct = ctRaw.toLowerCase().split(";")[0].trim();

    if (response.ok) {
      if (ct.startsWith("image/")) {
        const mime = ct || "image/png";
        if (buf.byteLength === 0) {
          return { ok: false, error: "Empty image response." };
        }
        const url = URL.createObjectURL(new Blob([buf], { type: mime }));
        return { ok: true, url };
      }

      const sniffed = sniffImageMime(buf);
      if (sniffed) {
        const url = URL.createObjectURL(new Blob([buf], { type: sniffed }));
        return { ok: true, url };
      }
    }

    const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    let data: unknown;
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      if (!response.ok) {
        return { ok: false, error: `Request failed (${response.status} ${response.statusText}).` };
      }
      return {
        ok: false,
        error:
          "The server did not return a supported image or JSON. If this is an image workflow, ensure Content-Type is image/png or the body is valid PNG data.",
      };
    }

    if (!response.ok) {
      const msg =
        typeof data === "object" && data !== null && "message" in data && typeof (data as { message: unknown }).message === "string"
          ? String((data as { message: string }).message)
          : `Request failed (${response.status} ${response.statusText})`;
      return { ok: false, error: msg };
    }

    const url = parseSceneImageUrlFromResponse(data);
    if (url) {
      const filename = parseSceneImageFilenameFromResponse(data) ?? undefined;
      return { ok: true, url, filename };
    }

    return { ok: false, error: "No image URL in JSON response." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Request failed" };
  }
}
