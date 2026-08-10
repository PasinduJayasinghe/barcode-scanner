import type { ExportColumn, ExportProfile } from "./profile";
import type { FieldId } from "./fields";

function column(header: string, field: FieldId, constant?: string): ExportColumn {
  // Ids are deterministic here rather than random: built-in profiles are
  // rebuilt from this file on every load, and stable ids keep React from
  // remounting the editor rows on each render.
  return { id: `aronium-${header.toLowerCase()}`, header, field, constant };
}

/**
 * Aronium POS, exactly as the app has always emitted it.
 *
 * This is the default and is covered by a golden-file test: the bytes it
 * produces must stay identical to the pre-customisation output, so an existing
 * user sees no change. `Cost` and `Markup` are fixed at 0 because cost comes
 * from the supplier invoice and never from packaging.
 */
export const ARONIUM_PROFILE: ExportProfile = {
  id: "builtin-aronium",
  name: "Aronium POS",
  format: "csv",
  builtIn: true,
  version: 1,
  delimiter: ",",
  lineEnding: "crlf",
  includeHeader: true,
  bom: false,
  filenamePrefix: "thurvate-products",
  columns: [
    column("Name", "name"),
    column("ProductGroup", "category"),
    column("SKU", "constant", ""),
    column("Barcode", "barcode"),
    column("MeasurementUnit", "unit"),
    column("Cost", "constant", "0"),
    column("Markup", "constant", "0"),
    column("Price", "price"),
    column("Tax", "constant", ""),
    column("IsTaxInclusivePrice", "constant", "1"),
    column("IsPriceChangeAllowed", "constant", "0"),
    column("IsUsingDefaultQuantity", "constant", "1"),
    column("IsService", "constant", "0"),
    column("IsEnabled", "constant", "1"),
    column("Description", "constant", ""),
    column("Quantity", "constant", "0"),
  ],
};

export const BUILT_IN_PROFILES: ExportProfile[] = [ARONIUM_PROFILE];
