// Map layer catalog
import hyper from "@macrostrat/hyper";

import { Routes, Route, Link, useParams } from "react-router-dom";
import styles from "../main.module.styl";
import { useAPIResult, ErrorBoundary } from "@macrostrat/ui-components";
import { ParentRouteButton } from "./utils";
import { SETTINGS } from "~/map-interface/settings";
import { Spinner } from "@blueprintjs/core";
import { BasicLayerInspectorPage } from ".";

const h = hyper.styled(styles);

export function LinkItem({ to, children }) {
  return h("li", h(Link, { to }, children));
}

export function MapLayerCatalog() {
  // A route for each layer
  return h(
    ErrorBoundary,
    h(Routes, [
      h(Route, {
        path: ":layer",
        element: h(MapLayerPage),
      }),
      h(Route, { path: "*", element: h(MapLayerCatalogPage) }),
    ])
  );
}

const BackButton = () => h(ParentRouteButton, {}, "Back");

function MapLayerCatalogPage() {
  return h("div.page.layer-catalog-page", [
    h(BackButton),
    h(MapLayerCatalogList),
  ]);
}

function MapLayerCatalogList() {
  // A route for each layer
  const url = SETTINGS.burwellTileDomain + "/tables.json";
  const layers = useAPIResult(url);

  if (layers == null) {
    return h("div.loading", h(Spinner));
  }

  if (layers.length == 0) {
    return h("div.no-layers", "No layers");
  }

  return h(
    "ul.layer-list",
    layers.map((layer) => h(MapLayerCatalogItem, { layer }))
  );
}

function MapLayerCatalogItem({ layer }) {
  return h(LinkItem, { to: layer.id }, layer.id);
}

function MapLayerPage() {
  const { layer } = useParams();
  // get path from URL
  const url = SETTINGS.burwellTileDomain + "/table/" + layer + ".json";
  const layerDef = useAPIResult(url);
  if (layerDef == null) {
    return h("div", [h(BackButton), h("div.loading", h(Spinner))]);
  }
  console.log(layerDef);
  return h(ErrorBoundary, h(BasicLayerInspectorPage, { layer: layerDef }));
}
