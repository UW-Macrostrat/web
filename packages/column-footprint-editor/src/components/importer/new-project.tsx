import React, { useState, useContext } from "react";
import {
  Button,
  InputGroup,
  FormGroup,
  EditableText,
  Spinner,
  Icon,
  Dialog,
  Collapse,
} from "@blueprintjs/core";
import axios from "axios";
import { AppContext } from "../../context";
import { base } from "../../context/env";

function NewProject(props) {
  const openNewPanel = () => {
    props.openPanel({
      renderPanel: NewProjectFormPanel,
      title: "Create New Project",
    });
  };
  return (
    <div>
      <h3>Create a New Project</h3>
      <Button onClick={openNewPanel} intent="primary">
        Create
      </Button>
    </div>
  );
}

function NewProjectFormPanel(props) {
  const { state, runAction } = useContext(AppContext);
  const [alert, setAlert] = useState(false);
  const [importing, setImporting] = useState(false);
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

  const onSubmit = async () => {
    const data = { data: project };
    let url = base + "projects";
    setAlert(true);
    setImporting(true);
    const res = await axios.post(url, data);
    if (res.status == 200) {
      setImporting(false);
      setTimeout(() => {
        setAlert(false);
        runAction({
          type: "change-project",
          payload: {
            project_id: res.data.project_id,
            name: project.name,
            description: project.description,
          },
        });
      }, 2000);
    }
  };
  let mainText = importing ? "Creating New Project" : "Finished!";
  let visualComponent = importing ? (
    <Spinner />
  ) : (
    <Icon icon="tick" intent="success" size={55} />
  );
  let lowerText = importing
    ? "This may take a minute.."
    : "Wait to be redirected";
  return (
    <div style={{ marginTop: "15px", padding: "5px" }}>
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
        <Button onClick={() => props.closePanel()} intent="danger">
          Cancel
        </Button>
        <Button onClick={onSubmit} intent="success">
          Create Project
        </Button>
      </div>
      <Dialog isOpen={alert} className="import-feedback-dialog">
        <h4>{mainText}</h4>
        {visualComponent}
        <h5>{lowerText}</h5>{" "}
      </Dialog>
    </div>
  );
}

export { NewProject };
