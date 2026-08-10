import type { SessionProduct } from "../types";
import { fieldDef } from "./fields";
import { buildRows } from "./csv";
import type { ExportProfile } from "./profile";

/**
 * Real .xlsx, built in the browser.
 *
 * Note what is deliberately absent: the apostrophe guard used by the CSV
 * writer. It isn't needed here and would actively corrupt names. Every cell
 * carries an explicit `type`, and `type: String` is a different thing entirely
 * from the library's `type: 'Formula'` — so a value beginning with `=` is
 * stored as text and never evaluated. The structure of the format solves what
 * CSV can only paper over.
 *
 * `kind: "number"` fields become real numeric cells, so a Price column can be
 * summed in Excel rather than sitting there as text.
 *
 * The writer is imported dynamically: it carries a zip encoder and has no
 * business in the scanner's bundle for the many sessions that never export.
 */
export interface XlsxCell {
  value: string | number | null;
  type: StringConstructor | NumberConstructor;
  format?: string;
  fontWeight?: "bold";
}

/**
 * The sheet as cell objects, separated out from the writer so the type
 * guarantee above can actually be asserted in a test rather than just claimed
 * in a comment.
 */
export function buildXlsxCells(
  products: SessionProduct[],
  profile: ExportProfile,
): XlsxCell[][] {
  const { header, rows } = buildRows(products, profile);

  const headerRow: XlsxCell[] = header.map((text) => ({
    value: text,
    type: String,
    fontWeight: "bold",
  }));

  const bodyRows: XlsxCell[][] = rows.map((row) =>
    row.map((value, i) => {
      const def = fieldDef(profile.columns[i].field);

      if (def.kind === "number") {
        return {
          value: typeof value === "number" ? value : null,
          type: Number,
          format: profile.columns[i].field === "price" ? "0.00" : undefined,
        };
      }

      return {
        value: value === null || value === undefined ? "" : String(value),
        type: String,
      };
    }),
  );

  return profile.includeHeader ? [headerRow, ...bodyRows] : bodyRows;
}

export async function buildXlsxBlob(
  products: SessionProduct[],
  profile: ExportProfile,
): Promise<Blob> {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");

  // The library's cell union is wide enough that a mapped array doesn't narrow
  // cleanly; the runtime shape is exactly what its types document.
  return writeXlsxFile(buildXlsxCells(products, profile) as never, {
    columns: widths(profile),
  }).toBlob();
}

/** Rough column widths so the file is readable the moment it opens. */
function widths(profile: ExportProfile) {
  return profile.columns.map((column) => ({
    width: Math.min(40, Math.max(10, column.header.length + 4)),
  }));
}
