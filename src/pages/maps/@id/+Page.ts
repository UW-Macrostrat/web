import h from "@macrostrat/hyper";
import { PageContextBuiltInServer } from "vike/types";
import { ClientOnly } from "~/renderer/client-only";
import { apiV2Prefix } from "~/settings";
const MapInterface = () => import("./map-interface");

const apiAddress = apiV2Prefix + "/defs/sources";

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
        map,
      },
      documentProps: {
        // The page's <title>
        title: map.properties.name,
      },
    },
  };
}

export function Page({ map }) {
  return h("div.single-map", h(ClientOnly, { component: MapInterface, map }));
}
