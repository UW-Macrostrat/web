import h from "@macrostrat/hyper";
import { Routes, Route, Link } from "react-router-dom";
import {
  VectorMapInspectorPage,
  MacrostratVectorTileset,
  MacrostratRasterTileset,
  RasterMapInspectorPage,
} from "./map";

export default function MapInspectorApp() {
  // A route for each layer
  return h("div.map-inspector", [
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
      h(Route, { path: "*", element: h(MapInspectorIndex) }),
    ]),
  ]);
}

function MapInspectorIndex() {
  return h("div.map-inspector-index", [
    h("ul.layers", [
      h(LinkItem, { to: "carto" }, "Carto"),
      h(LinkItem, { to: "carto-slim" }, "Carto (slim)"),
      h(LinkItem, { to: "carto-raster" }, "Carto (image)"),
      h(LinkItem, { to: "emphasized" }, "Carto (image, emphasized)"),
    ]),
  ]);
}

function LinkItem({ to, children }) {
  return h("li", h(Link, { to }, children));
}
