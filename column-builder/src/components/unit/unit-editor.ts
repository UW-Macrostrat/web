import React from "react";
import { hyperStyled } from "@macrostrat/hyper";
import Link from "next/link";
import {
  UnitsView,
  IntervalRow,
  IntervalDataI,
  ColorBlock,
  Table,
  FeatureCell,
} from "../../index";
import { NumericInput, TextArea } from "@blueprintjs/core";
import {
  ModelEditor,
  useModelEditor,
  //@ts-ignore
} from "@macrostrat/ui-components";
import styles from "../comp.module.scss";
import { SubmitButton } from "..";
import {
  UnitEditorModel,
  UnitEditorProps,
  EnvTags,
  LithTags,
  FormalStratName,
  InformalUnitName,
  UnitThickness,
} from "./common-editing";
import { LithContainer } from "../lith";
const h = hyperStyled(styles);

function UnitThicknesses() {
  const { model, actions }: { model: UnitEditorModel; actions: any } =
    useModelEditor();
  const { unit } = model;

  return h(React.Fragment, [
    h(FeatureCell, { text: "Min-Thick" }, [
      h(UnitThickness, {
        field: "min_thick",
        defaultValue: unit?.min_thick || undefined,
        placeholder: "Min thick",
      }),
    ]),
    h(FeatureCell, { text: "Max-Thick: " }, [
      h(UnitThickness, {
        field: "max_thick",
        defaultValue: unit?.max_thick || undefined,
        placeholder: "Max thick",
      }),
    ]),
  ]);
}

function StratName() {
  const { model, actions } = useModelEditor();
  const { unit }: UnitEditorModel = model;
  const baseURl = `/unit/${unit.id}`;
  // this complexity is born of the confusing strat_name issues in the db
  const href = unit.strat_name
    ? `${baseURl}/strat-name/${unit.strat_name.id}/edit`
    : `${baseURl}/strat-name/new`;

  const linkText = unit.strat_name ? "(modify)" : "(create)";

  return h("tr", [
    h(FeatureCell, { text: "Informal Unit Name" }, [h(InformalUnitName)]),
    h(FeatureCell, { text: "Formal Stratigraphic Name: " }, [
      h(FormalStratName),
      h(Link, { href }, [h("a", { style: { fontSize: "10px" } }, [linkText])]),
    ]),
  ]);
}

interface UnitPositionI {
  bottom: boolean;
  position_bottom?: number;
  position_top?: number;
  onPositionChange: (e: number) => void;
}

function UnitPosition(props: UnitPositionI) {
  const positionLabel: string = props.bottom
    ? "Position Bottom: "
    : "Position Top: ";

  return h(React.Fragment, [
    h(FeatureCell, { text: positionLabel }, [
      h(NumericInput, {
        onValueChange: props.onPositionChange,
        defaultValue: props.position_bottom || props.position_top,
      }),
    ]),
  ]);
}

/* 
Probably the most complicated component, bc there are so many editable things.
*/
function UnitEdit() {
  const { model, hasChanges, actions, ...rest } = useModelEditor();
  const { unit }: { unit: UnitsView } = model;

  const updateUnit = (field: string, e: any) => {
    actions.updateState({ model: { unit: { [field]: { $set: e } } } });
  };

  const onChangeLo = (interval: IntervalDataI) => {
    const { data } = interval;
    const { id: lo, interval_name: name_lo, age_top } = data;
    actions.updateState({
      model: {
        unit: {
          lo: { $set: lo },
          name_lo: { $set: name_lo },
          age_top: { $set: age_top },
        },
      },
    });
  };

  const onChangeFo = (interval: IntervalDataI) => {
    const { data } = interval;
    const { id: fo, interval_name: name_fo, age_bottom } = data;
    actions.updateState({
      model: {
        unit: {
          fo: { $set: fo },
          name_fo: { $set: name_fo },
          age_bottom: { $set: age_bottom },
        },
      },
    });
  };

  return h("div", [
    h(Table, { interactive: false }, [
      h(StratName),
      h("tr", [
        h(IntervalRow, {
          bottom: false,
          age_top: unit?.age_top,
          initialSelected: {
            value: unit?.name_lo,
            data: { id: unit?.lo || 0, interval_name: unit?.name_lo },
          },
          onChange: onChangeLo,
        }),
        h(UnitPosition, {
          bottom: false,
          onPositionChange: (e) => updateUnit("position_top", e),
          position_top: unit?.position_top || undefined,
        }),
      ]),
      h("tr", [
        h(IntervalRow, {
          bottom: true,
          age_bottom: unit?.age_bottom,
          initialSelected: {
            value: unit?.name_fo,
            data: {
              id: unit?.fo || 0,
              interval_name: unit?.name_fo,
            },
          },
          onChange: onChangeFo,
        }),
        h(UnitPosition, {
          bottom: true,
          onPositionChange: (e) => updateUnit("position_bottom", e),
          position_bottom: unit?.position_bottom || undefined,
        }),
      ]),
      h("tr", [
        h(FeatureCell, { text: "Color: " }, [
          h(ColorBlock, {
            onChange: (color) => {
              actions.updateState({
                model: { unit: { color: { $set: color } } },
              });
            },
            color: unit?.color,
          }),
        ]),
        h(UnitThicknesses),
      ]),
      h("tr", [
        h(FeatureCell, { text: "Notes: ", colSpan: 5 }, [
          h(TextArea, {
            value: unit.notes,
            onChange: (e) => updateUnit("notes", e.target.value),
          }),
        ]),
      ]),
      h("tr", [
        h(FeatureCell, { text: "Lithologies: ", colSpan: 5 }, [h(LithTags)]),
      ]),
      h("tr", [
        h(FeatureCell, { text: "Environments: ", colSpan: 5 }, [h(EnvTags)]),
      ]),
    ]),
    h(SubmitButton),
  ]);
}

function UnitEditor(props: UnitEditorProps) {
  return h(
    ModelEditor,
    {
      model: props.model,
      //@ts-ignore
      persistChanges: props.persistChanges,
      canEdit: true,
      isEditing: true,
    },
    [h(UnitEdit)]
  );
}

export { UnitEditor };
