"use client";

import { SOURCE_LABEL, type BarcodeSource, type CapturedImage } from "@/lib/types";
import { Button, Notice, PhotoSlot, StepHeader } from "./ui";

export function ReviewStep({
  barcode,
  barcodeSource,
  front,
  back,
  error,
  onRetakeFront,
  onRetakeBack,
  onExtract,
  onBack,
}: {
  barcode: string;
  barcodeSource: BarcodeSource;
  front: CapturedImage | null;
  back: CapturedImage | null;
  error: string | null;
  onRetakeFront: () => void;
  onRetakeBack: () => void;
  onExtract: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex max-w-[560px] flex-col gap-[26px]">
      <StepHeader onBack={onBack} step="Step 3 — Check" />

      <div className="border-line flex flex-col gap-1.5 border-b pb-3.5">
        <span className="text-[11px] tracking-[0.1em] text-muted uppercase">Barcode</span>
        <span className="font-mono text-[19px] tracking-[0.12em] tabular-nums">
          {barcode || "Not entered"}
        </span>
        <span className="text-[11px] tracking-[0.04em] text-faint">
          {barcodeSource === "photo"
            ? "Will be read from the photo"
            : SOURCE_LABEL[barcodeSource]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        {(
          [
            ["Front", front, onRetakeFront],
            ["Back", back, onRetakeBack],
          ] as const
        ).map(([label, image, onRetake]) => (
          <div key={label} className="flex flex-col gap-2">
            <PhotoSlot src={image?.dataUrl} label={label} className="aspect-3/4 w-full" />
            <Button variant="quiet" onClick={onRetake}>
              Retake {label.toLowerCase()}
            </Button>
          </div>
        ))}
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      <p className="text-xs leading-[1.55] text-muted text-pretty">
        Check both shots are sharp and the printed price is legible. Extraction uses one of
        today&rsquo;s scans — a failed attempt costs nothing.
      </p>

      <Button onClick={onExtract} disabled={!front || !back}>
        Extract details
      </Button>
    </div>
  );
}
