/** Edit a map's boundary as an ordered list of operations (admin).
 *
 * A boundary is its opening — the map's own footprint — followed by operations
 * replayed in order: drawn `add` and `subtract` polygons (river gaps, slivers),
 * and parameter operations such as `fill_holes`. The panel edits the list
 * through api-v3 `/bounds`; the map shows the built boundary, the drawn
 * polygons, and the one being drawn. */
import h from "@macrostrat/hyper";
import { useData } from "vike-react/useData";

import { onDemand } from "~/_utils";
import { HybridPage, type LayoutCapabilities } from "~/layouts/hybrid";

import type { MapBoundary, OperationType } from "./api";
import { BoundaryPanel } from "./panel";
import { boundaryAtom, operationTypesAtom } from "./state";

// mapbox-gl and the draw library have no business in the server bundle
const BoundaryMap = onDemand(() => import("./map.client").then((m) => m.BoundaryMap));

const capabilities: Partial<LayoutCapabilities> = {
  modes: ["map-primary", "content-primary"],
  defaultMode: "map-primary",
  hasAssistant: false,
  itemName: "Boundary",
  contentScroll: "panel",
};

export function Page() {
  const data = useData<{ boundary: MapBoundary | null; operationTypes: OperationType[] }>();
  return h(HybridPage, {
    capabilities,
    initialAtoms: [
      [boundaryAtom, data?.boundary ?? null],
      [operationTypesAtom, data?.operationTypes ?? []],
    ],
    content: h(BoundaryPanel),
    map: h(BoundaryMap),
  });
}
