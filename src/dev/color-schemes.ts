import { VectorMapInspectorPage } from "./map";
import h from "@macrostrat/hyper";

export function MapColorsInspector() {
  return h(VectorMapInspectorPage, {
    title: "Map colors",
  });
}
