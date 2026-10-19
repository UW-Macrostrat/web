/** The views the snapshot route can draw, by kind. Each one is the live
 * component in its snapshot mode, so the image is what the page would show. */
import h from "@macrostrat/hyper";
import { MapboxMapProvider } from "@macrostrat/mapbox-react";
import { MapSnapshotReporter } from "~/map-snapshots/reporter";
import { HERO_SNAPSHOT_LAYERS, HeroMap } from "../../../../index/hero.client";
import type { HeroSnapshotData } from "../../../../index/hero-snapshot";
import type { MapSnapshotPageData } from "./+data";

/** Each kind's view, and the layers its overlays add after the base style —
 * the reporter holds the capture until they are there. */
const views = {
  hero: { View: HeroSnapshotView, requiredLayers: HERO_SNAPSHOT_LAYERS },
};

export function MapSnapshotView(props: MapSnapshotPageData) {
  const kind = views[props.kind];
  if (kind == null) return h("p", `Unknown map snapshot kind: ${props.kind}`);

  return h(MapboxMapProvider, [
    h(kind.View, { view: props.view }),
    h(MapSnapshotReporter, {
      snapshotKey: props.snapshotKey,
      requiredLayers: kind.requiredLayers,
    }),
  ]);
}

function HeroSnapshotView({ view }: { view: HeroSnapshotData }) {
  return h(HeroMap, {
    area: view.area,
    footprint: view.footprint,
    projectColumns: view.projectColumns,
    timeRange: view.timeRange,
    snapshot: true,
  });
}
