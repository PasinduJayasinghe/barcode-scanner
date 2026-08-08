/**
 * EAN-8 / UPC-A / EAN-13 validation.
 *
 * Every barcode is put through this regardless of where it came from. A digit
 * transposed by OCR is invisible downstream — the check digit is the only cheap
 * signal we have that the number is intact.
 */

export const VALID_LENGTHS = [8, 12, 13] as const;

export type VerdictLevel = "empty" | "incomplete" | "error" | "notice" | "ok";

export interface BarcodeVerdict {
  /** Digits only, with every other character stripped out. */
  digits: string;
  level: VerdictLevel;
  /** True only when the code is safe to attach to a product. */
  ok: boolean;
  /** Shown inline, in red, under the input. Empty unless level is "error". */
  message: string;
  /** Always populated — explains why the primary action is unavailable. */
  hint: string;
  /** Prefix 2 / 02: valid, but only meaningful inside one retailer's system. */
  storeInternal: boolean;
}

export function normalizeBarcode(raw: string): string {
  return raw.replace(/\D/g, "");
}

/**
 * Reverse the body, weight alternating digits 3 and 1 starting with 3, sum, and
 * the check digit must be (10 - sum mod 10) mod 10. This single formula is
 * correct for all three lengths we accept.
 */
export function isChecksumValid(code: string): boolean {
  if (!/^\d+$/.test(code)) return false;
  if (!(VALID_LENGTHS as readonly number[]).includes(code.length)) return false;

  const body = code.slice(0, -1).split("").map(Number).reverse();
  const check = Number(code[code.length - 1]);
  const sum = body.reduce((acc, digit, i) => acc + digit * (i % 2 === 0 ? 3 : 1), 0);

  return (10 - (sum % 10)) % 10 === check;
}

/** GS1 reserves prefix 2 (EAN-13) and 02 (UPC-A) for in-store use. */
export function isStoreInternal(code: string): boolean {
  return code.startsWith("2") || code.startsWith("02");
}

/**
 * @param raw          Whatever is currently in the input, or came back from OCR.
 * @param existingCodes Barcodes already in the session — the same product scanned
 *                      twice is a user error worth catching at entry.
 */
export function validateBarcode(raw: string, existingCodes: string[] = []): BarcodeVerdict {
  const trimmed = raw.trim();
  const digits = normalizeBarcode(trimmed);
  const base = { digits, ok: false, message: "", storeInternal: false };

  if (!trimmed) {
    return { ...base, level: "empty", hint: "Enter or scan a barcode to continue." };
  }

  if (trimmed !== digits) {
    return {
      ...base,
      level: "error",
      message: "Barcodes are digits only. Remove any letters or spaces.",
      hint: "Barcode contains characters that aren't digits.",
    };
  }

  if (digits.length === 14) {
    return {
      ...base,
      level: "error",
      message: "That's a carton code, not a retail unit. Scan the barcode on the individual pack.",
      hint: "14-digit carton codes can't be added as a product.",
    };
  }

  if (!(VALID_LENGTHS as readonly number[]).includes(digits.length)) {
    return {
      ...base,
      level: "incomplete",
      hint: `Barcodes are 8, 12 or 13 digits — you have ${digits.length}.`,
    };
  }

  if (!isChecksumValid(digits)) {
    return {
      ...base,
      level: "error",
      message: "This barcode doesn't look valid. Check the digits, or scan it again.",
      hint: "The check digit doesn't match the rest of the number.",
    };
  }

  if (existingCodes.includes(digits)) {
    return {
      ...base,
      level: "error",
      message: "This product is already in your session list.",
      hint: "Duplicate barcode — each product can only be added once.",
    };
  }

  const storeInternal = isStoreInternal(digits);

  return {
    digits,
    level: storeInternal ? "notice" : "ok",
    ok: true,
    message: storeInternal
      ? "This looks like a shop's own barcode. It may not work in other systems."
      : "",
    hint: "",
    storeInternal,
  };
}

/**
 * Classifies barcode input as scanner-driven or hand-typed from keystroke timing.
 *
 * A USB scanner in HID keyboard mode emits the whole code as a single burst —
 * a few milliseconds between characters. The fastest human sustains ~100ms.
 * Feed it the timestamps of each keystroke, oldest first.
 */
export const SCANNER_MAX_MEAN_GAP_MS = 30;
export const SCANNER_MAX_SPAN_MS = 400;

export function looksLikeScanner(timestamps: number[]): boolean {
  if (timestamps.length < 5) return false;

  const span = timestamps[timestamps.length - 1] - timestamps[0];
  if (span > SCANNER_MAX_SPAN_MS) return false;

  const meanGap = span / (timestamps.length - 1);
  return meanGap <= SCANNER_MAX_MEAN_GAP_MS;
}
