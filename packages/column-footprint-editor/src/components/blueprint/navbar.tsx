import React, { useContext } from "react";
import { DownloadButton } from ".";
import { Button, Navbar, Popover, Divider } from "@blueprintjs/core";
import { AppContext } from "../../context";
import { useAPIResult } from "@macrostrat/ui-components";
import { MapColLegend, AddKnownGeom } from "../map/map-pieces";
import * as Constants from "@mapbox/mapbox-gl-draw/src/constants";
import axios from "axios";

const import_url = "http://0.0.0.0:8000/import";
const projects_url = "http://0.0.0.0:8000/projects";

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

function MapToolBar(props) {
  const { columns, editMode, draw, addToChangeSet } = props;

  const addGeomToDraw = (geom) => {
    let feature = draw.add(geom);

    const obj = {
      action: "draw.create",
      feature: { id: feature[0], geometry: geom },
    };

    addToChangeSet(obj);
  };

  return (
    <Navbar className="toolbar">
      <Navbar.Group>
        <Navbar.Heading>Tool Bar</Navbar.Heading>
        {editMode ? (
          <AddKnownGeom addGeom={addGeomToDraw} />
        ) : (
          <MapColLegend columns={columns} />
        )}
      </Navbar.Group>
    </Navbar>
  );
}

function MapNavBar(props) {
  const {
    onSave,
    addToChangeSet,
    onCancel,
    enterEditMode,
    enterPropertyMode,
    editMode,
    project_id,
    legendColumns,
    draw,
  } = props;
  const { state, runAction } = useContext(AppContext);

  let projects = useAPIResult(
    projects_url,
    {},
    { unwrapResponse: unwrapProjects }
  );
  if (!projects) return <div></div>;

  return (
    <div className="navbar-layout">
      <Navbar>
        <Navbar.Group>
          <Navbar.Heading>
            <Popover
              content={<ProjectDropDown projects={projects} />}
              position="bottom"
              minimal={true}
            >
              <Button minimal={true}>
                <b>{state.project.name}</b>
              </Button>
            </Popover>
          </Navbar.Heading>
          <Navbar.Divider />
          <DownloadButton project_id={project_id} />
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
      <MapToolBar
        columns={legendColumns}
        editMode={editMode}
        addToChangeSet={addToChangeSet}
        draw={draw}
      />
    </div>
  );
}

export { MapNavBar };
