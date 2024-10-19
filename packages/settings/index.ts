/* Client-side code to access configuration variables */
import { getRuntimeConfig } from "./utils";

export const darkMapURL =
  "mapbox://styles/jczaplewski/cl5uoqzzq003614o6url9ou9z?optimize=true";
export const baseMapURL =
  "mapbox://styles/jczaplewski/clatdbkw4002q14lov8zx0bm0?optimize=true";
export const satelliteMapURL =
  "mapbox://styles/jczaplewski/cl51esfdm000e14mq51erype3?optimize=true";

export const burwellTileDomain = getRuntimeConfig(
  "MACROSTRAT_TILESERVER_DOMAIN"
);
export const apiDomain = getRuntimeConfig("MACROSTRAT_API_DOMAIN");
export const tileserverDomain = burwellTileDomain;

export const gddDomain = "https://xdd.wisc.edu";
export const pbdbDomain = "https://paleobiodb.org";

export const mapboxAccessToken = getRuntimeConfig("MAPBOX_API_TOKEN");

export const baseURL = getRuntimeConfig("BASE_URL", "/");

export const apiV2Prefix = getRuntimeConfig(
  "MACROSTRAT_API_V2",
  apiDomain + "/api/v2"
);

export const ingestPrefix = getRuntimeConfig(
  "MACROSTRAT_INGEST_API",
  apiDomain + "/api/v3"
);

export const cdrPrefix = getRuntimeConfig("CDR_API_URL");
export const cdrAPIKey = getRuntimeConfig("CDR_API_KEY");

export const mapPagePrefix = "/map";
export const routerBasename = "/map";

export const postgrestPrefix = getRuntimeConfig(
  "MACROSTRAT_POSTGREST_PREFIX",
  apiDomain + "/api/pg"
);

export const macrostratInstance = getRuntimeConfig("MACROSTRAT_INSTANCE");

export const elevationLayerURL = getRuntimeConfig("ELEVATION_LAYER_URL");

export const enableAdmin = getRuntimeConfig("ENABLE_ADMIN", true);

/** Legacy settings object */
export const SETTINGS = {
  cdrPrefix,
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
