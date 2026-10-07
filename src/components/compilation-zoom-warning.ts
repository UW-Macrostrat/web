import { Callout } from "@blueprintjs/core";
import h from "@macrostrat/hyper";
import { zoomBandWarning, type CompilationSummary } from "~/_utils/compilations";

/** A warning when the map's zoom is outside the band a scale-dependent
 * compilation is meant for; nothing otherwise. */
export function CompilationZoomWarning({
  compilation,
  zoom,
  className,
}: {
  compilation: CompilationSummary | null;
  zoom: number | null;
  className?: string;
}) {
  const message = zoomBandWarning(compilation, zoom);
  if (message == null) return null;
  return h(
    Callout,
    { intent: "warning", icon: "warning-sign", compact: true, className },
    message
  );
}
