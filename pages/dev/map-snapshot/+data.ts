import {
  mapSnapshotIndexEntry,
  type MapSnapshotIndexEntry,
} from "~/map-snapshots/spec";
import { allMapSnapshotSpecs } from "./registry";

export async function data(): Promise<{ entries: MapSnapshotIndexEntry[] }> {
  return { entries: allMapSnapshotSpecs().map(mapSnapshotIndexEntry) };
}
