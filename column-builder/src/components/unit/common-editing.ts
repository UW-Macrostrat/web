import React from "react";
import { hyperStyled } from "@macrostrat/hyper";
import {
  UnitsView,
  LithUnit,
  EnvironUnit,
  TagContainerCell,
} from "../../index";
import { InputGroup, NumericInput, FormGroup } from "@blueprintjs/core";
import {
  useModelEditor,
  //@ts-ignore
} from "@macrostrat/ui-components";
import styles from "../comp.module.scss";
import { EnvTagsAdd, LithTagsAdd, StratNameDataI, StratNameSuggest } from "..";
import { LithContainer } from "../lith";
const h = hyperStyled(styles);

export interface UnitEditorModel {
  unit: UnitsView;
}

export interface UnitEditorProps {
  persistChanges: (e: UnitEditorModel, c: Partial<UnitEditorModel>) => void;
  model: UnitsView | {};
}

export function EnvTags(props: { large: boolean }) {
  const { large = true } = props;
  const {
    model,
    isEditing,
    actions,
  }: {
    model: UnitEditorModel;
    isEditing: boolean;
    actions: any;
  } = useModelEditor();
  const {
    unit: { environ_unit: envs },
  } = model;

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
      model: { unit: { environ_unit: { $set: filteredEnvs } } },
    });
  };

  const onClick = (env: Partial<EnvironUnit>) => {
    actions.updateState({
      model: { unit: { environ_unit: { $push: [env] } } },
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
    model,
    isEditing,
    actions,
  }: {
    model: UnitEditorModel;
    isEditing: boolean;
    actions: any;
  } = useModelEditor();
  const {
    unit: { lith_unit: liths = [] },
  } = model;

  const tagData =
    liths?.map((lith) => {
      return {
        id: lith.id,
        color: lith.lith_color,
        name: lith.lith,
        description: lith.lith_class,
      };
    }) ?? [];

  const onClickDelete = (lith: LithUnit) => {
    const filteredLiths = [...(liths ?? [])].filter((l) => l.id != lith.id);
    actions.updateState({
      model: { unit: { lith_unit: { $set: filteredLiths } } },
    });
  };

  const onAdd = (lith: Partial<LithUnit>) => {
    actions.updateState({ model: { unit: { lith_unit: { $push: [lith] } } } });
  };

  const onSwitchProp = (id: number, prop: "dom" | "sub") => {
    console.log(id, prop);
  };

  return h("div.tag-container", [
    h.if(tagData.length == 0 && isEditing)("div", ["Add lithologies"]),
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
  const { model, actions }: { model: UnitEditorModel; actions: any } =
    useModelEditor();

  const update = (field: string, e: any) => {
    actions.updateState({ model: { unit: { [field]: { $set: e } } } });
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
    model,
    actions,
    isEditing,
  }: { model: UnitEditorModel; actions: any; isEditing: boolean } =
    useModelEditor();

  const unit = model.unit;

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
  const { model, actions } = useModelEditor();
  const { unit }: UnitEditorModel = model;

  const updateUnitName = (e: string) => {
    actions.updateState({
      model: { unit: { unit_strat_name: { $set: e } } },
    });
  };

  return h(FormGroup, { label: "Informal Unit Name" }, [
    h(InputGroup, {
      placeholder: "Informal Unit Name",
      style: { width: "200px" },
      value: unit.unit_strat_name || undefined,
      onChange: (e) => updateUnitName(e.target.value),
    }),
  ]);
}

export function FormalStratName() {
  const { model, actions } = useModelEditor();
  const { unit }: UnitEditorModel = model;

  const initialSelected: StratNameDataI | undefined = unit?.strat_names
    ? {
        value: `${unit.strat_names.strat_name} ${unit.strat_names.rank}`,
        data: unit.strat_names,
      }
    : undefined;

  const updateStratName = (e: StratNameDataI) => {
    actions.updateState({
      model: {
        unit: {
          strat_names: { $set: e.data },
          unit_strat_name: { $set: `${e.data.strat_name} ${e.data.rank}` },
          strat_name_id: { $set: e.data.id },
        },
      },
    });
  };

  return h(FormGroup, { label: "Formal strat name" }, [
    h(StratNameSuggest, {
      initialSelected,
      placeholder: "Formal Strat Name",
      onChange: updateStratName,
      col_id: unit.col_id,
    }),
  ]);
}
