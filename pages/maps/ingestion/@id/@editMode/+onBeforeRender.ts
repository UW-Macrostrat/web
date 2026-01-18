import type { PageContextServer } from "vike/types";
import { getIngestProcessData } from "../_data";

const validEditModes = ["points", "lines", "polygons"];

export async function onBeforeRender(pageContext: PageContextServer) {
  const { id, editMode } = pageContext.routeParams;
  const source_id = parseInt(id);
  const props = await getIngestProcessData(source_id);

  if (!validEditModes.includes(editMode)) {
    throw "Invalid edit mode";
  }

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
