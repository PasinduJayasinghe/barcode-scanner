"use client";

import { useSyncExternalStore } from "react";

import { Disclaimer, SiteHeader } from "@/components/Chrome";
import { ColumnEditor } from "@/components/ColumnEditor";
import { ExportPreview } from "@/components/ExportPreview";
import { Button, FieldCaption, Notice } from "@/components/ui";
import {
  DELIMITER_LABELS,
  validateProfile,
  type Delimiter,
  type ExportColumn,
  type ExportFormat,
  type ExportProfile,
} from "@/lib/export";
import {
  createProfileFrom,
  deleteProfile,
  getProfilesServerSnapshot,
  getProfilesSnapshot,
  selectProfile,
  subscribeProfiles,
  updateProfile,
} from "@/lib/export/store";

const CONTROL =
  "border-line-mid min-h-[38px] rounded-[2px] border bg-white px-2.5 text-[13px]";

export default function SettingsPage() {
  const { profiles, selected } = useSyncExternalStore(
    subscribeProfiles,
    getProfilesSnapshot,
    getProfilesServerSnapshot,
  );

  const readOnly = selected.builtIn === true;
  const problems = validateProfile(selected);

  function patch(changes: Partial<ExportProfile>) {
    updateProfile({ ...selected, ...changes });
  }

  return (
    <>
      <SiteHeader current="settings" />

      <main className="mx-auto flex w-full max-w-[1000px] flex-1 flex-col gap-9 px-5 pt-[26px] pb-[92px]">
        <header className="flex flex-col gap-3">
          <h1 className="text-[28px] leading-tight font-medium tracking-[-0.02em] text-pretty">
            Export columns
          </h1>
          <p className="max-w-[62ch] text-[15px] leading-relaxed text-slate text-pretty">
            Every point-of-sale system wants a different file. Build the exact columns yours
            expects — the name in the header row, what goes in each cell, and the order.
            The scanner uses whichever layout is selected here.
          </p>
        </header>

        {/* ---- profiles ---- */}
        <section className="flex flex-col gap-3">
          <SectionTitle>Layouts</SectionTitle>

          <div className="border-line flex flex-col border-t">
            {profiles.map((profile) => {
              const active = profile.id === selected.id;
              return (
                <div
                  key={profile.id}
                  className={`border-line-soft flex flex-wrap items-center gap-3 border-b py-2.5 ${
                    active ? "border-l-2 border-l-ink pl-3" : "border-l-2 border-l-transparent"
                  }`}
                >
                  <label className="flex flex-1 cursor-pointer items-center gap-2.5">
                    <input
                      type="radio"
                      name="profile"
                      checked={active}
                      onChange={() => selectProfile(profile.id)}
                      className="accent-ink"
                    />
                    <span className="text-[14px]">{profile.name}</span>
                    <span className="font-mono text-[10px] tracking-[0.1em] text-faint uppercase">
                      {profile.format} · {profile.columns.length} cols
                    </span>
                    {profile.builtIn && (
                      <span className="border-line-strong border px-1.5 py-0.5 text-[10px] tracking-[0.1em] text-muted uppercase">
                        Built in
                      </span>
                    )}
                  </label>

                  <div className="flex items-center gap-2">
                    <Button variant="quiet" onClick={() => createProfileFrom(profile)}>
                      Duplicate
                    </Button>
                    {!profile.builtIn && (
                      <Button variant="quiet" onClick={() => deleteProfile(profile.id)}>
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {readOnly && (
            <Notice tone="info">
              {selected.name} is built in and verified against a real import, so it can&rsquo;t
              be edited. Duplicate it to make a version you can change.
            </Notice>
          )}
        </section>

        {/* ---- columns ---- */}
        <section className="flex flex-col gap-3">
          <SectionTitle>Columns</SectionTitle>
          <ColumnEditor
            profile={selected}
            readOnly={readOnly}
            onChange={(columns: ExportColumn[]) => patch({ columns })}
          />
          {problems.map((problem) => (
            <Notice key={problem.message} tone={problem.level === "error" ? "error" : "info"}>
              {problem.message}
            </Notice>
          ))}
        </section>

        {/* ---- file options ---- */}
        <section className="flex flex-col gap-4">
          <SectionTitle>File</SectionTitle>

          <div className="grid gap-4 sm:grid-cols-2">
            <Setting label="Layout name">
              <input
                value={selected.name}
                disabled={readOnly}
                onChange={(e) => patch({ name: e.target.value })}
                className={`${CONTROL} w-full disabled:text-muted`}
              />
            </Setting>

            <Setting label="Format" hint="xlsx keeps numbers numeric in Excel">
              <select
                value={selected.format}
                disabled={readOnly}
                onChange={(e) => patch({ format: e.target.value as ExportFormat })}
                className={`${CONTROL} w-full ${readOnly ? "" : "cursor-pointer"}`}
              >
                <option value="csv">CSV (.csv)</option>
                <option value="xlsx">Excel (.xlsx)</option>
              </select>
            </Setting>

            <Setting label="Filename prefix" hint={`${selected.filenamePrefix}-2026-08-11.${selected.format}`}>
              <input
                value={selected.filenamePrefix}
                disabled={readOnly}
                onChange={(e) => patch({ filenamePrefix: e.target.value })}
                className={`${CONTROL} w-full font-mono text-xs disabled:text-muted`}
              />
            </Setting>

            {selected.format === "csv" && (
              <Setting label="Separator" hint="Semicolon suits some European importers">
                <select
                  value={selected.delimiter}
                  disabled={readOnly}
                  onChange={(e) => patch({ delimiter: e.target.value as Delimiter })}
                  className={`${CONTROL} w-full ${readOnly ? "" : "cursor-pointer"}`}
                >
                  {Object.entries(DELIMITER_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Setting>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            <Toggle
              checked={selected.includeHeader}
              disabled={readOnly}
              onChange={(v) => patch({ includeHeader: v })}
              label="Write a header row"
              hint="Turn off if your importer expects data from the very first line"
            />
            {selected.format === "csv" && (
              <>
                <Toggle
                  checked={selected.bom}
                  disabled={readOnly}
                  onChange={(v) => patch({ bom: v })}
                  label="Add a UTF-8 byte-order mark"
                  hint="Helps Excel show accented characters correctly; some importers choke on it"
                />
                <Toggle
                  checked={selected.lineEnding === "crlf"}
                  disabled={readOnly}
                  onChange={(v) => patch({ lineEnding: v ? "crlf" : "lf" })}
                  label="Windows line endings (CRLF)"
                  hint="Leave on unless your POS specifically asks for Unix endings"
                />
              </>
            )}
          </div>
        </section>

        {/* ---- preview ---- */}
        <section className="flex flex-col gap-3">
          <SectionTitle>Preview</SectionTitle>
          <ExportPreview profile={selected} />
        </section>
      </main>

      <Disclaimer />
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-line border-b pb-2 text-[11px] tracking-[0.12em] text-muted uppercase">
      {children}
    </h2>
  );
}

function Setting({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs tracking-[0.06em] text-stone uppercase">{label}</span>
      {children}
      {hint && <FieldCaption>{hint}</FieldCaption>}
    </label>
  );
}

function Toggle({
  checked,
  disabled,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label className={`flex items-start gap-2.5 ${disabled ? "" : "cursor-pointer"}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-ink mt-1"
      />
      <span className="flex flex-col">
        <span className="text-[13px]">{label}</span>
        <FieldCaption>{hint}</FieldCaption>
      </span>
    </label>
  );
}
