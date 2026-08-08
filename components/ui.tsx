"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "quiet" | "link";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "min-h-[54px] w-full rounded-[2px] border border-ink bg-ink px-5 text-[15px] font-medium text-paper transition-colors hover:border-ink-hover hover:bg-ink-hover disabled:cursor-not-allowed disabled:border-line-mid disabled:bg-fill-deep disabled:text-faint",
  secondary:
    "min-h-[46px] w-full rounded-[2px] border border-line-strong bg-transparent px-5 text-sm text-ash transition-colors hover:border-ink disabled:cursor-not-allowed disabled:text-faint",
  quiet:
    "min-h-[40px] rounded-[2px] border border-line-strong bg-transparent px-4 text-xs tracking-[0.06em] text-ash uppercase transition-colors hover:border-ink",
  link: "cursor-pointer border-0 bg-transparent p-0 text-xs tracking-[0.08em] text-muted uppercase transition-colors hover:text-ink",
};

export function Button({ variant = "primary", className = "", ...rest }: ButtonProps) {
  const cursor = rest.disabled ? "" : "cursor-pointer";
  return <button className={`${VARIANTS[variant]} ${cursor} ${className}`} {...rest} />;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] tracking-[0.1em] text-muted uppercase tabular-nums">
      {children}
    </span>
  );
}

export function StepHeader({
  onBack,
  step,
  backLabel = "Back",
}: {
  onBack: () => void;
  step: string;
  backLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Button variant="link" onClick={onBack}>
        ← {backLabel}
      </Button>
      <Eyebrow>{step}</Eyebrow>
    </div>
  );
}

/** Inline message with a coloured rule down its left edge. */
export function Notice({
  tone,
  children,
}: {
  tone: "error" | "info";
  children: ReactNode;
}) {
  const accent = tone === "error" ? "border-signal text-signal" : "border-[#b4b4af] text-slate";
  return (
    <p className={`border-l-2 pl-3 text-[13px] leading-relaxed text-pretty ${accent}`}>
      {children}
    </p>
  );
}

/**
 * Five bars, filled proportionally. Deliberately not a percentage — a precise
 * number invites trust the model hasn't earned; the shape of the bar says
 * "check this one" without pretending to be measurement.
 */
export function ConfidenceMeter({ value }: { value: number }) {
  const filled = Math.max(1, Math.round(value * 5));
  const percent = Math.round(value * 100);

  return (
    <div
      className="flex items-end gap-[2px]"
      title={`Confidence ${percent}%`}
      aria-label={`Confidence ${percent} percent`}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={`h-[11px] w-[4px] ${i < filled ? "bg-ink" : "bg-line-mid"}`}
        />
      ))}
    </div>
  );
}

export function ReviewTag({ children = "Review" }: { children?: ReactNode }) {
  return (
    <span className="border border-[#b4b4af] px-1.5 py-0.5 text-[10px] tracking-[0.1em] text-ink uppercase">
      {children}
    </span>
  );
}

/** Hatched stand-in used wherever a photo hasn't been taken yet. */
export function PhotoSlot({
  src,
  label,
  className = "",
}: {
  src?: string;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`hatched border-edge relative flex items-center justify-center overflow-hidden border ${className}`}
    >
      {src ? (
        // Plain <img>: these are client-side blobs, so next/image adds nothing.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} className="h-full w-full object-cover" />
      ) : (
        <span className="font-mono text-[10px] tracking-[0.14em] text-stone uppercase">
          {label}
        </span>
      )}
    </div>
  );
}
