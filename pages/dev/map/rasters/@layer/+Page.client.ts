/** Any layer in the raster index, at the tileserver's by-name route. It takes
 * the site's own tile token, so nothing is configured per layer. */
import h from "@macrostrat/hyper";
import { useMemo } from "react";
import { usePageContext } from "vike-react/usePageContext";
import { getTileToken } from "~/_utils/tile-token";
import {
  namedLayerURL,
  type RasterViewerConfig,
  RasterLayerViewer,
} from "../viewer";

export function Page() {
  const ctx = usePageContext();
  const layer = String(ctx.routeParams.layer);
  // Stable per layer: the viewer stores it, and a new object would re-store it.
  const config = useMemo(
    (): RasterViewerConfig => ({
      layer,
      baseURL: namedLayerURL(layer),
      getToken: getTileToken,
    }),
    [layer]
  );
  return h(RasterLayerViewer, { key: layer, config });
}
