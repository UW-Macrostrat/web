import h from "@macrostrat/hyper";
import { ColumnNavigationMap } from "@macrostrat/column-views";
import { mapboxAccessToken } from "@macrostrat-web/settings";

export function Page() {
  return h(ColumnNavigationMap, { 
    style: { height: "100vh" },
    accessToken: mapboxAccessToken 
  });
}