import type { PageContextServer } from "vike/types";
import { getIngestProcessData } from "../+data";

export async function onBeforeRender(pageContext: PageContextServer) {
  // editMode is validated in +guard.ts before we get here.
  const { id, editMode } = pageContext.routeParams;
  const source_id = parseInt(id);
  const props = await getIngestProcessData(source_id);

  return {
    pageContext: {
      pageProps: { ...props, editMode, source_id },
      documentProps: {
        // The page's <title>
        title: props.source.name,
      },
    },
  };
}
