export const SETTINGS = {
  baseMapURL:
    "mapbox://styles/jczaplewski/cl3w3bdai001f14ob27ckmpxz?optimize=true",
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
  burwellTileDomain: process.env.MACROSTRAT_TILESERVER_DOMAIN,
  apiDomain: process.env.MACROSTRAT_API_DOMAIN,
  gddDomain: "https://xdd.wisc.edu",
  pbdbDomain: "https://paleobiodb.org",
  mapboxAccessToken: process.env.MAPBOX_API_TOKEN,
};

export const routerBasename = process.env.PUBLIC_URL;
