import { apiV2Prefix } from "@macrostrat-web/settings";
import h from "@macrostrat/hyper";
import { PageContextBuiltInServer } from "vike/types";
import { ClientOnly } from "~/renderer/client-only";

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
