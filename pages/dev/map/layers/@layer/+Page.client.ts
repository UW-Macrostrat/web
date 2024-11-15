import { RasterMapInspectorPage, VectorMapInspectorPage } from "../lib";
import h from "@macrostrat/hyper";
import { useData } from "vike-react/useData";

export function Page() {
  const layerInfo: any = useData();

  const { title, tileset, type } = layerInfo;

  const component: any =
    type == "raster" ? RasterMapInspectorPage : VectorMapInspectorPage;

  return h(component, { title, tileset });
}
