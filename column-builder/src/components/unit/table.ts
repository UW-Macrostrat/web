import React from "react";
import Link from "next/link";
import { hyperStyled } from "@macrostrat/hyper";
import {
  ColumnStateI,
  UnitEditorModel,
  SectionStateI,
  useRowUnitEditor,
  UnitsView,
  convertColorNameToHex,
} from "~/index";
import { SectionUnitCheckBox } from "../column";
import { UnitLithHelperText, UnitRowContextMenu } from "./common-editing";
import { MinEditorDialog } from "./minimal-unit-editor";
import { DragDropContext } from "react-beautiful-dnd";
import { Table, Row } from "../table";
import { DropResult } from "react-beautiful-dnd";

import styles from "../comp.module.scss";

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

/* 
This needs to internally handle context options of... create new unit above, below, edit current, 
copying unit up or down. The differences just position the unit editor above or below, the model,
and the persistChanges function --> some dispatch to the reducer.

State will be this object of section_ids as keys and a list of the respective units.
Or do we only keep track of the indices of the units that below to section, that way
that state is still holding a list of units.. easier for handling state.
*/
function ColSecUnitsTable(props: {
  state: ColumnStateI | SectionStateI;
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
  };

  const editingModel = editMode.copy
    ? { unit: unitForEditor }
    : { unit: { lith_unit: [], environ_unit: [] } };

  return h("div", [
    h(MinEditorDialog, {
      title: diaglogTitle,
      persistChanges,
      open: editOpen,
      model: editingModel,
      onCancel,
    }),
    h(DragDropContext, { onDragEnd }, [
      sections.map((section, i) => {
        const units_: UnitsView[] = Object.values(section)[0];
        const id = Object.keys(section)[0];
        return h(
          Table,
          {
            key: i,
            interactive: false,
            headers,
            title: `Section #${id}`,
            drag: props.state.drag,
            droppableId: i.toString() + " " + id.toString(),
            externalDragContext: true,
          },
          [
            units_.map((unit, j) => {
              let cellStyles =
                unit_index == j && section_index == i ? styles : {};
              return h(
                Row,
                {
                  key: unit.id,
                  index: j,
                  drag: props.state.drag,
                  draggableId: unit.unit_strat_name + unit.id.toString(),
                  href: undefined,
                },
                [
                  h(UnitRowCellGroup, {
                    onClickDivideCheckBox: props.onClickDivideCheckBox,
                    unit,
                    key: j,
                    cellStyles,
                  }),
                  h("td", { width: "0%", style: { ...cellStyles } }, [
                    h(UnitRowContextMenu, {
                      unit,
                      unit_index: j,
                      section_index: i,
                      triggerEditor: triggerEditor,
                    }),
                  ]),
                ]
              );
            }),
          ]
        );
      }),
    ]),
  ]);
}

export { ColSecUnitsTable, UnitRowCellGroup };
