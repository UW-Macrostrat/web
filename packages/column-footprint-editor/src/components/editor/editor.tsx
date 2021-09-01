import React, { createContext, useContext, useReducer, useEffect } from "react";
import { Overlay, Button, Card, Navbar, FormGroup } from "@blueprintjs/core";
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

function ColumnNavBar() {
  const { model, isEditing, hasChanges, actions } = useModelEditor();

  const buttonText = isEditing ? "Cancel" : "Edit";
  const buttonIntent = isEditing ? "danger" : "success";

  return (
    <Navbar>
      <Navbar.Group>
        Column ID: {model.col_id}
        <Navbar.Divider />
        Project ID: {model.project_id}
        <Navbar.Divider />
        <SaveButton
          minimal={true}
          disabled={!isEditing && !hasChanges()}
          onClick={() => {
            actions.toggleEditing();
            actions.persistChanges();
          }}
        ></SaveButton>
        <ModelEditButton intent={buttonIntent} minimal={true}>
          {buttonText}
        </ModelEditButton>
      </Navbar.Group>
    </Navbar>
  );
}

function ColumnName() {
  const { model, isEditing, actions } = useModelEditor();

  const { col_name } = model;

  if (isEditing) {
    return (
      <div className="edit-with-label">
        <h4 className="h4-0">col_name: </h4>{" "}
        <h4>
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

function FeatureOverlay({ feature, open }) {
  const { model, isEditing, actions } = useModelEditor();

  return (
    <div>
      <ColumnNavBar />
      <ColumnName />
      <ColumnGroup />
    </div>
  );
}

function PropertyDialog(props) {
  const { features, open, closeOpen } = props;
  const { state: appState, runAction, updateLinesAndColumns } = useContext(
    AppContext
  );
  const feature = features[0];
  if (!feature) return null;

  const {
    col_group,
    col_group_name,
    col_group_id,
    col_id,
    col_name,
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
    identity_id,
  };

  const put_url = `http://0.0.0.0:8000/${state.project_id}/property_updates`;

  const persistChanges = async (updatedModel, changeset) => {
    console.log("changeset", changeset);
    console.log("updatedModel", updatedModel);
    if (Object.keys(changeset).length > 0) {
      runAction({ type: "is-saving", payload: { isSaving: true } });
      AppToaster.show({
        message: <SavingToast />,
        intent: "primary",
      });
      try {
        const res = await axios.put(
          put_url,
          { updatedModel },
          { headers: { "Access-Control-Allow-Origin": "*" } }
        );
        AppToaster.show({
          message: <SuccessfullySaved />,
          intent: "success",
          timeout: 3000,
        });
        updateLinesAndColumns(state.project_id);
        runAction({ type: "is-saving", payload: { isSaving: false } });
      } catch {
        AppToaster.show({
          message: <BadSaving />,
          intent: "danger",
          timeout: 5000,
        });
        updateLinesAndColumns(state.project_id);
        runAction({ type: "is-saving", payload: { isSaving: false } });
      }
    }
  };

  return (
    <ModelEditor
      model={state}
      canEdit={true}
      isEditing={false}
      persistChanges={persistChanges}
    >
      <OverlayBox open={open} closeOpen={closeOpen}>
        <FeatureOverlay feature={state} open={open} />
      </OverlayBox>
    </ModelEditor>
  );
}

export { PropertyDialog };
