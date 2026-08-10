import type { FieldId } from "./fields";

export type ExportFormat = "csv" | "xlsx";
export type Delimiter = "," | ";" | "\t";

export interface ExportColumn {
  /** Stable id — React keys and reordering, never written to the file. */
  id: string;
  /** Literally what lands in the header row. */
  header: string;
  field: FieldId;
  /** Only meaningful when `field === "constant"`. */
  constant?: string;
}

export interface ExportProfile {
  id: string;
  name: string;
  format: ExportFormat;
  columns: ExportColumn[];
  /** CSV only. Some POS importers expect semicolons in European locales. */
  delimiter: Delimiter;
  /** CSV only. */
  lineEnding: "crlf" | "lf";
  includeHeader: boolean;
  /** CSV only — a UTF-8 BOM makes Excel open accented text correctly. */
  bom: boolean;
  filenamePrefix: string;
  /** Built-ins ship with the app: duplicable, never editable or deletable. */
  builtIn?: boolean;
  /** Bumped if the stored shape ever changes; the DB move will need it. */
  version: 1;
}

export function newColumnId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `c-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const DELIMITER_LABELS: Record<Delimiter, string> = {
  ",": "Comma",
  ";": "Semicolon",
  "\t": "Tab",
};

export interface ProfileProblem {
  level: "error" | "warning";
  message: string;
}

/**
 * Problems worth showing before someone downloads a file their POS will reject.
 * Duplicate headers are only a warning — a few importers genuinely tolerate
 * them — but an empty header or no columns at all produces an unusable file.
 */
export function validateProfile(profile: ExportProfile): ProfileProblem[] {
  const problems: ProfileProblem[] = [];

  if (profile.columns.length === 0) {
    problems.push({ level: "error", message: "Add at least one column." });
    return problems;
  }

  if (profile.includeHeader) {
    const blank = profile.columns.filter((c) => c.header.trim() === "").length;
    if (blank > 0) {
      problems.push({
        level: "error",
        message: `${blank} column${blank === 1 ? " has" : "s have"} no header name.`,
      });
    }

    const seen = new Map<string, number>();
    for (const column of profile.columns) {
      const key = column.header.trim().toLowerCase();
      if (key) seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    const repeated = [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k);
    if (repeated.length > 0) {
      problems.push({
        level: "warning",
        message: `Repeated header name: ${repeated.join(", ")}. Most importers use the first match only.`,
      });
    }
  }

  if (profile.filenamePrefix.trim() === "") {
    problems.push({ level: "error", message: "Give the file a name prefix." });
    return problems;
  }

  return problems;
}

/** A deep copy under a new identity — the basis of "Duplicate". */
export function duplicateProfile(source: ExportProfile, name: string): ExportProfile {
  return {
    ...source,
    id: newColumnId(),
    name,
    builtIn: false,
    columns: source.columns.map((column) => ({ ...column, id: newColumnId() })),
  };
}
