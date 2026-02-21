import { MapLocation } from "../reducers/core";
import booleanContains from "@turf/boolean-contains";
import { MultiPolygon, Polygon } from "geojson";
import { UnitLong } from "@macrostrat/api-types";
import { sum, timescale, TimescaleDivision } from "../../utils";

export type ColumnProperties = {
  col_id: number;
  col_area: string;
  col_name: string;
  col_group?: string;
  col_group_id?: number;
  project_id: number;
  group_col_id?: number;
};

type UnitIndex = { [id: number]: UnitExt & { drawn: boolean } };

export type ColumnSummary = ColumnProperties & {
  area: number;
  max_thick: number;
  min_thick: number;
  pbdb_collections: number;
  pbdb_occs: number;
  t_age: number;
  b_age: number;
  units: UnitExt[];
  timescale: TimescaleExt[];
  unitIdx: UnitIndex;
};

export interface ColumnGeoJSONRecord {
  type: "Feature";
  geometry: Polygon | MultiPolygon;
  properties: ColumnProperties;
}

export function findColumnsForLocation(
  columns: ColumnGeoJSONRecord[],
  position: MapLocation
): ColumnGeoJSONRecord[] {
  const { lat, lng } = position;
  const point = { type: "Point", coordinates: [lng, lat] };
  return columns.filter((column) => {
    if (column.geometry.type == "MultiPolygon") {
      for (let poly of column.geometry.coordinates) {
        if (booleanContains({ type: "Polygon", coordinates: poly }, point))
          return true;
      }
    } else if (booleanContains(column.geometry, point)) return true;
    return false;
  });
}

type IntersectionTracker = {
  intersectingUnits: number;
  intersectingUnitIds: number[];
};

type TimescaleExt = IntersectionTracker & TimescaleDivision;
type UnitExt = IntersectionTracker & UnitLong;

export function assembleColumnSummary(
  column: ColumnProperties,
  units0: UnitLong[]
): ColumnSummary {
  /** This function has been pulled out of the web v3 codebase and appears
   * to be a mostly unused attempt to find overlapping units. This is somewhat
   * valuable so we'll hope to eventually adapt it into @macrostrat/column-components.
   */
  let columnTimescale: TimescaleExt[] = timescale.map((d) => {
    return {
      ...d,
      intersectingUnits: 0,
      intersectingUnitIds: [],
    };
  });

  let units: UnitExt[] = units0.map((d) => {
    return {
      ...d,
      intersectingUnits: 0,
      intersectingUnitIds: [],
    };
  });

  for (let i = 0; i < units.length; i++) {
    units[i].intersectingUnits = 0;
    units[i].intersectingUnitIds = [];
    for (let j = 0; j < units.length; j++) {
      if (
        // unit *contains* unit
        ((units[i].t_age < units[j].b_age && units[j].t_age < units[i].b_age) ||
          // units share t and b age
          (units[i].t_age === units[j].t_age &&
            units[i].b_age === units[j].b_age) ||
          // units share t_age, but not b_age
          (units[i].t_age === units[j].t_age &&
            units[i].b_age <= units[j].b_age) ||
          // units share b_age, but not t_age
          (units[i].b_age === units[j].b_age &&
            units[i].t_age >= units[j].t_age)) &&
        units[i].unit_id != units[j].unit_id
      ) {
        units[i].intersectingUnits += 1;
        units[i].intersectingUnitIds.push(units[j].unit_id);
      }
    }

    for (let j = 0; j < columnTimescale.length; j++) {
      // Need to explicitly overlap, not
      if (
        // interval *contains* unit
        (units[i].t_age < columnTimescale[j].b_age &&
          columnTimescale[j].t_age < units[i].b_age) ||
        // interval and unit share t and b age
        (units[i].t_age === columnTimescale[j].t_age &&
          units[i].b_age === columnTimescale[j].b_age) ||
        // interval and unit share t_age, but not b_age
        (units[i].t_age === columnTimescale[j].t_age &&
          units[i].b_age <= columnTimescale[j].b_age) ||
        // interval and unit share b_age, but not t_age
        (units[i].b_age === columnTimescale[j].b_age &&
          units[i].t_age >= columnTimescale[j].t_age)
      ) {
        columnTimescale[j].intersectingUnitIds.push(units[i].unit_id);
      }
    }
  }

  let unitIdx = {};
  units.forEach((unit) => {
    unitIdx[unit["unit_id"]] = unit;
    unitIdx[unit["unit_id"]]["drawn"] = false;
  });

  columnTimescale = columnTimescale.filter((d) => {
    if (d.intersectingUnits > 0) {
      return d;
    }
  });

  return {
    ...column,
    max_thick: sum(units, "max_thick") as number,
    min_thick: sum(units, "min_thick") as number,
    pbdb_collections: sum(units, "pbdb_collections") as number,
    pbdb_occs: sum(units, "pbdb_occurrences") as number,
    b_age: Math.max(
      ...units.map((d) => {
        return d.b_age;
      })
    ),
    t_age: Math.min(
      ...units.map((d) => {
        return d.t_age;
      })
    ),
    area: Number(column?.col_area ?? 0),
    timescale: columnTimescale,
    units,
    unitIdx,
  };
}
