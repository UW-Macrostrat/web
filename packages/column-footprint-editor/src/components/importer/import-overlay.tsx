import React, { useState, useContext } from "react";
import { Dialog, InputGroup, FormGroup, Card, Button } from "@blueprintjs/core";
import axios from "axios";

import { AppContext } from "../../context";

const import_url = "http://0.0.0.0:8000/import";

function ImportDialog(props) {
  const { open } = props;

  const { state, runAction, state_reducer } = useContext(AppContext);

  const { project_id } = state;

  const changeProjectId = (id) => {
    runAction({ type: state_reducer.PROJECT_ID, payload: { project_id: id } });
  };

  const onClickImport = () => {
    const url =
      "https://macrostrat.org/api/v2/columns?project_id=10&format=geojson_bare&status_code=in%20process";

    axios.post(import_url, { url, project_id: 10 });
  };
  return (
    <Dialog isOpen={open} title="Choose a Project">
      <Card>
        Hello! Please choose a project to edit, or import a new project!
      </Card>
      <Button onClick={() => changeProjectId(1)}>Project 1</Button>
      <Button onClick={() => changeProjectId(10)}>Project 10</Button>
      <FormGroup label="Project ID">
        <InputGroup />
      </FormGroup>
      <Button onClick={onClickImport}>Import!</Button>
    </Dialog>
  );
}

export { ImportDialog };
