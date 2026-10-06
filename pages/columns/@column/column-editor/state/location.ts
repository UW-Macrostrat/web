/** Where the column is, as part of the editing session: the footprint as
 * loaded, the footprint as edited, and what the map is doing. */
import { atom } from "jotai";
import type { LineString, MultiPolygon, Polygon } from "geojson";
import type mapboxgl from "mapbox-gl";
import {
  EMPTY_FOOTPRINT,
  sameFootprint,
  type Footprint,
  type FootprintPart,
  type LngLat,
  type LocationKind,
} from "../location/geometry";

/** The footprint as the database holds it; what Reset returns to. */
export const loadedFootprintAtom = atom<Footprint>(EMPTY_FOOTPRINT);

export const footprintAtom = atom<Footprint>(EMPTY_FOOTPRINT);

export const isLocationDirtyAtom = atom((get) =>
  !sameFootprint(get(footprintAtom), get(loadedFootprintAtom))
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

/** Which part of the footprint the map edits: the location or the region. */
export const footprintPartAtom = atom<FootprintPart>("location");

/** Whether the map is in a drawing mode (a new point, line or polygon), as
 * opposed to selecting and dragging what is there. */
export const drawingAtom = atom(false);

/** The location page's map, once it exists, so the panel can move it. */
export const locationMapAtom = atom<mapboxgl.Map | null>(null);
