import { filterOrAddIds, UnitEditorModel, UnitsView } from "~/index";

///////////////// helper functions //////////////
/* 
    This would be async and would persist to db 
    then would return db representation which we 
    would add to units in a Sync Action
*/
function persistUnit(unit: UnitEditorModel, position_bottom: number) {
  let color = "#FFFFF";
  if (
    typeof unit.unit.lith_unit !== "undefined" &&
    unit.unit.lith_unit.length > 0
  ) {
    color = unit.unit?.lith_unit[0].lith_color;
  }
  const newUnit = {
    ...unit.unit,
    id: 666,
    position_bottom,
    color,
  };
  return newUnit;
}

const addUnitAt = (
  unit: UnitEditorModel,
  units: UnitsView[],
  index: number
) => {
  const pBottom = units[index]?.position_bottom;
  const sectionId = units[index]?.section_id;
  console.log(pBottom, sectionId);
  for (let i = index; i < units.length; i++) {
    units[i].position_bottom++;
  }
  const newUnit = { ...persistUnit(unit, pBottom), section_id: sectionId };
  units.splice(index, 0, newUnit);
  return units;
};

/////////////// Action Types ///////////////
type ToggleDrag = { type: "toggle-drag" };
type SetDivideIds = { type: "set-divide-ids"; id: number };
type AddUnitTop = { type: "add-unit-top"; unit: UnitEditorModel };
type AddUnitBottom = { type: "add-unit-bottom"; unit: UnitEditorModel };
type SwitchPositions = {
  type: "switch-positions";
  source: number;
  destination: number;
};
type AddUnitAt = { type: "add-unit-at"; index: number; unit: UnitEditorModel };
type EditUnitAt = {
  type: "edit-unit-at";
  index: number;
  unit: UnitEditorModel;
};

export type SyncSectActions =
  | SetDivideIds
  | AddUnitBottom
  | AddUnitTop
  | SwitchPositions
  | AddUnitAt
  | EditUnitAt
  | ToggleDrag;

export interface SectionStateI {
  section_id: number;
  units: UnitsView[];
  divideIds: number[];
  drag: boolean;
  sections: { [section_id: string | number]: UnitsView[] }[];
}

// a little function to help us with reordering the result
const reorder = (list: any[], startIndex: number, endIndex: number): any[] => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};

const sectionReducer = (state: SectionStateI, action: SyncSectActions) => {
  switch (action.type) {
    case "toggle-drag":
      return {
        ...state,
        drag: !state.drag,
      };
    case "set-divide-ids":
      const currentIds = [...state.divideIds];
      const id = action.id;
      const newIds = filterOrAddIds(id, currentIds);
      return {
        ...state,
        divideIds: newIds,
      };
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
        units: [
          { ...newTopUnit, section_id: state.section_id },
          ...currentUnits,
        ],
        sections: { [state.section_id]: [0, state.units.length] },
      };
    case "add-unit-bottom":
      // just append to end here
      const newBottomUnit = persistUnit(
        action.unit,
        state.units[state.units.length - 1].position_bottom + 1
      );
      return {
        ...state,
        units: [
          ...state.units,
          { ...newBottomUnit, section_id: state.section_id },
        ],
        sections: { [state.section_id]: [0, state.units.length] },
      };
    case "add-unit-at":
      //increment every p_B below this unit
      const current_units: UnitsView[] = JSON.parse(
        JSON.stringify(state.units)
      );
      const new_unit = persistUnit(
        action.unit,
        current_units[action.index].position_bottom
      );
      for (let i = action.index; i < current_units.length; i++) {
        current_units[i].position_bottom++;
      }
      current_units.splice(action.index, 0, {
        ...new_unit,
        section_id: state.section_id,
      });
      return {
        ...state,
        units: current_units,
        sections: { [state.section_id]: [0, state.units.length - 1] },
      };

    case "edit-unit-at":
      const newUnits__ = JSON.parse(JSON.stringify(state.units));
      const unitToEdit = {
        ...action.unit.unit,
      };
      newUnits__.splice(action.index, 1, unitToEdit);
      return {
        ...state,
        units: newUnits__,
      };
    case "switch-positions":
      // somewhat non-effcient way to create deep copy
      let currUnits = JSON.parse(JSON.stringify([...state.units]));

      // assign new p_b to dragged unit
      currUnits[action.source].position_bottom =
        currUnits[action.destination].position_bottom;

      currUnits = reorder(currUnits, action.source, action.destination);

      //if we moved a unit up the column source > destination => increment
      // all p_bs from source+1 -> destination
      if (action.source > action.destination) {
        for (let i = action.destination + 1; i <= action.source; i++) {
          currUnits[i].position_bottom++;
        }
      } else if (action.source < action.destination) {
        for (let i = action.destination - 1; i >= action.source; i--) {
          currUnits[i].position_bottom--;
        }
      }

      return {
        ...state,
        units: currUnits,
      };
  }
};

export { sectionReducer };
