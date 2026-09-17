/** Browser for Macrostrat's map-compilation hierarchy.
 *
 * A compilation is a map assembled out of other maps; a served tile layer is a
 * compilation that happens to be served. Nothing in the database marks either as
 * a *kind* — "is a compilation" means has members — so this page shows the graph
 * itself and lets the derived flags do the explaining.
 *
 * On the hybrid frame, so the same page is a catalog you can read without a map
 * and a map you can read without the catalog. The whole graph arrives in one
 * server-side request (`/compilations/graph`), which is what lets the list
 * filter, group and select across the *entire* hierarchy rather than only what
 * has been expanded.
 */

import h from "@macrostrat/hyper";
import { useData } from "vike-react/useData";

import { HybridPage } from "~/layouts/hybrid";

import { CompilationAssistant } from "./assistant";
import { CompilationTree } from "./tree";
import { emptyGraph } from "./graph";
import { graphAtom } from "./state";
import { onDemand } from "~/_utils";

// The map pulls in mapbox-gl, which has no business in the server bundle.
const CompilationMap = onDemand(() =>
  import("./map.client").then((m) => m.CompilationMap)
);

export function Page() {
  const data = useData<{ graph: typeof emptyGraph }>();
  const graph = data?.graph ?? emptyGraph;

  return h(HybridPage, {
    capabilities: {
      defaultMode: "content-primary",
      itemName: "Compilations",
    },
    // `HybridPage` creates its own jotai scope, so page state has to be seeded
    // here rather than in an outer provider.
    initialAtoms: [[graphAtom, graph]],
    content: h(CompilationTree),
    map: h(CompilationMap),
    assistant: h(CompilationAssistant),
  });
}
