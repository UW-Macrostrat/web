import type { PageContextServer } from "vike/types";
import { getIngestProcessData } from "./_data";

export async function onBeforeRender(pageContext: PageContextServer) {
  const { id } = pageContext.routeParams;
  const source_id = parseInt(id);
  const props = await getIngestProcessData(source_id);

  return {
    pageContext: {
      pageProps: props,
      documentProps: {
        // The page's <title>
        title: props.source.name,
      },
    },
  };
}
