import React from "react";
import { hyperStyled } from "@macrostrat/hyper";
import {
  UnitsView,
  LithUnit,
  Lith,
  EnvironUnit,
  TagContainerCell,
} from "../../index";
import { InputGroup, NumericInput, FormGroup } from "@blueprintjs/core";
import {
  useModelEditor,
  //@ts-ignore
} from "@macrostrat/ui-components";
import styles from "../comp.module.scss";
import { EnvTagsAdd } from "..";
import { UnitStratNameModalEditor } from "..";
import { LithContainer } from "../lith";
const h = hyperStyled(styles);

export interface UnitEditorProps {
  persistChanges: (e: UnitsView, c: Partial<UnitsView>) => void;
  model: UnitsView | {};
}

export function EnvTags(props: { large: boolean }) {
  const { large = true } = props;
  const {
    model: unit,
    isEditing,
    actions,
  }: {
    model: UnitsView;
    isEditing: boolean;
    actions: any;
  } = useModelEditor();
  const { environ_unit: envs } = unit;

  const tagData =
    envs?.map((env) => {
      return {
        id: env.id,
        color: env.environ_color,
        name: env.environ,
        description: env.environ_class,
      };
    }) ?? [];

  const onClickDelete = (id: number) => {
    const filteredEnvs = [...(envs ?? [])].filter((l) => l.id != id);
    actions.updateState({
      model: { environ_unit: { $set: filteredEnvs } },
    });
  };

  const onClick = (env: Partial<EnvironUnit>) => {
    actions.updateState({
      model: { environ_unit: { $push: [env] } },
    });
  };

  return h("div.tag-container", [
    h.if(tagData.length == 0 && isEditing)("div", ["Add environments"]),
    h(TagContainerCell, { data: tagData, onClickDelete, isEditing, large }),
    h.if(isEditing)(EnvTagsAdd, { onClick }),
  ]);
}

export function LithTags(props: { large?: boolean }) {
  const { large = true } = props;
  const {
    model: unit,
    isEditing,
    actions,
  }: {
    model: UnitsView;
    isEditing: boolean;
    actions: any;
  } = useModelEditor();
  const { lith_unit: liths = [] } = unit;

  const onClickDelete = (lith: LithUnit) => {
    const filteredLiths = [...(liths ?? [])].filter((l) => l.id != lith.id);
    actions.updateState({
      model: { lith_unit: { $set: filteredLiths } },
    });
  };

  const onAdd = (lith: Lith) => {
    lith.prop = "sub";
    actions.updateState({ model: { lith_unit: { $push: [lith] } } });
  };

  const onSwitchProp = (id: number) => {
    const index = liths.findIndex((lith: LithUnit) => lith.id == id);
    const arrayOfDeleted = liths.splice(index, 1);
    const lith: LithUnit = arrayOfDeleted[0];
    if (lith.prop == "dom") {
      lith.prop = "sub";
    } else lith.prop = "dom";
    liths.splice(index, 0, lith);
    actions.updateState({ model: { lith_unit: { $set: liths } } });
  };

  return h("div", [
    h.if(liths.length == 0 && isEditing)("div", ["Add lithologies"]),
    h(LithContainer, {
      large,
      liths,
      onAdd,
      onSwitchProp,
      onRemove: isEditing ? onClickDelete : undefined,
      isEditing,
    }),
  ]);
}

export function UnitThickness(props: {
  field: string;
  defaultValue: number | undefined;
  placeholder: string;
  small?: boolean;
}) {
  const { model: unit, actions }: { model: UnitsView; actions: any } =
    useModelEditor();

  const update = (field: string, e: any) => {
    actions.updateState({ model: { [field]: { $set: e } } });
  };
  const width = props.small ?? false ? "60px" : undefined;

  return h(NumericInput, {
    style: { width },
    onValueChange: (e) => update(props.field, e),
    defaultValue: props.defaultValue,
    placeholder: props.placeholder,
    buttonPosition: props.small ?? false ? "none" : undefined,
  });
}

export function UnitRowThicknessEditor() {
  const {
    model: unit,
    actions,
    isEditing,
  }: { model: UnitsView; actions: any; isEditing: boolean } = useModelEditor();

  return h(React.Fragment, [
    h.if(!isEditing)("div", [
      unit.min_thick != unit.max_thick
        ? `${unit.min_thick} - ${unit.max_thick}`
        : unit.min_thick,
    ]),
    h.if(isEditing)("div", { style: { display: "flex" } }, [
      h(UnitThickness, {
        field: "min_thick",
        placeholder: "min thickness",
        defaultValue: unit?.min_thick,
        small: true,
      }),
      " - ",
      h(UnitThickness, {
        field: "max_thick",
        placeholder: "max thickness",
        defaultValue: unit?.max_thick,
        small: true,
      }),
    ]),
  ]);
}

export function InformalUnitName() {
  const { model: unit, actions, isEditing } = useModelEditor();

  const updateUnitName = (e: string) => {
    actions.updateState({
      model: { strat_name: { $set: e } },
    });
  };

  return h("div", [
    h.if(!isEditing)("p", [unit.strat_name]),
    h.if(isEditing)(InputGroup, {
      placeholder: "Informal Unit Name",
      style: { width: "200px" },
      value: unit.strat_name || undefined,
      onChange: (e) => updateUnitName(e.target.value),
    }),
  ]);
}

export function UnitRowStratNameEditor() {
  const {
    model: unit,
    actions,
    isEditing,
  }: { model: UnitsView; actions: any; isEditing: boolean } = useModelEditor();

  const nameText = unit.strat_names.length
    ? unit.strat_names.map((sn) => `${sn.strat_name} ${sn.rank}`).join(", ")
    : "No stratigraphic name";

  return h("div", [nameText, h.if(isEditing)(UnitStratNameModalEditor)]);
}
