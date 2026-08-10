"use client";

import Link from "next/link";

import { findExportBlockers, resolveDuplicateNames, type ExportProfile } from "@/lib/export";
import {
  CATEGORIES,
  SOURCE_LABEL,
  SOURCE_MARK,
  type ProductForm,
  type SessionProduct,
} from "@/lib/types";
import { Button, Notice, ReviewTag } from "./ui";

const CELL =
  "min-h-[34px] w-full rounded-[2px] border border-transparent bg-transparent px-1.5 text-[13px] transition-colors hover:border-line-mid hover:bg-white focus:border-ink focus:bg-white";

export function SessionListScreen({
  products,
  remaining,
  profile,
  exporting,
  onEdit,
  onDelete,
  onDownload,
  onClose,
}: {
  products: SessionProduct[];
  remaining: number;
  profile: ExportProfile;
  exporting: boolean;
  onEdit: (id: string, key: keyof ProductForm, value: string) => void;
  onDelete: (id: string) => void;
  onDownload: () => void;
  onClose: () => void;
}) {
  const blockers = findExportBlockers(products, profile);
  const exportNames = resolveDuplicateNames(products);
  const renamed = exportNames.filter((name, i) => name !== products[i].name.trim()).length;
  const canDownload = products.length > 0 && blockers.length === 0;

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-medium tracking-[-0.01em]">This session</h2>
        <Button variant="link" onClick={onClose}>
          Close
        </Button>
      </div>

      {products.length === 0 ? (
        <p className="border-line border-y py-6 text-[13px] text-muted">
          No products yet. Scan one to get started.
        </p>
      ) : (
        <div className="-mx-5 overflow-x-auto px-5">
          <div className="border-line min-w-[620px] border-t border-t-ink border-b">
            <div className="border-line grid grid-cols-[30px_minmax(140px,2fr)_minmax(120px,1.2fr)_minmax(130px,1fr)_80px_32px] items-center gap-2.5 border-b py-2.5 text-[10px] tracking-[0.1em] text-muted uppercase">
              <span title="Barcode source">Src</span>
              <span>Product</span>
              <span>Barcode</span>
              <span>Group</span>
              <span className="text-right">MRP</span>
              <span />
            </div>

            {products.map((product) => (
              <div
                key={product.id}
                className="border-line-soft grid grid-cols-[30px_minmax(140px,2fr)_minmax(120px,1.2fr)_minmax(130px,1fr)_80px_32px] items-center gap-2.5 border-b py-[7px]"
              >
                <span
                  title={SOURCE_LABEL[product.barcodeSource]}
                  className="text-center font-mono text-[11px] text-stone"
                >
                  {SOURCE_MARK[product.barcodeSource]}
                </span>

                <div className="flex min-w-0 items-center gap-1.5">
                  <input
                    value={product.name}
                    aria-label="Product name"
                    onChange={(event) => onEdit(product.id, "name", event.target.value)}
                    className={CELL}
                  />
                  {product.needsReview && <ReviewTag>OCR</ReviewTag>}
                </div>

                <input
                  value={product.barcode}
                  aria-label="Barcode"
                  inputMode="numeric"
                  onChange={(event) => onEdit(product.id, "barcode", event.target.value)}
                  className={`${CELL} font-mono text-xs tracking-[0.06em] tabular-nums`}
                />

                <select
                  value={product.category}
                  aria-label="Product group"
                  onChange={(event) => onEdit(product.id, "category", event.target.value)}
                  className={`${CELL} cursor-pointer`}
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>

                <input
                  value={product.price}
                  aria-label="Price"
                  inputMode="decimal"
                  placeholder="—"
                  onChange={(event) => onEdit(product.id, "price", event.target.value)}
                  className={`${CELL} text-right tabular-nums`}
                />

                <button
                  type="button"
                  onClick={() => onDelete(product.id)}
                  title={`Delete ${product.name || "row"}`}
                  aria-label={`Delete ${product.name || "row"}`}
                  className="h-[30px] w-[30px] cursor-pointer rounded-[2px] border border-transparent bg-transparent text-sm text-faint transition-colors hover:border-ink hover:text-ink"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 text-[11px] tracking-[0.04em] text-faint">
        {(["scanned", "typed", "photo"] as const).map((source) => (
          <span key={source} className="flex items-center gap-1.5">
            <span className="font-mono">{SOURCE_MARK[source]}</span>
            {SOURCE_LABEL[source].toLowerCase()}
          </span>
        ))}
      </div>

      {blockers.map((blocker) => (
        <Notice key={blocker} tone="error">
          {blocker}
        </Notice>
      ))}

      {renamed > 0 && (
        <Notice tone="info">
          {renamed} duplicate product name{renamed === 1 ? "" : "s"} will get a numbered
          suffix in the CSV. Aronium rejects the whole import if two names match.
        </Notice>
      )}

      <div className="border-line bg-paper sticky bottom-[52px] flex flex-wrap items-center justify-between gap-3.5 border-t border-t-ink py-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[13px] text-ash tabular-nums">
            {products.length} products · {remaining} scans left
          </span>
          <span className="text-[11px] tracking-[0.04em] text-faint">
            Format: {profile.name} ({profile.format.toUpperCase()}) ·{" "}
            <Link href="/settings" className="underline underline-offset-2 hover:text-ink">
              Change columns
            </Link>
          </span>
        </div>
        <Button
          onClick={onDownload}
          disabled={!canDownload || exporting}
          className="!min-h-[46px] !w-auto px-5 text-sm"
        >
          {exporting ? "Preparing…" : `Download ${profile.format.toUpperCase()}`}
        </Button>
      </div>
    </div>
  );
}
