import { PageContextServer } from "vike/types";
import { useConfig } from "vike-react/useConfig";
import {
  MacrostratRasterTileset,
  MacrostratVectorTileset,
} from "~/_utils/map-layers";
import { render } from "vike/abort";
import { tileserverDomain } from "@macrostrat-web/settings";

export async function data(pageContext: PageContextServer) {
  const config = useConfig();
  const { layer } = pageContext.routeParams;

  const layerInfo = layerIndex.find((l) => l.slug == layer);

  if (layerInfo == null) {
    throw render(404, "Layer not found");
  }

  const { title, tileset, type } = layerInfo;

  let _title = title;
  if (_title == null) {
    // Capitalize the first letter
    _title = tileset.charAt(0).toUpperCase() + tileset.slice(1);
  }

  config({
    title: _title + "– Layer",
  });

  return { title: _title, tileset, type };
}

type LayerInfo = {
  title?: string;
  slug: string;
  tileset: MacrostratRasterTileset | MacrostratVectorTileset | string;
  type: "raster" | "vector";
};

/** Index of allowed map layers.
 * TODO: we could get this from the Macrostrat API somehow
 */

const layerIndex: LayerInfo[] = [
  { slug: "carto", tileset: MacrostratRasterTileset.Carto, type: "vector" },
  {
    slug: "carto-slim",
    tileset: MacrostratVectorTileset.CartoSlim,
    type: "vector",
  },
  {
    slug: "carto-raster",
    tileset: tileserverDomain + "/carto/{z}/{x}/{y}.png",
    type: "raster",
    title: "Carto (raster)",
  },
  {
    slug: "carto-v1",
    tileset: "https://tiles.macrostrat.org/carto/{z}/{x}/{y}.mvt",
    type: "vector",
  },
  {
    slug: "carto-slim-v1",
    tileset: "https://tiles.macrostrat.org/carto-slim/{z}/{x}/{y}.mvt",
    type: "vector",
  },
  {
    slug: "all-maps",
    tileset: MacrostratVectorTileset.AllMaps,
    type: "vector",
  },
  {
    slug: "emphasized",
    tileset: MacrostratRasterTileset.Emphasized,
    type: "raster",
  },
];
