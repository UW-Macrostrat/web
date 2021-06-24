import React from "react";
import { DownloadButton } from ".";
import { Button, Navbar } from "@blueprintjs/core";

function MapNavBar(props) {
  const {
    onSave,
    onCancel,
    enterEditMode,
    enterPropertyMode,
    editMode,
    columns,
  } = props;

  return (
    <Navbar>
      <Navbar.Group>
        <Navbar.Heading>
          <b>Project 10</b>
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
