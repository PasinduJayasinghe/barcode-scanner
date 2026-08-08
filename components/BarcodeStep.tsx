"use client";

import { useCallback, useEffect, useRef } from "react";

import { looksLikeScanner, type BarcodeVerdict } from "@/lib/barcode";
import type { BarcodeSource } from "@/lib/types";
import { Button, Notice, StepHeader } from "./ui";

export function BarcodeStep({
  value,
  verdict,
  onChange,
  onSubmit,
  onSkip,
  onBack,
}: {
  value: string;
  verdict: BarcodeVerdict;
  onChange: (value: string) => void;
  onSubmit: (source: BarcodeSource) => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  /** Timestamp of every character keystroke since the field was last emptied. */
  const strokes = useRef<number[]>([]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const classifySource = useCallback(
    (): BarcodeSource => (looksLikeScanner(strokes.current) ? "scanned" : "typed"),
    [],
  );

  // Most HID scanners append Enter, but not all of them do. When the digits
  // arrive as one burst and already checksum, advance without waiting.
  useEffect(() => {
    if (!verdict.ok || !looksLikeScanner(strokes.current)) return;
    const timer = setTimeout(() => onSubmit("scanned"), 80);
    return () => clearTimeout(timer);
  }, [value, verdict.ok, onSubmit]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (verdict.ok) onSubmit(classifySource());
      return;
    }
    if (event.key.length === 1) strokes.current.push(performance.now());
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    if (next.length === 0) strokes.current = [];
    onChange(next);
  }

  const borderColor =
    verdict.level === "error"
      ? "border-signal"
      : verdict.ok
        ? "border-ink"
        : "border-edge";

  return (
    <div className="flex max-w-[520px] flex-col gap-[30px]">
      <StepHeader onBack={onBack} step="Step 1 — Barcode" />

      <div className="flex flex-col gap-2.5">
        <label htmlFor="thv-barcode" className="text-[13px] font-medium tracking-[0.02em]">
          Scan or type the barcode
        </label>

        <input
          id="thv-barcode"
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          inputMode="numeric"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="—"
          aria-invalid={verdict.level === "error"}
          aria-describedby="thv-barcode-hint"
          className={`min-h-[74px] w-full rounded-[2px] border bg-white px-3.5 text-center font-mono text-[28px] tracking-[0.16em] tabular-nums ${borderColor}`}
        />

        <div className="flex min-h-5 items-start justify-between gap-3.5">
          <p id="thv-barcode-hint" className="max-w-[38ch] text-xs leading-normal text-muted">
            Use the barcode scanner, or type the number printed under the bars.
          </p>
          {verdict.ok && (
            <span className="text-xs tracking-[0.06em] whitespace-nowrap uppercase">
              ✓ Valid
            </span>
          )}
        </div>

        {verdict.level === "error" && <Notice tone="error">{verdict.message}</Notice>}
        {verdict.level === "notice" && <Notice tone="info">{verdict.message}</Notice>}
      </div>

      <div className="flex flex-col gap-3.5">
        <Button disabled={!verdict.ok} onClick={() => onSubmit(classifySource())}>
          Continue to photos
        </Button>

        {!verdict.ok && verdict.hint && (
          <p className="text-center text-xs leading-normal text-muted">{verdict.hint}</p>
        )}

        <div className="border-line border-t pt-3.5 text-center">
          <button
            type="button"
            onClick={onSkip}
            className="cursor-pointer border-0 bg-transparent px-0.5 py-1.5 text-xs text-faint underline underline-offset-[3px] transition-colors hover:text-ash"
          >
            Skip — read it from the photo instead
          </button>
        </div>
      </div>
    </div>
  );
}
