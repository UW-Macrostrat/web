import React, { useContext } from "react";
import { Navbar, Popover } from "@blueprintjs/core";
import { OverlayBox, SaveButton } from "../blueprint";
import {
  ModelEditor,
  useModelEditor,
  ModelEditButton,
  EditableMultilineText,
} from "@macrostrat/ui-components";
import axios from "axios";
import { AppContext } from "../../context";

import {
  AppToaster,
  SavingToast,
  SuccessfullySaved,
  BadSaving,
} from "../blueprint";

import "./main.css";

import { TwoIdentities } from "./two-identities";
import { ColumnGroup } from "./column-groups";
import { base } from "../../context/env";

const canSave = (model): boolean => {
  const { col_name = null, description = null, col_group_name = null } = model;
  if (col_name && description && col_group_name) return true;
  return false;
};

function ColumnNavBar({ onMouseDown }) {
  const { state: appState, runAction, updateLinesAndColumns } = useContext(
    AppContext
  );
  const { model, isEditing, hasChanges, actions, ...rest } = useModelEditor();

  const buttonText = isEditing ? "Cancel" : "Edit";
  const buttonIntent = isEditing ? "danger" : "success";

  const put_url = base + `projects`;

  const persist = async (updatedModel = model) => {
    if (Object.keys(updatedModel).length > 0) {
      runAction({ type: "is-saving", payload: { isSaving: true } });
      AppToaster.show({
        message: <SavingToast />,
        intent: "primary",
      });
      try {
        const res = await axios.put(put_url, {
          updatedModel,
          project_id: model.project_id,
        });
        AppToaster.show({
          message: <SuccessfullySaved />,
          intent: "success",
          timeout: 3000,
        });
        updateLinesAndColumns(model.project_id);
        runAction({ type: "is-saving", payload: { isSaving: false } });
        return res.data.project;
      } catch {
        AppToaster.show({
          message: <BadSaving />,
          intent: "danger",
          timeout: 5000,
        });
        updateLinesAndColumns(model.project_id);
        runAction({ type: "is-saving", payload: { isSaving: false } });
      }
    }
  };

  return (
    <div className="column-nav-bar" onMouseDown={onMouseDown}>
      <Navbar>
        <div className="column-nav-container">
          <div style={{ display: "flex", alignItems: "center" }}>
            Column ID: {model.col_id}
            <Navbar.Divider />
            Project ID: {model.project_id}
          </div>
          <div>
            <SaveButton
              minimal={true}
              disabled={!isEditing || !canSave(model)}
              onClick={async () => {
                const project = await persist();
                actions.updateState({ model: { $set: project } });
                actions.toggleEditing();
              }}
            ></SaveButton>
            <ModelEditButton intent={buttonIntent} minimal={true}>
              {buttonText}
            </ModelEditButton>
          </div>
        </div>
      </Navbar>
    </div>
  );
}

function ColumnName() {
  const { model, isEditing, actions } = useModelEditor();
  const { col_name } = model;

  if (isEditing) {
    return (
      <div className="edit-with-label">
        <h4 className="h4-0">col_name: </h4>{" "}
        <h4 className="h4-0">
          <EditableMultilineText field="col_name" className="column_name" />
        </h4>
      </div>
    );
  }
  return (
    <div>
      <h4>Column Name: {col_name}</h4>
    </div>
  );
}

function ColumnDescription() {
  const { model, isEditing, actions } = useModelEditor();
  let { description = "No description" } = model;

  if (isEditing) {
    return (
      <div className="edit-with-label">
        <h4 className="h4-0">Description: </h4>{" "}
        <h4 className="h4-0">
          <EditableMultilineText
            field="description"
            className="column_description"
          />
        </h4>
      </div>
    );
  }
  return (
    <div>
      <h4>Description: {description}</h4>
    </div>
  );
}

function FeatureOverlay({ feature, open }) {
  return (
    <div>
      <ColumnName />
      <ColumnDescription />
      <ColumnGroup />
    </div>
  );
}

function PropertyDialog(props) {
  const { features, open, closeOpen } = props;
  const { state: appState } = useContext(AppContext);
  const feature = features[0];
  if (!feature) return null;
  console.log(feature);
  const {
    col_group,
    col_group_name,
    col_group_id,
    col_id,
    col_name,
    description,
    color,
    id: identity_id,
  } = feature["properties"];

  let state = {
    col_group,
    col_group_name,
    col_group_id,
    project_id: appState.project.project_id,
    location: feature.geometry,
    col_id,
    col_name,
    color,
    description,
    identity_id,
  };

  console.log(feature);

  return (
    <ModelEditor
      model={state}
      canEdit={true}
      isEditing={false}
      persistChanges={() => {}}
    >
      <OverlayBox
        open={open}
        closeOpen={closeOpen}
        HeaderComponent={ColumnNavBar}
      >
        <FeatureOverlay feature={state} open={open} />
      </OverlayBox>
    </ModelEditor>
  );
}

export { PropertyDialog };
