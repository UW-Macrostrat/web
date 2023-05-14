/**
 * A development interface for the "Weaver" point data server.
 */

import h from "@macrostrat/hyper";
import {
  VectorMapInspectorPage,
  MacrostratVectorTileset,
} from "../dev/map-layers";

export function WeaverPage() {
  return h(
    "div.weaver-page",
    h(VectorMapInspectorPage, {
      tileset: MacrostratVectorTileset.CartoSlim,
    })
  );
}
