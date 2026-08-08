"use client";

import { Button } from "./ui";

export function LimitScreen({
  limit,
  onOpenList,
  onManual,
}: {
  limit: number;
  onOpenList: () => void;
  onManual: () => void;
}) {
  return (
    <div className="flex max-w-[460px] flex-col gap-[22px] pt-[8vh]">
      <h2 className="text-[26px] leading-tight font-medium tracking-[-0.015em] text-pretty">
        You&rsquo;ve reached today&rsquo;s limit of {limit} AI scans.
      </h2>

      <p className="text-sm leading-relaxed text-slate text-pretty">
        The limit applies to AI extraction only. You can carry on adding products by typing
        their details yourself, and your session list stays editable either way. The counter
        resets at midnight.
      </p>

      <Button onClick={onManual}>Add a product manually</Button>

      <div className="border-line flex flex-col gap-1.5 border-y py-4">
        <span className="text-[11px] tracking-[0.1em] text-muted uppercase">
          Need a higher limit
        </span>
        <a href="mailto:sales@thurvate.example" className="text-sm underline underline-offset-2">
          sales@thurvate.example
        </a>
      </div>

      <Button variant="secondary" onClick={onOpenList}>
        View session list
      </Button>
    </div>
  );
}
