import { localDateKey } from "../date";
import type { SessionProduct } from "../types";
import { buildCsv } from "./csv";
import type { ExportProfile } from "./profile";

export { buildCsv, buildRows, toCsvCell } from "./csv";
export { FIELDS, fieldDef, resolveDuplicateNames } from "./fields";
export type { FieldDef, FieldId } from "./fields";
export { ARONIUM_PROFILE, BUILT_IN_PROFILES } from "./presets";
export {
  DELIMITER_LABELS,
  duplicateProfile,
  newColumnId,
  validateProfile,
} from "./profile";
export type {
  Delimiter,
  ExportColumn,
  ExportFormat,
  ExportProfile,
  ProfileProblem,
} from "./profile";

export function exportFilename(profile: ExportProfile, date = new Date()): string {
  const prefix = profile.filenamePrefix.trim() || "thurvate-products";
  return `${prefix}-${localDateKey(date)}.${profile.format}`;
}

/**
 * Reasons the file can't be produced yet.
 *
 * These are driven by the profile rather than hardcoded: if a profile has no
 * Price column, a product without a price is no longer a problem worth blocking
 * on. Only what actually reaches the file can break the import.
 */
export function findExportBlockers(
  products: SessionProduct[],
  profile: ExportProfile,
): string[] {
  const blockers: string[] = [];

  if (products.length === 0) return blockers;

  const used = new Set(profile.columns.map((c) => c.field));
  const plural = (n: number) => (n === 1 ? "" : "s");

  if (used.has("name") || used.has("rawName")) {
    const missing = products.filter((p) => p.name.trim() === "").length;
    if (missing > 0) {
      blockers.push(`${missing} product${plural(missing)} still need a name.`);
    }
  }

  if (used.has("price")) {
    const missing = products.filter((p) => p.price.trim() === "").length;
    if (missing > 0) {
      blockers.push(`${missing} product${plural(missing)} still need a price.`);
    }
  }

  if (used.has("barcode")) {
    const missing = products.filter((p) => p.barcode.trim() === "").length;
    if (missing > 0) {
      blockers.push(`${missing} product${plural(missing)} still need a barcode.`);
    }
  }

  return blockers;
}

/** Hands the finished file to the browser. */
export async function downloadExport(
  products: SessionProduct[],
  profile: ExportProfile,
): Promise<void> {
  const blob =
    profile.format === "xlsx"
      ? await (await import("./xlsx")).buildXlsxBlob(products, profile)
      : // No BOM unless the profile asks: Blob writes exactly the bytes given.
        new Blob([buildCsv(products, profile)], { type: "text/csv;charset=utf-8" });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = exportFilename(profile);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
