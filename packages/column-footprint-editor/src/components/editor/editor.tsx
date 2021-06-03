import React, { createContext, useContext, useReducer, useEffect } from "react";
import { Overlay, Button, Card, Navbar, FormGroup } from "@blueprintjs/core";
import { OverlayBox, SaveButton } from "../blueprint";
import {
  APIHelpers,
  ModelEditor,
  useModelEditor,
  ModelEditButton,
  EditableMultilineText,
} from "@macrostrat/ui-components";
import axios from "axios";
import "./main.css";

import { TwoIdentities } from "./two-identities";

function ColumnNavBar() {
  const { model, isEditing, hasChanges, actions } = useModelEditor();

  const buttonText = isEditing ? "Cancel" : "Edit";
  const buttonIntent = isEditing ? "danger" : "success";

  return (
    <Navbar>
      <Navbar.Group>
        Column ID: {model.column_id}
        <Navbar.Divider />
        Project ID: {model.project_id}
        <Navbar.Divider />
        <SaveButton
          minimal={true}
          disabled={!isEditing && !hasChanges()}
          onClick={() => actions.persistChanges()}
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

  const { column_name } = model;

  if (isEditing) {
    return (
      <div>
        <h4>
          <EditableMultilineText field="column_name" className="column_name" />
        </h4>
      </div>
    );
  }
  return (
    <div>
      <h4>Column Name: {column_name}</h4>
    </div>
  );
}
function ColumnGroup() {
  const { model, isEditing, actions } = useModelEditor();

  const { group } = model;

  if (isEditing) {
    return (
      <h4>
        <EditableMultilineText field="group" className="column_name" />
      </h4>
    );
  }
  return (
    <div>
      <h4>Column Group: {group}</h4>
    </div>
  );
}

function FeatureOverlay({ feature }) {
  const { model, isEditing } = useModelEditor();

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

  const feature = features[0];
  if (!feature) return null;

  const featuress = [features[0], features[0]];

  if (featuress.length > 1) {
    return (
      <OverlayBox open={open} closeOpen={closeOpen}>
        <TwoIdentities features={featuress} />
      </OverlayBox>
    );
  }
  if (feature["properties"]["col_id"] == null) {
    let state = {
      group: null,
      project_id: null,
      column_id: null,
      column_name: null,
      identity_id: null,
    };
    return (
      <OverlayBox open={open} closeOpen={closeOpen}>
        <FeatureOverlay feature={state} />
      </OverlayBox>
    );
  }

  const {
    col_group: group,
    project_id,
    col_id: column_id,
    col_name: column_name,
    id: identity_id,
  } = features[0]["properties"];

  let state = {
    group,
    project_id: parseInt(project_id),
    column_id: parseInt(column_id),
    column_name,
    identity_id: parseInt(identity_id),
  };

  const put_url = "http://0.0.0.0:8000/property_updates";

  const persistChanges = async (updatedModel, changeset) => {
    console.log("changeset", changeset);
    console.log("updatedModel", updatedModel);
    const res = await axios.put(
      put_url,
      { updatedModel },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
    console.log(res);
  };

  return (
    <ModelEditor
      model={state}
      canEdit={true}
      isEditing={false}
      persistChanges={persistChanges}
    >
      <OverlayBox open={open} closeOpen={closeOpen}>
        <FeatureOverlay feature={state} />
      </OverlayBox>
    </ModelEditor>
  );
}

export { PropertyDialog };
