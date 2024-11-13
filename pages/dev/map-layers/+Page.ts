import hyper from "@macrostrat/hyper";
import { Routes, Route, Link } from "react-router-dom";
import {
  VectorMapInspectorPage,
  MacrostratVectorTileset,
  MacrostratRasterTileset,
  RasterMapInspectorPage,
  MapLayerCatalog,
  MapLayerPage,
  LinkItem,
} from "./map-layers";
import { loadableElement } from "~/_utils";
import styles from "./main.module.styl";
import { MapColorsInspector } from "./color-schemes";
import { WeaverPage } from "./weaver";
import { BrowserRouter as Router } from "react-router-dom";

const h = hyper.styled(styles);

export function Page() {
  // A route for each layer
  return h("div.dev-index-page", [
    h(Router, { basename: "/dev/map-layers" }, [
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
          path: "carto-v1",
          element: h(VectorMapInspectorPage, {
            title: "Carto (v1)",
            tileset: "https://tiles.macrostrat.org/carto/{z}/{x}/{y}.mvt",
          }),
        }),
        h(Route, {
          path: "carto-slim-v1",
          element: h(VectorMapInspectorPage, {
            title: "Carto (slim, v1)",
            tileset: "https://tiles.macrostrat.org/carto-slim/{z}/{x}/{y}.mvt",
          }),
        }),
        h(Route, {
          path: "all-maps",
          element: h(VectorMapInspectorPage, {
            tileset: MacrostratVectorTileset.AllMaps,
          }),
        }),
        h(Route, {
          path: "sources/:layer",
          element: h(MapLayerPage),
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
        h(Route, { path: "catalog/*", element: h(MapLayerCatalog) }),
        h(Route, {
          path: "strabospot",
          element: loadableElement(() => import("./strabospot-integration")),
        }),
        h(Route, { path: "*", element: h(MapInspectorIndex) }),
      ]),
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
      h(LinkItem, { to: "carto-v1" }, "Carto (v1)"),
      h(LinkItem, { to: "carto-slim-v1" }, "Carto (v1)"),
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
    h("h1", "Rendering libraries"),
    h("ul.renderers", [
      h(LinkItem, { to: "globe" }, "Globe"),
      h(LinkItem, { to: "cesium-vector-providers" }, "Cesium Vector Provider"),
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
