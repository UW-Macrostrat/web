import {
  mapSnapshotIndexEntry,
  type MapSnapshotIndexEntry,
} from "@macrostrat-web/map-snapshots";
import { allMapSnapshotSpecs } from "./registry";

export async function data(): Promise<{ entries: MapSnapshotIndexEntry[] }> {
  return { entries: allMapSnapshotSpecs().map(mapSnapshotIndexEntry) };
}
