import React, { useContext } from "react";
import { Navbar, InputGroup, FormGroup, TextArea } from "@blueprintjs/core";
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

import { ColumnGroup } from "./column-groups";
import { base } from "../../context/env";

const canSave = (model): boolean => {
  const { col_name = null, description = null, col_group_name = null } = model;
  if (col_name && description && col_group_name) return true;
  return false;
};

function ColumnNavBar({ onMouseDown }) {
  const { model, isEditing, hasChanges, actions, ...rest } = useModelEditor();

  const buttonText = isEditing ? "Cancel" : "Edit";
  const buttonIntent = isEditing ? "danger" : "success";

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
                actions.persistChanges();
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

  const updateName = (name) => {
    actions.updateState({
      model: { col_name: { $set: name.target.value } },
    });
  };

  if (isEditing) {
    return (
      <FormGroup label="Column name">
        <InputGroup onChange={updateName} value={col_name} />
      </FormGroup>
    );
  }
  return <div className="column-name-text">{col_name}</div>;
}

function ColumnDescription() {
  const { model, isEditing, actions } = useModelEditor();
  let { description = "No description" } = model;

  const updateDescription = (e) => {
    actions.updateState({
      model: { description: { $set: e.target.value } },
    });
  };

  if (isEditing) {
    return (
      <FormGroup label="Column description">
        <TextArea onChange={updateDescription} value={description} />
      </FormGroup>
    );
  }
  return <div className="description-text">{description}</div>;
}

function FeatureOverlay({ feature, open }) {
  return (
    <div className="editor-overlay">
      <ColumnName />
      <ColumnGroup />
      <ColumnDescription />
    </div>
  );
}

function PropertyDialog(props) {
  const {
    state: appState,
    runAction,
    updateLinesAndColumns,
  } = useContext(AppContext);
  const { features, open, closeOpen, setFeatures } = props;
  const feature = features[0];
  if (!feature) return null;

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
    id: feature.id,
    col_group,
    col_group_name,
    col_group_id,
    project_id: appState.project.project_id,
    location: feature.geometry || feature.properties.location,
    col_id,
    col_name,
    color,
    description,
    identity_id,
  };
  const put_url = base + `projects`;

  const persistChanges = async (updatedModel, changeSet) => {
    console.log(updatedModel);
    if (Object.keys(updatedModel).length > 0) {
      runAction({ type: "is-saving", payload: { isSaving: true } });
      AppToaster.show({
        message: <SavingToast />,
        intent: "primary",
      });
      try {
        await axios.put(put_url, {
          updatedModel,
          project_id: updatedModel.project_id,
        });
        AppToaster.show({
          message: <SuccessfullySaved />,
          intent: "success",
          timeout: 3000,
        });
        updateLinesAndColumns(updatedModel.project_id);
        runAction({ type: "is-saving", payload: { isSaving: false } });
      } catch {
        AppToaster.show({
          message: <BadSaving />,
          intent: "danger",
          timeout: 5000,
        });
        updateLinesAndColumns(updatedModel.project_id);
        runAction({ type: "is-saving", payload: { isSaving: false } });
      }
    }
    const newFeature = { properties: updatedModel, id: updatedModel.id };
    newFeature.properties.id = newFeature.properties.identity_id;
    setFeatures([newFeature]);
  };

  return (
    <ModelEditor
      model={state}
      canEdit={true}
      isEditing={false}
      persistChanges={persistChanges}
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
