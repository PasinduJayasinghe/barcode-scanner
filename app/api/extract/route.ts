import { GoogleGenAI } from "@google/genai";

import { buildTaskPrompt, SYSTEM_INSTRUCTION } from "@/lib/gemini-prompt";
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

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

/** Two 1024px JPEGs land around 1MB of base64; this leaves generous headroom. */
const MAX_IMAGE_BASE64_CHARS = 4_000_000;

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return fail("CONFIG", "The server is missing its Gemini API key. Set GEMINI_API_KEY.", 500);
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

  let rawText: string;
  try {
    const ai = new GoogleGenAI({ apiKey });

    // One call, both images. The model can only reconcile the front and back —
    // name on one, price and barcode on the other — if it sees them together.
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: "Image 1: front of pack" },
            { inlineData: { mimeType: body.front.mimeType, data: body.front.base64 } },
            { text: "Image 2: back of pack" },
            { inlineData: { mimeType: body.back.mimeType, data: body.back.base64 } },
            { text: buildTaskPrompt(suppliedBarcode) },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    rawText = response.text ?? "";
  } catch (error) {
    return fromUpstreamError(error);
  }

  if (!rawText.trim()) {
    return fail("PARSE", "Gemini returned an empty response. Try again.", 502);
  }

  const parsed = parseModelJson(rawText);
  if (!parsed) {
    return fail(
      "PARSE",
      "Gemini's reply wasn't valid JSON. This usually clears on a retry.",
      502,
    );
  }

  consumeQuota(key);

  return Response.json({
    ok: true,
    data: normalize(parsed, suppliedBarcode),
  } satisfies ExtractResponse);
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
 * The model is asked for bare JSON and pinned to an application/json response
 * mime type, but a stray ```json fence still turns up occasionally. Strip it
 * before parsing rather than surfacing a syntax error to the shopkeeper.
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

  const modelBarcode =
    typeof raw.barcode === "string" ? normalizeBarcode(raw.barcode) : "";

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

/** Gemini's own rate limit must read differently from the user's daily quota. */
function fromUpstreamError(error: unknown): Response {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[extract] Gemini request failed:", message);

  // The SDK puts the upstream JSON body in `message`, so the reliable signal is
  // the `status` string inside it rather than the HTTP code — a rejected key
  // comes back as 400 INVALID_ARGUMENT / API_KEY_INVALID, not 401.
  const httpStatus = (error as { status?: number })?.status;
  const upstream = `${message} ${httpStatus ?? ""}`;

  if (/API_KEY_INVALID|PERMISSION_DENIED|UNAUTHENTICATED|API key not valid/i.test(upstream)) {
    return fail(
      "CONFIG",
      "Gemini rejected the API key. Check GEMINI_API_KEY on the server.",
      500,
    );
  }

  if (httpStatus === 429 || /RESOURCE_EXHAUSTED|rate.?limit|too many requests/i.test(upstream)) {
    return fail(
      "RATE_LIMIT",
      "Gemini is rate limiting requests right now. Wait a moment and retry — this is not your daily product limit.",
      503,
    );
  }

  return fail("UPSTREAM", "Couldn't reach Gemini. Check your connection and retry.", 502);
}

function fail(code: ExtractErrorCode, message: string, status: number): Response {
  return Response.json({ ok: false, error: { code, message } } satisfies ExtractResponse, {
    status,
  });
}
