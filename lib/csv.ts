import type { SessionProduct } from "./types";

/** Aronium's import columns, in the exact order it expects them. */
export const CSV_HEADERS = [
  "Name",
  "ProductGroup",
  "SKU",
  "Barcode",
  "MeasurementUnit",
  "Cost",
  "Markup",
  "Price",
  "Tax",
  "IsTaxInclusivePrice",
  "IsPriceChangeAllowed",
  "IsUsingDefaultQuantity",
  "IsService",
  "IsEnabled",
  "Description",
  "Quantity",
] as const;

const CRLF = "\r\n";

/**
 * Excel and LibreOffice evaluate any cell whose text starts with one of these,
 * even inside a quoted CSV field. Quoting is not a defence.
 */
const FORMULA_LEAD = /^[=+\-@\t\r]/;

/**
 * Spreadsheet formula injection is a live risk here, not a theoretical one:
 * product names arrive from OCR of a photographed label, so their first
 * character is chosen by whoever printed the packaging. A name like
 * `=HYPERLINK("http://…")` lands in the CSV, and the shopkeeper opening the
 * file to check it before importing is enough to fire it.
 *
 * A leading apostrophe forces the cell to be read as literal text. It is
 * preserved rather than stripped so no data is silently lost — and legitimate
 * retail names effectively never begin with these characters, so the cosmetic
 * cost falls only on input that was already anomalous.
 */
function escapeField(value: string): string {
  const safe = FORMULA_LEAD.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
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

/** Products that can't be exported yet, with the reason. */
export function findExportBlockers(products: SessionProduct[]): string[] {
  const blockers: string[] = [];

  const missingPrice = products.filter((p) => p.price.trim() === "").length;
  if (missingPrice > 0) {
    blockers.push(
      `${missingPrice} product${missingPrice === 1 ? "" : "s"} still need a price.`,
    );
  }

  const missingName = products.filter((p) => p.name.trim() === "").length;
  if (missingName > 0) {
    blockers.push(
      `${missingName} product${missingName === 1 ? "" : "s"} still need a name.`,
    );
  }

  return blockers;
}

function formatPrice(raw: string): string {
  const value = Number(raw.replace(/[^\d.]/g, ""));
  return Number.isFinite(value) ? value.toFixed(2) : "";
}

/**
 * Builds the import file. CRLF line endings, UTF-8, no BOM — the disclaimer
 * deliberately stays out of here so the file imports clean.
 */
export function buildCsv(products: SessionProduct[]): string {
  const names = resolveDuplicateNames(products);

  const rows = products.map((product, i) =>
    [
      names[i], // Name
      product.category, // ProductGroup
      "", // SKU
      product.barcode, // Barcode
      product.unit, // MeasurementUnit
      "0", // Cost — comes from the supplier invoice, never from packaging
      "0", // Markup
      formatPrice(product.price), // Price — the printed MRP
      "", // Tax
      "1", // IsTaxInclusivePrice
      "0", // IsPriceChangeAllowed
      "1", // IsUsingDefaultQuantity
      "0", // IsService
      "1", // IsEnabled
      "", // Description
      "0", // Quantity
    ]
      .map(escapeField)
      .join(","),
  );

  return [CSV_HEADERS.join(","), ...rows].join(CRLF) + CRLF;
}

/** Local calendar date, not UTC — the shop's day is what matters. */
export function localDateKey(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function csvFilename(date = new Date()): string {
  return `thurvate-products-${localDateKey(date)}.csv`;
}

export function downloadCsv(products: SessionProduct[]): void {
  // No BOM: Blob writes exactly the bytes given.
  const blob = new Blob([buildCsv(products)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = csvFilename();
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
