import h from "@macrostrat/hyper";
import { Routes, Route, Link } from "react-router-dom";
import { DevMapPage, MacrostratTileset } from "./map";
import { LinkButton } from "~/map-interface/components/buttons";

export default function MapInspectorApp() {
  // A route for each layer
  return h("div.map-inspector", [
    h(Routes, [
      h(Route, {
        path: "carto",
        element: h(MapInspector, { tileset: MacrostratTileset.Carto }),
      }),
      h(Route, {
        path: "carto-slim",
        element: h(MapInspector, { tileset: MacrostratTileset.CartoSlim }),
      }),
      h(Route, { path: "*", element: h(MapInspectorIndex) }),
    ]),
  ]);
}

export function MapInspector({ tileset }: { tileset: MacrostratTileset }) {
  return h("div.map-inspector", [
    h(DevMapPage, {
      tileset,
      headerElement: h([h(ParentRouteButton), h("h2", `${tileset}`)]),
    }),
  ]);
}

function MapInspectorIndex() {
  return h("div.map-inspector-index", [
    h("ul.layers", [
      h(LinkItem, { to: "carto" }, "Carto"),
      h(LinkItem, { to: "carto-slim" }, "Carto-Slim"),
    ]),
  ]);
}

function LinkItem({ to, children }) {
  return h("li", h(Link, { to }, children));
}

export function ParentRouteButton({ children, icon = "arrow-left", ...rest }) {
  // A button that links to the parent route
  return h(LinkButton, { to: "..", icon, minimal: true, ...rest });
}
