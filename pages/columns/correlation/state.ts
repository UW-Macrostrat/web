import { LineString, Point } from "geojson";
import { create } from "zustand";
import { ColumnGeoJSONRecord } from "#/map/map-interface/app-state/handlers/columns";
// Turf intersection
import { fetchAllColumns } from "#/map/map-interface/app-state/handlers/fetch";
import {
  getCorrelationHashParams,
  setHashStringForCorrelation,
} from "./hash-string";
// Turf intersection
import { lineIntersect } from "@turf/line-intersect";
import { distance } from "@turf/distance";
import { nearestPointOnLine } from "@turf/nearest-point-on-line";
import { centroid } from "@turf/centroid";
import {
  ColumnIdentifier,
  CorrelationChartData,
  buildCorrelationChartData,
  AgeScaleMode,
} from "./correlation-chart";
import { UnitLong } from "@macrostrat/api-types";
import { LocalStorage } from "@macrostrat/ui-components";
import { SectionRenderData } from "./types";
import mapboxgl from "mapbox-gl";

export interface CorrelationState extends CorrelationLocalStorageState {
  focusedLine: LineString | null;
  columns: ColumnGeoJSONRecord[];
  focusedColumns: FocusedColumnGeoJSONRecord[];
  chartData: CorrelationChartData | null;
  selectedUnit: UnitLong | null;
  onClickMap: (event: mapboxgl.MapMouseEvent, point: Point) => void;
  toggleMapExpanded: () => void;
  startup: () => Promise<void>;
  setSelectedUnit: (unit: UnitLong) => void;
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
    const { mapExpanded, displayDensity } =
      localStorage.get() ??
      ({
        mapExpanded: false,
        displayDensity: DisplayDensity.MEDIUM,
      } as CorrelationLocalStorageState);

    const { section, unit } = getCorrelationHashParams();

    return {
      focusedLine: section,
      columns: [],
      focusedColumns: [],
      mapExpanded,
      displayDensity,
      selectedUnit: null,
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
        localStorage.set({ displayDensity });
      },
      toggleMapExpanded: () =>
        set((state) => {
          const partial = { mapExpanded: !state.mapExpanded };
          localStorage.set(partial);
          return partial;
        }),
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

        buildCorrelationChartData(
          columns.map(columnGeoJSONRecordToColumnIdentifier),
          {
            ageMode: AgeScaleMode.Broken,
          }
        ).then((data) => set({ chartData: data }));

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

        const chartData = await buildCorrelationChartData(
          focusedColumns.map(columnGeoJSONRecordToColumnIdentifier),
          { ageMode: AgeScaleMode.Broken }
        );

        // Actually set the selected unit from the hash string once column data has been downloaded
        if (unit != null) {
          const selectedUnit = findMatchingUnit(chartData.columnData, unit);
          set({ selectedUnit });
        }

        set({ chartData });
      },
    };
  }
);

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
