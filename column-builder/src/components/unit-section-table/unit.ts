import React from "react";
import Link from "next/link";
import { hyperStyled } from "@macrostrat/hyper";
import {
  UnitEditorModel,
  UnitsView,
  convertColorNameToHex,
  IntervalDataI,
  IntervalSuggest,
} from "~/index";
import {
  EnvTags,
  LithTags,
  UnitEditorProps,
  UnitRowThicknessEditor,
} from "../unit/common-editing";
import { MinEditorCard } from "../unit/minimal-unit-editor";
import { DraggableRow } from "../table";
import {
  UnitRowContextMenu,
  AddBtnBetweenRows,
  UNIT_ADD_POISITON,
} from "./helpers";

import styles from "~/components/comp.module.scss";
import { Button, Dialog, TextArea } from "@blueprintjs/core";
import {
  ModelEditor,
  useModelEditor,
} from "deps/ui-components/packages/ui-components/src";
import { SubmitButton } from "../buttons";
import { UnitStratNameModalEditor } from "../strat-name";

const h = hyperStyled(styles);

function UnitRowIntervalEditor() {
  const {
    model,
    actions,
    isEditing,
  }: { model: UnitEditorModel; actions: any; isEditing: boolean } =
    useModelEditor();

  const unit = model.unit;

  const changeInterval = (interval: IntervalDataI, lo: boolean) => {
    const { id, interval_name } = interval.data;

    let intervalField = "fo";
    let intervalName = "name_fo";
    if (lo) {
      intervalField = "lo";
      intervalName = "name_lo";
    }
    actions.updateState({
      model: {
        unit: {
          [intervalField]: { $set: id },
          [intervalName]: { $set: interval_name },
        },
      },
    });
  };

  const onChangeLo = (interval: IntervalDataI) => {
    changeInterval(interval, true);
  };

  const onChangeFo = (interval: IntervalDataI) => {
    changeInterval(interval, false);
  };

  return h(React.Fragment, [
    h.if(!isEditing)("div", [
      unit.name_fo !== unit.name_lo
        ? `${unit.name_fo} - ${unit.name_lo}`
        : unit.name_lo,
    ]),
    h.if(isEditing)("div", { style: { display: "flex" } }, [
      h(IntervalSuggest, {
        placeholder: "Bottom interval",
        initialSelected: {
          value: unit?.name_fo,
          data: { id: unit?.fo || 0, interval_name: unit?.name_fo },
        },
        onChange: onChangeFo,
      }),
      "-",
      h(IntervalSuggest, {
        placeholder: "Top Interval",
        initialSelected: {
          value: unit?.name_lo,
          data: {
            id: unit?.lo || 0,
            interval_name: unit?.name_lo,
          },
        },
        onChange: onChangeLo,
      }),
    ]),
  ]);
}

function UnitRowNotes() {
  const {
    model,
    actions,
    isEditing,
  }: { model: { unit: UnitsView }; actions: any; isEditing: boolean } =
    useModelEditor();

  const unit = model.unit;

  const updateUnit = (field: string, value: string) => {
    actions.updateState({
      model: {
        unit: {
          [field]: { $set: value },
        },
      },
    });
  };

  return h(React.Fragment, [
    h.if(isEditing)(TextArea, {
      style: { maxWidth: "100px" },
      value: unit.notes,
      onChange: (e) => updateUnit("notes", e.target.value),
    }),
    h.if(!isEditing)("p.ellipse", [unit.notes]),
  ]);
}

function UnitRowStratNameEditor() {
  const {
    model,
    actions,
    isEditing,
  }: { model: { unit: UnitsView }; actions: any; isEditing: boolean } =
    useModelEditor();

  const { unit } = model;

  return h("div", [
    unit.strat_names
      ? `${unit.strat_names.strat_name} ${unit.strat_names.rank}`
      : unit.unit_strat_name ?? "unnamed",
    h.if(isEditing)(UnitStratNameModalEditor),
  ]);
}

function UnitCellGroup(props: { unit: UnitsView; onCancel: () => void }) {
  const { unit } = props;
  const {
    isEditing,
    actions,
  }: { isEditing: boolean; actions: { persistChanges: any } } =
    useModelEditor();

  const backgroundColor = convertColorNameToHex(unit.color) + "80";
  return h(React.Fragment, [
    h("td", { width: "0%" }, [
      h(Link, { href: `/unit/${unit.id}/edit` }, [h("a", [unit.id])]),
    ]),
    h("td", { style: { background: backgroundColor } }, [
      h(UnitRowStratNameEditor),
    ]),
    h("td", [h(LithTags, { large: false })]),
    h("td", [h(EnvTags, { large: false })]),
    h("td", [h(UnitRowIntervalEditor)]),
    h("td", [h(UnitRowThicknessEditor)]),
    h("td", [h(UnitRowNotes)]),
    h.if(isEditing)("td", [
      h(Button, { intent: "danger", onClick: props.onCancel }, ["Cancel"]),
      h(SubmitButton),
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
    copy: boolean,
    inRow?: boolean
  ) => void;
  onCancel: () => void;
  dialogTitle: string;
  persistChanges: (e: UnitEditorModel, c: Partial<UnitEditorModel>) => void;
  colSpan: number;
  isMoved: boolean;
  inRowEditing: boolean;
  copyUnitUp: () => void;
  copyUnitDown: () => void;
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
    h(
      DraggableRow,
      {
        key: props.unit.id,
        index: props.unit_index,
        drag: props.drag,
        draggableId: props.unit.unit_strat_name + props.unit.id.toString(),
        href: undefined,
        isMoved: props.isMoved,
        onDoubleClick: () =>
          props.triggerEditor(
            UNIT_ADD_POISITON.EDIT,
            props.unit_index,
            props.section_index,
            true,
            true
          ),
      },
      [
        h(
          ModelEditor,
          {
            isEditing: props.inRowEditing,
            //@ts-ignore
            persistChanges: props.persistChanges,
            model: { unit: props.unit },
          },
          [
            h(UnitCellGroup, {
              unit: props.unit,
              key: props.unit_index,
              onCancel: props.onCancel,
            }),
          ]
        ),
        h.if(!props.inRowEditing)("td", { width: "0%" }, [
          h(UnitRowContextMenu, {
            unit: props.unit,
            unit_index: props.unit_index,
            section_index: props.section_index,
            triggerEditor: props.triggerEditor,
            copyUnitUp: props.copyUnitUp,
            copyUnitDown: props.copyUnitDown,
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
  ]);
}

function UnitRowEditorModal(
  props: UnitEditorProps & {
    onCancel: () => void;
    title: string;
    open: boolean;
  }
) {
  return h(Dialog, { isOpen: props.open, style: { width: "50%" } }, [
    h(MinEditorCard, {
      title: props.title,
      persistChanges: props.persistChanges,
      model: props.model,
      onCancel: props.onCancel,
    }),
  ]);
}

export { UnitRow, UnitRowEditorModal };
