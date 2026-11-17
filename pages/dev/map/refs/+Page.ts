/** Reference geometries (`macrostrat.refs.rgeom`), for finding bad ones.
 *
 * Matching places strat names with no footprint of their own by their
 * reference's geometry, so a reference whose geometry is wrong misplaces every
 * name it contributed. The list flags invalid ones; the map shows the rest. */
import h from "@macrostrat/hyper";
import { useData } from "vike-react/useData";

import { onDemand } from "~/_utils";
import { HybridPage, type LayoutCapabilities } from "~/layouts/hybrid";

import type { Reference } from "./api";
import { RefAssistant } from "./assistant";
import { RefList, RefToolbar } from "./panel";
import { refsAtom } from "./state";

// mapbox-gl has no business in the server bundle
const RefMap = onDemand(() => import("./map.client").then((m) => m.RefMap));

const capabilities: Partial<LayoutCapabilities> = {
  modes: ["map-primary", "content-primary", "map-only"],
  defaultMode: "map-primary",
  itemName: "References",
  contentScroll: "panel",
};

export function Page() {
  const data = useData<{ refs: Reference[] }>();
  return h(HybridPage, {
    capabilities,
    initialAtoms: [[refsAtom, data?.refs ?? []]],
    filterBar: h(RefToolbar),
    content: h(RefList),
    map: h(RefMap),
    assistant: h(RefAssistant),
  });
}
