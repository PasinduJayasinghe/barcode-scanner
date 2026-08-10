import type { SessionProduct } from "../types";

/**
 * Stand-in rows for the column editor's preview.
 *
 * The session list lives in React state on /scan and isn't available here, so
 * the preview runs on these instead. They are chosen to exercise the cases that
 * actually catch people out: a name containing a comma, a decimal price, a
 * store-internal barcode, and a row whose barcode came from OCR.
 */
export const SAMPLE_PRODUCTS: SessionProduct[] = [
  {
    id: "sample-1",
    name: "Munchee Super Cream Cracker, 190g",
    brand: "Munchee",
    size: "190g",
    barcode: "8901262010016",
    price: "120.50",
    category: "MART/Snacks & Confectionery",
    unit: "pcs",
    barcodeSource: "scanned",
    confidence: { productName: 0.94, barcode: 1, price: 0.88 },
    needsReview: false,
    storeInternal: false,
  },
  {
    id: "sample-2",
    name: "Highland Fresh Milk 1L",
    brand: "Highland",
    size: "1L",
    barcode: "5449000000996",
    price: "480.00",
    category: "MART/Dairy & Frozen",
    unit: "pcs",
    barcodeSource: "typed",
    confidence: { productName: 0.9, barcode: 1, price: 0.91 },
    needsReview: false,
    storeInternal: false,
  },
  {
    id: "sample-3",
    name: "Shop Own Blend Tea 250g",
    brand: "",
    size: "250g",
    barcode: "2000000000008",
    price: "750.00",
    category: "MART/Beverages",
    unit: "kg",
    barcodeSource: "photo",
    confidence: { productName: 0.61, barcode: 0.55, price: 0.7 },
    needsReview: true,
    storeInternal: true,
  },
];
