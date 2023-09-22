export const SETTINGS = {
  darkMapURL:
    "mapbox://styles/jczaplewski/cl5uoqzzq003614o6url9ou9z?optimize=true",
  baseMapURL:
    "mapbox://styles/jczaplewski/clatdbkw4002q14lov8zx0bm0?optimize=true",
  satelliteMapURL:
    "mapbox://styles/jczaplewski/cl51esfdm000e14mq51erype3?optimize=true",
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
  burwellTileDomain: import.meta.env.VITE_MACROSTRAT_TILESERVER_DOMAIN,
  apiDomain: import.meta.env.VITE_MACROSTRAT_API_DOMAIN,
  gddDomain: "https://xdd.wisc.edu",
  pbdbDomain: "https://paleobiodb.org",
  mapboxAccessToken: import.meta.env.VITE_MAPBOX_API_TOKEN,
};

export const mapPagePrefix = "/map";

export const routerBasename = import.meta.env.BASE_URL + mapPagePrefix;
