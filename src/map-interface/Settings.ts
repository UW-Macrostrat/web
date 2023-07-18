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
  burwellTileDomain: process.env.MACROSTRAT_TILESERVER_DOMAIN,
  apiDomain: process.env.MACROSTRAT_API_DOMAIN,
  gddDomain: "https://xdd.wisc.edu",
  pbdbDomain: "https://paleobiodb.org",
  mapboxAccessToken: process.env.MAPBOX_API_TOKEN,
  corelleAPIDomain: process.env.CORELLE_API_DOMAIN,
};

export const routerBasename = process.env.PUBLIC_URL;
