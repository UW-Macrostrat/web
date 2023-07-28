import hyper from "@macrostrat/hyper";
import { Routes, Route, Link } from "react-router-dom";
import {
  VectorMapInspectorPage,
  MacrostratVectorTileset,
  MacrostratRasterTileset,
  RasterMapInspectorPage,
  MapLayerCatalog,
  LinkItem,
} from "./map-layers";
import { loadableElement } from "~/_utils";
import styles from "./main.module.styl";
import { MapColorsInspector } from "./color-schemes";
import { WeaverPage } from "../weaver";
const h = hyper.styled(styles);

export default function DevIndex() {
  // A route for each layer
  return h("div.dev-index-page", [
    h(Routes, [
      h(Route, { path: "weaver", element: h(WeaverPage) }),
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
        path: "all-maps",
        element: h(VectorMapInspectorPage, {
          tileset: MacrostratVectorTileset.AllMaps,
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
      h(Route, { path: "catalog/*", element: h(MapLayerCatalog) }),
      h(Route, { path: "*", element: h(MapInspectorIndex) }),
    ]),
  ]);
}

function MapInspectorIndex() {
  return h("div.page.map-inspector-index", [
    h("h1", "Map layer inspectors"),
    h("h2", "Core layers"),
    h("ul.layers", [
      h(LinkItem, { to: "carto" }, "Carto"),
      h(LinkItem, { to: "carto-slim" }, "Carto (slim)"),
      h(LinkItem, { to: "carto-raster" }, "Carto (image)"),
      h(LinkItem, { to: "emphasized" }, "Carto (image, emphasized)"),
      h(LinkItem, { to: "all-maps" }, "All maps"),
    ]),
    h("h2", "Additional layers"),
    h("ul.layers", [
      h(LinkItem, { to: "igcp-orogens" }, "IGCP orogens"),
      h(LinkItem, { to: "weaver" }, "Weaver (point data experiments)"),
    ]),
    h("h2", h(Link, { to: "catalog" }, "Map layer catalog")),
    h("h1", "Stratigraphic column inspector"),
    h(Link, { to: "column-inspector" }, "Stratigraphy"),
    h("h1", "Color scheme testing"),
    h(Link, { to: "color-schemes" }, "Color schemes"),
  ]);
}
