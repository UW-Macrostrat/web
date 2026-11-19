/** One indexed raster by id, in a layer or not: the preview for the inbox. */
import h from "@macrostrat/hyper";
import { usePageContext } from "vike-react/usePageContext";
import { SingleRasterViewer } from "../../single-raster";

export function Page() {
  const ctx = usePageContext();
  const id = String(ctx.routeParams.id);
  return h(SingleRasterViewer, { key: id, id });
}
