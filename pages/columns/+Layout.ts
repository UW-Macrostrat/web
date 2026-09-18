import hyper from "@macrostrat/hyper";
import { ReactNode } from "react";

import { clientOnly } from "~/components/lex/client-only";

const h = hyper;

/** The single Mapbox instance for the `/columns` subtree. Client-only (it
 * reaches mapbox-gl) and mounted *here* rather than in a page, so it survives
 * client-side navigation between the column list and a column — pages move it
 * into their `ColumnMapSlot` and re-target it. See
 * `~/components/column-map/target`. */
const ColumnPersistentMap = clientOnly(() =>
  import("~/components/column-map/persistent-map.client").then(
    (m) => m.ColumnPersistentMap
  )
);

/**
 * Shared frame for the `/columns` subtree. Vike keeps a nested layout mounted
 * across client-side navigation within the subtree, so this is the home for the
 * one map instance the list and the column pages share.
 *
 * It adds no chrome of its own — the pages' own `HybridPage` frames still own
 * the header, panels and layout modes.
 */
export default function ColumnsLayout({ children }: { children: ReactNode }) {
  return h([
    children,
    // Renders nothing until a page asks for a map, then stays mounted.
    h(ColumnPersistentMap, { key: "persistent-map" }),
  ]);
}
