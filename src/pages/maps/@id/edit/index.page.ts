import { PageContextBuiltInServer } from "vike/types";
import { SETTINGS } from "~/map-interface/settings";
import h from "@macrostrat/hyper";
import { ClientOnly } from "~/renderer/client-only";

const apiAddress = SETTINGS.apiDomain + "/api/v2/defs/sources";

export async function onBeforeRender(pageContext: PageContextBuiltInServer) {
  const { id } = pageContext.routeParams;

  const params = new URLSearchParams({
    format: "geojson",
    source_id: id,
  });
  const response = await fetch(apiAddress + "?" + params);
  const data: any = await response.json();
  const map = data?.success?.data?.features[0];

  return {
    pageContext: {
      pageProps: {
        id,
        map,
      },
      documentProps: {
        // The page's <title>
        title: map.properties.name,
      },
    },
  };
}

const EditInterface = () => import("./edit-page");

export function Page({ id, map }) {
  return h(
    "div.single-map",
    h(ClientOnly, { component: EditInterface, source_id: id, mapBounds: map })
  );
}
