import React from "react";
import Link from "next/link";
import { hyperStyled } from "@macrostrat/hyper";
import { UnitEditorModel, UnitsView, convertColorNameToHex } from "~/index";
import { UnitEditorProps, UnitLithHelperText } from "../unit/common-editing";
import { MinEditorCard } from "../unit/minimal-unit-editor";
import { DraggableRow } from "../table";
import {
  SectionUnitCheckBox,
  UnitRowContextMenu,
  AddBtnBetweenRows,
  UNIT_ADD_POISITON,
} from "./helpers";

import styles from "~/components/comp.module.scss";

const h = hyperStyled(styles);

function UnitCellGroup(props: {
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
            : unit.unit_strat_name ?? "unnamed",
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

interface UnitRowProps {
  unit: UnitsView;
  drag: boolean;
  unit_index: number;
  section_index: number;
  triggerEditor: (
    u: UNIT_ADD_POISITON,
    unit_index: number,
    section_number: number,
    copy: boolean
  ) => void;
  onCancel: () => void;
  dialogTitle: string;
  editingModel: { unit: any };
  persistChanges: (e: UnitEditorModel, c: Partial<UnitEditorModel>) => void;
  styles: any;
  colSpan: number;
  openBottom: boolean;
  openTop: boolean;
  isMoved: boolean;
}

function UnitRow(props: UnitRowProps) {
  return h(React.Fragment, { key: props.unit.id }, [
    h.if(props.unit_index == 0)(AddBtnBetweenRows, {
      colSpan: props.colSpan,
      onClick: () =>
        props.triggerEditor(
          UNIT_ADD_POISITON.ABOVE,
          props.unit_index,
          props.section_index,
          false
        ),
    }),

    h(UnitRowEditorCard, {
      model: props.editingModel,
      colSpan: props.colSpan,
      persistChanges: props.persistChanges,
      onCancel: props.onCancel,
      title: props.dialogTitle,
      open: props.openTop,
    }),
    h(
      DraggableRow,
      {
        key: props.unit.id,
        index: props.unit_index,
        drag: props.drag,
        draggableId: props.unit.unit_strat_name + props.unit.id.toString(),
        href: undefined,
        isMoved: props.isMoved,
      },
      [
        h(UnitCellGroup, {
          unit: props.unit,
          key: props.unit_index,
          cellStyles: props.styles,
        }),
        h("td", { width: "0%", style: { ...props.styles } }, [
          h(UnitRowContextMenu, {
            unit: props.unit,
            unit_index: props.unit_index,
            section_index: props.section_index,
            triggerEditor: props.triggerEditor,
          }),
        ]),
      ]
    ),

    h(AddBtnBetweenRows, {
      colSpan: props.colSpan,
      onClick: () =>
        props.triggerEditor(
          UNIT_ADD_POISITON.BELOW,
          props.unit_index,
          props.section_index,
          false
        ),
    }),

    h(UnitRowEditorCard, {
      model: props.editingModel,
      colSpan: props.colSpan,
      persistChanges: props.persistChanges,
      onCancel: props.onCancel,
      title: props.dialogTitle,
      open: props.openBottom,
    }),
  ]);
}

function UnitRowEditorCard(
  props: UnitEditorProps & {
    onCancel: () => void;
    title: string;
    open: boolean;
    colSpan: number;
  }
) {
  if (!props.open) return null;

  return h("tr", [
    h(
      "td",
      {
        colSpan: props.colSpan,
        style: { padding: 0 },
      },
      [
        h(MinEditorCard, {
          title: props.title,
          persistChanges: props.persistChanges,
          model: props.model,
          onCancel: props.onCancel,
        }),
      ]
    ),
  ]);
}

export { UnitRow };
