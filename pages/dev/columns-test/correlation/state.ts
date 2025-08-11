import { Point } from "geojson";
import { create } from "zustand";
import type { ColumnGeoJSONRecord } from "@macrostrat/api-types";
import { UnitLong } from "@macrostrat/api-types";
import { LocalStorage } from "@macrostrat/ui-components";

export interface CorrelationState extends CorrelationLocalStorageState {
  focusedColumns: FocusedColumnGeoJSONRecord[];
  selectedUnitID: number | null;
  selectedUnit: UnitLong | null;
  toggleMapExpanded: () => void;
  setSelectedColumns: (columns: FocusedColumnGeoJSONRecord[]) => void;
  setSelectedUnit: (unit_id: number, unit: UnitLong) => void;
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
      mapExpanded,
      displayDensity,
      selectedUnitID: null,
      selectedUnit: null,
      colorizeUnits,
      setSelectedColumns(columns) {
        set({ focusedColumns: columns });
      },
      setSelectedUnit(
        unit_id: number,
        selectedUnit: UnitLong | null = undefined
      ) {
        console.log("setSelectedUnit", unit_id, selectedUnit);
        set({ selectedUnitID: unit_id, selectedUnit });
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

function setLocalStorageState(state: CorrelationState) {
  localStorage.set({
    mapExpanded: state.mapExpanded,
    displayDensity: state.displayDensity,
    colorizeUnits: state.colorizeUnits,
  });
}

interface FocusedColumnGeoJSONRecord extends ColumnGeoJSONRecord {
  properties: {
    centroid: Point;
    nearestPointOnLine: Point;
    distanceAlongLine: number;
  } & ColumnGeoJSONRecord["properties"];
}
