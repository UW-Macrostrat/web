import {
  mapSnapshotStatuses,
  resolveMapSnapshots,
} from "~/map-snapshots/store.server";
import type { MapSnapshotStatus } from "~/map-snapshots/spec";
import { allMapSnapshotSpecs, mapSnapshotKinds } from "./registry";

/** Visiting the index also queues anything missing or stale, so it is the way
 * to have the server draw its stills by hand. */
export async function data(): Promise<{ statuses: MapSnapshotStatus[] }> {
  for (const kind of Object.values(mapSnapshotKinds)) {
    await resolveMapSnapshots(kind.specs(), { complete: true });
  }
  return { statuses: await mapSnapshotStatuses(allMapSnapshotSpecs()) };
}
