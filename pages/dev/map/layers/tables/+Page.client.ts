/**
 * Map layer catalog.
 * This page is a good example of nesting react-router within a Vike page.
 */
import hyper from "@macrostrat/hyper";

import { Spinner } from "@blueprintjs/core";
import { burwellTileDomain } from "@macrostrat-web/settings";
import { ErrorBoundary, useAPIResult } from "@macrostrat/ui-components";
import { Link, Route, Routes, useParams } from "react-router-dom";
import { ParentRouteButton } from "~/components/map-navbar";
import { BasicLayerInspectorPage } from "../lib";
import { BrowserRouter as Router } from "react-router-dom";

import styles from "../index/main.module.styl";
import { PageHeader } from "~/components";

const h = hyper.styled(styles);

function LinkItem({ to, children }) {
  return h("li", h(Link, { to }, children));
}

export function Page() {
  // A route for each layer
  return h(Router, { basename: "/dev/map/layers/tables" }, [
    h(Routes, [
      h(Route, {
        path: ":layer",
        element: h(MapLayerPage),
      }),
      h(Route, { path: "*", element: h(TableCatalogIndexPage) }),
    ]),
  ]);
}

const BackButton = () => h(ParentRouteButton, {}, "Back");

function TableCatalogIndexPage() {
  return h("div.page.layer-catalog-page", [
    h(PageHeader, { title: "Table Catalog" }),
    h(MapLayerCatalogList),
  ]);
}

function MapLayerCatalogList() {
  // A route for each layer
  const url = burwellTileDomain + "/tables.json";
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

export function MapLayerPage() {
  const { layer } = useParams();
  // get path from URL
  const url = burwellTileDomain + "/table/" + layer + ".json";
  const layerDef = useAPIResult(url);
  if (layerDef == null) {
    return h("div", [h(BackButton), h("div.loading", h(Spinner))]);
  }
  return h(ErrorBoundary, h(BasicLayerInspectorPage, { layer: layerDef }));
}
