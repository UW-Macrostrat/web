import React, { useState, useContext } from "react";
import {
  Dialog,
  Card,
  Button,
  Collapse,
  Spinner,
  Icon,
} from "@blueprintjs/core";
import { useAPIResult } from "@macrostrat/ui-components";
import axios from "axios";

import { AppContext } from "../../context";
import { NewProject } from "./new-project";
import { base } from "../../context/env";

const import_url = base + "import";

// https://macrostrat.org/api/v2/defs/projects?all lists projects in macrostrat

function ProjectButtonCollapse(props) {
  const { project, onClick, onClickImport, text, id } = props;
  return (
    <div style={{ margin: "5px" }} key={project.project_id}>
      <Button key={project.project_id} onClick={onClick}>
        {project.name}
      </Button>
      <Collapse isOpen={project.project_id == id}>
        <div
          style={{
            borderStyle: "solid",
            borderRadius: "5px",
            borderWidth: "1px",
            padding: "5px",
          }}
        >
          <h5>Project ID: {project.project_id}</h5>
          <h5>Project Name: {project.name}</h5>
          <p>Project Description: {project.description}</p>
          <Button onClick={() => onClickImport(project)} intent="primary">
            {text}
          </Button>
        </div>
      </Collapse>
    </div>
  );
}

const getMacrostratProjects = () => {
  const url = "https://macrostrat.org/api/v2/defs/projects?all";

  const unwrapData = (res) => {
    if (res) {
      const data = res.success.data.map((project) => {
        const { project_id, project: name, descrip: description } = project;
        return { project_id, name, description };
      });
      return data;
    } else {
      return [];
    }
  };

  const data = useAPIResult(url, {}, { unwrapResponse: unwrapData });
  return data;
};

function ImportableProjects(props) {
  const { state, runAction } = useContext(AppContext);

  const [id, setId] = useState(null);
  const [alert, setAlert] = useState(false);
  const [importing, setImporting] = useState(false);
  const projectData = getMacrostratProjects();

  if (!projectData) return <div></div>;

  const onClick = (i) => {
    let id_ = projectData[i]["project_id"];
    if (id_ == id) {
      setId(null);
    } else {
      setId(projectData[i]["project_id"]);
    }
  };

  const onClickImport = async (project) => {
    let data = {
      project_id: project.project_id,
      name: project.name,
      description: project.description,
    };

    setAlert(true);
    setImporting(true);
    let res = await axios.post(import_url, data);
    // needs to have some more stuff here for feedback
    if (res.status == 200) {
      setImporting(false);
      setTimeout(() => {
        setAlert(false);
        runAction({ type: "change-project", payload: data });
      }, 2000);
    }
  };

  let mainText = importing ? "Importing Project" : "Finished!";
  let visualComponent = importing ? (
    <Spinner />
  ) : (
    <Icon icon="tick" intent="success" size={55} />
  );
  let lowerText = importing
    ? "This may take a minute.."
    : "Wait to be redirected";

  return (
    <Card>
      <h3>Projects Available for Import</h3>
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {projectData.map((project, i) => {
          return (
            <ProjectButtonCollapse
              key={i}
              project={project}
              onClick={() => onClick(i)}
              onClickImport={onClickImport}
              text="Import"
              id={id}
            />
          );
        })}
      </div>
      <Dialog isOpen={alert} className="import-feedback-dialog">
        <h4>{mainText}</h4>
        {visualComponent}
        <h5>{lowerText}</h5>{" "}
      </Dialog>
    </Card>
  );
}

function EditableProjects() {
  const { state, runAction } = useContext(AppContext);
  const [id, setId] = useState(null);

  let projectsUrl = base + "projects";
  const unwrapProjects = (res) => {
    const data = res.data.map((project) => {
      const { project_id, name, description } = project;
      return { project_id, name, description };
    });
    return data;
  };
  const data = useAPIResult(
    projectsUrl,
    {},
    { unwrapResponse: unwrapProjects }
  );
  console.log(data);
  if (!data) return <div></div>;

  const onClick = (i) => {
    let id_ = data[i]["project_id"];
    if (id_ == id) {
      setId(null);
    } else {
      setId(data[i]["project_id"]);
    }
  };

  const changeProjectId = (project) => {
    runAction({ type: "change-project", payload: project });
  };

  return (
    <Card>
      <h3>Projects Available for Editing in Databse</h3>
      {data.map((project, i) => {
        return (
          <ProjectButtonCollapse
            key={i}
            project={project}
            onClick={() => onClick(i)}
            onClickImport={() => changeProjectId(project)}
            text="Edit"
            id={id}
          />
        );
      })}
    </Card>
  );
}

function ImportDialog(props) {
  const { state, runAction } = useContext(AppContext);

  let isCloseButtonShown = state.project != null;

  const onClose = () => {
    runAction({ type: "import-overlay", payload: { open: false } });
  };

  return (
    <Dialog
      isOpen={state.importOverlayOpen}
      title="Choose a Project"
      isCloseButtonShown={isCloseButtonShown}
      onClose={onClose}
    >
      <EditableProjects />
      <ImportableProjects />
      <NewProject />
    </Dialog>
  );
}

export { ImportDialog };
