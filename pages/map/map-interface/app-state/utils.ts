import { apiV2Prefix } from "@macrostrat-web/settings";

export function buildMacrostratAPIURL(route, params) {
  const queryParams = new URLSearchParams(params).toString();
  return apiV2Prefix + route + "?" + queryParams;
}
