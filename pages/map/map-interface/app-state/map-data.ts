import { atom } from "jotai";
import { apiV2Prefix } from "@macrostrat-web/settings";
import { appStateAtom } from "./store.ts";
import { formatCoordForZoomLevel } from "@macrostrat/mapbox-utils";
import { loadable } from "jotai/utils";

export const infoMarkerPositionAtom = atom((get) => {
  const appState = get(appStateAtom);
  return appState.infoMarkerPosition;
});

export const mapPositionAtom = atom((get) => {
  const appState = get(appStateAtom);
  return appState.mapPosition;
});

export const mapZoomAtom = atom((get) => {
  const mapPosition = get(mapPositionAtom);
  const zoom = mapPosition.target?.zoom ?? 7;
  return Math.round(zoom);
});

interface KeyedMapQueryData extends MapQueryData {
  key: string;
}

const mapInfoDataAtom = atom<Promise<KeyedMapQueryData>>(
  async (get, { signal }) => {
    /** Atom to handle fetching of map data */
    const { lng, lat } = get(infoMarkerPositionAtom);
    const z = get(mapZoomAtom);
    const params = {
      lng: formatCoordForZoomLevel(lng, z),
      lat: formatCoordForZoomLevel(lat, z),
      z: z.toFixed(0),
      //map_id: null,
    };

    const queryParams = new URLSearchParams(params).toString();

    let url = apiV2Prefix + "/mobile/map_query_v2?" + queryParams;

    const response = await fetch(url, { signal });
    const res: MapQueryResponse = await response.json();
    return {
      key: queryParams,
      ...preprocessMapResponse(res),
    };
  }
);

export const mapInfoAtom = loadable(mapInfoDataAtom);

const classColors = {
  sedimentary: "#FF8C00",
  metamorphic: "#8B4513",
  igneous: "#9F1D0F",
  marine: "#047BFF",
  "non-marine": "#A67A45",
  "precious commodity": "#FDFDFC",
  material: "#777777",
  water: "#00CCFF",
  energy: "#333333",
};

function preprocessMapResponse(res: MapQueryResponse): MapQueryData {
  const data = res.success.data;
  return {
    ...data,
    mapData: data.mapData.map(preprocessMapSource),
  };
}

function preprocessMapSource(source: MapData): MapData {
  // Add map_id to each reference
  source.ref.map_id = source.map_id;

  if (source.macrostrat == null) {
    return source;
  }

  if (source.macrostrat.liths) {
    let types = {};

    source.macrostrat.liths.forEach((lith) => {
      if (!types[lith.lith_type]) {
        types[lith.lith_type] = {
          name: lith.lith_type,
          color: classColors[lith.lith_class],
        };
      }
    });
    source.macrostrat.lith_types = Object.keys(types).map((l) => types[l]);
  }

  if (source.macrostrat.environs) {
    let types = {};

    source.macrostrat.environs.forEach((environ) => {
      if (!types[environ.environ_type]) {
        types[environ.environ_type] = {
          name: environ.environ_type,
          color: classColors[environ.environ_class],
        };
      }
    });
    source.macrostrat.environ_types = Object.keys(types).map((l) => types[l]);
  }
  if (source.macrostrat.econs) {
    let types = {};

    source.macrostrat.econs.forEach((econ) => {
      if (!types[econ.econ_type]) {
        types[econ.econ_type] = {
          name: econ.econ_type,
          color: classColors[econ.econ_class],
        };
      }
    });
    source.macrostrat.econ_types = Object.keys(types).map((l) => types[l]);
  }

  return source;
}

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
  map_id?: number;
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
