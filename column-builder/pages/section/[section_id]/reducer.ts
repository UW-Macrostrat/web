import React from "react";
import { filterOrAddIds, UnitEditorModel, UnitsView } from "../../../src";

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

/////////////// Action Types ///////////////

type SetDivideIds = { type: "set-divide-ids"; id: number };
type AddUnitTop = { type: "add-unit-top"; unit: UnitEditorModel };
type AddUnitBottom = { type: "add-unit-bottom"; unit: UnitEditorModel };
type SwitchPositions = {
  type: "switch-positions";
  indexOne: number;
  indexTwo: number;
};

export type SyncActions =
  | SetDivideIds
  | AddUnitBottom
  | AddUnitTop
  | SwitchPositions;

export interface SectionStateI {
  units: UnitsView[];
  divideIds: number[];
}

const sectionReducer = (state: SectionStateI, action: SyncActions) => {
  switch (action.type) {
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
    case "switch-positions":
      const currUnits = [...state.units];
      // swap position_bottom

      [
        currUnits[action.indexOne].position_bottom,
        currUnits[action.indexTwo].position_bottom,
      ] = [
        currUnits[action.indexTwo].position_bottom,
        currUnits[action.indexOne].position_bottom,
      ];
      // swap spot in units
      [currUnits[action.indexOne], currUnits[action.indexTwo]] = [
        currUnits[action.indexTwo],
        currUnits[action.indexOne],
      ];
      return {
        ...state,
        units: currUnits,
      };
  }
};

export { sectionReducer };
