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
  ColorBlock,
  Table,
  FeatureCell,
} from "../../index";
import {
  Tooltip2 as Tooltip,
  Popover2 as Popover,
} from "@blueprintjs/popover2";
import { Button, NumericInput, TextArea } from "@blueprintjs/core";
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
    h(Popover, { content: h(EnvTagsAdd, { onClick }) }, [
      h(Tooltip, { content: "Add an environment" }, [
        h(Button, { icon: "plus", minimal: true, intent: "success" }),
      ]),
    ]),
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
    h(Popover, { content: h(LithTagsAdd, { onClick }) }, [
      h(Tooltip, { content: "Add a lithology" }, [
        h(Button, { icon: "plus", minimal: true, intent: "success" }),
      ]),
    ]),
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

/* 
The strat_name situation is semi-complex. There are many 
units that have an assigned strat_name that is stored. But there
are a lot of units that contain a 'strat_name' but that strat_name 
is NOT stored in the database with a proper record. This is complicated
right now, but we can discuss how to move forward.
*/
function StratName() {
  const { model, actions } = useModelEditor();
  const { unit }: UnitEditorModel = model;
  const baseURl = `/unit/${unit.id}`;
  // this complexity is born of the confusing strat_name issues in the db
  const href = unit.strat_name
    ? `${baseURl}/strat-name/${unit.strat_name.id}/edit`
    : unit.unit_strat_name
    ? `${baseURl}/strat-name/new?name=${unit.unit_strat_name}`
    : `${baseURl}/strat-name/new`;

  const initialSelected: StratNameDataI | undefined = unit?.strat_name
    ? {
        value: unit.unit_strat_name || unit.strat_name.strat_name,
        data: unit.strat_name,
      }
    : unit?.unit_strat_name
    ? {
        value: unit.unit_strat_name,
        data: { strat_name: unit.unit_strat_name, id: undefined },
      }
    : undefined;

  const updateStratName = (e: StratNameDataI) => {
    actions.updateState({ model: { unit: { strat_name: { $set: e.data } } } });
  };

  return h("tr", [
    h(FeatureCell, { text: "Stratigraphic Name: " }, [
      h(StratNameSuggest, {
        initialSelected,
        onChange: updateStratName,
      }),
      h(Link, { href }, [
        h("a", { style: { fontSize: "10px" } }, ["(modify)"]),
      ]),
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
      h("tbody", [
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
          h(UnitThickness),
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

function UnitEditor(props: UnitEditorProps) {
  console.log("Unit Model", props.model);
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
