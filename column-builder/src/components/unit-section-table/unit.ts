import React from "react";
import Link from "next/link";
import { hyperStyled } from "@macrostrat/hyper";
import {
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
  UnitRowStratNameEditor,
  InformalUnitName,
} from "../unit/common-editing";
import { MinEditorCard } from "../unit/minimal-unit-editor";
import { DraggableRow } from "../table";
import { UnitRowContextMenu, AddBtnBetweenRows } from "./helpers";
import { useUnitSectionContext } from "~/index";
import styles from "~/components/comp.module.scss";
import { Button, Dialog, TextArea } from "@blueprintjs/core";
import {
  ModelEditor,
  useModelEditor,
} from "deps/ui-components/packages/ui-components/src";
import { SubmitButton } from "../buttons";

const h = hyperStyled(styles);

function UnitRowIntervalEditor() {
  const {
    model: unit,
    actions,
    isEditing,
  }: { model: UnitsView; actions: any; isEditing: boolean } = useModelEditor();

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
        [intervalField]: { $set: id },
        [intervalName]: { $set: interval_name },
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
    model: unit,
    actions,
    isEditing,
  }: { model: UnitsView; actions: any; isEditing: boolean } = useModelEditor();

  const updateUnit = (field: string, value: string) => {
    actions.updateState({
      model: {
        [field]: { $set: value },
      },
    });
  };

  return h(React.Fragment, [
    h.if(isEditing)(TextArea, {
      style: { maxWidth: "100px" },
      value: unit.notes ?? "",
      onChange: (e) => updateUnit("notes", e.target.value),
    }),
    h.if(!isEditing)("p.ellipse", [unit.notes]),
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
    h("td", [h(Link, { href: `/unit/${unit.id}/edit` }, [h("a", [unit.id])])]),
    h("td", { style: { background: backgroundColor } }, [h(InformalUnitName)]),
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
  colSpan: number;
  isMoved: boolean;
  inRowEditing: boolean;
  copyUnitUp: () => void;
  copyUnitDown: () => void;
  addEmptyUnit: (unit_index: number) => void;
  editUnitAt: (unit_index: number) => void;
}

function UnitRow(props: UnitRowProps) {
  const { state, runAction } = useUnitSectionContext();

  const persistChanges = (e: UnitsView, c: Partial<UnitsView>) => {
    runAction({
      type: "save-unit-at",
      unit: e,
      changeSet: c,
      og_unit: props.unit,
      unit_index: props.unit_index,
      section_index: props.section_index,
      sections: state.sections,
    });
  };

  const onCancel = () => {
    runAction({
      type: "cancel-editing",
      section_index: props.section_index,
      unit_index: props.unit_index,
    });
  };

  return h(React.Fragment, { key: props.unit.id }, [
    h.if(props.unit_index == 0)(AddBtnBetweenRows, {
      colSpan: props.colSpan,
      onClick: (e) => {
        e.stopPropagation();
        props.addEmptyUnit(props.unit_index);
      },
    }),
    h(
      DraggableRow,
      {
        key: props.unit.id,
        index: props.unit_index,
        drag: props.drag,
        draggableId: props.unit.strat_name + props.unit.id.toString(),
        href: undefined,
        isMoved: props.isMoved,
        onDoubleClick: () => {
          runAction({
            type: "edit-unit-at",
            unit_index: props.unit_index,
            section_index: props.section_index,
          });
        },
      },
      [
        h(
          ModelEditor,
          {
            isEditing: props.inRowEditing,
            //@ts-ignore
            persistChanges,
            model: { ...props.unit },
          },
          [
            h(UnitCellGroup, {
              unit: props.unit,
              key: props.unit_index,
              onCancel,
            }),
          ]
        ),
        h.if(!props.inRowEditing)("td", { width: "0%" }, [
          h(UnitRowContextMenu, {
            unit: props.unit,
            unit_index: props.unit_index,
            section_index: props.section_index,
            copyUnitUp: props.copyUnitUp,
            copyUnitDown: props.copyUnitDown,
            addEmptyUnit: props.addEmptyUnit,
            editUnitAt: props.editUnitAt,
          }),
        ]),
      ]
    ),

    h(AddBtnBetweenRows, {
      colSpan: props.colSpan,
      onClick: (e) => {
        e.stopPropagation();
        props.addEmptyUnit(props.unit_index + 1);
      },
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
