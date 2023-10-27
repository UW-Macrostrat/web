import h from "@macrostrat/hyper";
import {
  VectorMapInspectorPage,
  MacrostratVectorTileset,
} from "~/dev/map-layers";
// Having to include these global styles is a bit awkward
import "~/styles/global.styl";

export default function PaleoMap() {
  return h(VectorMapInspectorPage, {
    tileset: MacrostratVectorTileset.Carto,
  });
}
