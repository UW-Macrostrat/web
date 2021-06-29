import React, { useState } from "react";
import { Dialog, InputGroup, FormGroup, Card, Button } from "@blueprintjs/core";
import axios from "axios";

const import_url = "http://0.0.0.0:8000/import";

function ImportDialog(props) {
  const { open } = props;

  const [project_id, setProject_id] = useState(null);

  const onClickImport = () => {
    const url =
      "https://macrostrat.org/api/v2/columns?project_id=10&format=geojson_bare&status_code=in%20process";

    axios.post(import_url, { url, project_id: 10 });
  };
  return (
    <Dialog isOpen={open} title="Import a Project">
      <Card>
        Hello! It looks like there is no project in the database! Please enter a
        Project ID to import the project of your choice
      </Card>
      <FormGroup label="Project ID">
        <InputGroup onChange={(e) => setProject_id(e.target.value)} />
      </FormGroup>
      <Button onClick={onClickImport}>Import!</Button>
    </Dialog>
  );
}

export { ImportDialog };
