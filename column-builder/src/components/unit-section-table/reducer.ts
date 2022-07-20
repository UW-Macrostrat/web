import { Dispatch } from "react";
import { DropResult } from "react-beautiful-dnd";
import { filterOrAddIds, UnitsView } from "~/index";

///////////////// helper functions //////////////
/* 
    This would be async and would persist to db 
    then would return db representation which we 
    would add to units in a Sync Action
*/
function persistUnit(unit: UnitsView) {
  let color = "#FFFFF";
  if (
    typeof unit.lith_unit !== "undefined" &&
    unit.lith_unit.length > 0
  ) {
    color = unit?.lith_unit[0].lith_color;
  }
  const newUnit = {
    ...unit,
    id: unit.id ?? 666,
    color: unit.color ?? color,
  };
  return newUnit;
}

// a little function to help us with reordering the result
const reorder = (list: any[], startIndex: number, endIndex: number): void => {
  const [removed] = list.splice(startIndex, 1);
  list.splice(endIndex, 0, removed);
};

const addElementToList = (list: any[], index: number, element: any): void => {
  list.splice(index, 0, element);
};

/////////////// Data Types //////////////////

type SectionUnits = { [section_id: string | number]: UnitsView[] }[];

/////////////// Action Types ///////////////

type SetMergeIds = { type: "set-merge-ids"; id: number };
type MergeIds = { type: "merge-ids" };
type DroppedUnit = {
  type: "dropped-unit";
  result: DropResult;
};
type DroppedSection = {
  type: "dropped-section";
  result: DropResult;
};
type ToggleDrag = { type: "toggle-drag" };
type ToggleUnitsView = { type: "toggle-units-view" };
type AddSectionAt = {
  type: "add-section-at";
  index: number;
};

type AddUnitAt = {
  type: "add-unit-at";
  section_index: number;
  unit_index: number;
  unit: UnitsView;
};

type PersistEditsAt = {
  type: "persist-edits-at";
  section_index: number;
  unit_index: number;
  unit: UnitsView;
};

type EditUnitAt = {
  type: "edit-unit-at";
  section_index: number;
  unit_index: number;
};

type CancelEditing = {
  type: "cancel-editing";
};

type RemoveUnit = {
  type: "remove-unit";
  section_index: number;
  unit_index: number;
};

export type SyncActions =
  | RemoveUnit
  | CancelEditing
  | AddSectionAt
  | EditUnitAt
  | SetMergeIds
  | DroppedUnit
  | DroppedSection
  | MergeIds
  | ToggleDrag
  | AddUnitAt
  | PersistEditsAt
  | ToggleUnitsView;

export interface EditorState {
  open: boolean;
  section_index: number;
  unit_index: number;
}

export interface ColumnStateI {
  sections: SectionUnits;
  originalSections: SectionUnits;
  mergeIds: number[];
  moved: { [unit_id: number]: boolean };
  drag: boolean;
  unitsView: boolean;
  edit: EditorState;
}

export interface UnitSectionTableCtx {
  state: ColumnStateI;
  runAction(action: SyncActions): Promise<void>;
}

/// we can filter async actions through here first
export const useUnitSectionTableActions = (dispatch: Dispatch<SyncActions>) => {
  return async (action: SyncActions) => {
    switch (action.type) {
      default:
        return dispatch(action);
    }
  };
};

const columnReducer = (state: ColumnStateI, action: SyncActions) => {
  const currSections: SectionUnits = JSON.parse(JSON.stringify(state.sections));
  switch (action.type) {
    case "cancel-editing":
      return {
        ...state,
        edit: {
          ...state.edit,
          open: false,
        },
      };
    case "edit-unit-at":
      return {
        ...state,
        edit: {
          open: true,
          section_index: action.section_index,
          unit_index: action.unit_index,
        },
      };
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
    case "add-section-at":
      const sectionIndex = action.index;
      //@ts-ignore
      const newSection: SectionUnits = { 666: [] };
      addElementToList(currSections, sectionIndex, newSection);
      return { ...state, sections: currSections };
    case "remove-unit":
      const _section_id = Object.keys(currSections[action.section_index])[0];
      currSections[action.section_index][_section_id].splice(
        action.unit_index,
        1
      );
      return {
        ...state,
        sections: currSections,
      };
    case "add-unit-at":
      // this will encapsulate the add top and bottom
      // mutate a the sections list in place
      const section_id = Object.keys(currSections[action.section_index])[0];

      currSections[action.section_index][section_id].splice(
        action.unit_index,
        0,
        persistUnit(action.unit)
      );
      return {
        ...state,
        sections: currSections,
        edit: {
          open: true,
          section_index: action.section_index,
          unit_index: action.unit_index,
        },
      };
    case "persist-edits-at":
      const section_id_ = Object.keys(currSections[action.section_index])[0];

      currSections[action.section_index][section_id_].splice(
        action.unit_index,
        1,
        persistUnit(action.unit)
      );
      return {
        ...state,
        sections: currSections,
        edit: {
          ...state.edit,
          open: false,
        },
      };
    case "dropped-section":
      if (!action.result.combine) return state;
      /* Merge sections!! What data should you expect? 
        draggableId : `${section_id} ${index}` of section that was dropped.
        combine.draggableID: `${section_id} ${index}` of section that was dropped on.

        Get the indexes, whichever is greater, take those units and append to smaller one
      */
      const [s_id, s_index] = action.result.draggableId.split(" ");
      const [d_id, d_index] = action.result.combine.draggableId.split(" ");

      let big = { id: s_id, index: parseInt(s_index) };
      let small = { id: d_id, index: parseInt(d_index) };
      if (parseInt(s_index) < parseInt(d_index)) {
        big = { id: d_id, index: parseInt(d_index) };
        small = { id: s_id, index: parseInt(s_index) };
      }

      currSections[small.index][small.id].push(
        ...currSections[big.index][big.id]
      );
      currSections.splice(big.index, 1);

      return { ...state, sections: currSections };
    case "dropped-unit":
      if (
        typeof action.result.destination === "undefined" ||
        action.result.destination == null
      )
        return state;
      let source_index = action.result.source.index;
      let destination_index = action.result.destination.index;

      /// our drop result source and destination provide
      // The index of where to find the section in our list as well
      //  as the section_id itself.
      const [sourceSectionIndex, sourceSection] =
        action.result.source.droppableId.split(" ");
      const [destSectionIndex, destSection] =
        action.result.destination.droppableId.split(" ");

      const movedUnitId =
        currSections[parseInt(sourceSectionIndex)][sourceSection][source_index][
          "id"
        ];

      if (sourceSection === destSection) {
        // same section
        reorder(
          currSections[parseInt(sourceSectionIndex)][sourceSection],
          source_index,
          destination_index
        );
      } else {
        // we changed sections!
        const [movedUnit] = currSections[parseInt(sourceSectionIndex)][
          sourceSection
        ].splice(source_index, 1);
        movedUnit["section_id"] = parseInt(destSection);

        currSections[parseInt(destSectionIndex)][destSection].splice(
          destination_index,
          0,
          movedUnit
        );
      }

      return {
        ...state,
        moved: { ...state.moved, [movedUnitId]: true },
        sections: currSections,
      };
  }
};

export { columnReducer };
