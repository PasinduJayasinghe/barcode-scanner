# Thurvate Product Scanner

Photograph a retail pack, get a row of point-of-sale data. The app captures a product's
barcode, takes a front and back photo, sends both to Groq in one call, and exports the
result as a CSV formatted for import into [Aronium POS](https://www.aronium.com/).

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Groq `qwen/qwen3.6-27b`.
No database, no auth, no image storage — photos are processed in the request and discarded.

## Running it

```bash
npm install
cp .env.example .env.local   # then paste your key into GROQ_API_KEY
npm run dev
```

Deploying to Vercel: set `GROQ_API_KEY` in the project's environment variables. Nothing
else is required.

### Why Groq, and why this model

`qwen/qwen3.6-27b` is the **only image-capable model on Groq's free tier** — everything
else on offer is text, audio or a safety classifier. It was chosen because it accepts
**multiple images in one request**, which the design depends on (see below). Verified:
given the front and back separately labelled, it correctly attributes text to the image it
came from rather than blurring the two together.

Google Gemini was the original target and is no longer viable on a free account: the 2.x
Flash models return *"no longer available to new users"*, and `gemini-2.0-flash`'s free
tier is retired outright.

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
4. **Extract** — one Groq call.
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

## Export

The file shape is **data, not code** — an `ExportProfile` describing ordered columns, each
mapping a header name to a field (or a fixed value). Customers build their own on
`/settings`; the scanner exports whichever profile is selected.

**Aronium POS is the built-in default and is locked.** It is covered by a golden-file test:
its bytes must stay identical to the pre-customisation output, so an existing user sees no
change. Duplicate it to get an editable copy.

- Filename `<prefix>-YYYY-MM-DD.<csv|xlsx>`
- CSV: configurable delimiter, CRLF/LF, optional UTF-8 BOM, optional header row
- Duplicate product names get a numbered suffix before writing, because a repeated name
  aborts the whole Aronium import. Duplicate barcodes are blocked earlier, at entry
- Export blockers are profile-aware: a missing price only blocks if the profile has a Price
  column
- The AI disclaimer deliberately does **not** appear in the file — it stays clean for import

### CSV and .xlsx differ deliberately

A field beginning with `=`, `+`, `-` or `@` is written to **CSV** with a leading apostrophe
(`'=1+1`). Excel and LibreOffice execute such cells as formulas *even inside quoted fields*,
and product names originate from OCR of a photographed label — so the first character is
effectively chosen by whoever printed the packaging.

**.xlsx does not do this, and must not.** Every cell is written with an explicit type, and
`type: String` is a different thing from the writer's `type: 'Formula'` — so the value is
stored as text and never evaluated. Adding the apostrophe there would corrupt the name for
no gain. Numeric fields are written as real numbers, so a Price column can be summed.

Both behaviours are asserted in tests, including one that unzips a generated `.xlsx` and
checks the sheet XML contains no formula elements.

The writer (`write-excel-file`) is loaded with a dynamic `import()` and lands in its own
~83KB chunk, so sessions that never export never download it.

## Daily quota

10 products per calendar day, tracked in `localStorage` keyed by local date and enforced
again in the API route with an IP-keyed counter. Only successful extractions count; a
failed call is free.

### Groq's limits, which are separate — and it's tokens, not requests

The app's 10/day cap is its own; Groq's free tier applies on top of it: **1000 requests per
day, but only 8000 tokens per minute.**

Requests are not the constraint — tokens are. A 1024px front-and-back pair costs **~3700
input tokens**, so in practice you get **about two scans per minute**. Ten products takes
roughly five minutes of wall clock, not because the model is slow but because the budget
refills on a rolling minute.

Hitting it produces a distinct `RATE_LIMIT` message quoting Groq's own `retry-after` value,
rather than the daily-limit screen — and it does not consume one of your 10 scans.

Two things keep the token cost down:

- **Thinking is off** (`reasoning_effort: "none"`). Qwen reasons before answering by
  default, spending hundreds of completion tokens against that same ceiling. Reading fields
  off a label is perception, not reasoning; with it off, completions run ~20 tokens.
- **Images are downscaled to 1024px** before upload ([`lib/image.ts`](lib/image.ts)).
  Dropping to 768px would roughly halve the token cost and double the scans per minute, at
  the cost of legibility on small printed MRP text — the one field you least want misread.

⚠️ The server-side counter lives in memory ([`lib/server-quota.ts`](lib/server-quota.ts)).
Serverless instances are ephemeral and several may run concurrently, so it is a speed bump
rather than exact accounting. Swap the `Map` for Vercel KV if the limit ever needs to hold
precisely.

## Layout

```
app/
  page.tsx              homepage + how-to guide (static)
  scan/page.tsx         the scanner: screen state machine, session list, quota
  settings/page.tsx     column profile editor
  api/extract/route.ts  the only place the Groq key is ever touched
lib/
  barcode.ts            checksum, validation, scanner-vs-typed detection
  prompt.ts             system instruction and task prompt
  image.ts              client-side downscale + JPEG re-encode
  date.ts               localDateKey, shared by quota and export
  quota.ts              client daily counter
  server-quota.ts       IP-keyed daily counter
  export/
    fields.ts           what a column can contain, and how it resolves
    profile.ts          ExportProfile shape + validation
    presets.ts          Aronium — the locked built-in
    csv.ts              CSV writer (apostrophe guard lives here)
    xlsx.ts             .xlsx writer, dynamically imported
    store.ts            localStorage profiles, useSyncExternalStore
    index.ts            downloadExport, filenames, export blockers
components/             one file per screen, plus shared primitives in ui.tsx
```

### Routes

| Route | Contents |
| --- | --- |
| `/` | Homepage and how-to guide |
| `/scan` | The scanner |
| `/settings` | Column profile editor |
| `/api/extract` | Groq call — server only |
