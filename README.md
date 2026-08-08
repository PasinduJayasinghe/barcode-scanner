# Thurvate Product Scanner

Photograph a retail pack, get a row of point-of-sale data. The app captures a product's
barcode, takes a front and back photo, sends both to Google Gemini in one call, and
exports the result as a CSV formatted for import into [Aronium POS](https://www.aronium.com/).

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Gemini `gemini-2.0-flash`.
No database, no auth, no image storage — photos are processed in the request and discarded.

## Running it

```bash
npm install
cp .env.example .env.local   # then paste your key into GEMINI_API_KEY
npm run dev
```

Deploying to Vercel: set `GEMINI_API_KEY` in the project's environment variables. Nothing
else is required.

## The design principle

**Barcode digits read from a photograph are not trustworthy.** A model can transpose two
digits and produce a number that is still a valid EAN — the error then flows silently into
the POS and is only discovered at the till.

So the barcode is captured by hardware scanner or typed by hand wherever possible, and OCR
is strictly a fallback. Every barcode, from every source, is checksum-validated
([`lib/barcode.ts`](lib/barcode.ts)), and any barcode whose source is `photo` is flagged
for manual review in the UI *even when the checksum passes*.

A USB scanner in HID keyboard mode just types the digits and sends Enter, so the barcode
field is a plain `<input>` — no library. The app tells a scanner from a human by keystroke
timing: a scanner emits the whole code as one burst (a few milliseconds between
characters), which no typist can sustain. The source is recorded as `scanned`, `typed` or
`photo` and carried all the way to the session list.

## Flow

1. **Barcode** — scanner or manual entry. Optional skip to the OCR fallback.
2. **Front photo**, then **back photo** — `<input type="file" capture="environment">`,
   resized client-side to 1024px on the long edge and re-encoded as JPEG at 0.8 quality.
3. **Review** both shots, retake either.
4. **Extract** — one Gemini call.
5. **Confirm** the editable results form.
6. Add another, or finish and download the CSV.

### Why one call with both images

The front of a pack carries the brand and product name; the back carries the barcode, MRP
and net weight. Sending both images in a single request — labelled `Image 1: front of pack`
and `Image 2: back of pack` — lets the model cross-reference the two faces and resolve
ambiguities between them. Two separate calls cannot do this.

When a barcode has already been captured, it is passed into the prompt as ground truth.
That both prevents the model from re-reading (and possibly corrupting) a number we already
know is good, and helps it pick the right product when a pack shows several numbers.

## Validation rules

| Input | Result |
| --- | --- |
| 8, 12 or 13 digits, checksum passes | Accepted |
| Checksum fails | Inline error; product cannot be added |
| 14 digits | Rejected as a carton code, not a retail unit |
| Starts with `2` or `02` | Accepted, flagged as store-internal |
| Contains non-digits | Rejected |
| Already in this session | Rejected as a duplicate at entry |

## CSV output

Filename `thurvate-products-YYYY-MM-DD.csv`. CRLF line endings, UTF-8, **no BOM**. Fields
containing a comma, quote or newline are quoted.

`Cost` and `Markup` are always `0` — cost comes from the supplier invoice, never from
packaging. `Price` is the printed MRP.

Duplicate product names are resolved before the file is written (second occurrence becomes
`Name (2)`, and so on), because a repeated name aborts the entire Aronium import. Duplicate
barcodes are blocked earlier, at entry.

The AI disclaimer deliberately does **not** appear in the CSV — the file stays clean for import.

## Daily quota

10 products per calendar day, tracked in `localStorage` keyed by local date and enforced
again in the API route with an IP-keyed counter. Only successful extractions count; a
failed call is free.

⚠️ The server-side counter lives in memory ([`lib/server-quota.ts`](lib/server-quota.ts)).
Serverless instances are ephemeral and several may run concurrently, so it is a speed bump
rather than exact accounting. Swap the `Map` for Vercel KV if the limit ever needs to hold
precisely.

## Layout

```
app/
  page.tsx              screen state machine, session list, quota wiring
  api/extract/route.ts  the only place the Gemini key is ever touched
lib/
  barcode.ts            checksum, validation, scanner-vs-typed detection
  csv.ts                Aronium export, duplicate-name resolution
  gemini-prompt.ts      system instruction and task prompt
  image.ts              client-side downscale + JPEG re-encode
  quota.ts              client daily counter
  server-quota.ts       IP-keyed daily counter
components/             one file per screen, plus shared primitives in ui.tsx
```
