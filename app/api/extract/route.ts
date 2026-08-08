import { buildTaskPrompt, SYSTEM_INSTRUCTION } from "@/lib/prompt";
import { clientKey, consumeQuota, hasQuota } from "@/lib/server-quota";
import { normalizeBarcode } from "@/lib/barcode";
import {
  CATEGORIES,
  FALLBACK_CATEGORY,
  type Category,
  type ExtractErrorCode,
  type ExtractRequestBody,
  type ExtractedProduct,
  type ExtractResponse,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

/**
 * The only image-capable model on Groq's free tier. It handles multiple images
 * in one request, which the whole design depends on — the front and back have
 * to be cross-referenced, not read separately.
 *
 * Free-tier limits are 1000 requests/day but only 8000 tokens/minute, and a
 * 1024px image pair costs ~3700 of those. Tokens, not requests, are what runs
 * out; see the rate-limit handling below.
 */
const MODEL = process.env.GROQ_MODEL ?? "qwen/qwen3.6-27b";

/** Two 1024px JPEGs land around 1MB of base64; this leaves generous headroom. */
const MAX_IMAGE_BASE64_CHARS = 4_000_000;

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return fail("CONFIG", "The server is missing its Groq API key. Set GROQ_API_KEY.", 500);
  }

  let body: ExtractRequestBody;
  try {
    body = (await request.json()) as ExtractRequestBody;
  } catch {
    return fail("BAD_REQUEST", "The request body could not be read.", 400);
  }

  const invalid = validateRequest(body);
  if (invalid) return fail("BAD_REQUEST", invalid, 400);

  // Checked before the call, consumed only after it succeeds.
  const key = clientKey(request);
  if (!hasQuota(key)) {
    return fail("QUOTA", "You've reached today's limit of 10 products.", 429);
  }

  const suppliedBarcode = body.barcode ? normalizeBarcode(body.barcode) : null;

  let response: Response;
  try {
    response = await callGroq(apiKey, body, suppliedBarcode);
  } catch {
    return fail("UPSTREAM", "Couldn't reach Groq. Check your connection and retry.", 502);
  }

  if (!response.ok) {
    return await fromUpstreamError(response);
  }

  const payload = (await response.json().catch(() => null)) as GroqResponse | null;
  const rawText = payload?.choices?.[0]?.message?.content ?? "";

  if (!rawText.trim()) {
    return fail("PARSE", "The model returned an empty response. Try again.", 502);
  }

  const parsed = parseModelJson(rawText);
  if (!parsed) {
    return fail("PARSE", "The model's reply wasn't valid JSON. This usually clears on a retry.", 502);
  }

  consumeQuota(key);

  return Response.json({
    ok: true,
    data: normalize(parsed, suppliedBarcode),
  } satisfies ExtractResponse);
}

interface GroqResponse {
  choices?: { message?: { content?: string } }[];
}

/**
 * One call, both images. The model can only reconcile the front and back —
 * name on one, price and barcode on the other — if it sees them together.
 *
 * `reasoning_effort: "none"` matters more than it looks. Qwen thinks before
 * answering by default, which spends hundreds of completion tokens against an
 * 8000/minute ceiling and buys nothing: reading fields off a label is
 * perception, not reasoning. With it off, completions run ~20 tokens.
 */
function callGroq(
  apiKey: string,
  body: ExtractRequestBody,
  suppliedBarcode: string | null,
): Promise<Response> {
  const dataUrl = (image: { mimeType: string; base64: string }) =>
    `data:${image.mimeType};base64,${image.base64}`;

  return fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.1,
      max_tokens: 1200,
      reasoning_effort: "none",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        {
          role: "user",
          content: [
            { type: "text", text: "Image 1: front of pack" },
            { type: "image_url", image_url: { url: dataUrl(body.front) } },
            { type: "text", text: "Image 2: back of pack" },
            { type: "image_url", image_url: { url: dataUrl(body.back) } },
            { type: "text", text: buildTaskPrompt(suppliedBarcode) },
          ],
        },
      ],
    }),
  });
}

function validateRequest(body: ExtractRequestBody): string | null {
  for (const side of ["front", "back"] as const) {
    const image = body?.[side];
    if (!image?.base64 || !image?.mimeType) {
      return `The ${side} photograph is missing.`;
    }
    if (image.base64.length > MAX_IMAGE_BASE64_CHARS) {
      return `The ${side} photograph is too large.`;
    }
  }
  return null;
}

/**
 * JSON mode is requested, but a stray ```json fence still turns up
 * occasionally. Strip it before parsing rather than surfacing a syntax error
 * to the shopkeeper.
 */
function parseModelJson(raw: string): Record<string, unknown> | null {
  const candidates = [raw.trim(), stripFences(raw), sliceOutermostObject(raw)];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const value = JSON.parse(candidate) as unknown;
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return value as Record<string, unknown>;
      }
    } catch {
      // Try the next shape.
    }
  }

  return null;
}

function stripFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function sliceOutermostObject(raw: string): string {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  return start !== -1 && end > start ? raw.slice(start, end + 1) : "";
}

/** Coerces whatever came back into the shape the client is typed against. */
function normalize(raw: Record<string, unknown>, suppliedBarcode: string | null): ExtractedProduct {
  const confidence = (raw.confidence ?? {}) as Record<string, unknown>;

  const modelBarcode = typeof raw.barcode === "string" ? normalizeBarcode(raw.barcode) : "";

  return {
    productName: text(raw.productName),
    brand: text(raw.brand),
    size: text(raw.size),
    // A supplied barcode always wins — that's the whole point of capturing it.
    barcode: suppliedBarcode || modelBarcode || null,
    price: number(raw.price),
    category: category(raw.category),
    unit: text(raw.unit) || "pcs",
    confidence: {
      productName: confidenceScore(confidence.productName),
      barcode: suppliedBarcode ? 1 : confidenceScore(confidence.barcode),
      price: confidenceScore(confidence.price),
    },
  };
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.]/g, ""));
    if (Number.isFinite(parsed) && value.trim() !== "") return parsed;
  }
  return null;
}

function category(value: unknown): Category {
  const raw = text(value);
  const match = CATEGORIES.find((c) => c.toLowerCase() === raw.toLowerCase());
  return match ?? FALLBACK_CATEGORY;
}

function confidenceScore(value: unknown): number {
  const parsed = number(value);
  if (parsed === null) return 0;
  return Math.max(0, Math.min(1, parsed));
}

/** Groq's own limits must read differently from the user's daily quota. */
async function fromUpstreamError(response: Response): Promise<Response> {
  const detail = await response.text().catch(() => "");
  console.error(`[extract] Groq request failed: ${response.status} ${detail.slice(0, 400)}`);

  if (response.status === 401 || response.status === 403) {
    return fail("CONFIG", "Groq rejected the API key. Check GROQ_API_KEY on the server.", 500);
  }

  if (response.status === 429) {
    // Tokens per minute, not requests per day, is what actually runs out here —
    // an image pair costs ~3700 of an 8000/min budget. Groq tells us how long
    // to wait, so pass that on instead of a vague "try later".
    const wait = Math.ceil(Number(response.headers.get("retry-after") ?? "30"));
    const seconds = Number.isFinite(wait) && wait > 0 ? wait : 30;
    return fail(
      "RATE_LIMIT",
      `Groq's per-minute limit is full — two photos use most of it. Wait about ${seconds} seconds and press Extract again. This is Groq's limit, not your daily one, and it hasn't cost you a scan.`,
      503,
    );
  }

  // Groq's capacity problem, not the user's connection.
  if (response.status === 503 || response.status === 502) {
    return fail(
      "BUSY",
      "Groq is busy right now — that's on their side, not yours. Wait a few seconds and press Extract again; it hasn't cost you a scan.",
      503,
    );
  }

  if (response.status === 413) {
    return fail("BAD_REQUEST", "Those photos were too large to send. Retake them.", 400);
  }

  return fail("UPSTREAM", "Couldn't reach Groq. Check your connection and retry.", 502);
}

function fail(code: ExtractErrorCode, message: string, status: number): Response {
  return Response.json({ ok: false, error: { code, message } } satisfies ExtractResponse, {
    status,
  });
}
