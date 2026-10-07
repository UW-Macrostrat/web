/** Where the column is, as part of the editing session: the footprint as
 * loaded, the footprint as edited, and what the map is doing. */
import { atom } from "jotai";
import type { LineString, MultiPolygon, Polygon } from "geojson";
import type mapboxgl from "mapbox-gl";
import {
  EMPTY_FOOTPRINT,
  locationWithinRegion,
  sameFootprint,
  type Footprint,
  type FootprintPart,
  type LngLat,
  type LocationKind,
} from "../location/geometry";
import { editedColumnInfoAtom } from "./metadata";

/** The footprint as the database holds it; what Reset returns to. */
export const loadedFootprintAtom = atom<Footprint>(EMPTY_FOOTPRINT);

export const footprintAtom = atom<Footprint>(EMPTY_FOOTPRINT);

export const isLocationDirtyAtom = atom((get) =>
  !sameFootprint(get(footprintAtom), get(loadedFootprintAtom))
);

/** A location outside the region contradicts it. */
export const locationOutsideRegionAtom = atom(
  (get) => locationWithinRegion(get(footprintAtom)) === false
);

export const locationKindAtom = atom(
  (get) => get(footprintAtom).location.kind,
  (get, set, kind: LocationKind) => {
    const fp = get(footprintAtom);
    set(footprintAtom, { ...fp, location: { ...fp.location, kind } });
  }
);

export const setPointAtom = atom(null, (get, set, point: LngLat | null) => {
  const fp = get(footprintAtom);
  set(footprintAtom, { ...fp, location: { ...fp.location, point } });
});

export const setRadiusAtom = atom(null, (get, set, radius_km: number | null) => {
  const fp = get(footprintAtom);
  set(footprintAtom, { ...fp, location: { ...fp.location, radius_km } });
});

export const setLineAtom = atom(null, (get, set, line: LineString | null) => {
  const fp = get(footprintAtom);
  set(footprintAtom, { ...fp, location: { ...fp.location, line } });
});

export const setRegionAtom = atom(
  null,
  (get, set, region: Polygon | MultiPolygon | null) => {
    set(footprintAtom, { ...get(footprintAtom), region });
  }
);

export const resetLocationAtom = atom(null, (get, set) => {
  set(footprintAtom, get(loadedFootprintAtom));
});

/** The part chosen on the page, if any. */
const footprintPartChoiceAtom = atom<FootprintPart | null>(null);

/** Which part of the footprint is being edited: the column type's own part
 * until the other is chosen. */
export const footprintPartAtom = atom(
  (get) =>
    get(footprintPartChoiceAtom) ??
    primaryFootprintPart(get(editedColumnInfoAtom)?.col_type),
  (_get, set, part: FootprintPart) => set(footprintPartChoiceAtom, part)
);

/** A measured column is located by where it was measured; a composite one by
 * the area it stands for. */
export function primaryFootprintPart(col_type: string | null | undefined): FootprintPart {
  if (col_type === "section") return "location";
  return "region";
}

/** Whether the map is in a drawing mode (a new point, line or polygon), as
 * opposed to selecting and dragging what is there. */
export const drawingAtom = atom(false);

/** The location page's map, once it exists, so the panel can move it. */
export const locationMapAtom = atom<mapboxgl.Map | null>(null);
