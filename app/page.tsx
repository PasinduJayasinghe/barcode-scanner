"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

import { BarcodeStep } from "@/components/BarcodeStep";
import { CaptureStep } from "@/components/CaptureStep";
import { Disclaimer, Header, SessionAside } from "@/components/Chrome";
import { Landing } from "@/components/Landing";
import { LimitScreen } from "@/components/LimitScreen";
import { ProcessingStep } from "@/components/ProcessingStep";
import { ResultsStep } from "@/components/ResultsStep";
import { ReviewStep } from "@/components/ReviewStep";
import { SessionListScreen } from "@/components/SessionListScreen";
import { validateBarcode } from "@/lib/barcode";
import { downloadCsv } from "@/lib/csv";
import { processImageFile } from "@/lib/image";
import {
  DAILY_LIMIT,
  consumeQuota,
  exhaustQuota,
  getUsedServerSnapshot,
  getUsedSnapshot,
  subscribeQuota,
} from "@/lib/quota";
import {
  FALLBACK_CATEGORY,
  type BarcodeSource,
  type CapturedImage,
  type ExtractResponse,
  type ExtractedProduct,
  type FieldConfidence,
  type ProductForm,
  type SessionProduct,
} from "@/lib/types";

type Screen =
  | "landing"
  | "barcode"
  | "captureFront"
  | "captureBack"
  | "review"
  | "processing"
  | "results"
  | "list"
  | "limit";

/** Everything about the product currently being scanned. */
interface Draft {
  barcodeInput: string;
  source: BarcodeSource;
  front: CapturedImage | null;
  back: CapturedImage | null;
  confidence: FieldConfidence;
  form: ProductForm;
}

const EMPTY_FORM: ProductForm = {
  name: "",
  brand: "",
  size: "",
  barcode: "",
  price: "",
  category: FALLBACK_CATEGORY,
  unit: "pcs",
};

const EMPTY_DRAFT: Draft = {
  barcodeInput: "",
  source: "scanned",
  front: null,
  back: null,
  confidence: { productName: 0, barcode: 0, price: 0 },
  form: EMPTY_FORM,
};

/** All three scores below this means the photos, not the model, are the problem. */
const BLURRED_BELOW = 0.4;

export default function Page() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [products, setProducts] = useState<SessionProduct[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scannerSeen, setScannerSeen] = useState(false);

  // localStorage isn't readable during the server render, so the counter comes
  // through an external store rather than a mount effect.
  const used = useSyncExternalStore(
    subscribeQuota,
    getUsedSnapshot,
    getUsedServerSnapshot,
  );

  const remaining = Math.max(0, DAILY_LIMIT - used);
  const existingCodes = useMemo(() => products.map((p) => p.barcode), [products]);

  const entryVerdict = useMemo(
    () => validateBarcode(draft.barcodeInput, existingCodes),
    [draft.barcodeInput, existingCodes],
  );

  const resultVerdict = useMemo(
    () => validateBarcode(draft.form.barcode, existingCodes),
    [draft.form.barcode, existingCodes],
  );

  const patchDraft = useCallback(
    (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch })),
    [],
  );

  const startScan = useCallback(() => {
    setExtractError(null);
    setCaptureError(null);
    setDraft(EMPTY_DRAFT);
    setScreen(remaining <= 0 ? "limit" : "barcode");
  }, [remaining]);

  const submitBarcode = useCallback(
    (source: BarcodeSource) => {
      if (source === "scanned") setScannerSeen(true);
      setDraft((current) => ({
        ...current,
        source,
        barcodeInput: validateBarcode(current.barcodeInput).digits,
      }));
      setScreen("captureFront");
    },
    [],
  );

  const skipBarcode = useCallback(() => {
    setDraft((current) => ({ ...current, source: "photo", barcodeInput: "" }));
    setScreen("captureFront");
  }, []);

  const handleFile = useCallback(
    async (side: "front" | "back", file: File) => {
      setBusy(true);
      setCaptureError(null);
      try {
        const image = await processImageFile(file);
        patchDraft(side === "front" ? { front: image } : { back: image });
        setScreen(side === "front" ? "captureBack" : "review");
      } catch (error) {
        setCaptureError(
          error instanceof Error ? error.message : "That photo could not be processed.",
        );
      } finally {
        setBusy(false);
      }
    },
    [patchDraft],
  );

  const extract = useCallback(async () => {
    if (!draft.front || !draft.back) return;

    setExtractError(null);
    setScreen("processing");

    let response: Response;
    try {
      response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          front: { base64: draft.front.base64, mimeType: draft.front.mimeType },
          back: { base64: draft.back.base64, mimeType: draft.back.mimeType },
          barcode: draft.barcodeInput || null,
          barcodeSource: draft.source,
        }),
      });
    } catch {
      // The draft is untouched, so retrying costs no photos and no quota.
      setExtractError(
        "Couldn't reach the server. Your photos and barcode are still here — retry when you have a connection.",
      );
      setScreen("review");
      return;
    }

    const body = (await response.json().catch(() => null)) as ExtractResponse | null;

    if (!body || !body.ok) {
      if (body?.error.code === "QUOTA") {
        exhaustQuota();
        setScreen("limit");
        return;
      }
      setExtractError(body?.error.message ?? "Extraction failed. Please try again.");
      setScreen("review");
      return;
    }

    consumeQuota();
    setDraft((current) => ({
      ...current,
      confidence: body.data.confidence,
      form: toForm(body.data, current.barcodeInput),
    }));
    setScreen("results");
  }, [draft.front, draft.back, draft.barcodeInput, draft.source]);

  const commit = useCallback(() => {
    setProducts((current) => [
      ...current,
      {
        ...draft.form,
        name: draft.form.name.trim(),
        barcode: validateBarcode(draft.form.barcode).digits,
        id: newId(),
        barcodeSource: draft.source,
        confidence: draft.confidence,
        needsReview: draft.source === "photo",
        storeInternal: resultVerdict.storeInternal,
      },
    ]);
  }, [draft, resultVerdict.storeInternal]);

  const editProduct = useCallback(
    (id: string, key: keyof ProductForm, value: string) =>
      setProducts((current) =>
        current.map((product) => (product.id === id ? { ...product, [key]: value } : product)),
      ),
    [],
  );

  const showAside = screen !== "list" && screen !== "limit";

  return (
    <>
      <Header remaining={remaining} limit={DAILY_LIMIT} scannerReady={scannerSeen} />

      <main className="mx-auto grid w-full max-w-[1180px] flex-1 grid-cols-1 items-stretch pb-[52px] lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="flex min-w-0 flex-col px-5 pt-[26px] pb-10">
          {screen === "landing" && (
            <Landing
              limit={DAILY_LIMIT}
              productCount={products.length}
              onStart={startScan}
              onOpenList={() => setScreen("list")}
            />
          )}

          {screen === "barcode" && (
            <BarcodeStep
              value={draft.barcodeInput}
              verdict={entryVerdict}
              onChange={(value) => patchDraft({ barcodeInput: value })}
              onSubmit={submitBarcode}
              onSkip={skipBarcode}
              onBack={() => setScreen("landing")}
            />
          )}

          {(screen === "captureFront" || screen === "captureBack") && (
            <CaptureStep
              side={screen === "captureFront" ? "front" : "back"}
              front={draft.front}
              busy={busy}
              error={captureError}
              onFile={(file) =>
                handleFile(screen === "captureFront" ? "front" : "back", file)
              }
              onBack={() =>
                setScreen(screen === "captureBack" ? "captureFront" : "barcode")
              }
              onRetakeFront={() => {
                patchDraft({ front: null });
                setScreen("captureFront");
              }}
            />
          )}

          {screen === "review" && (
            <ReviewStep
              barcode={draft.barcodeInput}
              barcodeSource={draft.source}
              front={draft.front}
              back={draft.back}
              error={extractError}
              onRetakeFront={() => {
                patchDraft({ front: null });
                setScreen("captureFront");
              }}
              onRetakeBack={() => {
                patchDraft({ back: null });
                setScreen("captureBack");
              }}
              onExtract={extract}
              onBack={() => setScreen("captureBack")}
            />
          )}

          {screen === "processing" && <ProcessingStep />}

          {screen === "results" && (
            <ResultsStep
              form={draft.form}
              confidence={draft.confidence}
              barcodeSource={draft.source}
              barcodeVerdict={resultVerdict}
              lowQuality={isBlurred(draft.confidence)}
              onField={(key, value) =>
                setDraft((current) => ({
                  ...current,
                  form: { ...current.form, [key]: value },
                }))
              }
              onRetake={() => {
                patchDraft({ front: null, back: null });
                setScreen("captureFront");
              }}
              onAddAnother={() => {
                commit();
                setDraft(EMPTY_DRAFT);
                // `remaining` already reflects the scan this product consumed.
                setScreen(remaining <= 0 ? "limit" : "barcode");
              }}
              onDone={() => {
                commit();
                setDraft(EMPTY_DRAFT);
                setScreen("list");
              }}
              onBack={() => setScreen("review")}
            />
          )}

          {screen === "list" && (
            <SessionListScreen
              products={products}
              remaining={remaining}
              onEdit={editProduct}
              onDelete={(id) =>
                setProducts((current) => current.filter((product) => product.id !== id))
              }
              onDownload={() => downloadCsv(products)}
              onClose={() => setScreen("landing")}
            />
          )}

          {screen === "limit" && (
            <LimitScreen limit={DAILY_LIMIT} onOpenList={() => setScreen("list")} />
          )}
        </section>

        {showAside && (
          <SessionAside products={products} onOpenList={() => setScreen("list")} />
        )}
      </main>

      <Disclaimer />
    </>
  );
}

function toForm(data: ExtractedProduct, capturedBarcode: string): ProductForm {
  return {
    name: data.productName,
    brand: data.brand,
    size: data.size,
    // A scanned or typed code always outranks anything read off the pack.
    barcode: capturedBarcode || data.barcode || "",
    price: data.price === null ? "" : String(data.price),
    category: data.category,
    unit: data.unit || "pcs",
  };
}

function isBlurred(confidence: FieldConfidence): boolean {
  return Object.values(confidence).every((score) => score < BLURRED_BELOW);
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `p-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
