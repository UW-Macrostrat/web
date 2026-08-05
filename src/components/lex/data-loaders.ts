import { fetchAPIData, fetchAPIRefs, fetchPGData } from "~/_utils";
import { getPrevalentTaxa } from "./data-helper";
import { render } from "vike/abort";
import { useData } from "vike-react/useData";
import { MacrostratItemIdentifier } from "@macrostrat/data-components";

/**
 * Portable, run-location-agnostic loaders for lexicon detail data.
 *
 * These are plain async functions (no React, no jotai) so the same call can run
 * in a server `+data` hook OR inside a client jotai atom. Layer A loads the
 * heavy/derived resources (columns, fossils, taxa, related-item presence) on the
 * client via atoms; keeping the fetch logic here means any of them can be
 * re-hoisted into the server `+data` later (for SSR/SEO) by moving only the
 * call site — see [[Geologic lexicon pages]].
 */

/** Per-type config: how to load the core record, and the id-param name used
 * across the shared `/columns`, `/fossils`, `/units`, legend endpoints. Most
 * types load their core from a `/defs/<x>` route; a type with a non-standard
 * core (e.g. a PostgREST view) supplies `coreLoader` instead. */
export interface LexTypeConfig {
  defsEndpoint?: string;
  idParam: string;
  /** Override for the core record load when it isn't a plain `/defs/` route. */
  coreLoader?: (id: number) => Promise<any>;
  siftLink?: string;
}

/** Keyed by the URL type segment (`/lex/<type>/<id>`). */
export const LEX_TYPE_CONFIG: Record<string, LexTypeConfig> = {
  lithologies: {
    defsEndpoint: "/defs/lithologies",
    idParam: "lith_id",
    siftLink: "lithology",
  },
  intervals: {
    defsEndpoint: "/defs/intervals",
    idParam: "int_id",
    siftLink: "interval",
  },
  environments: {
    defsEndpoint: "/defs/environments",
    idParam: "environ_id",
    siftLink: "environment",
  },
  economics: {
    defsEndpoint: "/defs/econs",
    idParam: "econ_id",
    siftLink: "economy",
  },
  "strat-names": {
    defsEndpoint: "/defs/strat_names",
    idParam: "strat_name_id",
    siftLink: "strat_name",
  },
  minerals: { defsEndpoint: "/defs/minerals", idParam: "mineral_id" },
  structures: { defsEndpoint: "/defs/structures", idParam: "structure_id" },
  "lith-atts": {
    defsEndpoint: "/defs/lithology_attributes",
    idParam: "lith_att_id",
  },
  "strat-concepts": {
    // Core comes from a PostgREST view, not a /defs/ route; everything else
    // (columns/fossils/units/refs) keys on strat_name_concept_id.
    idParam: "strat_name_concept_id",
    siftLink: "strat_name_concept",
    coreLoader: (id) =>
      fetchPGData("/strat_concepts_with_names", {
        concept_id: "eq." + id,
      }).then((r) => r?.[0] ?? null),
  },
};

export function lexTypeConfig(type: string): LexTypeConfig | null {
  return LEX_TYPE_CONFIG[type] ?? null;
}

/** Extract the numeric lex id from a page context in the `data()` hook.
 * `routeParams` isn't reliably populated there on a direct/SSR request, so fall
 * back to the URL path (`/lex/<type>/<id>`). */
export function lexIdFromContext(pageContext: any): number {
  const raw =
    pageContext.routeParams?.id ??
    pageContext.urlParsed?.pathname?.split("/")[3];
  return parseInt(raw);
}

/** Core descriptive record (server-HTML / SEO). Throws on API failure so the
 * page's ErrorBoundary can surface a "doesn't exist" state. */
export async function fetchLexCore(cfg: LexTypeConfig, id: number) {
  if (cfg.coreLoader != null) return cfg.coreLoader(id);
  const res = await fetchAPIData(cfg.defsEndpoint, { [cfg.idParam]: id });
  return res?.[0] ?? null;
}

export interface LexItemData {
  resData: any;
  id: number;
  type: string;
  config: Omit<LexTypeConfig, "coreLoader">;
}

const typeNames = Object.keys(LEX_TYPE_CONFIG);

export function useLexItemData() {
  return useData<LexItemData>();
}

export async function fetchLexData(
  pageContext: any,
  type: string
): Promise<LexItemData> {
  /** Lex data fetcher for use in Vike, with semantic
   * error handling
   */
  if (type == null || !typeNames.includes(type)) {
    throw render(404, "Invalid lexicon type");
  }

  const id = lexIdFromContext(pageContext);
  if (isNaN(id)) {
    throw render(404, "ID must be a number");
  }
  const cfg = lexTypeConfig(type);
  const resData = await fetchLexCore(cfg, id);
  if (resData == null) {
    throw render(404, `${type} not found`);
  }

  return {
    type,
    id,
    resData,
    config: {
      defsEndpoint: cfg.defsEndpoint,
      idParam: cfg.idParam,
      siftLink: cfg.siftLink,
    },
  };
}

/** Merged references from the fossils + columns endpoints (server-HTML).
 * Per-source failures degrade to an empty list rather than failing the page. */
export async function fetchLexRefs(cfg: LexTypeConfig, id: number) {
  const [fossilRefs, columnRefs] = await Promise.all([
    fetchAPIRefs("/fossils", { [cfg.idParam]: id }).catch(() => null),
    fetchAPIRefs("/columns", { [cfg.idParam]: id }).catch(() => null),
  ]);
  return [
    ...(fossilRefs ? Object.values(fossilRefs) : []),
    ...(columnRefs ? Object.values(columnRefs) : []),
  ];
}

/** Column GeoJSON — heavy; feeds the map island and derived stats/charts. */
export async function fetchLexColumns(cfg: LexTypeConfig, id: number) {
  return fetchAPIData("/columns", {
    [cfg.idParam]: id,
    response: "long",
    format: "geojson",
  });
}

/** Fossil-collection GeoJSON — heavy; feeds the map island (and taxa). */
export async function fetchLexFossils(cfg: LexTypeConfig, id: number) {
  return fetchAPIData("/fossils", { [cfg.idParam]: id, format: "geojson" });
}

/** Prevalent taxa (PBDB), derived from fossil collections. Takes already-loaded
 * fossil GeoJSON so it can share the fossils fetch rather than re-issuing it. */
export async function fetchLexPrevalentTaxa(fossilsData: any) {
  return getPrevalentTaxa(fossilsData);
}

/** Related units. NOTE: downstream only uses presence (`.length`); a
 * count-only endpoint would be lighter — tracked as a follow-up. */
export async function fetchLexUnits(cfg: LexTypeConfig, id: number) {
  return fetchAPIData("/units", { [cfg.idParam]: id });
}

/** Map-legend samples. NOTE: downstream only uses presence (`.length`). */
export async function fetchLexMaps(cfg: LexTypeConfig, id: number) {
  return fetchAPIData("/geologic_units/map/legend", {
    [cfg.idParam]: id,
    sample: "true",
  });
}
