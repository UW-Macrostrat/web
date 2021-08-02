import React, { useState, useContext } from "react";
import {
  Dialog,
  InputGroup,
  FormGroup,
  Card,
  Button,
  Collapse,
} from "@blueprintjs/core";
import { useAPIResult } from "@macrostrat/ui-components";
import axios from "axios";

import { AppContext } from "../../context";
import { NewProject } from "./new-project";

const import_url = "http://0.0.0.0:8000/import";

// https://macrostrat.org/api/v2/defs/projects?all lists projects in macrostrat

function ProjectButtonCollapse(props) {
  const { project, onClick, onClickImport, text, id } = props;
  return (
    <div style={{ margin: "5px" }} key={project.project_id}>
      <Button key={project.project_id} onClick={onClick}>
        Project {project.project_id}
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
  const [id, setId] = useState(null);
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

  const onClickImport = (project) => {
    let data = {
      project_id: project.project_id,
      name: project.name,
      description: project.description,
    };

    axios.post(import_url, data);
  };

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
    </Card>
  );
}

function EditableProjects() {
  const { state, runAction } = useContext(AppContext);
  const [id, setId] = useState(null);

  let projectsUrl = "http://0.0.0.0:8000/projects";
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
  if (!data) return <div></div>;

  const onClick = (i) => {
    let id_ = data[i]["project_id"];
    if (id_ == id) {
      setId(null);
    } else {
      setId(data[i]["project_id"]);
    }
  };

  const changeProjectId = (id) => {
    runAction({ type: "change-project-id", payload: { project_id: id } });
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
            onClickImport={() => changeProjectId(project.project_id)}
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

  let isCloseButtonShown = state.project_id != null;

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
