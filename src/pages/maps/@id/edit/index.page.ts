import { PageContextBuiltInServer } from "vike/types";
import { SETTINGS } from "~/settings";
import h from "@macrostrat/hyper";
import { ClientOnly } from "~/renderer/client-only";

const apiAddress = import.meta.env.VITE_MACROSTRAT_INGEST_API + "/sources/";

export async function onBeforeRender(pageContext: PageContextBuiltInServer) {
  const { id } = pageContext.routeParams;

  const response = await fetch(apiAddress + id);
  const data: any = await response.json();
  const map = {
    "type": "Feature",
    "geometry": {
      ...data.geometry
    },
    properties: {
      ...data
    }
  }

  console.log(map, apiAddress + id, map.type)

  return {
    pageContext: {
      pageProps: {
        id,
        map,
      },
      documentProps: {
        // The page's <title>
        title: data.name,
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
