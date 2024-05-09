import h from "@macrostrat/hyper";
import { mapboxAccessToken } from "@macrostrat-web/settings";
import { App } from "@macrostrat-web/globe";
import { DocumentProps } from "~/renderer";

export function Page() {
  return h("div.globe", h(App, { accessToken: mapboxAccessToken }));
}
