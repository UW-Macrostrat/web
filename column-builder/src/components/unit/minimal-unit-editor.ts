import React from "react";
import { hyperStyled } from "@macrostrat/hyper";
import Link from "next/link";
import {
  UnitsView,
  LithUnit,
  EnvironUnit,
  IntervalRow,
  IntervalDataI,
  TagContainerCell,
  Table,
  FeatureCell,
} from "../../index";
import {
  Tooltip2 as Tooltip,
  Popover2 as Popover,
} from "@blueprintjs/popover2";
import { Button, InputGroup, NumericInput, TextArea } from "@blueprintjs/core";
import {
  ModelEditor,
  useModelEditor,
  //@ts-ignore
} from "@macrostrat/ui-components/lib/esm";
import styles from "../comp.module.scss";
import {
  EnvTagsAdd,
  LithTagsAdd,
  StratNameDataI,
  StratNameSuggest,
  SubmitButton,
} from "..";
const h = hyperStyled(styles);

function EnvTags() {
  const {
    model,
    isEditing,
    actions,
  }: {
    model: UnitEditorModel;
    isEditing: boolean;
    actions: any;
  } = useModelEditor();
  const { envs } = model;

  const tagData = envs.map((env) => {
    return {
      id: env.id,
      color: env.environ_color,
      name: env.environ,
      description: env.environ_class,
    };
  });

  const onClickDelete = (id: number) => {
    const filteredEnvs = [...envs].filter((l) => l.id != id);
    actions.updateState({ model: { envs: { $set: filteredEnvs } } });
  };

  const onClick = (env: Partial<EnvironUnit>) => {
    actions.updateState({ model: { envs: { $push: [env] } } });
  };

  return h("div.tag-container", [
    h(TagContainerCell, { data: tagData, onClickDelete, isEditing }),
    h(EnvTagsAdd, { onClick }),
  ]);
}

function LithTags() {
  const {
    model,
    isEditing,
    actions,
  }: {
    model: UnitEditorModel;
    isEditing: boolean;
    actions: any;
  } = useModelEditor();
  const { liths } = model;

  const tagData = liths.map((lith) => {
    return {
      id: lith.id,
      color: lith.lith_color,
      name: lith.lith,
      description: lith.lith_class,
    };
  });

  const onClickDelete = (id: number) => {
    const filteredLiths = [...liths].filter((l) => l.id != id);
    actions.updateState({ model: { liths: { $set: filteredLiths } } });
  };

  const onClick = (lith: Partial<LithUnit>) => {
    actions.updateState({ model: { liths: { $push: [lith] } } });
  };

  return h("div.tag-container", [
    h(TagContainerCell, { data: tagData, onClickDelete, isEditing }),
    h(LithTagsAdd, { onClick }),
  ]);
}

function UnitThickness() {
  const { model, actions }: { model: UnitEditorModel; actions: any } =
    useModelEditor();
  const { unit } = model;

  const update = (field: string, e: any) => {
    actions.updateState({ model: { unit: { [field]: { $set: e } } } });
  };

  return h(React.Fragment, [
    h(FeatureCell, { text: "Min-Thick" }, [
      h(NumericInput, {
        onValueChange: (e) => update("min_thick", e),
        defaultValue: unit?.min_thick || undefined,
      }),
    ]),
    h(FeatureCell, { text: "Max-Thick: " }, [
      h(NumericInput, {
        onValueChange: (e) => update("max_thick", e),
        defaultValue: unit?.max_thick || undefined,
      }),
    ]),
  ]);
}

function StratName() {
  const { model, actions } = useModelEditor();
  const { unit }: UnitEditorModel = model;
  const baseURl = `/unit/${unit.id}`;

  const href = unit.strat_name
    ? `${baseURl}/strat-name/${unit.strat_name.id}/edit`
    : `${baseURl}/strat-name/new`;

  const initialSelected: StratNameDataI | undefined = unit?.strat_name
    ? {
        value: unit.unit_strat_name || unit.strat_name.strat_name,
        data: unit.strat_name,
      }
    : undefined;

  const updateStratName = (e: StratNameDataI) => {
    actions.updateState({ model: { unit: { strat_name: { $set: e.data } } } });
  };
  const updateUnitName = (e: string) => {
    actions.updateState({
      model: { unit: { unit_strat_name: { $set: e } } },
    });
  };

  const linkText = unit.strat_name ? "(modify)" : "(create)";

  return h(React.Fragment, [
    h("td", [
      h(InputGroup, {
        placeholder: "Informal Unit Name",
        style: { width: "200px" },
        defaultValue: unit.unit_strat_name || undefined,
        onChange: (e) => updateUnitName(e.target.value),
      }),
    ]),
    h("td", [
      h(StratNameSuggest, {
        initialSelected,
        onChange: updateStratName,
      }),
      h(Link, { href }, [h("a", { style: { fontSize: "10px" } }, [linkText])]),
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
      h("tbody", [
        h("tr", [h(StratName), h("tr", [h(LithTags)]), h("tr", [h(EnvTags)])]),
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
        ]),
        h("tr", [h(UnitThickness)]),
        h("tr", [
          h(FeatureCell, { text: "Notes: ", colSpan: 5 }, [
            h(TextArea, {
              value: unit.notes,
              onChange: (e) => updateUnit("notes", e.target.value),
            }),
          ]),
        ]),
      ]),
    ]),
    h(SubmitButton),
  ]);
}

export interface UnitEditorModel {
  unit: UnitsView;
  envs: EnvironUnit[];
  liths: LithUnit[];
}

interface UnitEditorProps {
  persistChanges: (e: Partial<UnitsView>, c: Partial<UnitsView>) => UnitsView;
  model: UnitEditorModel | {};
}

function MinUnitEditor(props: UnitEditorProps) {
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

export { MinUnitEditor };
