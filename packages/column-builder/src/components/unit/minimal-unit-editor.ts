import { hyperStyled } from "@macrostrat/hyper";
import {
  IntervalDataI,
  Table,
  IntervalSuggest,
} from "@macrostrat-web/column-builder/src";
import { Button, TextArea, Card, Collapse, Dialog } from "@blueprintjs/core";
import { ModelEditor, useModelEditor } from "@macrostrat/ui-components";
import styles from "../comp.module.sass";
import { SubmitButton } from "..";
import {
  UnitThickness,
  UnitEditorProps,
  InformalUnitName,
  FormalStratName,
  EnvTags,
  LithTags,
} from "./common-editing";
import { useState } from "react";
import { AddButton } from "../buttons";
import { UnitsView } from "~/types";
const h = hyperStyled(styles);

function UnitEditCancelAlert(props: {
  onCancel: () => void;
  onClose: () => void;
  open: boolean;
}) {
  return h(
    Dialog,
    {
      isOpen: props.open,
      icon: "warning-sign",
      title: "Unsaved Changes",
    },
    [
      h(
        "div",
        {
          style: { margin: "10px" },
        },
        [
          h("p", [
            "There are unsaved changes, are you sure you want to leave?",
          ]),
          h("div", [
            h(Button, { intent: "danger", onClick: props.onCancel }, [
              "Don't Save",
            ]),
            h(Button, { intent: "primary", onClick: props.onClose }, [
              "Back to Editing",
            ]),
          ]),
        ]
      ),
    ]
  );
}

function UnitEdit(props: { onCancel: () => void }) {
  const [open, setOpen] = useState(false);
  const { model, hasChanges, actions, ...rest } = useModelEditor();
  const { unit }: { unit: UnitsView } = model;

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

  const onCancelBtnClick = () => {
    if (hasChanges()) {
      setOpen(true);
    } else {
      props.onCancel();
    }
  };

  return h("div", [
    h(UnitEditCancelAlert, {
      open,
      onCancel: props.onCancel,
      onClose: () => setOpen(false),
    }),
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
              h(SubmitButton),
              h(Button, { intent: "danger", onClick: onCancelBtnClick }, [
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
  btnPosition: "top" | "bottom";
}

function MinEditorToggle(props: ToggleI) {
  const [add, setAdd] = useState(false);

  const model = {
    unit: { new_section: false, lith_unit: [], environ_unit: [] },
  };

  const persistChanges = (e: UnitsView, c: Partial<UnitsView>) => {
    props.persistChanges(e, c);
    setAdd(false);
  };

  const onCancel = () => {
    setAdd(false);
  };

  return h("div", [
    h.if(props.btnPosition == "top")(
      AddButton,
      { onClick: () => setAdd(!add) },
      [props.btnText]
    ),
    h(Collapse, { isOpen: add }, [
      h(MinEditorCard, {
        persistChanges,
        onCancel,
        model,
        title: props.btnText,
      }),
    ]),
    h.if(props.btnPosition == "bottom")(
      AddButton,
      { onClick: () => setAdd(!add) },
      [props.btnText]
    ),
  ]);
}

function NewSectionBtn(props: {
  addNewSection: (i: number) => void;
  index: number;
}) {
  return h(AddButton, { onClick: () => props.addNewSection(props.index) }, [
    "Add Section",
  ]);
}

function MinEditorCard(
  props: UnitEditorProps & {
    onCancel: () => void;
    title?: string;
  }
) {
  const { persistChanges, model, onCancel, title } = props;
  return h(Card, { style: { padding: 0, paddingBottom: "5px" } }, [
    h("div.header", [title]),
    h(MinUnitEditor, {
      model,
      persistChanges,
      onCancel,
    }),
  ]);
}

export { MinUnitEditor, MinEditorToggle, MinEditorCard, NewSectionBtn };
