import { hyperStyled } from "@macrostrat/hyper";
import {
  IntervalDataI,
  Table,
  IntervalSuggest,
  UnitsView,
  UnitEditorModel,
} from "~/index";
import { Button, Checkbox, Dialog, TextArea } from "@blueprintjs/core";
import { ModelEditor, useModelEditor } from "@macrostrat/ui-components";
import styles from "../comp.module.scss";
import { SubmitButton } from "..";
import {
  UnitThickness,
  UnitEditorProps,
  InformalUnitName,
  FormalStratName,
  EnvTags,
  LithTags,
  UnitEditorI,
} from "./common-editing";
import React, { ReactChild, useEffect, useState } from "react";
import { AddButton } from "../buttons";
import { DraggableOverlay } from "~/components/draggable-overlay";
const h = hyperStyled(styles);

function UnitEdit(props: { onCancel: () => void }) {
  const { model, hasChanges, actions, ...rest } = useModelEditor();
  const { unit }: { unit: UnitEditorI } = model;
  console.log(unit);
  const updateUnit = (field: string, e: any) => {
    actions.updateState({ model: { unit: { [field]: { $set: e } } } });
  };

  const onChangeLo = (interval: IntervalDataI) => {
    const { data } = interval;
    const { id: lo, interval_name: name_lo } = data;
    actions.updateState({
      model: {
        unit: {
          lo: { $set: lo },
          name_lo: { $set: name_lo },
        },
      },
    });
  };

  const onChangeFo = (interval: IntervalDataI) => {
    const { data } = interval;
    const { id: fo, interval_name: name_fo } = data;
    actions.updateState({
      model: {
        unit: {
          fo: { $set: fo },
          name_fo: { $set: name_fo },
        },
      },
    });
  };

  return h("div", [
    h(Table, { interactive: false }, [
      h("tr", [
        h("td", [
          h("div.margin-bottom-spacing", [h(InformalUnitName)]),
          h(FormalStratName),
        ]),
        h("td", [
          h("div.margin-bottom-spacing", [h(LithTags, { large: false })]),
          h(EnvTags, { large: false }),
        ]),

        h("td", [
          h("div.margin-bottom-spacing", [
            h(UnitThickness, {
              field: "min_thick",
              placeholder: "min thickness",
              defaultValue: unit?.min_thick || undefined,
            }),
          ]),
          h(UnitThickness, {
            field: "max_thick",
            placeholder: "max thickness",
            defaultValue: unit?.max_thick || undefined,
          }),
        ]),
      ]),
      h("tr", [
        h("td.interval-cell-min-editor", [
          h(IntervalSuggest, {
            placeholder: "Top interval",
            initialSelected: {
              value: unit?.name_lo,
              data: { id: unit?.lo || 0, interval_name: unit?.name_lo },
            },
            onChange: onChangeLo,
          }),
          h(IntervalSuggest, {
            placeholder: "Bottom Interval",
            initialSelected: {
              value: unit?.name_fo,
              data: {
                id: unit?.fo || 0,
                interval_name: unit?.name_fo,
              },
            },
            onChange: onChangeFo,
          }),
        ]),
        h("td", { colSpan: 2 }, [
          h("div", { style: { display: "flex", flexDirection: "column" } }, [
            h(TextArea, {
              value: unit.notes,
              onChange: (e) => updateUnit("notes", e.target.value),
            }),
            h("div", { style: { marginTop: "10px" } }, [
              h(Checkbox, {
                checked: unit.new_section,
                onChange: () => updateUnit("new_section", !unit.new_section),
                label: "Make new section with this unit",
              }),
              h(SubmitButton),
              h(Button, { intent: "danger", onClick: props.onCancel }, [
                "Cancel",
              ]),
            ]),
          ]),
        ]),
      ]),
    ]),
  ]);
}

interface MinUnitEditorProps extends UnitEditorProps {
  onCancel: () => void;
}

function MinUnitEditor(props: MinUnitEditorProps) {
  return h(
    ModelEditor,
    {
      model: props.model,
      //@ts-ignore
      persistChanges: props.persistChanges,
      canEdit: true,
      isEditing: true,
    },
    [h(UnitEdit, { onCancel: props.onCancel })]
  );
}

interface ToggleI extends UnitEditorProps {
  btnText: string;
}

function MinEditorToggle(props: ToggleI) {
  const [add, setAdd] = useState(false);

  const model = { unit: { new_section: false }, liths: [], envs: [] };

  const persistChanges = (e: UnitEditorModel, c: Partial<UnitEditorModel>) => {
    props.persistChanges(e, c);
    setAdd(false);
  };

  const onCancel = () => {
    setAdd(false);
  };

  return h("div", [
    h(MinEditorDialog, {
      open: add,
      persistChanges,
      onCancel,
      model,
      title: props.btnText,
    }),
    h(AddButton, { onClick: () => setAdd(true) }, [props.btnText]),
  ]);
}

function MinEditorDialog(
  props: UnitEditorProps & {
    open: boolean;
    onCancel: () => void;
    title?: string;
  }
) {
  const { open, persistChanges, model, onCancel, title } = props;
  console.log("rendered");
  return h(
    DraggableOverlay,
    {
      open,
      title,
    },
    [
      h(MinUnitEditor, {
        model,
        persistChanges,
        onCancel,
      }),
    ]
  );
}

export { MinUnitEditor, MinEditorToggle, MinEditorDialog };
