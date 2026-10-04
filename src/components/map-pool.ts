/** The app's one map pool, so `MapView`s reuse a Mapbox map across client-side
 * navigations instead of each constructing (and billing) a new one.
 *
 * Mounted by the `+Layout` of each subtree whose pages draw maps, rather than
 * the root layout, so pages without maps don't load map-interface. The pool is
 * module-level, so maps carry over between those subtrees too. `/map` is left
 * out for now. */
import h from "@macrostrat/hyper";
import { createMapPool, MapPoolProvider } from "@macrostrat/map-interface";
import { ReactNode } from "react";

export const mapPool = createMapPool();

export function MapPoolLayout({ children }: { children: ReactNode }) {
  return h(MapPoolProvider, { pool: mapPool }, children);
}
