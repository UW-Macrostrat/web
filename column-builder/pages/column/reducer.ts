import { DropResult } from "react-beautiful-dnd";
import { filterOrAddIds, UnitEditorModel, UnitsView } from "~/index";

///////////////// helper functions //////////////
/* 
    This would be async and would persist to db 
    then would return db representation which we 
    would add to units in a Sync Action
*/
function persistUnit(unit: UnitEditorModel, position_bottom: number) {
  const newUnit = {
    ...unit.unit,
    lith_unit: [
      ...unit.liths.map((l) => {
        return { lith: l.lith };
      }),
    ],
    id: 666,
    position_bottom,
    color: unit.liths[0].lith_color || "#FFFFF",
  };
  return newUnit;
}

function calculateSecionUnitIndexs(units: UnitsView[]) {
  const unitIndexsBySection: { [section_id: number]: [number, number] } = {};
  units.map((unit, i) => {
    if (unit.section_id in unitIndexsBySection) {
      unitIndexsBySection[unit.section_id][1] = i;
    } else {
      unitIndexsBySection[unit.section_id] = [i, i];
    }
  });
  return unitIndexsBySection;
}

// a little function to help us with reordering the result
const reorder = (list: any[], startIndex: number, endIndex: number): any[] => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};
/////////////// Data Types //////////////////

type SectionUnits = { [section_id: number]: [number, number] };

/////////////// Action Types ///////////////

type SetMergeIds = { type: "set-merge-ids"; id: number };
type MergeIds = { type: "merge-ids" };
type AddUnitTop = { type: "add-unit-top"; unit: UnitEditorModel };
type AddUnitBottom = { type: "add-unit-bottom"; unit: UnitEditorModel };
type DroppedUnit = {
  type: "dropped-unit";
  result: DropResult;
};
type ToggleDrag = { type: "toggle-drag" };
type ToggleUnitsView = { type: "toggle-units-view" };

export type SyncActions =
  | SetMergeIds
  | AddUnitBottom
  | AddUnitTop
  | DroppedUnit
  | MergeIds
  | ToggleDrag
  | ToggleUnitsView;

export interface ColumnStateI {
  sections: SectionUnits;
  units: UnitsView[];
  mergeIds: number[];
  drag: boolean;
  unitsView: boolean;
}

const columnReducer = (state: ColumnStateI, action: SyncActions) => {
  switch (action.type) {
    case "set-merge-ids":
      const currentIds = [...state.mergeIds];
      const id = action.id;
      const newIds = filterOrAddIds(id, currentIds);
      return {
        ...state,
        mergeIds: newIds,
      };
    case "toggle-drag":
      return {
        ...state,
        drag: !state.drag,
      };
    case "toggle-units-view":
      return {
        ...state,
        unitsView: !state.unitsView,
      };
    case "merge-ids":
      console.log("Merging sections ", state.mergeIds);
      return state;
    case "add-unit-top":
      // for each unit in section increment postion_bottom 1
      const currentUnits = [...state.units];
      for (let i = 0; i < currentUnits.length; i++) {
        //@ts-ignore
        currentUnits[i].position_bottom++;
      }
      const newTopUnit = persistUnit(
        action.unit,
        currentUnits[0].position_bottom - 1
      );
      return {
        ...state,
        units: [newTopUnit, ...currentUnits],
      };
    case "add-unit-bottom":
      // just append to end here
      const newBottomUnit = persistUnit(
        action.unit,
        state.units[state.units.length - 1].position_bottom + 1
      );
      return {
        ...state,
        units: [...state.units, newBottomUnit],
      };
    case "dropped-unit":
      if (typeof action.result.destination === "undefined") return state;

      // somewhat non-effcient way to create deep copy
      let currUnits: UnitsView[] = JSON.parse(JSON.stringify([...state.units]));
      let source_index = action.result.source.index;
      let destination_index = action.result.destination.index;
      /// check droppableIds
      const sourceDroppableId = action.result.source.droppableId;
      const destDroppableId = action.result.destination.droppableId;
      if (
        source_index < destination_index &&
        sourceDroppableId !== destDroppableId
      ) {
        destination_index--;
      }

      // assign new p_b to dragged unit
      currUnits[source_index].position_bottom =
        currUnits[destination_index].position_bottom;

      currUnits = reorder(currUnits, source_index, destination_index);

      //if we moved a unit up the column source > destination => increment
      // all p_bs from source+1 -> destination
      if (source_index > destination_index) {
        for (let i = destination_index + 1; i <= source_index; i++) {
          currUnits[i].position_bottom++;
        }
      } else if (source_index < destination_index) {
        for (let i = destination_index - 1; i >= source_index; i--) {
          currUnits[i].position_bottom--;
        }
      }

      if (sourceDroppableId !== destDroppableId) {
        // we changed sections!
        const finalSectionId = parseInt(destDroppableId);
        const unitToChange: UnitsView = JSON.parse(
          JSON.stringify(currUnits[destination_index])
        );
        unitToChange["section_id"] = finalSectionId;
        currUnits.splice(destination_index, 1, unitToChange);
        const newSections = calculateSecionUnitIndexs(currUnits);
        return {
          ...state,
          units: currUnits,
          sections: newSections,
        };
      }

      return {
        ...state,
        units: currUnits,
      };
  }
};

export { columnReducer, calculateSecionUnitIndexs };
