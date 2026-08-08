"use client";

import type { BarcodeVerdict } from "@/lib/barcode";
import {
  CATEGORIES,
  SOURCE_LABEL,
  type BarcodeSource,
  type FieldConfidence,
  type ProductForm,
} from "@/lib/types";
import { Button, ConfidenceMeter, Notice, ReviewTag, StepHeader } from "./ui";

/** Below this, the field gets a review flag rather than being presented as fact. */
const FLAG_BELOW = 0.6;

interface FieldSpec {
  key: keyof ProductForm;
  label: string;
  confidence?: number;
  mono?: boolean;
  select?: boolean;
  caption?: string;
  inputMode?: "numeric" | "decimal" | "text";
}

export function ResultsStep({
  form,
  confidence,
  barcodeSource,
  barcodeVerdict,
  lowQuality,
  onField,
  onRetake,
  onAddAnother,
  onDone,
  onBack,
}: {
  form: ProductForm;
  confidence: FieldConfidence;
  barcodeSource: BarcodeSource;
  barcodeVerdict: BarcodeVerdict;
  lowQuality: boolean;
  onField: (key: keyof ProductForm, value: string) => void;
  onRetake: () => void;
  onAddAnother: () => void;
  onDone: () => void;
  onBack: () => void;
}) {
  const readFromPhoto = barcodeSource === "photo";

  const fields: FieldSpec[] = [
    { key: "name", label: "Product name", confidence: confidence.productName },
    {
      key: "barcode",
      label: "Barcode",
      confidence: confidence.barcode,
      mono: true,
      inputMode: "numeric",
      caption: readFromPhoto
        ? "Read from photo — always check this against the pack"
        : SOURCE_LABEL[barcodeSource],
    },
    { key: "size", label: "Size / weight" },
    {
      key: "price",
      label: "Price (MRP)",
      confidence: confidence.price,
      inputMode: "decimal",
      caption: "In LKR, as printed on the pack",
    },
    { key: "category", label: "Product group", select: true },
    { key: "unit", label: "Unit" },
  ];

  const flaggedCount = fields.filter((f) => isFlagged(f, readFromPhoto)).length;
  const canCommit = barcodeVerdict.ok && form.name.trim() !== "";

  return (
    <div className="flex max-w-[600px] flex-col gap-[22px]">
      <StepHeader onBack={onBack} step="Step 4 — Confirm" />

      <div className="border-line flex items-baseline justify-between gap-3 border-b pb-3">
        <h2 className="text-xl font-medium tracking-[-0.01em]">Extracted details</h2>
        <span className="text-[11px] tracking-[0.1em] text-muted uppercase tabular-nums">
          {flaggedCount} of {fields.length} need review
        </span>
      </div>

      {lowQuality && (
        <Notice tone="error">
          Every field came back with low confidence — the photos are probably too blurred or
          too dark to read. Retaking them will give a much better result than correcting this
          by hand.{" "}
          <button
            type="button"
            onClick={onRetake}
            className="cursor-pointer border-0 bg-transparent p-0 text-[13px] underline underline-offset-2"
          >
            Retake photos
          </button>
        </Notice>
      )}

      <div className="flex flex-col">
        {fields.map((field) => {
          const flagged = isFlagged(field, readFromPhoto);
          const id = `thv-f-${field.key}`;

          return (
            <div
              key={field.key}
              className={`border-line-soft flex flex-col gap-[7px] border-b pt-3.5 pb-[15px] ${
                flagged ? "border-l-2 border-l-ink pl-3" : "border-l-2 border-l-transparent"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor={id}
                  className={`text-xs tracking-[0.06em] text-stone uppercase ${
                    flagged ? "font-semibold" : "font-normal"
                  }`}
                >
                  {field.label}
                </label>
                <div className="flex items-center gap-2">
                  {flagged && <ReviewTag />}
                  {field.confidence !== undefined && (
                    <ConfidenceMeter value={field.confidence} />
                  )}
                </div>
              </div>

              {field.select ? (
                <select
                  id={id}
                  value={form[field.key]}
                  onChange={(event) => onField(field.key, event.target.value)}
                  className="border-line-mid min-h-[44px] w-full cursor-pointer rounded-[2px] border bg-white px-3 text-[15px]"
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={id}
                  value={form[field.key]}
                  inputMode={field.inputMode}
                  onChange={(event) => onField(field.key, event.target.value)}
                  className={`border-line-mid min-h-[44px] w-full rounded-[2px] border bg-white px-3 text-[15px] tabular-nums ${
                    field.mono ? "font-mono tracking-[0.08em]" : ""
                  }`}
                />
              )}

              {field.key === "barcode" && barcodeVerdict.level === "error" ? (
                <Notice tone="error">{barcodeVerdict.message}</Notice>
              ) : field.key === "barcode" && barcodeVerdict.storeInternal ? (
                <Notice tone="info">
                  Store-internal barcode. Fine for your own till, but it may not work
                  elsewhere.
                </Notice>
              ) : (
                field.caption && (
                  <span className="text-[11px] tracking-[0.04em] text-faint">
                    {field.caption}
                  </span>
                )
              )}
            </div>
          );
        })}
      </div>

      {!canCommit && (
        <p className="text-xs leading-normal text-muted">
          {form.name.trim() === ""
            ? "Give the product a name before adding it."
            : barcodeVerdict.hint || "Correct the barcode before adding this product."}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2.5">
        <Button variant="secondary" onClick={onAddAnother} disabled={!canCommit}>
          Add another product
        </Button>
        <Button onClick={onDone} disabled={!canCommit}>
          Done
        </Button>
      </div>
    </div>
  );
}

function isFlagged(field: FieldSpec, readFromPhoto: boolean): boolean {
  // An OCR-read barcode is always flagged: a transposed digit can land on a
  // checksum that happens to pass, and nothing downstream would catch it.
  if (field.key === "barcode" && readFromPhoto) return true;
  return field.confidence !== undefined && field.confidence < FLAG_BELOW;
}
