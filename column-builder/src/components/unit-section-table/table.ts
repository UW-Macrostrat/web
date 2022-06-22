import React, { createContext, useContext, useReducer } from "react";
import { hyperStyled } from "@macrostrat/hyper";
import {
  ColumnStateI,
  UnitEditorModel,
  UnitsView,
  ColSectionsTable,
  ColSectionI,
  UnitSectionTableCtx,
} from "~/index";
import {
  columnReducer,
  SyncActions,
  useUnitSectionTableActions,
} from "../column";
import { DragDropContext, Droppable } from "react-beautiful-dnd";
import { DropResult, DroppableProvided } from "react-beautiful-dnd";
import { ColumnPageBtnMenu } from "./helpers";
import styles from "~/components/comp.module.scss";
import { SectionTable } from "./section";
import { NewSectionBtn } from "../unit/minimal-unit-editor";

const h = hyperStyled(styles);

interface SectionUnitTableProps {
  onDragEnd: (r: DropResult) => void;
}

function SectionsDropContainer(props: SectionUnitTableProps) {
  const { onDragEnd } = props;
  const { state, runAction } = useUnitSectionContext();
  const { sections, moved } = state;

  return h("div", [
    h(DragDropContext, { onDragEnd }, [
      h(
        Droppable,
        {
          droppableId: "unit-section-tables",
          type: "SECTIONS",
          isCombineEnabled: true,
        },
        [
          (provided: DroppableProvided) => {
            return h(
              "div",
              { ...provided.droppableProps, ref: provided.innerRef },
              [
                h(NewSectionBtn, {
                  index: 0,
                  addNewSection: (i: number) =>
                    runAction({ type: "add-section-at", index: i }),
                }),
                sections.map((section, i) => {
                  const addUnitAt = (e: UnitEditorModel, n: number) => {
                    runAction({
                      type: "add-unit-at",
                      unit_index: n,
                      unit: e,
                      section_index: i,
                    });
                  };

                  const editUnitAt = (unit_index: number) => {
                    runAction({
                      type: "edit-unit-at",
                      section_index: i,
                      unit_index,
                    });
                  };

                  return h(React.Fragment, [
                    h(SectionTable, {
                      addUnitAt,
                      section,
                      index: i,
                      drag: state.drag,
                      editUnitAt,
                      moved,
                    }),
                    h(NewSectionBtn, {
                      index: i + 1,
                      addNewSection: (i: number) =>
                        runAction({ type: "add-section-at", index: i }),
                    }),
                  ]);
                }),
                provided.placeholder,
              ]
            );
          },
        ]
      ),
    ]),
  ]);
}

const UnitSectionTableContext = createContext<UnitSectionTableCtx>({
  state: {
    sections: [],
    originalSections: [],
    mergeIds: [],
    moved: {},
    drag: false,
    unitsView: true,
    edit: {
      open: false,
      section_index: 0,
      unit_index: 0,
    },
  },
  runAction: async (action: SyncActions) => {},
});

const useUnitSectionContext = () => useContext(UnitSectionTableContext);

function UnitSectionTable(props: {
  colSections: ColSectionI[];
  sections: { [section_id: number | string]: UnitsView[] }[];
}) {
  const { colSections, sections } = props;

  const initialState: ColumnStateI = {
    sections,
    originalSections: sections,
    mergeIds: [],
    moved: {},
    drag: false,
    unitsView: true,
    edit: {
      open: false,
      section_index: 0,
      unit_index: 0,
    },
  };

  const [state, dispatch] = useReducer(columnReducer, initialState);

  const runAction = useUnitSectionTableActions(dispatch);

  const onChange = (id: number) => {
    dispatch({ type: "set-merge-ids", id });
  };

  const onDragEnd = (r: DropResult) => {
    if (r.type == "SECTIONS") {
      dispatch({ type: "dropped-section", result: r });
    } else {
      dispatch({ type: "dropped-unit", result: r });
    }
  };

  return h(UnitSectionTableContext.Provider, { value: { state, runAction } }, [
    h("div", [
      h(ColumnPageBtnMenu, {
        state: {
          unitsView: state.unitsView,
          drag: state.drag,
          mergeIds: state.mergeIds,
          moved: state.moved,
        },
        toggleUnitsView: () => runAction({ type: "toggle-units-view" }),
        toggleDrag: () => {
          runAction({ type: "toggle-drag" });
        },
        divideSection: () => {},
        mergeSections: () => {},
        noSectionView: colSections.length == 0,
      }),
      h.if(colSections.length > 0 && !state.unitsView)(ColSectionsTable, {
        colSections,
        onChange,
      }),
      h.if(state.sections.length > 0 && state.unitsView)(
        "div.unit-section-container",
        [
          h("div.unit-section-tables", [
            h(SectionsDropContainer, {
              onDragEnd,
            }),
          ]),
        ]
      ),
    ]),
  ]);
}

export { UnitSectionTable, useUnitSectionContext, UnitSectionTableContext };
