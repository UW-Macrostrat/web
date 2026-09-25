/** The views the snapshot route can draw, by kind. Each one is the live
 * component in its snapshot mode, so the image is what the page would show. */
import h from "@macrostrat/hyper";
import { MapboxMapProvider } from "@macrostrat/mapbox-react";
import { MapSnapshotReporter } from "~/map-snapshots/reporter";
import { HeroMap } from "../../../../index/hero.client";
import type { HeroSnapshotData } from "../../../../index/hero-snapshot";
import type { MapSnapshotPageData } from "./+data";

const views = {
  hero: HeroSnapshotView,
};

export function MapSnapshotView(props: MapSnapshotPageData) {
  const View = views[props.kind];
  if (View == null) return h("p", `Unknown map snapshot kind: ${props.kind}`);

  return h(MapboxMapProvider, [
    h(View, { view: props.view }),
    h(MapSnapshotReporter, { snapshotKey: props.key }),
  ]);
}

function HeroSnapshotView({ view }: { view: HeroSnapshotData }) {
  return h(HeroMap, {
    area: view.area,
    footprint: view.footprint,
    timeRange: view.timeRange,
    snapshot: true,
  });
}
