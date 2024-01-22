export const darkMapURL =
  "mapbox://styles/jczaplewski/cl5uoqzzq003614o6url9ou9z?optimize=true";
export const baseMapURL =
  "mapbox://styles/jczaplewski/clatdbkw4002q14lov8zx0bm0?optimize=true";
export const satelliteMapURL =
  "mapbox://styles/jczaplewski/cl51esfdm000e14mq51erype3?optimize=true";
// TODO: make these configurable with environment variables
// burwellTileDomain:
//   window.location.hostname === "localhost"
//     ? "https://tiles.macrostrat.org"
//     : window.location.hostname === "dev.macrostrat.org"
//     ? "https://devtiles.macrostrat.org"
//     : "https://tiles.macrostrat.org",
// apiDomain:
//   window.location.hostname === "localhost"
//     ? "https://dev.macrostrat.org"
//     : `https://${window.location.hostname}`,
// burwellTileDomain: "https://devtiles.macrostrat.org",
// apiDomain: "https://dev.macrostrat.org",
export const burwellTileDomain = import.meta.env
  .VITE_MACROSTRAT_TILESERVER_DOMAIN;
export const apiDomain = import.meta.env.VITE_MACROSTRAT_API_DOMAIN;
export const gddDomain = "https://xdd.wisc.edu";
export const pbdbDomain = "https://paleobiodb.org";
export const mapboxAccessToken = import.meta.env.VITE_MAPBOX_API_TOKEN;

export const apiV2Prefix =
  import.meta.env.VITE_MACROSTRAT_API_V2 ?? apiDomain + "/api/v2";

export const mapPagePrefix = "/map";

export const routerBasename = import.meta.env.BASE_URL + "map";

/** Legacy settings object */
export const SETTINGS = {
  darkMapURL,
  baseMapURL,
  satelliteMapURL,
  burwellTileDomain,
  apiDomain,
  gddDomain,
  pbdbDomain,
  mapboxAccessToken,
  apiV2Prefix,
  mapPagePrefix,
  routerBasename,
};
