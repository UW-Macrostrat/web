/** Every kind of cached map view the site renders, and how to find the specs
 * and the data for one. Server-side: the data hooks call the API.
 *
 * A new kind — a project's coverage map, a map source's thumbnail — is an
 * entry here, a view in `@kind/@id/views.client.ts`, and wherever the page
 * that shows it resolves its spec against the manifest. */
import type { MapSnapshotSpec } from "@macrostrat-web/map-snapshots";
import { heroSnapshotData, heroSnapshotSpecs } from "../../index/hero-snapshot";

interface MapSnapshotKind {
  specs(): MapSnapshotSpec[];
  data(id: string): Promise<unknown | null>;
}

export const mapSnapshotKinds: Record<string, MapSnapshotKind> = {
  hero: { specs: heroSnapshotSpecs, data: heroSnapshotData },
};

export function allMapSnapshotSpecs(): MapSnapshotSpec[] {
  return Object.values(mapSnapshotKinds).flatMap((kind) => kind.specs());
}

export function findMapSnapshotSpec(
  kind: string,
  id: string
): MapSnapshotSpec | null {
  const specs = mapSnapshotKinds[kind]?.specs() ?? [];
  return specs.find((spec) => spec.id === id) ?? null;
}
