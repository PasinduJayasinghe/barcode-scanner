"use client";

import { buildCsv, buildRows, toCsvCell, type ExportProfile } from "@/lib/export";
import { SAMPLE_PRODUCTS } from "@/lib/export/sample";

/**
 * The whole point of the editor: see the file before you download it.
 *
 * Runs the real builders over sample products, so what appears here is exactly
 * what the export produces — including the apostrophe guard and the quoting.
 */
export function ExportPreview({ profile }: { profile: ExportProfile }) {
  if (profile.columns.length === 0) {
    return (
      <p className="border-line bg-panel border py-6 text-center text-[13px] text-muted">
        Add a column to see the preview.
      </p>
    );
  }

  const { header, rows } = buildRows(SAMPLE_PRODUCTS, profile);

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-5 overflow-x-auto px-5">
        <table className="border-line min-w-full border-collapse border-t border-t-ink text-[12px]">
          <thead>
            <tr>
              {header.map((cell, i) => (
                <th
                  key={i}
                  className="border-line border-b px-2.5 py-1.5 text-left font-mono text-[10px] font-medium tracking-[0.08em] whitespace-nowrap text-muted uppercase"
                >
                  {profile.includeHeader ? cell || "—" : `col ${i + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                {row.map((value, c) => (
                  <td
                    key={c}
                    className="border-line-soft border-b px-2.5 py-1.5 whitespace-nowrap text-ash tabular-nums"
                  >
                    {toCsvCell(value, profile.columns[c].field) || (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {profile.format === "csv" ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] tracking-[0.12em] text-muted uppercase">
            Raw file, first two lines
          </span>
          <pre className="border-line bg-panel overflow-x-auto border p-3 font-mono text-[11px] leading-relaxed text-ash">
            {buildCsv(SAMPLE_PRODUCTS, profile)
              .split(profile.lineEnding === "lf" ? "\n" : "\r\n")
              .slice(0, 2)
              .join("\n")}
          </pre>
          <span className="text-[11px] text-faint">
            Sample rows only — your session&rsquo;s products are used for the real download.
          </span>
        </div>
      ) : (
        <p className="text-[11px] leading-relaxed text-faint">
          Sample rows only. In .xlsx every cell carries an explicit type, so number columns
          stay numeric and a name beginning with <code className="font-mono">=</code> is stored
          as text rather than a formula.
        </p>
      )}
    </div>
  );
}
