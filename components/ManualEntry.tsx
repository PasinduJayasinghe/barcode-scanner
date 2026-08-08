"use client";

import type { BarcodeVerdict } from "@/lib/barcode";
import { CATEGORIES, type ProductForm } from "@/lib/types";
import {
  BarcodeFootnote,
  Button,
  FieldCaption,
  FieldControl,
  FieldRow,
  Notice,
  StepHeader,
} from "./ui";

interface FieldSpec {
  key: keyof ProductForm;
  label: string;
  caption?: string;
  placeholder?: string;
  mono?: boolean;
  select?: boolean;
  inputMode?: "numeric" | "decimal" | "text";
}

const FIELDS: FieldSpec[] = [
  {
    key: "name",
    label: "Product name",
    placeholder: "Munchee Super Cream Cracker 190g",
    caption: "Brand, product and size — exactly as you want it on the receipt",
  },
  {
    key: "barcode",
    label: "Barcode",
    placeholder: "8901234567890",
    mono: true,
    inputMode: "numeric",
  },
  { key: "size", label: "Size / weight", placeholder: "190g" },
  {
    key: "price",
    label: "Price (MRP)",
    placeholder: "120.00",
    inputMode: "decimal",
    caption: "In LKR, as printed on the pack",
  },
  { key: "category", label: "Product group", select: true },
  { key: "unit", label: "Unit", placeholder: "pcs" },
];

/**
 * The escape hatch when the model is rate limited or the daily allowance is
 * gone. No photographs, no API call — so it costs nothing and is never blocked
 * by a quota. Everything here is read off the pack by a person, which makes it
 * the most trustworthy path in the app, not the least.
 */
export function ManualEntry({
  form,
  barcodeVerdict,
  reason,
  onField,
  onAddAnother,
  onDone,
  onBack,
}: {
  form: ProductForm;
  barcodeVerdict: BarcodeVerdict;
  reason: string | null;
  onField: (key: keyof ProductForm, value: string) => void;
  onAddAnother: () => void;
  onDone: () => void;
  onBack: () => void;
}) {
  const canCommit = barcodeVerdict.ok && form.name.trim() !== "";

  return (
    <div className="flex max-w-[600px] flex-col gap-[22px]">
      <StepHeader onBack={onBack} step="Manual entry" />

      <div className="border-line flex flex-col gap-2 border-b pb-3">
        <h2 className="text-xl font-medium tracking-[-0.01em]">Type the details yourself</h2>
        <p className="text-[13px] leading-relaxed text-slate text-pretty">
          No photographs and no AI — this doesn&rsquo;t use one of your daily scans, and it
          works even when the limit is reached.
        </p>
      </div>

      {reason && <Notice tone="info">{reason}</Notice>}

      <div className="flex flex-col">
        {FIELDS.map((field) => {
          const id = `thv-m-${field.key}`;

          return (
            <FieldRow
              key={field.key}
              id={id}
              label={field.label}
              footer={
                field.key === "barcode" ? (
                  <BarcodeFootnote verdict={barcodeVerdict} caption={field.caption} />
                ) : (
                  field.caption && <FieldCaption>{field.caption}</FieldCaption>
                )
              }
            >
              <FieldControl
                id={id}
                value={form[field.key]}
                onChange={(value) => onField(field.key, value)}
                options={field.select ? CATEGORIES : undefined}
                placeholder={field.placeholder}
                inputMode={field.inputMode}
                mono={field.mono}
              />
            </FieldRow>
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
          Save and type another
        </Button>
        <Button onClick={onDone} disabled={!canCommit}>
          Done
        </Button>
      </div>
    </div>
  );
}
