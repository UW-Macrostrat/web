import type { PageContextServer } from "vike/types";
import { fetchPGData } from "~/_utils/fetch-helpers";
import {
  emptyGraph,
  fetchCompilationGraph,
  type CompilationGraph,
} from "~/components/compilation-tree";
import { joinCompilations } from "./compilations";

const MAP_FIELDS = [
  "source_id",
  "slug",
  "name",
  "scale",
  "ref_title",
  "ref_source",
  "ref_year",
];

/** Every map at once (~860 rows), so the list and the map filter the same
 * set in memory. */
export async function data(pageContext: PageContextServer) {
  const [maps, graph] = await Promise.all([fetchMaps(), fetchGraph()]);
  const { rows, compilations } = joinCompilations(maps, graph);
  return {
    maps: rows,
    compilations,
    // Filters are read from the URL once; the server renders the same view
    search: pageContext.urlParsed?.searchOriginal ?? "",
  };
}

async function fetchMaps() {
  const res = await fetchPGData("/maps", {
    select: MAP_FIELDS.join(","),
    order: "source_id.desc",
  });
  if (!Array.isArray(res)) return [];
  return res;
}

async function fetchGraph(): Promise<CompilationGraph> {
  try {
    return await fetchCompilationGraph();
  } catch (error) {
    // Without the graph the list still works; only the compilation filter goes
    console.error("Could not load the compilation graph:", error);
    return emptyGraph;
  }
}
