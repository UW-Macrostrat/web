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
    lith_unit: [...unit.liths],
    environ_unit: [...unit.envs],
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

const getSectionId = (sections: SectionUnits, index: number) => {
  let id = "0";
  for (const key in sections) {
    const [begin, end] = sections[key];
    if (index >= begin && index <= end) {
      id = key;
    }
  }
  return parseInt(id);
};

const addUnitToTop = (
  unit: UnitEditorModel,
  units: UnitsView[],
  sections: SectionUnits
) => {
  for (let i = 0; i < units.length; i++) {
    units[i].position_bottom++;
  }
  const newTopUnit = persistUnit(unit, units[0].position_bottom - 1);
  const newUnits = [
    {
      ...newTopUnit,
      section_id: getSectionId(sections, 0),
    },
    ...units,
  ];
  return newUnits;
};

const addUnitToBottom = (
  unit: UnitEditorModel,
  units: UnitsView[],
  sections: SectionUnits
) => {
  // add to bottom
  const newBottomUnit = persistUnit(
    unit,
    units[units.length - 1].position_bottom + 1
  );

  const newUnits_ = [
    ...units,

    {
      ...newBottomUnit,
      section_id: getSectionId(
        JSON.parse(JSON.stringify(sections)),
        units.length - 1
      ),
    },
  ];
  return newUnits_;
};
/////////////// Data Types //////////////////

type SectionUnits = { [section_id: number]: [number, number] };

/////////////// Action Types ///////////////

type SetMergeIds = { type: "set-merge-ids"; id: number };
type SetDivideIds = { type: "set-divide-ids"; id: number };
type MergeIds = { type: "merge-ids" };
type DroppedUnit = {
  type: "dropped-unit";
  result: DropResult;
};
type ToggleDrag = { type: "toggle-drag" };
type ToggleUnitsView = { type: "toggle-units-view" };
type AddUnitAt = {
  type: "add-unit-at";
  index: number;
  unit: Partial<UnitEditorModel>;
};

export type SyncActions =
  | SetMergeIds
  | SetDivideIds
  | DroppedUnit
  | MergeIds
  | ToggleDrag
  | AddUnitAt
  | ToggleUnitsView;

export interface ColumnStateI {
  sections: SectionUnits;
  units: UnitsView[];
  mergeIds: number[];
  divideIds: number[];
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
    case "set-divide-ids":
      const currentDiIds = [...state.divideIds];
      const id_ = action.id;
      const newDiIds = filterOrAddIds(id_, currentDiIds);
      return {
        ...state,
        divideIds: newDiIds,
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
    case "add-unit-at":
      // this will encapsulate the add top and bottom
      const currentUnits_ = JSON.parse(JSON.stringify(state.units));
      const currentSections_ = JSON.parse(JSON.stringify(state.sections));
      let newUnits = currentUnits_;
      if (action.index <= 0) {
        ///add to top
        newUnits = addUnitToTop(action.unit, currentUnits_, currentSections_);
      } else if (action.index > state.units.length) {
        newUnits = addUnitToBottom(
          action.unit,
          currentUnits_,
          currentSections_
        );
      }

      const newSections = calculateSecionUnitIndexs(newUnits);

      return {
        ...state,
        units: newUnits,
        sections: newSections,
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
