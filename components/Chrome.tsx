"use client";

import Link from "next/link";

import { SOURCE_LABEL, SOURCE_MARK, type SessionProduct } from "@/lib/types";
import { Button } from "./ui";

export function Header({
  remaining,
  limit,
  scannerReady,
}: {
  remaining: number;
  limit: number;
  scannerReady: boolean;
}) {
  return (
    <header className="border-line bg-paper sticky top-0 z-10 flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-[18px]">
      <div className="flex min-w-0 items-baseline gap-2.5">
        <span className="text-[13px] font-semibold tracking-[0.24em]">THURVATE</span>
        <span className="hidden text-[11px] tracking-[0.1em] text-muted uppercase sm:inline">
          Product Scanner
        </span>
      </div>

      <div className="flex items-center gap-3.5">
        {scannerReady && (
          <div className="hidden items-center gap-[7px] text-[11px] tracking-[0.06em] text-stone uppercase sm:flex">
            <span className="bg-ink animate-beacon h-1.5 w-1.5 rounded-full" />
            Scanner ready
          </div>
        )}
        <div className="border-line-mid flex items-center gap-1.5 rounded-full border px-[11px] py-[5px] text-[11px] tracking-[0.03em] whitespace-nowrap text-ash tabular-nums">
          <span className="font-semibold">{remaining}</span> of{" "}
          <span className="font-semibold">{limit}</span> scans left
        </div>
      </div>
    </header>
  );
}

/**
 * Top bar for the pages that aren't the scanner. Deliberately lighter than
 * `Header` — a scans-left pill means nothing on a homepage or a settings screen.
 */
export function SiteHeader({ current }: { current?: "scan" | "settings" }) {
  const links: { href: string; label: string; key: "scan" | "settings" }[] = [
    { href: "/scan", label: "Scanner", key: "scan" },
    { href: "/settings", label: "Columns", key: "settings" },
  ];

  return (
    <header className="border-line bg-paper sticky top-0 z-10 flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-[18px]">
      <Link href="/" className="flex min-w-0 items-baseline gap-2.5 no-underline">
        <span className="text-[13px] font-semibold tracking-[0.24em] text-ink">THURVATE</span>
        <span className="hidden text-[11px] tracking-[0.1em] text-muted uppercase sm:inline">
          Product Scanner
        </span>
      </Link>

      <nav className="flex items-center gap-4">
        {links.map((link) => (
          <Link
            key={link.key}
            href={link.href}
            aria-current={current === link.key ? "page" : undefined}
            className={`text-[13px] no-underline transition-colors hover:text-ink ${
              current === link.key
                ? "text-ink underline underline-offset-[5px]"
                : "text-stone"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function Disclaimer() {
  return (
    <div className="border-line-mid bg-panel-deep fixed inset-x-0 bottom-0 z-20 border-t px-4 py-[11px]">
      <p className="text-center text-[11px] leading-snug tracking-[0.04em] text-stone text-pretty">
        Extracted using AI. Verify all details against the physical product before use.
      </p>
    </div>
  );
}

export function SessionAside({
  products,
  onOpenList,
}: {
  products: SessionProduct[];
  onOpenList: () => void;
}) {
  const recent = products.slice(-4).reverse();

  return (
    <aside className="bg-panel flex min-w-0 flex-col gap-4 px-5 pt-[26px] pb-10">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] tracking-[0.1em] text-stone uppercase">Session</span>
        <span className="text-[11px] text-faint tabular-nums">
          {products.length} products
        </span>
      </div>

      <div className="border-line-mid border-t">
        {recent.length === 0 ? (
          <p className="py-3 text-[13px] text-muted">Nothing scanned yet.</p>
        ) : (
          recent.map((product) => (
            <div
              key={product.id}
              className="flex items-baseline justify-between gap-3 border-b border-[#e4e4e0] py-2.5"
            >
              <span className="flex min-w-0 items-baseline gap-2">
                <span
                  className="font-mono text-[11px] text-muted"
                  title={SOURCE_LABEL[product.barcodeSource]}
                >
                  {SOURCE_MARK[product.barcodeSource]}
                </span>
                <span className="truncate text-[13px]">{product.name || "Untitled"}</span>
              </span>
              <span className="text-xs whitespace-nowrap text-stone tabular-nums">
                {product.price ? `Rs. ${product.price}` : "—"}
              </span>
            </div>
          ))
        )}
      </div>

      <Button
        variant="link"
        onClick={onOpenList}
        className="self-start !tracking-normal !normal-case !text-ash underline underline-offset-[3px]"
      >
        Open full list
      </Button>
    </aside>
  );
}
