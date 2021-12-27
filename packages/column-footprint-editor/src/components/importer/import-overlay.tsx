import React, { useState, useContext } from "react";
import {
  Dialog,
  Card,
  Button,
  Spinner,
  Icon,
  Divider,
} from "@blueprintjs/core";
import { useAPIResult } from "@macrostrat/ui-components";
import axios from "axios";

import { AppContext } from "../../context";
import { NewProject } from "./new-project";
import { base } from "../../context/env";
import { AboutPanel } from "./about-panel";
import { PanelStack } from "./panel-stack";

const import_url = base + "import";

// https://macrostrat.org/api/v2/defs/projects?all lists projects in macrostrat

function Project(props) {
  const { project, onClickImport, text } = props;
  return (
    <div style={{ margin: "5px" }} key={project.project_id}>
      <div>
        <h5>Project ID: {project.project_id}</h5>
        <h5>Project Name: {project.name}</h5>
        <p>Project Description: {project.description}</p>
        <Button onClick={() => onClickImport(project)} intent="primary">
          {text}
        </Button>
      </div>
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

function ImportableProjectPanel(props) {
  const { runAction } = useContext(AppContext);
  const [alert, setAlert] = useState(false);
  const [importing, setImporting] = useState(false);

  const { project } = props;

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
    <div>
      <Project project={project} onClickImport={onClickImport} text="import" />
      <Dialog isOpen={alert} className="import-feedback-dialog">
        <h4>{mainText}</h4>
        {visualComponent}
        <h5>{lowerText}</h5>{" "}
      </Dialog>
    </div>
  );
}

function ImportableProjects(props) {
  const projectData = getMacrostratProjects();

  if (!projectData) return <div></div>;

  const openNewPanel = (project) => {
    props.openPanel({
      props: {
        project,
      },
      renderPanel: ImportableProjectPanel,
      title: "Import " + project.name,
    });
  };

  return (
    <div>
      <h3>Projects Available for Import</h3>
      {projectData.map((project, i) => {
        return (
          <Button
            key={i}
            className="project-btns"
            onClick={() => openNewPanel(project)}
          >
            {project.name}
          </Button>
        );
      })}
    </div>
  );
}

function EditableProjects(props) {
  const { state, runAction } = useContext(AppContext);

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
  if (!data) return <div></div>;

  const openNewPanel = (project) => {
    props.openPanel({
      props: {
        project,
        onClickImport: () => changeProjectId(project),
        text: "Edit",
      },
      renderPanel: Project,
      title: "Edit " + project.name,
    });
  };

  const changeProjectId = (project) => {
    runAction({ type: "change-project", payload: project });
  };

  return (
    <div>
      <h3>Projects Available for Editing in Databse</h3>
      {data.map((project, i) => {
        return (
          <Button
            key={i}
            className="project-btns"
            onClick={() => openNewPanel(project)}
          >
            {project.name}
          </Button>
        );
      })}
    </div>
  );
}

enum MenuPanel {
  PROJECT,
  ABOUT,
}

function ImportPanels() {
  const [panel, setPanel] = useState<MenuPanel>(MenuPanel.PROJECT);

  const setProjects = () => {
    setPanel(MenuPanel.PROJECT);
  };
  const setAbout = () => {
    setPanel(MenuPanel.ABOUT);
  };
  return (
    <div>
      <div className="main-dialog-header">
        <Button
          rightIcon="send-to-graph"
          onClick={setProjects}
          minimal
          active={panel == MenuPanel.PROJECT}
        >
          Projects
        </Button>
        <Button
          rightIcon="info-sign"
          onClick={setAbout}
          minimal
          active={panel == MenuPanel.ABOUT}
        >
          About
        </Button>
      </div>
      <Divider />
      <PanelRender panel={panel} />
    </div>
  );
}

function PanelRender({ panel }) {
  const initialPanel = {
    props: {
      panelNumber: 1,
    },
    renderPanel: ProjectPanel,
    title: "Project Actions",
  };
  return (
    <div>
      {panel == MenuPanel.ABOUT ? (
        <AboutPanel />
      ) : (
        <PanelStack
          initialPanel={initialPanel}
          renderActivePanelOnly={false}
          className="panel-stack"
        />
      )}
    </div>
  );
}

function ProjectPanel(props) {
  return (
    <div>
      <EditableProjects {...props} />
      <ImportableProjects {...props} />
      <NewProject {...props} />
    </div>
  );
}

function ImportDialog(props) {
  const { state, runAction } = useContext(AppContext);

  const isCloseButtonShown = state.project.project_id != null;

  const onClose = () => {
    runAction({ type: "import-overlay", payload: { open: false } });
  };

  return (
    <Dialog
      isOpen={state.importOverlayOpen}
      isCloseButtonShown={isCloseButtonShown}
      canOutsideClickClose={isCloseButtonShown}
      canEscapeKeyClose={isCloseButtonShown}
      onClose={onClose}
    >
      <Card>
        <div className="btn-holder">
          <Button
            rightIcon="cross"
            minimal={true}
            intent="danger"
            onClick={onClose}
            disabled={!isCloseButtonShown}
          />
        </div>
        <ImportPanels />
      </Card>
    </Dialog>
  );
}

export { ImportDialog };
