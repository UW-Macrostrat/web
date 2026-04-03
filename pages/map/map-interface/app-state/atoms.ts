import { atomWithStore } from "jotai-zustand";
import { atom } from "jotai";
import { apiV2Prefix } from "@macrostrat-web/settings";
import { store } from "./store.ts";
import { formatCoordForZoomLevel } from "@macrostrat/mapbox-utils";
import { addMapIdToRef } from "./handlers/fetch.ts";
import { loadable } from "jotai/utils";

const zustandStoreAtom = atomWithStore(store);
const appStateAtom = atom((get) => get(zustandStoreAtom).coreState);

const infoMarkerPositionAtom = atom((get) => {
  const appState = get(appStateAtom);
  return appState.infoMarkerPosition;
});

const mapPositionAtom = atom((get) => {
  const appState = get(appStateAtom);
  return appState.mapPosition;
});

const mapInfoDataAtom = atom<Promise<MapQueryData>>(async (get, { signal }) => {
  /** Atom to handle fetching of map data */
  const { lng, lat } = get(infoMarkerPositionAtom);
  const mapPosition = get(mapPositionAtom);
  const z = mapPosition.target?.zoom ?? 7;
  const params = {
    z: z.toFixed(0),
    lng: formatCoordForZoomLevel(lng, z),
    lat: formatCoordForZoomLevel(lat, z),
    //map_id: null,
  };

  const queryParams = new URLSearchParams(params).toString();

  let url = apiV2Prefix + "/mobile/map_query_v2?" + queryParams;

  const response = await fetch(url, { signal });
  const res: MapQueryResponse = await response.json();
  return addMapIdToRef(res).success.data;
});

export const mapInfoAtom = loadable(mapInfoDataAtom);

/** TODO: move these types to @macrostrat/api-types */

interface Reference {
  source_id: number;
  name: string;
  url: string;
  ref_title: string;
  authors: string;
  ref_year: string;
  ref_source: string;
  isbn_doi: string;
}

interface Lithology {
  lith_id: number;
  lith: string;
  lith_type: string;
  lith_class: string;
  color: string;
  lith_fill: number;
}

interface Interval {
  int_id: number;
  b_age: number;
  t_age: number;
  int_name: string;
  color: string;
}

interface Line {
  line_id: number;
  source_id: number;
  name: string;
  type: string;
  direction: string;
  descrip: string;
  scale: string;
}

interface MapData {
  map_id: number;
  source_id: number;
  name: string;
  age: string;
  strat_name: string;
  lith: string;
  descrip: string;
  comments: string;
  macro_units: any[];
  strat_names: any[];
  liths: Lithology[];
  b_int: Interval;
  t_int: Interval;
  color: string;
  scale: string;
  ref: Reference;
  macrostrat: Record<string, any>;
  lines: Line[];
}

interface Region {
  boundary_id: number;
  name: string;
  boundary_group: string;
  boundary_type: string;
  boundary_class: string;
  descrip: string;
  wiki_link: string;
  ref: Reference;
}

interface MapQueryData {
  elevation: number;
  mapData: MapData[];
  regions: Region[];
  hasColumns: boolean;
}

interface MapQueryResponse {
  success: {
    v: number;
    license: string;
    data: MapQueryData;
  };
}
