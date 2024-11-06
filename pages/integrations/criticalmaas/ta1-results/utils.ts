import {
  cdrPrefix,
  cdrAPIKey,
  tileserverDomain,
} from "@macrostrat-web/settings";

export async function getMapSources(baseURL, page) {
  const url = new URL(baseURL + "/tiles/sources");
  url.searchParams.set("page_size", 10);
  url.searchParams.set("page", page);
  const res = await fetch(url);
  return await res.json();
}

export async function cdrFetch(url) {
  const url_ = cdrPrefix + url;

  let opts = null;
  /** We really aren't supposed to leak this to the client, but if we are testing locally, we can
   * directly use the API key. For public usage, we'll use a proxy server
   */
  if (cdrAPIKey != null) {
    opts = {
      headers: { Authorization: `Bearer ${cdrAPIKey}` },
      method: "GET",
    };
  }

  const res = await fetch(url_, opts);
  return await res.json();
}

export function buildRasterStyle(rasterURL: string, { opacity }) {
  return {
    ...emptyStyle,
    sources: {
      raster: {
        type: "raster",
        tiles: [
          tileserverDomain + "/cog/tiles/{z}/{x}/{y}.png?url=" + rasterURL,
        ],
        tileSize: 256,
      },
    },
    layers: [
      {
        id: "raster",
        type: "raster",
        source: "raster",
        minzoom: 0,
        maxzoom: 22,
        layout: {
          visibility: "visible",
        },
        paint: {
          "raster-opacity": opacity,
        },
      },
    ],
  };
}

const emptyStyle: any = {
  version: 8,
  sprite: "mapbox://sprites/mapbox/bright-v9",
  glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
  sources: {},
  layers: [],
};
