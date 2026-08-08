"use client";

import { Button } from "./ui";

export function Landing({
  limit,
  productCount,
  onStart,
  onOpenList,
}: {
  limit: number;
  productCount: number;
  onStart: () => void;
  onOpenList: () => void;
}) {
  const facts: [string, string][] = [
    ["Fields extracted", "6"],
    ["Photos per product", "2 — front, back"],
    ["Daily limit", `${limit} products`],
  ];

  return (
    <div className="flex max-w-[520px] flex-col gap-[34px]">
      <div className="flex flex-col gap-3.5">
        <h1 className="text-[34px] leading-[1.1] font-medium tracking-[-0.02em] text-pretty">
          Read a pack. Get point-of-sale data.
        </h1>
        <p className="max-w-[42ch] text-[15px] leading-[1.55] text-slate text-pretty">
          Photograph a retail product&rsquo;s packaging and Thurvate extracts the fields your
          till needs — name, size, price, group and unit.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Button onClick={onStart}>Start scanning</Button>
        <Button variant="secondary" onClick={onOpenList}>
          Session list ({productCount})
        </Button>
      </div>

      <dl className="border-line grid border-t">
        {facts.map(([term, detail]) => (
          <div
            key={term}
            className="border-line flex justify-between gap-4 border-b py-3.5 text-[13px]"
          >
            <dt className="tracking-[0.03em] text-muted">{term}</dt>
            <dd className="tabular-nums">{detail}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
