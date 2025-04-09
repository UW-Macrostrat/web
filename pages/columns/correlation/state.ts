import { LineString, Point } from "geojson";
import { create } from "zustand";
import type { ColumnGeoJSONRecord } from "@macrostrat/api-types";
import { runColumnQuery } from "#/map/map-interface/app-state/handlers/fetch";
import {
  getCorrelationHashParams,
  setHashStringForCorrelation,
} from "./hash-string";
import { ColumnIdentifier } from "./correlation-chart";
import { UnitLong } from "@macrostrat/api-types";
import { LocalStorage } from "@macrostrat/ui-components";
import { SectionRenderData } from "./types";
import { preprocessUnits } from "@macrostrat/column-views";

export interface CorrelationState extends CorrelationLocalStorageState {
  focusedColumns: FocusedColumnGeoJSONRecord[];
  columnUnits: ColumnData[];
  selectedUnit: UnitLong | null;
  toggleMapExpanded: () => void;
  setSelectedColumns: (columns: FocusedColumnGeoJSONRecord[]) => void;
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
  (set, get): CorrelationState => {
    const {
      mapExpanded = false,
      displayDensity = DisplayDensity.MEDIUM,
      colorizeUnits = true,
    } = localStorage.get() ?? ({} as CorrelationLocalStorageState);

    return {
      focusedColumns: [],
      columnUnits: [],
      mapExpanded,
      displayDensity,
      selectedUnit: null,
      colorizeUnits,
      setSelectedColumns(columns) {
        set({ focusedColumns: columns });
        getCorrelationUnits(get, set);
      },
      setSelectedUnit(selectedUnit: UnitLong | null) {
        set({ selectedUnit });
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
    };
  }
);

export async function getCorrelationUnits(get, set) {
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
  const units = await runColumnQuery({ col_id }, null);
  return { columnID: col_id, units };
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

interface FocusedColumnGeoJSONRecord extends ColumnGeoJSONRecord {
  properties: {
    centroid: Point;
    nearestPointOnLine: Point;
    distanceAlongLine: number;
  } & ColumnGeoJSONRecord["properties"];
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
