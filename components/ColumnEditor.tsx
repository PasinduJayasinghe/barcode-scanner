"use client";

import {
  FIELDS,
  fieldDef,
  newColumnId,
  type ExportColumn,
  type ExportProfile,
  type FieldId,
} from "@/lib/export";
import { Button, FieldCaption } from "./ui";

const GROUP_LABEL: Record<string, string> = {
  product: "From the product",
  provenance: "How it was captured",
  fixed: "Fixed value",
};

const CONTROL =
  "border-line-mid min-h-[38px] w-full rounded-[2px] border bg-white px-2.5 text-[13px]";

/**
 * One row per column in the output file, in output order.
 *
 * Reordering is done with buttons rather than drag-and-drop: it stays usable
 * from a keyboard, works on a phone at the till, and matches how restrained the
 * rest of this app is.
 */
export function ColumnEditor({
  profile,
  onChange,
  readOnly,
}: {
  profile: ExportProfile;
  onChange: (columns: ExportColumn[]) => void;
  readOnly: boolean;
}) {
  const columns = profile.columns;

  function patch(id: string, changes: Partial<ExportColumn>) {
    onChange(columns.map((c) => (c.id === id ? { ...c, ...changes } : c)));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= columns.length) return;
    const next = [...columns];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  const grouped = Object.entries(
    FIELDS.reduce<Record<string, typeof FIELDS>>((acc, field) => {
      (acc[field.group] ??= []).push(field);
      return acc;
    }, {}),
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-5 overflow-x-auto px-5">
        <div className="min-w-[640px]">
          <div className="border-line grid grid-cols-[2rem_minmax(140px,1.1fr)_minmax(160px,1.2fr)_minmax(120px,1fr)_5.5rem] items-center gap-2.5 border-b py-2 text-[10px] tracking-[0.1em] text-muted uppercase">
            <span>#</span>
            <span>Header in file</span>
            <span>Contents</span>
            <span>Fixed text</span>
            <span className="text-right">Order</span>
          </div>

          {columns.map((column, index) => {
            const def = fieldDef(column.field);
            const isConstant = column.field === "constant";

            return (
              <div
                key={column.id}
                className="border-line-soft grid grid-cols-[2rem_minmax(140px,1.1fr)_minmax(160px,1.2fr)_minmax(120px,1fr)_5.5rem] items-center gap-2.5 border-b py-2"
              >
                <span className="font-mono text-[11px] text-faint tabular-nums">
                  {index + 1}
                </span>

                <input
                  value={column.header}
                  aria-label={`Header for column ${index + 1}`}
                  disabled={readOnly}
                  onChange={(e) => patch(column.id, { header: e.target.value })}
                  className={`${CONTROL} disabled:text-muted`}
                />

                <select
                  value={column.field}
                  aria-label={`Contents of column ${index + 1}`}
                  disabled={readOnly}
                  onChange={(e) => patch(column.id, { field: e.target.value as FieldId })}
                  className={`${CONTROL} ${readOnly ? "" : "cursor-pointer"}`}
                >
                  {grouped.map(([group, fields]) => (
                    <optgroup key={group} label={GROUP_LABEL[group] ?? group}>
                      {fields.map((field) => (
                        <option key={field.id} value={field.id}>
                          {field.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>

                {isConstant ? (
                  <input
                    value={column.constant ?? ""}
                    aria-label={`Fixed text for column ${index + 1}`}
                    placeholder="(empty)"
                    disabled={readOnly}
                    onChange={(e) => patch(column.id, { constant: e.target.value })}
                    className={`${CONTROL} font-mono text-xs`}
                  />
                ) : (
                  <span className="text-[11px] text-faint">{def.hint ?? "—"}</span>
                )}

                <div className="flex items-center justify-end gap-1">
                  <IconButton
                    label={`Move ${column.header || "column"} up`}
                    disabled={readOnly || index === 0}
                    onClick={() => move(index, -1)}
                  >
                    ↑
                  </IconButton>
                  <IconButton
                    label={`Move ${column.header || "column"} down`}
                    disabled={readOnly || index === columns.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    ↓
                  </IconButton>
                  <IconButton
                    label={`Remove ${column.header || "column"}`}
                    disabled={readOnly}
                    onClick={() => onChange(columns.filter((c) => c.id !== column.id))}
                  >
                    ×
                  </IconButton>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!readOnly && (
        <div className="flex items-center gap-3">
          <Button
            variant="quiet"
            onClick={() =>
              onChange([
                ...columns,
                { id: newColumnId(), header: "New column", field: "constant", constant: "" },
              ])
            }
          >
            Add column
          </Button>
          <FieldCaption>{columns.length} columns in the file</FieldCaption>
        </div>
      )}
    </div>
  );
}

function IconButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="h-7 w-7 shrink-0 rounded-[2px] border border-transparent bg-transparent text-sm text-stone transition-colors not-disabled:cursor-pointer hover:border-ink hover:text-ink disabled:text-line-strong"
    >
      {children}
    </button>
  );
}
