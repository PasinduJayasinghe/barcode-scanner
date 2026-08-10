import { SOURCE_LABEL, type SessionProduct } from "../types";

/** Everything a single export column is allowed to contain. */
export type FieldId =
  | "name"
  | "rawName"
  | "brand"
  | "size"
  | "barcode"
  | "category"
  | "unit"
  | "price"
  | "barcodeSource"
  | "needsReview"
  | "rowNumber"
  | "constant";

export interface ResolveContext {
  /** Zero-based row index, before the header is prepended. */
  index: number;
  /** Names with duplicates already suffixed — see `resolveDuplicateNames`. */
  resolvedNames: string[];
  /** The column's fixed text, when the field is `constant`. */
  constant: string;
}

export interface FieldDef {
  id: FieldId;
  label: string;
  group: "product" | "provenance" | "fixed";
  hint?: string;
  /**
   * `number` fields become real numeric cells in .xlsx, so Excel can sum a
   * Price column instead of treating it as text.
   */
  kind: "text" | "number";
  resolve(product: SessionProduct, ctx: ResolveContext): string | number | null;
  /** Overrides how the resolved value is rendered into a CSV cell. */
  toCsv?(value: string | number | null): string;
}

/**
 * Reproduces the original `formatPrice` exactly, including its quirk of turning
 * an empty price into `0.00` rather than an empty cell. That behaviour is
 * covered by the golden-file test, so it must not be "tidied up" here without
 * deliberately updating the golden.
 */
function priceValue(raw: string): number | null {
  const value = Number(raw.replace(/[^\d.]/g, ""));
  return Number.isFinite(value) ? value : null;
}

export const FIELDS: FieldDef[] = [
  {
    id: "name",
    label: "Product name",
    group: "product",
    hint: "Duplicates get a numbered suffix so the import isn't rejected",
    kind: "text",
    resolve: (_p, ctx) => ctx.resolvedNames[ctx.index] ?? "",
  },
  {
    id: "rawName",
    label: "Product name (no de-duplication)",
    group: "product",
    hint: "The name exactly as entered, even if another row matches it",
    kind: "text",
    resolve: (p) => p.name.trim(),
  },
  { id: "brand", label: "Brand", group: "product", kind: "text", resolve: (p) => p.brand.trim() },
  { id: "size", label: "Size / weight", group: "product", kind: "text", resolve: (p) => p.size.trim() },
  { id: "barcode", label: "Barcode", group: "product", kind: "text", resolve: (p) => p.barcode },
  { id: "category", label: "Product group", group: "product", kind: "text", resolve: (p) => p.category },
  { id: "unit", label: "Unit", group: "product", kind: "text", resolve: (p) => p.unit },
  {
    id: "price",
    label: "Price (MRP)",
    group: "product",
    kind: "number",
    resolve: (p) => priceValue(p.price),
    toCsv: (value) => (typeof value === "number" ? value.toFixed(2) : ""),
  },
  {
    id: "rowNumber",
    label: "Row number",
    group: "product",
    kind: "number",
    resolve: (_p, ctx) => ctx.index + 1,
  },
  {
    id: "barcodeSource",
    label: "Barcode source",
    group: "provenance",
    hint: "Scanned, typed by hand, or read from the photo",
    kind: "text",
    resolve: (p) => SOURCE_LABEL[p.barcodeSource],
  },
  {
    id: "needsReview",
    label: "Needs review",
    group: "provenance",
    hint: "Yes when the barcode came from OCR",
    kind: "text",
    resolve: (p) => (p.needsReview ? "Yes" : "No"),
  },
  {
    id: "constant",
    label: "Fixed value",
    group: "fixed",
    hint: "The same text in every row — for flag columns your POS requires",
    kind: "text",
    resolve: (_p, ctx) => ctx.constant,
  },
];

const BY_ID = new Map(FIELDS.map((f) => [f.id, f]));

export function fieldDef(id: FieldId): FieldDef {
  return BY_ID.get(id) ?? BY_ID.get("constant")!;
}

/**
 * A repeated Name aborts the whole Aronium import, so collisions are resolved
 * before they reach the file. First occurrence keeps the clean name; later ones
 * get " (2)", " (3)", … Comparison is case-insensitive and whitespace-tolerant,
 * because Aronium's uniqueness check is too.
 */
export function resolveDuplicateNames(products: SessionProduct[]): string[] {
  const seen = new Map<string, number>();

  return products.map((product) => {
    const name = product.name.trim();
    const key = name.toLowerCase().replace(/\s+/g, " ");
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    return count === 1 ? name : `${name} (${count})`;
  });
}
