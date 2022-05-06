import { hyperStyled } from "@macrostrat/hyper";
import {
  UnitsView,
  LithUnit,
  EnvironUnit,
  TagContainerCell,
} from "../../index";
import {
  InputGroup,
  Menu,
  MenuItem,
  NumericInput,
  Button,
} from "@blueprintjs/core";
import {
  useModelEditor,
  //@ts-ignore
} from "@macrostrat/ui-components";
import styles from "../comp.module.scss";
import { EnvTagsAdd, LithTagsAdd, StratNameDataI, StratNameSuggest } from "..";
import { Popover2 } from "@blueprintjs/popover2";
const h = hyperStyled(styles);

export interface UnitEditorI extends UnitsView {
  new_section: boolean;
}

export interface UnitEditorModel {
  unit: UnitEditorI;
  envs: EnvironUnit[];
  liths: LithUnit[];
}

export interface UnitEditorProps {
  persistChanges: (e: Partial<UnitEditorI>, c: Partial<UnitEditorI>) => void;
  model: UnitEditorI | {};
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
    h.if(tagData.length == 0)("div", ["Add environments"]),
    h(TagContainerCell, { data: tagData, onClickDelete, isEditing, large }),
    h(EnvTagsAdd, { onClick }),
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
    h.if(tagData.length == 0)("div", ["Add lithologies"]),
    h(TagContainerCell, { data: tagData, onClickDelete, isEditing, large }),
    h(LithTagsAdd, { onClick }),
  ]);
}

export function UnitThickness(props: {
  field: string;
  defaultValue: number | undefined;
  placeholder: string;
}) {
  const { model, actions }: { model: UnitEditorModel; actions: any } =
    useModelEditor();

  const update = (field: string, e: any) => {
    actions.updateState({ model: { unit: { [field]: { $set: e } } } });
  };

  return h(NumericInput, {
    onValueChange: (e) => update(props.field, e),
    defaultValue: props.defaultValue,
    placeholder: props.placeholder,
  });
}

export function InformalUnitName() {
  const { model, actions } = useModelEditor();
  const { unit }: UnitEditorModel = model;

  const updateUnitName = (e: string) => {
    actions.updateState({
      model: { unit: { unit_strat_name: { $set: e } } },
    });
  };

  return h(InputGroup, {
    placeholder: "Informal Unit Name",
    style: { width: "200px" },
    defaultValue: unit.unit_strat_name || undefined,
    onChange: (e) => updateUnitName(e.target.value),
  });
}

export function FormalStratName() {
  const { model, actions } = useModelEditor();
  const { unit }: UnitEditorModel = model;

  const initialSelected: StratNameDataI | undefined = unit?.strat_name
    ? {
        value: unit.unit_strat_name || unit.strat_name.strat_name,
        data: unit.strat_name,
      }
    : undefined;

  const updateStratName = (e: StratNameDataI) => {
    actions.updateState({ model: { unit: { strat_name: { $set: e.data } } } });
  };

  return h(StratNameSuggest, {
    initialSelected,
    placeholder: "Formal Strat Name",
    onChange: updateStratName,
  });
}

export function UnitLithHelperText(props: { lith_unit?: Partial<LithUnit>[] }) {
  const { lith_unit = [] } = props;

  return h(
    "div",
    {
      style: { display: "flex", fontSize: "10px", whiteSpace: "break-spaces" },
    },
    [
      "(",
      lith_unit.map((l, i) => {
        let last = i == lith_unit.length - 1;
        if (last) {
          return h("p.nomargin", { key: i }, [l.lith]);
        } else {
          return h("p.nomargin", { key: i }, [l.lith, ", "]);
        }
      }),
      ")",
    ]
  );
}

enum UNIT_ADD_POISITON {
  UP = "up",
  DOWN = "down",
}

export interface UnitRowContextMenuI {
  // either we are adding a new unit above, below or editing the current unit
  triggerEditor: (e: UNIT_ADD_POISITON | number) => void;
  unit: UnitsView;
}
function UnitRowContextMenu(props: UnitRowContextMenuI) {
  const ContextMenu = () =>
    h(Menu, [
      h(MenuItem, {
        text: "Add Unit Above",
        onClick: () => props.triggerEditor(UNIT_ADD_POISITON.UP),
      }),
      h(MenuItem, {
        text: "Add Unit Below",
        onClick: () => props.triggerEditor(UNIT_ADD_POISITON.DOWN),
      }),
      h(MenuItem, {
        text: `Edit current unit, ${props.unit.id}`,
        onClick: () => props.triggerEditor(props.unit.id),
      }),
    ]);

  return h(Popover2, { content: h(ContextMenu), minimal: true }, [
    h(Button, { minimal: true, icon: "more" }),
  ]);
}

export { UnitRowContextMenu, UNIT_ADD_POISITON };
