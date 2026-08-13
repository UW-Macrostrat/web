/**
 * The *instance* half of the unified lexicon map (Layer E — see
 * [[Geologic lexicon pages]] and `./map-target`).
 *
 * Mounted once by `pages/lex/+Layout.ts` (client-only — this module reaches
 * mapbox-gl). It renders the map tree through a portal into the single map node
 * that `./map-target` owns, so the React tree — and therefore the `mapboxgl.Map`
 * instance — is bound to the layout's lifetime rather than to any one page. Pages
 * move that node into their `LexMapSlot`; the map only re-targets.
 */
import h from "@macrostrat/hyper";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { getLexMapNode, lexMapTargetAtom } from "./map-target";
import { lazy } from "react";

const LexiconMap = lazy(() =>
  import("./map.client").then((mod) => ({ default: mod.LexiconMap }))
);

export function LexPersistentMap() {
  const target = useAtomValue(lexMapTargetAtom);
  // The node is created in the browser only; resolving it in an effect also
  // guarantees the first render is portal-free (nothing to hydrate).
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    setNode(getLexMapNode());
  }, []);

  // Nothing is built until a page actually asks for a map; that first slot is
  // also what gives Mapbox a correctly sized container to initialize into.
  if (node == null || target == null) return null;

  return createPortal(
    h(LexiconMap, {
      targetKey: target.key,
      columns: target.columns,
      fossilsData: target.fossilsData,
      filters: target.filters,
      mapUrl: target.mapUrl,
    }),
    node
  );
}
