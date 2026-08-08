"use client";

import { useEffect, useState } from "react";

/** Cosmetic only — the real work is a single round trip we can't introspect. */
const STATUS_LINES = [
  "Uploading photographs",
  "Reading packaging text",
  "Matching product group",
  "Checking printed price",
];

export function ProcessingStep() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((current) => Math.min(current + 1, STATUS_LINES.length - 1));
    }, 1400);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="flex max-w-[440px] flex-col gap-5 pt-[16vh]"
      role="status"
      aria-live="polite"
    >
      <div className="bg-line h-px w-full overflow-hidden">
        <div className="bg-ink animate-rule h-px w-[30%]" />
      </div>
      <p className="text-[13px] tracking-[0.04em] text-ash tabular-nums">
        {STATUS_LINES[index]}
      </p>
      <p className="text-xs text-faint">Usually under ten seconds.</p>
    </div>
  );
}
