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
// For now,
export const isDev = true; // getRuntimeConfig("MACROSTRAT_INSTANCE") === "Development";

export const gddDomain = "https://xdd.wisc.edu";
export const pbdbDomain = "https://paleobiodb.org";

export const mapboxAccessToken = getRuntimeConfig("MAPBOX_API_TOKEN");

export const baseURL = getRuntimeConfig("BASE_URL", "/");

export const apiV2Prefix = getRuntimeConfig(
  "MACROSTRAT_API_V2",
  apiDomain + "/api/v2"
);

export const apiV3Prefix = getRuntimeConfig(
  "MACROSTRAT_API_V3",
  apiDomain + "/api/v3"
);

export const postgrestPrefix = getRuntimeConfig(
  "MACROSTRAT_POSTGREST_PREFIX",
  apiDomain + "/api/pg"
);

// If MACROSTRAT_INGEST_API is set, warn about deprecation
if (getRuntimeConfig("MACROSTRAT_INGEST_API") != null) {
  console.warn(
    "MACROSTRAT_INGEST_API is deprecated. Use MACROSTRAT_API_V3 instead."
  );
}
export const ingestPrefix = getRuntimeConfig(
  "MACROSTRAT_INGEST_API",
  apiV3Prefix
);

export const ingestPGPrefix = getRuntimeConfig(
  "MACROSTRAT_INGEST_API",
  postgrestPrefix
);

export const webAssetsPrefix = getRuntimeConfig(
  "MACROSTRAT_WEB_ASSETS_PREFIX",
  "https://storage.macrostrat.org/assets/web"
);

// Set a root CSS variable for web assets prefix
if (typeof document !== "undefined") {
  document.documentElement.style.setProperty(
    "--web-assets-prefix",
    webAssetsPrefix
  );
}

export const cdrPrefix = getRuntimeConfig("CDR_API_URL");
export const cdrAPIKey = getRuntimeConfig("CDR_API_KEY");

export const mapPagePrefix = "/map";
export const routerBasename = "/map";

export const knowledgeGraphAPIURL = getRuntimeConfig(
  "XDD_KNOWLEDGE_GRAPH_API_URL",
  apiDomain + "/api/knowledge-graph"
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
  isDev,
};
