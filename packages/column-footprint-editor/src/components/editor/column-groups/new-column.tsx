import React from "react";
import {
  ModelEditor,
  useModelEditor,
  ModelEditButton,
  EditableMultilineText,
} from "@macrostrat/ui-components";
import { SaveButton } from "../../blueprint";
import axios from "axios";

function EditComponents() {
  const { actions } = useModelEditor();
  return (
    <div>
      <h4>
        Column-Group:
        {/* @ts-ignore */}
        <EditableMultilineText field="col_group" className="col_group" />
        Column-Group-Name:
        {/* @ts-ignore */}
        <EditableMultilineText
          field="col_group_name"
          className="col_group_name"
        />
      </h4>
      <SaveButton onClick={() => actions.persistChanges()} />
    </div>
  );
}

function NewColGroups(props) {
  const { onCreate } = props;
  let state = {
    col_group: "",
    col_group_name: "",
  };

  const persistChanges = async (updatedModel, changeset) => {
    console.log("changeset", changeset);
    console.log("updatedModel", updatedModel);
    let route = `http://0.0.0.0:8000/col-groups/post`;
    let res = await axios.post(route, { updatedModel });
    const {
      data: { col_group_id },
    } = res;
    const { col_group, col_group_name } = updatedModel;
    onCreate(col_group_id, col_group, col_group_name);
  };

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

export { NewColGroups };
