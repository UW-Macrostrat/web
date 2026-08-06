import { atom, useAtomValue } from "jotai";
import { atomFamily, loadable } from "jotai/utils";
import {
  lexTypeConfig,
  fetchLexColumns,
  fetchLexFossils,
  fetchLexPrevalentTaxa,
  fetchLexRefs,
  fetchLexUnits,
  fetchLexMaps,
  fetchLexDefs,
} from "./data-loaders";

/**
 * Client-side loadable atoms for a lexicon item's heavy/derived data.
 *
 * Keyed by `{type, id}` via a module-level `atomFamily`, so the fetch is shared
 * across every consumer of the same item and cached across client-side
 * navigations (revisiting an item is instant). Each resource wraps its async
 * atom in `loadable`, so reading it never suspends; the hooks below return the
 * resolved value or `null` while loading/errored, which lets the existing
 * prop-based components (`ColumnsTable`, `Charts`, `PrevalentTaxa`, …) consume
 * them unchanged. Richer loading/error UX can read the loadable state directly
 * later. See [[Geologic lexicon pages]] (Layer A/D).
 */

export interface LexItemRef {
  type: string;
  id: number;
}

function keyFor(ref: LexItemRef): string {
  return `${ref.type}:${ref.id}`;
}

function parseKey(key: string): LexItemRef {
  const idx = key.lastIndexOf(":");
  return { type: key.slice(0, idx), id: Number(key.slice(idx + 1)) };
}

function resolveConfig(key: string) {
  const { type, id } = parseKey(key);
  const cfg = lexTypeConfig(type);
  if (cfg == null || !Number.isFinite(id)) return null;
  return { cfg, id };
}

const columnsAtom = atomFamily((key: string) =>
  atom(async () => {
    const r = resolveConfig(key);
    if (r == null) return null;
    return fetchLexColumns(r.cfg, r.id);
  })
);

const fossilsAtom = atomFamily((key: string) =>
  atom(async () => {
    const r = resolveConfig(key);
    if (r == null) return null;
    return fetchLexFossils(r.cfg, r.id);
  })
);

// Derives from the resolved fossils atom — no second GeoJSON fetch.
const taxaAtom = atomFamily((key: string) =>
  atom(async (get) => {
    const fossils = await get(fossilsAtom(key));
    return fetchLexPrevalentTaxa(fossils);
  })
);

const unitsAtom = atomFamily((key: string) =>
  atom(async () => {
    const r = resolveConfig(key);
    if (r == null) return null;
    return fetchLexUnits(r.cfg, r.id);
  })
);

const mapsAtom = atomFamily((key: string) =>
  atom(async () => {
    const r = resolveConfig(key);
    if (r == null) return null;
    return fetchLexMaps(r.cfg, r.id);
  })
);

// References are descriptive/SEO content, but the /columns + /fossils ref merge
// is slow for high-cardinality items (it was blocking +data on the server). Load
// it client-side for now; a future refs-improvement pass can move it back to a
// fast server path. See [[Reference loading improvements]].
const refsAtom = atomFamily((key: string) =>
  atom(async () => {
    const r = resolveConfig(key);
    if (r == null) return [];
    return fetchLexRefs(r.cfg, r.id);
  })
);

// The full definition list for a *type* (not an item) — the hierarchy view's
// input. Keyed by type, so one fetch serves every item of that type for the rest
// of the session.
const defsAtom = atomFamily((type: string) =>
  atom(async () => fetchLexDefs(type))
);

// Loadable wrappers, memoized per key so they're stable across renders.
const columnsLoadable = atomFamily((key: string) => loadable(columnsAtom(key)));
const fossilsLoadable = atomFamily((key: string) => loadable(fossilsAtom(key)));
const taxaLoadable = atomFamily((key: string) => loadable(taxaAtom(key)));
const unitsLoadable = atomFamily((key: string) => loadable(unitsAtom(key)));
const mapsLoadable = atomFamily((key: string) => loadable(mapsAtom(key)));
const refsLoadable = atomFamily((key: string) => loadable(refsAtom(key)));
const defsLoadable = atomFamily((type: string) => loadable(defsAtom(type)));

function dataOrNull(state: any) {
  return state?.state === "hasData" ? state.data : null;
}

export function useLexColumns(ref: LexItemRef) {
  return dataOrNull(useAtomValue(columnsLoadable(keyFor(ref))));
}

/** Columns *with* their load state. The column block reserves its space (and
 * keeps the shared map mounted) while this is loading, instead of appearing only
 * once data arrives — see [[Geologic lexicon pages]] (Layer E). */
export function useLexColumnsState(ref: LexItemRef) {
  const state: any = useAtomValue(columnsLoadable(keyFor(ref)));
  return { data: dataOrNull(state), loading: state?.state === "loading" };
}
export function useLexFossils(ref: LexItemRef) {
  return dataOrNull(useAtomValue(fossilsLoadable(keyFor(ref))));
}
export function useLexTaxa(ref: LexItemRef) {
  return dataOrNull(useAtomValue(taxaLoadable(keyFor(ref))));
}
export function useLexUnits(ref: LexItemRef) {
  return dataOrNull(useAtomValue(unitsLoadable(keyFor(ref))));
}
export function useLexMaps(ref: LexItemRef) {
  return dataOrNull(useAtomValue(mapsLoadable(keyFor(ref))));
}
/** All definitions of a lexicon type, for the hierarchy view. */
export function useLexDefs(type: string) {
  return dataOrNull(useAtomValue(defsLoadable(type)));
}

export function useLexRefs(ref: LexItemRef) {
  return dataOrNull(useAtomValue(refsLoadable(keyFor(ref)))) ?? [];
}
