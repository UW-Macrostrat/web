import hyper from "@macrostrat/hyper";
import { Routes, Route, Link } from "react-router-dom";
import {
  VectorMapInspectorPage,
  MacrostratVectorTileset,
  MacrostratRasterTileset,
  RasterMapInspectorPage,
} from "./map";
import { loadableElement } from "~/_utils";
import styles from "./main.module.styl";
const h = hyper.styled(styles);

export default function DevIndex() {
  // A route for each layer
  return h("div.dev-index-page", [
    h(Routes, [
      h(Route, {
        path: "carto",
        element: h(VectorMapInspectorPage, {
          tileset: MacrostratVectorTileset.Carto,
        }),
      }),
      h(Route, {
        path: "carto-slim",
        element: h(VectorMapInspectorPage, {
          tileset: MacrostratVectorTileset.CartoSlim,
        }),
      }),
      h(Route, {
        path: "carto-raster",
        element: h(RasterMapInspectorPage, {
          tileset: MacrostratRasterTileset.Carto,
        }),
      }),
      h(Route, {
        path: "emphasized",
        element: h(RasterMapInspectorPage, {
          tileset: MacrostratRasterTileset.Emphasized,
        }),
      }),
      h(Route, {
        path: "column-inspector",
        element: loadableElement(() => import("./column-inspector")),
      }),
      h(Route, { path: "*", element: h(MapInspectorIndex) }),
    ]),
  ]);
}

function MapInspectorIndex() {
<<<<<<< HEAD:src/dev-map/index.ts
  return h("div.map-inspector-index", [
=======
  return h("div.page.map-inspector-index", [
>>>>>>> develop:src/dev/index.ts
    h("h1", "Map layer inspectors"),
    h("ul.layers", [
      h(LinkItem, { to: "carto" }, "Carto"),
      h(LinkItem, { to: "carto-slim" }, "Carto (slim)"),
      h(LinkItem, { to: "carto-raster" }, "Carto (image)"),
      h(LinkItem, { to: "emphasized" }, "Carto (image, emphasized)"),
    ]),
<<<<<<< HEAD:src/dev-map/index.ts
    h("h1", "Rendering libraries"),
    h("ul.renderers", [
      h(LinkItem, { to: "globe" }, "Globe"),
      h(LinkItem, { to: "cesium-vector-providers" }, "Cesium Vector Provider"),
    ]),
=======
    h("h1", "Stratigraphic column inspector"),
    h(Link, { to: "column-inspector" }, "Stratigraphy"),
>>>>>>> develop:src/dev/index.ts
  ]);
}

function LinkItem({ to, children }) {
  return h("li", h(Link, { to }, children));
}
