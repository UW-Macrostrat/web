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
import { MapColorsInspector } from "./color-schemes";
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
        path: "color-schemes",
        element: h(MapColorsInspector, {
          title: "Map colors",
        }),
      }),
      h(Route, {
        path: "igcp-orogens",
        element: h(VectorMapInspectorPage, {
          tileset: MacrostratVectorTileset.IGCPOrogens,
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
      h(Route, {
        path: "strabospot",
        element: loadableElement(() => import("./strabospot-integration")),
      }),
      h(Route, { path: "*", element: h(MapInspectorIndex) }),
    ]),
  ]);
}

function MapInspectorIndex() {
  return h("div.page.map-inspector-index", [
    h("h1", "Map layer inspectors"),
    h("ul.layers", [
      h(LinkItem, { to: "carto" }, "Carto"),
      h(LinkItem, { to: "carto-slim" }, "Carto (slim)"),
      h(LinkItem, { to: "carto-raster" }, "Carto (image)"),
      h(LinkItem, { to: "emphasized" }, "Carto (image, emphasized)"),
    ]),
    h("h1", "Stratigraphic column inspector"),
    h(Link, { to: "column-inspector" }, "Stratigraphy"),
    h("h1", "Visualizations"),
    h(LinkItem, { to: "igcp-orogens" }, "IGCP orogens"),
    h("h2", "Color scheme testing"),
    h(Link, { to: "color-schemes" }, "Color schemes"),
    h("h1", "Integrations"),
    h(Link, { to: "strabospot" }, "StraboSpot"),
  ]);
}

function LinkItem({ to, children }) {
  return h("li", h(Link, { to }, children));
}
