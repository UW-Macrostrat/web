import React, { useContext, useEffect, useState } from "react";
import {
  ModelEditor,
  useModelEditor,
  ModelEditButton,
  EditableMultilineText,
} from "@macrostrat/ui-components";
import { Popover2 } from "@blueprintjs/popover2";
import { SaveButton } from "../../blueprint";
import axios from "axios";
import { ChromePicker } from "react-color";

import { AppContext } from "../../../context";
import { base } from "../../../context/env";

function ColorPicker() {
  const { model, isEditing, actions } = useModelEditor();
  const { color } = model;

  const onChangeColor = (color) => {
    const { hex } = color;
    actions.updateState({ model: { color: { $set: hex } } });
  };

  if (!isEditing) return <div />;
  return (
    <div>
      <Popover2
        content={
          <ChromePicker onChangeComplete={onChangeColor} color={color} />
        }
      >
        <div className="color-block" style={{ backgroundColor: color }}></div>
      </Popover2>
    </div>
  );
}

function EditComponents() {
  const { actions } = useModelEditor();
  return (
    <div>
      <div className="edit-with-label">
        <h4 className="h4-0">Column-Group: </h4>
        <h4 className="h4-0">
          {/* @ts-ignore */}
          <EditableMultilineText field="col_group" className="col_group" />
        </h4>
      </div>
      <div className="edit-with-label">
        <h4 className="h4-0">Column-Group-Name:</h4>
        <h4 className="h4-0">
          {/* @ts-ignore */}
          <EditableMultilineText
            field="col_group_name"
            className="col_group_name"
          />
        </h4>
      </div>
      <ColorPicker />
      <SaveButton onClick={() => actions.persistChanges()} />
    </div>
  );
}

function NewColGroups(props) {
  const { onCreate } = props;
  let state = {
    col_group: "",
    col_group_name: "",
    color: "",
  };

  const { state: appState } = useContext(AppContext);
  const project_id = appState.project.project_id;

  const persistChanges = async (updatedModel, changeset) => {
    let route = base + `${project_id}/col-groups`;
    let res = await axios.post(route, { updatedModel });
    const {
      data: { col_group_id },
    } = res;
    const { col_group, col_group_name } = updatedModel;
    onCreate(col_group_id, col_group, col_group_name);
  };

  return <BaseColGroupEditor state={state} persistChanges={persistChanges} />;
}

function EditColGroup(props) {
  const { onCreate, state } = props;

  const { state: appState } = useContext(AppContext);
  const project_id = appState.project.project_id;

  const persistChanges = async (updatedModel, changeset) => {

    let route = base + `${project_id}/col-groups`;
    let res = await axios.put(route, { updatedModel });
    const {
      data: { col_group_id },
    } = res;
    const { col_group, col_group_name } = updatedModel;
    onCreate(col_group_id, col_group, col_group_name);
  };

  return <BaseColGroupEditor state={state} persistChanges={persistChanges} />;
}

function BaseColGroupEditor(props) {
  const { state, persistChanges } = props;

  return (
    <ModelEditor
      model={state}
      canEdit={true}
      isEditing={true}
      persistChanges={persistChanges}
    >
      <EditComponents />
    </ModelEditor>
  );
}

export { NewColGroups, EditColGroup };
