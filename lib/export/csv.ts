import type { SessionProduct } from "../types";
import { fieldDef, resolveDuplicateNames } from "./fields";
import type { ExportProfile } from "./profile";

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
 *
 * The .xlsx writer deliberately does NOT do this; see `xlsx.ts`.
 */
function escapeField(value: string, delimiter: string): string {
  const safe = FORMULA_LEAD.test(value) ? `'${value}` : value;
  const mustQuote = safe.includes(delimiter) || /["\r\n]/.test(safe);
  return mustQuote ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** The rows a profile produces, as plain text, before escaping. */
export function buildRows(
  products: SessionProduct[],
  profile: ExportProfile,
): { header: string[]; rows: (string | number | null)[][] } {
  const resolvedNames = resolveDuplicateNames(products);

  const rows = products.map((product, index) =>
    profile.columns.map((column) =>
      fieldDef(column.field).resolve(product, {
        index,
        resolvedNames,
        constant: column.constant ?? "",
      }),
    ),
  );

  return { header: profile.columns.map((c) => c.header), rows };
}

/** Renders one resolved value the way CSV wants it. */
export function toCsvCell(value: string | number | null, field: string): string {
  const def = fieldDef(field as never);
  if (def.toCsv) return def.toCsv(value);
  return value === null || value === undefined ? "" : String(value);
}

/**
 * Builds the import file. UTF-8, no BOM by default — the disclaimer
 * deliberately stays out of here so the file imports clean.
 */
export function buildCsv(products: SessionProduct[], profile: ExportProfile): string {
  const { header, rows } = buildRows(products, profile);
  const eol = profile.lineEnding === "lf" ? "\n" : "\r\n";
  const d = profile.delimiter;

  const lines: string[] = [];

  if (profile.includeHeader) {
    lines.push(header.map((h) => escapeField(h, d)).join(d));
  }

  for (const row of rows) {
    lines.push(
      row
        .map((value, i) => escapeField(toCsvCell(value, profile.columns[i].field), d))
        .join(d),
    );
  }

  const body = lines.join(eol) + eol;
  return profile.bom ? `﻿${body}` : body;
}
