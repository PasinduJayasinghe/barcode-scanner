import Link from "next/link";

import { SiteHeader } from "@/components/Chrome";

const STEPS: { title: string; body: string }[] = [
  {
    title: "Scan or type the barcode",
    body: "A USB scanner in keyboard mode types the digits and presses Enter, so the field just works — no drivers, no pairing. No scanner? Type the number printed under the bars. Either way it advances the moment the code checks out.",
  },
  {
    title: "Photograph the front",
    body: "Your phone's own camera app opens. The front of the pack is where the brand, the product name and the net weight live.",
  },
  {
    title: "Photograph the back",
    body: "Make sure the printed MRP is legible — it sits near the manufacture and expiry dates on most Sri Lankan packs.",
  },
  {
    title: "Check both shots",
    body: "Blurred price? Retake it here. Nothing has been sent yet, so a retake costs you nothing.",
  },
  {
    title: "Extract",
    body: "Both photos go up together in a single request, so the model can cross-reference the two faces of the pack. Usually under ten seconds.",
  },
  {
    title: "Confirm and add",
    body: "Every field is editable, and anything the model was unsure about is flagged for review. Add another product, or download the file.",
  },
];

// What the shopkeeper brings, not how the system is wired. Anything only the
// operator can act on — keys, model names, token budgets — belongs in the
// README, not on a page a customer reads.
const REQUIREMENTS: [string, string][] = [
  ["A phone with a camera", "Nothing to install — it runs in the browser"],
  ["A USB barcode scanner", "Optional, but much faster once you're cataloguing a shelf at a time"],
  ["10 AI scans a day", "Typing the details in by hand is unlimited, and always available"],
  ["A short wait between scans", "Extraction is metered, and the app tells you when to wait"],
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-[1000px] flex-1 flex-col px-5">
        {/* ---- masthead ---- */}
        <section className="flex flex-col gap-7 pt-[7vh] pb-14">
          <div className="flex max-w-[46ch] flex-col gap-4">
            <span className="text-[11px] tracking-[0.14em] text-muted uppercase">
              Point-of-sale cataloguing
            </span>
            <h1 className="text-[clamp(2rem,5.2vw,3.1rem)] leading-[1.08] font-medium tracking-[-0.03em] text-pretty">
              Read a pack. Get point-of-sale data.
            </h1>
            <p className="text-[17px] leading-[1.55] text-slate text-pretty">
              Photograph a retail product&rsquo;s packaging and Thurvate extracts the fields
              your till needs — name, size, price, group and unit — then exports them in the
              exact column layout your POS expects.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/scan"
              className="border-ink bg-ink text-paper hover:border-ink-hover hover:bg-ink-hover flex min-h-[54px] items-center justify-center rounded-[2px] border px-7 text-[15px] font-medium no-underline transition-colors"
            >
              Open the scanner
            </Link>
            <Link
              href="/settings"
              className="border-line-strong text-ash hover:border-ink flex min-h-[54px] items-center justify-center rounded-[2px] border px-6 text-[15px] no-underline transition-colors"
            >
              Set up your columns
            </Link>
          </div>
        </section>

        {/* ---- how it works ---- */}
        <section className="flex flex-col gap-7 border-t border-t-ink py-14">
          <div className="flex max-w-[52ch] flex-col gap-3">
            <span className="text-[11px] tracking-[0.14em] text-muted uppercase">
              How it works
            </span>
            <h2 className="text-[26px] leading-tight font-medium tracking-[-0.02em] text-pretty">
              Six steps per product, most of them a single tap
            </h2>
          </div>

          <ol className="border-line grid list-none grid-cols-1 border-t p-0 md:grid-cols-2">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="border-line flex gap-4 border-b py-5 md:odd:pr-8 md:even:pl-8"
              >
                <span className="font-mono text-[13px] text-faint tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-[15px] font-medium">{step.title}</h3>
                  <p className="text-[13px] leading-[1.6] text-slate text-pretty">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ---- the design principle ---- */}
        <section className="flex flex-col gap-6 border-t border-t-ink py-14">
          <div className="flex max-w-[52ch] flex-col gap-3">
            <span className="text-[11px] tracking-[0.14em] text-muted uppercase">
              Why the barcode is scanned, not photographed
            </span>
            <h2 className="text-[26px] leading-tight font-medium tracking-[-0.02em] text-pretty">
              A misread barcode is invisible until the till rejects it
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="flex flex-col gap-4 text-[14px] leading-[1.65] text-slate">
              <p className="text-pretty">
                Ask a model to read digits from a photograph and it will occasionally transpose
                two of them. The problem is that a transposition can land on a number that is
                still a <em>valid</em> barcode — the check digit passes, nothing looks wrong,
                and the error only surfaces weeks later at the counter.
              </p>
              <p className="text-pretty">
                So Thurvate treats OCR as the fallback, never the default. The barcode comes
                from your scanner or your keyboard, and every code — whatever its source — is
                checksum-validated before it can be added.
              </p>
            </div>

            <div className="border-line bg-panel flex flex-col gap-3 border p-5">
              <span className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">
                Both of these are valid EAN-13
              </span>
              <div className="flex flex-col gap-1 font-mono text-[15px] tracking-[0.1em] tabular-nums">
                <span>8901262010016</span>
                <span>8901262010061</span>
              </div>
              <p className="text-[12px] leading-[1.6] text-slate text-pretty">
                The last two digits are swapped. The checksum passes either way, so validation
                alone cannot catch it. That is why anything read from a photo stays flagged for
                review even after it validates.
              </p>
            </div>
          </div>
        </section>

        {/* ---- columns ---- */}
        <section className="flex flex-col gap-6 border-t border-t-ink py-14">
          <div className="flex max-w-[52ch] flex-col gap-3">
            <span className="text-[11px] tracking-[0.14em] text-muted uppercase">
              Your columns, your POS
            </span>
            <h2 className="text-[26px] leading-tight font-medium tracking-[-0.02em] text-pretty">
              Build the file your system actually asks for
            </h2>
            <p className="text-[14px] leading-[1.65] text-slate text-pretty">
              Aronium ships as the default and is ready to import as-is. For anything else,
              duplicate it and change the header names, the order, which fields go where, and
              the fixed values your importer requires. Export as CSV or as a real{" "}
              <code className="font-mono text-[13px]">.xlsx</code>.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ExampleCard
              title="Aronium POS"
              caption="Built in · 16 columns"
              lines={["Name,ProductGroup,SKU,Barcode,", "MeasurementUnit,Cost,Markup,Price,…"]}
            />
            <ExampleCard
              title="Something simpler"
              caption="Yours · 5 columns"
              lines={["Product,Barcode,Price,Unit,Group"]}
            />
          </div>

          <Link
            href="/settings"
            className="text-ash hover:text-ink self-start text-[14px] underline underline-offset-[3px]"
          >
            Set up your columns →
          </Link>
        </section>

        {/* ---- requirements ---- */}
        <section className="flex flex-col gap-6 border-t border-t-ink py-14">
          <div className="flex max-w-[52ch] flex-col gap-3">
            <span className="text-[11px] tracking-[0.14em] text-muted uppercase">
              What you need
            </span>
            <h2 className="text-[26px] leading-tight font-medium tracking-[-0.02em] text-pretty">
              Nothing to install
            </h2>
          </div>

          <dl className="border-line grid grid-cols-1 border-t">
            {REQUIREMENTS.map(([term, detail]) => (
              <div
                key={term}
                className="border-line flex flex-col gap-1 border-b py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
              >
                <dt className="text-[14px]">{term}</dt>
                <dd className="m-0 max-w-[46ch] text-[13px] text-muted sm:text-right">
                  {detail}
                </dd>
              </div>
            ))}
          </dl>

          <p className="max-w-[60ch] text-[13px] leading-[1.65] text-slate text-pretty">
            Hit the daily limit, or caught the model mid rate-limit? Every screen offers a
            hand-typed fallback that needs no AI call and never counts against your scans.
          </p>
        </section>

        {/* ---- footer ---- */}
        <footer className="border-line flex flex-col gap-4 border-t py-9">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="text-[13px] font-semibold tracking-[0.24em]">THURVATE</span>
            <nav className="flex items-center gap-5 text-[13px] text-stone">
              <Link href="/scan" className="hover:text-ink no-underline">
                Scanner
              </Link>
              <Link href="/settings" className="hover:text-ink no-underline">
                Columns
              </Link>
            </nav>
          </div>
          <p className="max-w-[62ch] text-[12px] leading-[1.6] text-muted text-pretty">
            Product details are extracted using AI. Verify all details against the physical
            product before use. Photographs are processed in the request and discarded — they
            are never stored.
          </p>
        </footer>
      </main>
    </>
  );
}

function ExampleCard({
  title,
  caption,
  lines,
}: {
  title: string;
  caption: string;
  lines: string[];
}) {
  return (
    <div className="border-line flex flex-col gap-2.5 border p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[14px] font-medium">{title}</span>
        <span className="font-mono text-[10px] tracking-[0.08em] text-faint uppercase">
          {caption}
        </span>
      </div>
      <pre className="bg-panel overflow-x-auto p-2.5 font-mono text-[11px] leading-[1.7] text-ash">
        {lines.join("\n")}
      </pre>
    </div>
  );
}
