import React, { useContext } from "react";
import { DownloadButton } from ".";
import { Button, Navbar, Popover, Divider } from "@blueprintjs/core";
import { AppContext } from "../../context";
import { useAPIResult } from "@macrostrat/ui-components";
import { base } from "../../context/env";
import { MAP_MODES } from "../map/mapgl";

const projects_url = base + "projects";

function unwrapProjects(res) {
  if (res.data) {
    const { data } = res;
    let projects = data.map((project) => {
      return {
        project_id: project.project_id,
        name: project.name,
        description: project.description,
      };
    });
    return projects;
  } else {
    return [];
  }
}

function ProjectDropDown(props) {
  const { projects } = props;
  const { state, runAction } = useContext(AppContext);

  const changeProjectId = (project) => {
    runAction({ type: "change-project", payload: project });
  };

  const openImportOverlay = () => {
    runAction({ type: "import-overlay", payload: { open: true } });
  };

  return (
    <div>
      <div className="projects-drop-down">
        {projects.map((project) => {
          const { project_id: id, name } = project;
          let iconName = id == state.project.project_id ? "tick" : null;
          return (
            <Button
              key={id}
              fill={true}
              minimal={true}
              onClick={() => changeProjectId(project)}
              intent="primary"
              rightIcon={iconName}
            >
              {name}
            </Button>
          );
        })}
      </div>
      <div className="projects-drop-more">
        <Divider />
        <Button minimal={true} onClick={openImportOverlay}>
          More...
        </Button>
      </div>
    </div>
  );
}

function NavBarModeBtns(props: {
  changeMode: (mode: MAP_MODES) => void;
  mode: MAP_MODES;
}) {
  const { changeMode, mode } = props;

  return (
    <React.Fragment>
      <Button
        minimal={true}
        active={mode == MAP_MODES.voronoi}
        onClick={() => changeMode(MAP_MODES.voronoi)}
      >
        Tesselate
      </Button>
      <Button
        minimal={true}
        active={mode == MAP_MODES.topology}
        onClick={() => changeMode(MAP_MODES.topology)}
      >
        Edit Topology
      </Button>
      <Button
        minimal={true}
        active={mode == MAP_MODES.properties}
        onClick={() => changeMode(MAP_MODES.properties)}
      >
        View / Edit Properties
      </Button>
    </React.Fragment>
  );
}

interface NavBarSaveBtnsProps {
  onSave: () => void;
  onCancel: () => void;
  mode: MAP_MODES;
  project_id: number | null;
  polygons?: object[];
  changeSet?: object[];
}

function NavBarSaveBtns(props: NavBarSaveBtnsProps) {
  const {
    onSave,
    onCancel,
    project_id,
    mode,
    polygons = [],
    changeSet = [],
  } = props;

  const disabled =
    (mode == MAP_MODES.voronoi && !polygons.length) ||
    (mode == MAP_MODES.topology && !changeSet.length);
  return (
    <div className="nav-btn">
      <Button
        minimal={true}
        intent="success"
        onClick={onSave}
        disabled={disabled}
      >
        {mode == MAP_MODES.voronoi ? "Save Tesselation" : "Save"}
      </Button>
      <Button minimal={true} intent="danger" onClick={onCancel}>
        Cancel
      </Button>
      <DownloadButton project_id={project_id} />
    </div>
  );
}

interface MapNavBarProps {
  onSave: () => void;
  onCancel: () => void;
  changeMode: (mode: MAP_MODES) => void;
  mode: MAP_MODES;
  project_id: number | null;
  polygons: object[];
  changeSet: object[];
}

function MapNavBar(props: MapNavBarProps) {
  const { onSave, onCancel, mode, changeMode, project_id, ...rest } = props;
  const { state, runAction } = useContext(AppContext);

  const openImportOverlay = () => {
    runAction({ type: "import-overlay", payload: { open: true } });
  };

  let projects = useAPIResult(
    projects_url,
    {},
    { unwrapResponse: unwrapProjects }
  );
  if (!projects) return <div></div>;

  return (
    <div className="navbar-layout">
      <Navbar style={{ position: "absolute", top: 0, left: 0 }}>
        <div className="nav-contents">
          <div className="nav-left">
            <Navbar.Heading>
              <Button minimal={true} onClick={openImportOverlay}>
                <h2 style={{ margin: 0 }}>BirdsEye</h2>
              </Button>
            </Navbar.Heading>
            <Navbar.Divider />
            <Navbar.Heading>
              <Popover
                content={<ProjectDropDown projects={projects} />}
                position="bottom"
                minimal={true}
              >
                <Button minimal={true}>
                  <h3 style={{ margin: 0 }}>Project: {state.project.name}</h3>
                </Button>
              </Popover>
            </Navbar.Heading>
          </div>
          <div className="nav-right">
            <NavBarModeBtns mode={mode} changeMode={changeMode} />
            <Navbar.Divider />
            <NavBarSaveBtns
              mode={mode}
              project_id={project_id}
              onSave={onSave}
              onCancel={onCancel}
              {...rest}
            />
          </div>
        </div>
      </Navbar>
    </div>
  );
}

export { MapNavBar };
