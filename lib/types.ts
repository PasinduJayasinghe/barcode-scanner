/** Where a barcode's digits came from. Drives the trust model across the app. */
export type BarcodeSource = "scanned" | "typed" | "photo";

export const SOURCE_LABEL: Record<BarcodeSource, string> = {
  scanned: "Scanned",
  typed: "Typed by hand",
  photo: "Read from photo",
};

/** Two-letter mono badge used in dense table rows. */
export const SOURCE_MARK: Record<BarcodeSource, string> = {
  scanned: "SC",
  typed: "TY",
  photo: "PH",
};

/** A photo after client-side downscale + JPEG re-encode. */
export interface CapturedImage {
  /** `data:image/jpeg;base64,...` — for <img> previews only. */
  dataUrl: string;
  /** Bare base64 payload, no data-URL prefix — this is what goes to Gemini. */
  base64: string;
  mimeType: string;
  width: number;
  height: number;
  bytes: number;
}

export const CATEGORIES = [
  "MART/Beverages",
  "MART/Snacks & Confectionery",
  "MART/Dairy & Frozen",
  "MART/Dry Goods",
  "MART/Personal Care",
  "MART/Household",
  "MART",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const FALLBACK_CATEGORY: Category = "MART";

export interface FieldConfidence {
  productName: number;
  barcode: number;
  price: number;
}

/** The shape Gemini is asked to return, after normalisation. */
export interface ExtractedProduct {
  productName: string;
  brand: string;
  size: string;
  barcode: string | null;
  price: number | null;
  category: Category;
  unit: string;
  confidence: FieldConfidence;
}

/** Editable form state on the results screen. Everything is a string here so
 *  partially-typed values (e.g. "12.") don't get mangled mid-keystroke. */
export interface ProductForm {
  name: string;
  brand: string;
  size: string;
  barcode: string;
  price: string;
  category: string;
  unit: string;
}

/** A product committed to the session list. */
export interface SessionProduct extends ProductForm {
  id: string;
  barcodeSource: BarcodeSource;
  confidence: FieldConfidence;
  /** True when the barcode came from OCR — a transposition can still checksum. */
  needsReview: boolean;
  storeInternal: boolean;
}

export type ExtractErrorCode =
  | "CONFIG"
  | "BAD_REQUEST"
  | "QUOTA"
  | "RATE_LIMIT"
  | "PARSE"
  | "UPSTREAM";

export interface ExtractErrorBody {
  ok: false;
  error: { code: ExtractErrorCode; message: string };
}

export interface ExtractSuccessBody {
  ok: true;
  data: ExtractedProduct;
}

export type ExtractResponse = ExtractSuccessBody | ExtractErrorBody;

export interface ExtractRequestBody {
  front: { base64: string; mimeType: string };
  back: { base64: string; mimeType: string };
  /** Digits captured by scanner/keyboard, or null when the user skipped. */
  barcode: string | null;
  barcodeSource: BarcodeSource;
}
