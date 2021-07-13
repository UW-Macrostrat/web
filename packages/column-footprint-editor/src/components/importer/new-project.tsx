import React, { useState, useCallback } from "react";
import {
  Button,
  InputGroup,
  FormGroup,
  EditableText,
  Card,
  Collapse,
} from "@blueprintjs/core";
import axios from "axios";

function NewProject() {
  const [open, setOpen] = useState(false);
  const [project, setProject] = useState({
    name: "",
    description: "",
  });

  const setName = (e) => {
    const state = { ...project };
    setProject({ name: e.target.value, description: state.description });
  };
  const setDescription = (e) => {
    const state = { ...project };

    setProject({ name: state.name, description: e });
  };

  const onSubmit = () => {};

  return (
    <Card>
      <h3>Create a New Project</h3>
      {!open ? (
        <Button onClick={() => setOpen(true)} intent="primary">
          Create
        </Button>
      ) : null}
      <Collapse isOpen={open}>
        <FormGroup label="Project Name">
          <InputGroup value={project.name} onChange={setName} />
        </FormGroup>
        <FormGroup label="Project Description">
          <EditableText
            multiline={true}
            placeholder="Add a project description"
            value={project.description}
            onChange={setDescription}
          />
        </FormGroup>
        <div>
          <Button onClick={() => setOpen(false)} intent="danger">
            Cancel
          </Button>
          <Button onClick={onSubmit} intent="success">
            Create Project
          </Button>
        </div>
      </Collapse>
    </Card>
  );
}

export { NewProject };
