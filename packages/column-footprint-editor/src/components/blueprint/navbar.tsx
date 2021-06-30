import React from "react";
import { DownloadButton } from ".";
import { Button, Navbar } from "@blueprintjs/core";
import axios from "axios";

const import_url = "http://0.0.0.0:8000/import";

function MapNavBar(props) {
  const {
    onSave,
    onCancel,
    enterEditMode,
    enterPropertyMode,
    editMode,
    columns,
  } = props;

  const onClickImport = () => {
    // const url =
    //   "https://macrostrat.org/api/v2/columns?project_id=10&format=geojson_bare&status_code=in%20process";
    // axios.post(import_url, { url, project_id: 10 });
  };

  return (
    <Navbar>
      <Navbar.Group>
        <Navbar.Heading>
          <Button minimal={true} onClick={onClickImport}>
            <b>Project 10</b>
          </Button>
        </Navbar.Heading>
        <Navbar.Divider />
        <DownloadButton columns={columns} />
        <Button minimal={true} intent="success" onClick={onSave}>
          Save
        </Button>
        <Button minimal={true} intent="danger" onClick={onCancel}>
          Cancel
        </Button>
        <Navbar.Divider />
        <Button minimal={true} active={editMode} onClick={enterEditMode}>
          Topology Edit Mode
        </Button>
        <Button minimal={true} active={!editMode} onClick={enterPropertyMode}>
          Property View Mode
        </Button>
        <Navbar.Divider />
        Total Area: 5000 sq miles?
      </Navbar.Group>
    </Navbar>
  );
}

export { MapNavBar };
