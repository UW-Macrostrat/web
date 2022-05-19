import React, { useReducer } from "react";
import Link from "next/link";
import { hyperStyled } from "@macrostrat/hyper";
import {
  ColumnStateI,
  UnitEditorModel,
  UnitsView,
  convertColorNameToHex,
  ColSectionsTable,
  ColSectionI,
  MinEditorToggle,
} from "~/index";
import { columnReducer } from "../column";
import { UnitLithHelperText } from "../unit/common-editing";
import { MinEditorCard } from "../unit/minimal-unit-editor";
import { DragDropContext, Droppable } from "react-beautiful-dnd";
import { DraggableRow, DnDTable } from "../table";
import { DropResult, DroppableProvided } from "react-beautiful-dnd";
import {
  ColumnPageBtnMenu,
  SectionUnitCheckBox,
  UnitRowContextMenu,
  AddBtnBetweenRows,
  UNIT_ADD_POISITON,
  useRowUnitEditor,
} from "./helpers";

import styles from "~/components/comp.module.scss";

const h = hyperStyled(styles);

function UnitRowCellGroup(props: {
  unit: UnitsView;
  cellStyles: object;
  onClickDivideCheckBox: (id: number) => void;
}) {
  const { unit, cellStyles } = props;

  const backgroundColor = convertColorNameToHex(unit.color) + "80";
  return h(React.Fragment, [
    h(
      "td",
      { onClick: (e: any) => e.stopPropagation(), style: { width: "0%" } },
      [
        h(SectionUnitCheckBox, {
          data: unit.id,
          onChange: props.onClickDivideCheckBox,
        }),
      ]
    ),
    h("td", { width: "0%", style: { ...cellStyles } }, [
      h(Link, { href: `/unit/${unit.id}/edit` }, [h("a", [unit.id])]),
    ]),
    h(
      "td",
      { width: "50%", style: { background: backgroundColor, ...cellStyles } },
      [
        h("div", [
          unit.strat_name
            ? `${unit.strat_name.strat_name} ${unit.strat_name.rank}`
            : unit.unit_strat_name || "unnamed",
        ]),
        h(UnitLithHelperText, { lith_unit: unit?.lith_unit ?? [] }),
      ]
    ),
    h("td", { style: { ...cellStyles, width: "50%" } }, [
      unit.name_fo !== unit.name_lo
        ? `${unit.name_fo} - ${unit.name_lo}`
        : unit.name_lo,
    ]),
    h("td", { style: { ...cellStyles } }, [
      unit.min_thick != unit.max_thick
        ? `${unit.min_thick} - ${unit.max_thick}`
        : unit.min_thick,
    ]),
  ]);
}

function ColSecUnitsTable(props: {
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
}) {
  const {
    state: { sections, drag },
  } = props;
  const {
    editOpen,
    triggerEditor,
    styles,
    onCancel,
    unit_index,
    section_index,
    editMode,
  } = useRowUnitEditor();

  let headers = ["", "ID", "Strat Name", "Interval", "Thickness", ""];
  if (drag) headers = ["", ...headers];

  const onDragEnd = (result: DropResult) => {
    console.log("Drop result!!", result);
    props.onDragEnd(result);
  };

  const unitForEditor = Object.values(sections[section_index])[0][unit_index];
  const diaglogTitle =
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
                  const units_: UnitsView[] = Object.values(section)[0];
                  const id = Object.keys(section)[0];
                  return h(
                    DnDTable,
                    {
                      key: i,
                      index: i,
                      interactive: false,
                      headers,
                      title: `Section #${id}`,
                      draggableId: `${id} ${i}`,
                      drag: props.state.drag,
                      droppableId: i.toString() + " " + id.toString(),
                    },
                    [
                      units_.map((unit, j) => {
                        const cellStyles =
                          unit_index == j && section_index == i ? styles : {};

                        const openBottom =
                          editOpen &&
                          unit_index == j &&
                          section_index == i &&
                          editMode.mode === "below";

                        const openTop =
                          editOpen &&
                          unit_index == j &&
                          section_index == i &&
                          editMode.mode !== "below";

                        return h(React.Fragment, [
                          h.if(j == 0)(AddBtnBetweenRows, {
                            colSpan: headers.length,
                            onClick: () =>
                              triggerEditor(
                                UNIT_ADD_POISITON.ABOVE,
                                j,
                                i,
                                false
                              ),
                          }),

                          h.if(openTop)("tr", [
                            h(
                              "td",
                              {
                                colSpan: headers.length,
                                style: { padding: 0 },
                              },
                              [
                                h(MinEditorCard, {
                                  title: diaglogTitle,
                                  persistChanges,
                                  model: editingModel,
                                  onCancel,
                                }),
                              ]
                            ),
                          ]),
                          h(
                            DraggableRow,
                            {
                              key: unit.id,
                              index: j,
                              drag: props.state.drag,
                              draggableId:
                                unit.unit_strat_name + unit.id.toString(),
                              href: undefined,
                            },
                            [
                              h(UnitRowCellGroup, {
                                onClickDivideCheckBox:
                                  props.onClickDivideCheckBox,
                                unit,
                                key: j,
                                cellStyles,
                              }),
                              h(
                                "td",
                                { width: "0%", style: { ...cellStyles } },
                                [
                                  h(UnitRowContextMenu, {
                                    unit,
                                    unit_index: j,
                                    section_index: i,
                                    triggerEditor: triggerEditor,
                                  }),
                                ]
                              ),
                            ]
                          ),

                          h(AddBtnBetweenRows, {
                            colSpan: headers.length,
                            onClick: () =>
                              triggerEditor(
                                UNIT_ADD_POISITON.BELOW,
                                j,
                                i,
                                false
                              ),
                          }),

                          h.if(openBottom)("tr", [
                            h(
                              "td",
                              {
                                colSpan: headers.length,
                                style: { padding: 0 },
                              },
                              [
                                h(MinEditorCard, {
                                  title: diaglogTitle,
                                  persistChanges,
                                  model: editingModel,
                                  onCancel,
                                }),
                              ]
                            ),
                          ]),
                        ]);
                      }),
                    ]
                  );
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
  const mergeSections = () => {
    dispatch({ type: "merge-ids" });
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
    /// callback for adding a unit in column at index i
    // should probably have a way to split the section as well..
    console.log("Adding At", unit, section_index, unit, unit_index);
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
    /// callback for editing a unit
    // should probably have a way to split the section as well..
    console.log("Editing At", section_index, unit, unit_index);
    dispatch({
      type: "edit-unit-at",
      section_index,
      unit,
      unit_index,
    });
  };

  const headers = [
    "",
    "Section number",
    "Top interval",
    "Bottom interval",
    "# of units",
  ];

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
      headers,
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
          h(ColSecUnitsTable, {
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

export { ColSecUnitsTable, UnitRowCellGroup, UnitSectionTable };
