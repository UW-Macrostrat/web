import { LineString, Point } from "geojson";
import { create } from "zustand";
import { ColumnGeoJSONRecord } from "#/map/map-interface/app-state/handlers/columns";
// Turf intersection
import {
  fetchAllColumns,
  runColumnQuery,
} from "#/map/map-interface/app-state/handlers/fetch";
import {
  getCorrelationHashParams,
  setHashStringForCorrelation,
} from "./hash-string";
// Turf intersection
import { lineIntersect } from "@turf/line-intersect";
import { distance } from "@turf/distance";
import { nearestPointOnLine } from "@turf/nearest-point-on-line";
import { centroid } from "@turf/centroid";
import { ColumnIdentifier } from "./correlation-chart";
import { UnitLong } from "@macrostrat/api-types";
import { LocalStorage } from "@macrostrat/ui-components";
import { SectionRenderData } from "./types";
import mapboxgl from "mapbox-gl";
import { preprocessUnits } from "@macrostrat/column-views";

export interface CorrelationState extends CorrelationLocalStorageState {
  focusedLine: LineString | null;
  columns: ColumnGeoJSONRecord[];
  focusedColumns: FocusedColumnGeoJSONRecord[];
  columnUnits: ColumnData[];
  selectedUnit: UnitLong | null;
  onClickMap: (event: mapboxgl.MapMouseEvent, point: Point) => void;
  toggleMapExpanded: () => void;
  startup: () => Promise<void>;
  setSelectedUnit: (unit: UnitLong) => void;
  applySettings: (settings: Partial<CorrelationLocalStorageState>) => void;
  setDisplayDensity: (value: DisplayDensity) => void;
}

export enum DisplayDensity {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
}

interface CorrelationLocalStorageState {
  mapExpanded: boolean;
  displayDensity: DisplayDensity;
  colorizeUnits: boolean;
}

const localStorage = new LocalStorage<CorrelationLocalStorageState>(
  "macrostrat.correlation.settings"
);

/** Store management with Zustand.
 * This is a newer and somewhat more subtle approach than the Redux store
 * used in the mapping application.
 * */
export const useCorrelationDiagramStore = create<CorrelationState>(
  (set, get) => {
    const {
      mapExpanded = false,
      displayDensity = DisplayDensity.MEDIUM,
      colorizeUnits = true,
    } = localStorage.get() ?? ({} as CorrelationLocalStorageState);

    const { section, unit } = getCorrelationHashParams();

    return {
      focusedLine: section,
      columns: [],
      columnUnits: [],
      focusedColumns: [],
      mapExpanded,
      displayDensity,
      selectedUnit: null,
      colorizeUnits,
      setSelectedUnit(selectedUnit: UnitLong | null) {
        set({ selectedUnit });

        const { focusedLine } = get();

        setHashStringForCorrelation({
          section: focusedLine,
          unit: selectedUnit?.unit_id ?? null,
        });
      },
      setDisplayDensity(displayDensity: DisplayDensity) {
        set({ displayDensity });
        setLocalStorageState(get());
      },
      applySettings(settings: Partial<CorrelationLocalStorageState>) {
        set(settings);
        setLocalStorageState(get());
      },
      toggleMapExpanded: () => {
        set((state) => {
          const partial = { mapExpanded: !state.mapExpanded };
          localStorage.set(partial);
          return partial;
        });

        setLocalStorageState(get());
      },
      onClickMap(event: mapboxgl.MapMouseEvent, point: Point) {
        const state = get();

        // Check if shift key is pressed
        const shiftKeyPressed = event.originalEvent.shiftKey;

        if (
          state.focusedLine == null ||
          (state.focusedLine.coordinates.length >= 2 && !shiftKeyPressed)
        ) {
          return set({
            focusedLine: {
              type: "LineString",
              coordinates: [point.coordinates],
            },
            focusedColumns: [],
            chartData: null,
            selectedUnit: null,
          });
        }
        const focusedLine: LineString = {
          type: "LineString",
          coordinates: [...state.focusedLine.coordinates, point.coordinates],
        };

        const columns = buildCorrelationColumns(state.columns, focusedLine);

        set({
          focusedLine,
          focusedColumns: columns,
          selectedUnit: null,
        });

        // Actually download the appropriate units
        getCorrelationUnits(get, set).then(() => {});

        setHashStringForCorrelation({
          section: focusedLine,
          unit: null,
        });
      },
      async startup() {
        const columns = await fetchAllColumns();
        set({ columns });

        const { focusedLine } = get();
        if (focusedLine == null) {
          return;
        }

        const focusedColumns = buildCorrelationColumns(columns, focusedLine);
        set({ focusedColumns });
        await getCorrelationUnits(get, set);
      },
    };
  }
);

async function getCorrelationUnits(get, set) {
  const { focusedColumns } = get();
  const columnIDs = focusedColumns.map(columnGeoJSONRecordToColumnIdentifier);
  const columnUnits = await fetchAllColumnUnits(columnIDs);
  set({ columnUnits });
}

type ColumnData = {
  units: UnitLong[];
  columnID: number;
};

async function fetchUnitsForColumn(col_id: number): Promise<ColumnData> {
  const res = await runColumnQuery({ col_id }, null);

  return { columnID: col_id, units: preprocessUnits(res) };
}

export async function fetchAllColumnUnits(
  columns: ColumnIdentifier[]
): Promise<ColumnData[]> {
  const promises = columns.map((col) => fetchUnitsForColumn(col.col_id));
  return await Promise.all(promises);
}

function setLocalStorageState(state: CorrelationState) {
  localStorage.set({
    mapExpanded: state.mapExpanded,
    displayDensity: state.displayDensity,
    colorizeUnits: state.colorizeUnits,
  });
}

function findMatchingUnit(
  columns: SectionRenderData[][],
  unit_id: number
): UnitLong {
  for (const column of columns) {
    for (const section of column) {
      for (const unit of section.units) {
        if (unit.unit_id == unit_id) {
          return unit;
        }
      }
    }
  }
  return null;
}

function buildCorrelationColumns(
  columns: ColumnGeoJSONRecord[],
  line: LineString
): FocusedColumnGeoJSONRecord[] {
  let features = [];
  if (columns == null && line == null) {
    return [];
  }
  return orderColumnsByDistance(
    computeIntersectingColumns(columns, line),
    line
  );
}

function computeIntersectingColumns(
  columns: ColumnGeoJSONRecord[],
  line: LineString
): ColumnGeoJSONRecord[] {
  if (columns == null || line == null) {
    return [];
  }

  return columns.filter((col) => {
    const poly = col.geometry;
    const intersection = lineIntersect(line, poly);
    return intersection.features.length > 0;
  });
}

interface FocusedColumnGeoJSONRecord extends ColumnGeoJSONRecord {
  properties: {
    centroid: Point;
    nearestPointOnLine: Point;
    distanceAlongLine: number;
  } & ColumnGeoJSONRecord["properties"];
}

function orderColumnsByDistance(
  columns: ColumnGeoJSONRecord[],
  line: LineString
): FocusedColumnGeoJSONRecord[] {
  const centroids = columns.map((col) => centroid(col.geometry));
  const projectedPoints = centroids.map((point) =>
    nearestPointOnLine(line, point)
  );
  const distances = projectedPoints.map((point) =>
    distance(point.geometry.coordinates, line.coordinates[0])
  );

  let newColumns = columns.map((col, i) => {
    return {
      ...col,
      properties: {
        ...col.properties,
        centroid: centroids[i],
        nearestPointOnLine: projectedPoints[i],
        distanceAlongLine: distances[i],
      },
    };
  });

  return sorted(newColumns, (d) => d.properties.distanceAlongLine);
}

function sorted(data, accessor: (d) => number) {
  return data.sort((a, b) => accessor(a) - accessor(b));
}

export function columnGeoJSONRecordToColumnIdentifier(
  col: ColumnGeoJSONRecord
): ColumnIdentifier {
  return {
    col_id: col.properties.col_id,
    col_name: col.properties.col_name,
    project_id: col.properties.project_id,
  };
}
