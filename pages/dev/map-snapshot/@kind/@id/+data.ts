import { render } from "vike/abort";
import { mapSnapshotKey } from "~/map-snapshots/spec";
import { findMapSnapshotSpec, mapSnapshotKinds } from "../../registry";

export interface MapSnapshotPageData {
  kind: string;
  id: string;
  /** Not `key`: this object is spread into a component's props, and React
   * keeps `key` for itself. */
  snapshotKey: string;
  width: number;
  height: number;
  view: unknown;
}

export async function data(pageContext): Promise<MapSnapshotPageData> {
  const { kind, id } = pageContext.routeParams;
  const spec = findMapSnapshotSpec(kind, id);
  if (spec == null) throw render(404, `No map snapshot ${kind}/${id}`);

  const view = await mapSnapshotKinds[kind].data(id);
  if (view == null) throw render(404, `No data for map snapshot ${kind}/${id}`);

  return {
    kind,
    id,
    snapshotKey: mapSnapshotKey(spec),
    width: spec.width,
    height: spec.height,
    view,
  };
}
