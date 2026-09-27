/** Map provenance: which map replaces which, and who is credited for each.
 *
 * Supersession (`maps.sources.superseded_by`) and referencing are about maps as
 * sources rather than about how compilations are assembled, so they get their
 * own page beside the compilation browser. The list is every ingested map; the
 * side panel shows the selection's superseder, the maps it overlaps, its
 * memberships and its citation; the map draws them together. Editing is admin only, through api-v3 `PATCH /compilations`.
 */

import h from "@macrostrat/hyper";
import { useData } from "vike-react/useData";

import { HybridPage } from "~/layouts/hybrid";
import { emptyGraph } from "~/components/compilation-tree";
import { onDemand } from "~/_utils";

import { ProvenancePanel } from "./detail";
import { SourceList } from "./list";
import { graphAtom } from "./state";

// The map pulls in mapbox-gl, which has no business in the server bundle.
const ProvenanceMap = onDemand(() =>
  import("./map.client").then((m) => m.ProvenanceMap)
);

export function Page() {
  const data = useData<{ graph: typeof emptyGraph }>();
  const graph = data?.graph ?? emptyGraph;

  return h(HybridPage, {
    capabilities: {
      defaultMode: "content-primary",
      itemName: "Maps",
    },
    // `HybridPage` creates its own jotai scope, so page state is seeded here.
    initialAtoms: [[graphAtom, graph]],
    content: h(SourceList),
    map: h(ProvenanceMap),
    assistant: h(ProvenancePanel),
  });
}
