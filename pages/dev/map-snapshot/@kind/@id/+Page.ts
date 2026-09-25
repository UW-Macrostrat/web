/** One cached map view, drawn at its spec's size for the renderer to capture.
 *
 * Nothing renders on the server: the view is a live map, so it loads on the
 * client like the homepage hero does. */
import h from "@macrostrat/hyper";
import { useData } from "vike-react/useData";
import { clientOnly } from "~/components/lex/client-only";
import type { MapSnapshotPageData } from "./+data";

const SnapshotView = clientOnly(() =>
  import("./views.client").then((m) => m.MapSnapshotView)
);

export function Page() {
  const data = useData() as MapSnapshotPageData;
  return h(
    "div.map-snapshot-frame",
    { style: { width: data.width, height: data.height, overflow: "hidden" } },
    h(SnapshotView, data)
  );
}
