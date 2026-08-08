"use client";

import { Button } from "./ui";

export function LimitScreen({ limit, onOpenList }: { limit: number; onOpenList: () => void }) {
  return (
    <div className="flex max-w-[460px] flex-col gap-[22px] pt-[8vh]">
      <h2 className="text-[26px] leading-tight font-medium tracking-[-0.015em] text-pretty">
        You&rsquo;ve reached today&rsquo;s limit of {limit} products.
      </h2>

      <p className="text-sm leading-relaxed text-slate text-pretty">
        Your session list stays available — you can still edit rows and download the CSV.
        The counter resets at midnight.
      </p>

      <div className="border-line flex flex-col gap-1.5 border-y py-4">
        <span className="text-[11px] tracking-[0.1em] text-muted uppercase">
          Need a higher limit
        </span>
        <a href="mailto:sales@thurvate.example" className="text-sm underline underline-offset-2">
          sales@thurvate.example
        </a>
      </div>

      <Button onClick={onOpenList}>View session list</Button>
    </div>
  );
}
