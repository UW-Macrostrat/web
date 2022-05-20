import { useReducer } from "react";
import { hyperStyled } from "@macrostrat/hyper";
import {
  ColumnStateI,
  UnitEditorModel,
  UnitsView,
  ColSectionsTable,
  ColSectionI,
  MinEditorToggle,
} from "~/index";
import { columnReducer } from "../column";
import { DragDropContext, Droppable } from "react-beautiful-dnd";

import { DropResult, DroppableProvided } from "react-beautiful-dnd";
import { ColumnPageBtnMenu, useRowUnitEditor } from "./helpers";

import styles from "~/components/comp.module.scss";
import { SectionTable } from "./section";

const h = hyperStyled(styles);

interface SectionUnitTableProps {
  state: ColumnStateI;
  onDragEnd: (r: DropResult) => void;
  onClickDivideCheckBox: (id: number) => void;
  addUnitAt: (
    u: UnitEditorModel,
    section_index: number,
    unit_index: number
  ) => void;
  editUnitAt: (
    u: UnitEditorModel,
    section_index: number,
    unit_index: number
  ) => void;
}

function SectionsDropContainer(props: SectionUnitTableProps) {
  const {
    state: { sections },
    onDragEnd,
  } = props;
  const {
    editOpen,
    triggerEditor,
    onCancel,
    unit_index,
    section_index,
    editMode,
  } = useRowUnitEditor();

  const unitForEditor = Object.values(sections[section_index])[0][unit_index];
  const dialogTitle =
    editMode.mode == "edit"
      ? `Edit unit #${unitForEditor.id}`
      : `Add unit ${editMode.mode} unit #${unitForEditor.id}`;

  const persistChanges = (e: UnitEditorModel, c: Partial<UnitEditorModel>) => {
    if (editMode.mode == "edit") {
      props.editUnitAt(e, section_index, unit_index);
    } else {
      let i = unit_index;
      if (editMode.mode == "below") {
        i++;
      }
      props.addUnitAt(e, section_index, i);
    }
    onCancel();
  };

  const editingModel = editMode.copy
    ? { unit: unitForEditor }
    : { unit: { lith_unit: [], environ_unit: [] } };

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
                sections.map((section, i) => {
                  return h(SectionTable, {
                    editingModel,
                    section,
                    unit_index,
                    section_index,
                    editOpen,
                    editMode,
                    triggerEditor,
                    onCancel,
                    dialogTitle,
                    persistChanges,
                    index: i,
                    onClickCheckBox: props.onClickDivideCheckBox,
                    drag: props.state.drag,
                  });
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

function UnitSectionTable(props: {
  colSections: ColSectionI[];
  sections: { [section_id: number | string]: UnitsView[] }[];
}) {
  const { colSections, sections } = props;

  const [state, dispatch] = useReducer(columnReducer, {
    sections,
    mergeIds: [],
    divideIds: [],
    drag: false,
    unitsView: true,
  });

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

  const addUnitAt = (
    unit: UnitEditorModel,
    section_index: number,
    unit_index: number
  ) => {
    dispatch({
      type: "add-unit-at",
      section_index,
      unit,
      unit_index,
    });
  };

  const editUnitAt = (
    unit: UnitEditorModel,
    section_index: number,
    unit_index: number
  ) => {
    dispatch({
      type: "edit-unit-at",
      section_index,
      unit,
      unit_index,
    });
  };

  return h("div", [
    h(ColumnPageBtnMenu, {
      state: {
        unitsView: state.unitsView,
        drag: state.drag,
        divideIds: state.divideIds,
        mergeIds: state.mergeIds,
      },
      toggleUnitsView: () => dispatch({ type: "toggle-units-view" }),
      toggleDrag: () => {
        dispatch({ type: "toggle-drag" });
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
          //@ts-ignore
          h(MinEditorToggle, {
            btnPosition: "top",
            btnText: "create new unit on top",
            //@ts-ignore
            persistChanges: (e, c) =>
              dispatch({
                type: "add-unit-at",
                section_index: 0,
                unit: e,
                unit_index: 0,
              }),
          }),
          h(SectionsDropContainer, {
            onClickDivideCheckBox: (id: number) =>
              dispatch({ type: "set-divide-ids", id }),
            state,
            onDragEnd,
            editUnitAt,
            addUnitAt,
          }),
          //@ts-ignore
          h(MinEditorToggle, {
            //@ts-ignore
            persistChanges: (e, c) =>
              dispatch({
                type: "add-unit-at",
                section_index: state.sections.length - 1,
                // an annoying way to get the index of the last unit in last section
                unit_index: Object.values(
                  state.sections[state.sections.length - 1]
                )[0].length,
                unit: e,
              }),

            btnText: "create new unit on bottom",
            btnPosition: "bottom",
          }),
        ]),
      ]
    ),
  ]);
}

export { UnitSectionTable };
