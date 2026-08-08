import { CATEGORIES } from "./types";

export const SYSTEM_INSTRUCTION = `You are extracting retail product data from photographs of product packaging, for a shop in Sri Lanka that is building a point-of-sale catalogue.

Respond with JSON only. No prose, no explanation, no markdown code fences.

Use exactly this schema:

{
  "productName": string,
  "brand": string,
  "size": string,
  "barcode": string | null,
  "price": number | null,
  "category": string,
  "unit": string,
  "confidence": {
    "productName": number,
    "barcode": number,
    "price": number
  }
}

Field rules:
- productName: brand + product + size, in Title Case. e.g. "Munchee Super Cream Cracker 190g".
- brand: the manufacturer or brand name alone.
- size: the net weight or volume, e.g. "170g", "500ml". Net weight is usually printed on the front of the pack — use it for this field.
- barcode: digits only, no spaces or hyphens. Null if a barcode was supplied to you in the request.
- price: the MRP printed on the pack, in LKR, as a number. Sri Lankan packs usually print "MRP Rs. XXX.XX" on the back, near the manufacture and expiry dates. Extract the number only — never the currency text. Null if no printed price is visible.
- category: exactly one of the values listed below, copied character for character.
- unit: "pcs" unless the product is clearly sold by weight.
- confidence: a number from 0 to 1 for each of the three named fields.

category must be exactly one of:
${CATEGORIES.map((c) => `- ${c}`).join("\n")}

Reading rules:
- If you are asked to read a barcode, use the human-readable digits printed beneath the bars. Never attempt to interpret the bar pattern itself.
- If a field is not visible in either photograph, return null. Do not guess, and do not infer a value from what the product "should" cost or weigh.
- Report low confidence honestly. A low score is far more useful to the shopkeeper than a confidently wrong value.`;

export function buildTaskPrompt(barcode: string | null): string {
  const barcodeBlock = barcode
    ? `The barcode for this product has already been captured by a hardware scanner or entered by hand:

  ${barcode}

Treat that number as ground truth. Do NOT read a barcode from the images, and return null for the "barcode" field. Use the number only to help you identify which product on the pack is the one being catalogued, in case several numbers are printed.
For the "barcode" confidence score, return 1.`
    : `No barcode was captured for this product, so you must read it from the images.

Find the human-readable digits printed beneath the bars of the barcode — normally on the back of the pack — and return them in the "barcode" field, digits only. If no barcode is legible in either photograph, return null.
Score the "barcode" confidence honestly; digits misread here are expensive to catch later.`;

  return `The two images above are the front and the back of a single retail product pack. Read them together: the brand and product name are usually on the front, while the barcode, MRP, net weight and manufacturer are usually on the back. Cross-reference the two faces to resolve anything ambiguous.

${barcodeBlock}

Return the JSON object now, and nothing else.`;
}
