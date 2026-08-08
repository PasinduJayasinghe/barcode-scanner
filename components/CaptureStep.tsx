"use client";

import { useRef } from "react";

import type { CapturedImage } from "@/lib/types";
import { Button, Notice, PhotoSlot, StepHeader } from "./ui";

export function CaptureStep({
  side,
  front,
  busy,
  error,
  onFile,
  onBack,
  onRetakeFront,
}: {
  side: "front" | "back";
  front: CapturedImage | null;
  busy: boolean;
  error: string | null;
  onFile: (file: File) => void;
  onBack: () => void;
  onRetakeFront: () => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Clear the value so picking the same file twice still fires a change.
    event.target.value = "";
    if (file) onFile(file);
  }

  const step = side === "front" ? 1 : 2;

  return (
    <div className="flex max-w-[560px] flex-col gap-[18px]">
      <StepHeader onBack={onBack} step={`Step ${step} of 2 — Photos`} />

      <h2 className="text-xl leading-snug font-medium tracking-[-0.01em] text-pretty">
        {side === "front"
          ? "Photograph the front of the pack"
          : "Photograph the back — make sure the printed price is visible"}
      </h2>

      <div className="hatched border-edge relative aspect-3/4 max-h-[62vh] w-full overflow-hidden border">
        <div className="absolute inset-x-[9%] inset-y-[11%] border border-ink/40" />
        <div className="absolute inset-x-[9%] inset-y-[11%] flex items-end justify-center pb-3">
          <span className="bg-paper px-[7px] py-[3px] font-mono text-[10px] tracking-[0.14em] text-stone uppercase">
            {busy ? "processing photo" : "camera feed"}
          </span>
        </div>

        {side === "back" && front && (
          <div className="border-paper absolute top-3 right-3 w-[84px] border bg-white">
            <PhotoSlot src={front.dataUrl} label="Front" className="aspect-3/4 w-full" />
            <button
              type="button"
              onClick={onRetakeFront}
              className="border-paper bg-ink text-paper w-full cursor-pointer border-0 border-t py-[5px] text-[10px] tracking-[0.1em] uppercase"
            >
              Retake
            </button>
          </div>
        )}
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      <div className="flex items-center gap-3.5">
        {/* capture="environment" opens the rear camera directly on iOS Safari and
            Android Chrome, with none of the getUserMedia permission dance. */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          className="sr-only"
          aria-hidden
          tabIndex={-1}
        />
        <input
          ref={libraryRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="sr-only"
          aria-hidden
          tabIndex={-1}
        />

        <Button
          disabled={busy}
          onClick={() => cameraRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-2.5"
        >
          <span className="border-paper h-3 w-3 rounded-full border" />
          {busy ? "Working…" : "Capture"}
        </Button>

        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => libraryRef.current?.click()}
          className="!min-h-[56px] !w-auto px-[18px] text-[13px]"
        >
          Choose photo
        </Button>
      </div>
    </div>
  );
}
