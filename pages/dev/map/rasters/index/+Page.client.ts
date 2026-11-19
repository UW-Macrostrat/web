/** Every layer in the raster index, each linking to its map. The list comes
 * from the admin API, so only a `web_admin` session can read it. */
import h from "@macrostrat/hyper";
import {
  AnchorButton,
  Callout,
  HTMLTable,
  Intent,
  NonIdealState,
  Spinner,
} from "@blueprintjs/core";
import { useEffect, useState } from "react";
import {
  fetchLayers,
  layerMapURL,
  type LayerRow,
  rastersURL,
} from "../../../../dashboard/admin/rasters/api";

export function Page() {
  return h("div.raster-layers-index", [
    h("p", [
      "Layers in the raster index, each drawn from what its row holds. ",
      "Each one also has a WMTS service at ",
      h("code", "/rasters/layer/<slug>/WMTSCapabilities.xml"),
      " on the tile server.",
    ]),
    h(LayerList),
    h("div.links", [
      h(AnchorButton, {
        href: rastersURL,
        icon: "cog",
        minimal: true,
        text: "Manage rasters",
      }),
    ]),
  ]);
}

type LayersState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; layers: LayerRow[] };

function useLayers(): LayersState {
  const [state, setState] = useState<LayersState>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    fetchLayers()
      .then((layers) => {
        if (!cancelled) setState({ status: "done", layers });
      })
      .catch((err) => {
        if (!cancelled) setState({ status: "error", message: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

function LayerList() {
  const state = useLayers();
  if (state.status === "loading") return h(Spinner);
  if (state.status === "error") {
    return h(
      Callout,
      { intent: Intent.WARNING, title: "Couldn't list raster layers" },
      state.message
    );
  }
  if (state.layers.length === 0) {
    return h(NonIdealState, { icon: "layers", title: "No raster layers" });
  }
  return h(HTMLTable, { compact: true, striped: true }, [
    h(
      "thead",
      h("tr", [
        h("th", "Layer"),
        h("th", "Slug"),
        h("th", "Rasters"),
        h("th", "Description"),
      ])
    ),
    h(
      "tbody",
      state.layers.map((layer) => h(LayerRowView, { key: layer.slug, layer }))
    ),
  ]);
}

function LayerRowView({ layer }: { layer: LayerRow }) {
  return h("tr", [
    h("td", h("a", { href: layerMapURL(layer.slug) }, layer.name ?? layer.slug)),
    h("td", h("code", layer.slug)),
    h("td", layer.raster_count),
    h("td", layer.description ?? ""),
  ]);
}
