import { useAPIResult } from "@macrostrat/ui-components";
import { apiV2Prefix } from "@macrostrat-web/settings";

/** What is mapped at a point, answered from `compilation` (a slug or source
 * id) through the compilation system, as the map's tiles are drawn. */
export function fetchMapInfo(lng, lat, z, compilation: string | number) {
  return useAPIResult(`${apiV2Prefix}/mobile/map_query_v2`, {
    lng,
    lat,
    z,
    compilation,
  })?.success?.data;
}
