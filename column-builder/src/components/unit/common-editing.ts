import React, { useState } from "react";
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
  MenuDivider,
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
}

export interface UnitEditorProps {
  persistChanges: (e: UnitEditorModel, c: Partial<UnitEditorModel>) => void;
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
  const {
    unit: { lith_unit: liths },
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

  const onClickDelete = (id: number) => {
    const filteredLiths = [...(liths ?? [])].filter((l) => l.id != id);
    actions.updateState({
      model: { unit: { lith_unit: { $set: filteredLiths } } },
    });
  };

  const onClick = (lith: Partial<LithUnit>) => {
    actions.updateState({ model: { unit: { lith_unit: { $push: [lith] } } } });
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
        value: unit.strat_name.strat_name,
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

export function UnitLithHelperText(props: { lith_unit?: LithUnit[] }) {
  const { lith_unit = [] } = props;

  const tagData = lith_unit.map((lith) => {
    return {
      id: lith.id,
      color: lith.lith_color,
      name: lith.lith,
      description: lith.lith_class,
    };
  });

  return h("div.tag-container", [
    h(TagContainerCell, { data: tagData, large: false }),
  ]);
}

enum UNIT_ADD_POISITON {
  ABOVE = "above",
  BELOW = "below",
  EDIT = "edit",
}

export interface UnitRowContextMenuI {
  // either we are adding a new unit above, below or editing the current unit
  triggerEditor: (e: UNIT_ADD_POISITON, i: number, copy: boolean) => void;
  unit: UnitsView;
  index: number;
}
function UnitRowContextMenu(props: UnitRowContextMenuI) {
  const SubMenu = ({ pos }: { pos: UNIT_ADD_POISITON }) => {
    return h(React.Fragment, [
      h(MenuItem, {
        text: `Copy unit #${props.unit.id}`,
        icon: "duplicate",
        onClick: () => props.triggerEditor(pos, props.index, true),
      }),
      h(MenuItem, {
        text: `With empty unit`,
        icon: "new-object",
        onClick: () => props.triggerEditor(pos, props.index, false),
      }),
    ]);
  };

  const ContextMenu = () =>
    h(Menu, [
      h(
        MenuItem,
        {
          text: "Add Unit Above",
          icon: "circle-arrow-up",
        },
        [h(SubMenu, { pos: UNIT_ADD_POISITON.ABOVE })]
      ),
      h(
        MenuItem,
        {
          text: "Add Unit Below",
          icon: "circle-arrow-down",
        },
        [h(SubMenu, { pos: UNIT_ADD_POISITON.BELOW })]
      ),
      h(MenuItem, {
        text: `Edit unit #${props.unit.id}`,
        icon: "annotation",
        onClick: () =>
          props.triggerEditor(UNIT_ADD_POISITON.EDIT, props.index, true),
      }),
      h(MenuDivider),
      h(MenuItem, {
        text: `Delete unit #${props.unit.id}`,
        icon: "trash",
        intent: "danger",
      }),
    ]);

  return h(
    Popover2,
    { content: h(ContextMenu), minimal: true, position: "left-top" },
    [h(Button, { minimal: true, icon: "more" })]
  );
}

interface EditModeI {
  mode: UNIT_ADD_POISITON;
  copy: boolean;
}

const useRowUnitEditor = () => {
  const [editOpen, setEditOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [editMode, setEditMode] = useState<EditModeI>({
    mode: UNIT_ADD_POISITON.EDIT,
    copy: true,
  });

  const triggerEditor = (e: UNIT_ADD_POISITON, i: number, copy: boolean) => {
    setIndex(i);
    setEditMode({ mode: e, copy });
    setEditOpen(true);
  };

  const onCancel = () => {
    setEditOpen(false);
  };

  const rowBorderStyles = !editOpen
    ? {}
    : editMode.mode == "edit"
    ? { background: "#0F996040" }
    : editMode.mode == "above"
    ? { borderTop: "solid #0F9960 3px" }
    : { borderBottom: "solid #0F9960 3px" };

  return {
    triggerEditor,
    index,
    editOpen,
    styles: rowBorderStyles,
    editMode,
    onCancel,
  };
};

export { UnitRowContextMenu, UNIT_ADD_POISITON, useRowUnitEditor };
