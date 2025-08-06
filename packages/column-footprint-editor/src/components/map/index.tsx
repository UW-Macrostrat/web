import React, { useRef, useEffect, useState, useContext } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "@blueprintjs/popover2/lib/css/blueprint-popover2.css";

import mapboxgl from "mapbox-gl";
import { AppContext, ChangeSetItem } from "../../context";
import { MapNavBar, AppToaster } from "../blueprint";
import { PropertyDialog } from "../editor";
import { ImportDialog } from "../importer";
import { locationFromHash } from "./utils";
import "./map.css";
import {
  initializeMap,
  propertyViewMap,
  editModeMap,
  MapToolsControl,
  voronoiModeMap,
} from "./map-pieces";
import { VoronoiToolBar } from "../voronoi/tool-bar";
import { MAP_MODES, VoronoiPoint } from "../../context";

import { mapboxAccessToken } from "@macrostrat-web/settings";

/**
 *
 * For delete point, feature.removeCoordinate()
 *
 *
 * For the "preview" mode. Add layer, fill will be based on property. Hover would be nice touch. Then popup
 *
 */

mapboxgl.accessToken = mapboxAccessToken;

export function Map() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef();
  const drawRef = useRef();
  const voronoiRef = useRef();

  const { state, runAction, updateLinesAndColumns } = useContext(AppContext);
  const { mode, changeSet } = state;

  const [viewport, setViewport] = useState(
    locationFromHash(window.location.hash)
  );
  const [legendColumns, setLegendColumns] = useState([]);
  const [open, setOpen] = useState(false);
  const [features, setFeatures] = useState([]);

  const closeOpen = () => {
    setFeatures([]);
    setOpen(false);
  };

  const changeMode = (mode: MAP_MODES) => {
    runAction({ type: "set-map-mode", mode });
  };

  const addToChangeSet = (obj: ChangeSetItem) => {
    runAction({ type: "add-to-changeset", item: obj });
  };

  const onSave = async () => {
    if (changeSet.length != 0 && mode != MAP_MODES.voronoi) {
      runAction({
        type: "save-changeset",
        changeSet: state.changeSet,
        project_id: state.project.project_id ?? 0,
      });
    } else if (mode == MAP_MODES.voronoi) {
      /// persist new polygons to db
      runAction({
        type: "save-voronoi",
        project_id: state.project.project_id ?? 0,
        voronoiState: state.voronoi,
      });
    }
  };

  const onCancel = () => {
    AppToaster.show({
      message: "Undoing all Changes...",
      intent: "warning",
      timeout: 1000,
    });
    updateLinesAndColumns(state.project.project_id);
  };

  useEffect(() => {
    if (mapContainerRef.current == null) return;
    initializeMap(
      mapContainerRef.current,
      viewport,
      addToChangeSet,
      setViewport
    ).then((mapObj) => {
      mapRef.current = mapObj;
    });
    return () => {
      mapRef.current?.remove();
    };
  }, [mapContainerRef]);

  useEffect(() => {
    if (mapRef.current == null) return;
    const edit = mode == MAP_MODES.topology;
    if (edit) {
      const map = mapRef.current;

      let draw = editModeMap(map, state);
      drawRef.current = draw;
      return () => {
        let map = mapRef.current;
        let Draw = drawRef.current;
        if (!map || !Draw || !edit) return;
        try {
          map.off("draw.update", map.switchToSimpleSelect);
          map.off("draw.delete", map.onDrawDelete);
          Draw.onRemove();
        } catch (error) {
          console.log(error);
        }
      };
    }
  }, [state.lines, mode, mapRef]);

  const addVoronoiPoint = (point: object) => {
    runAction({
      type: "fetch-voronoi-state",
      points: state.voronoi.points ?? [],
      point,
      project_id: state.project.project_id ?? 0,
      radius: state.voronoi.radius,
      quad_segs: state.voronoi.quad_seg,
    });
  };
  const moveVoronoiPoint = (point: VoronoiPoint) => {
    let filteredPoints = state.voronoi.points?.filter((p) => p.id != point.id);

    filteredPoints = filteredPoints ?? [];
    filteredPoints = [...filteredPoints, point];
    runAction({
      type: "fetch-voronoi-state",
      points: filteredPoints,
      point: null,
      project_id: state.project.project_id ?? 0,
      radius: state.voronoi.radius,
      quad_segs: state.voronoi.quad_seg,
    });
  };

  const deleteVoronoiPoint = (point: VoronoiPoint) => {
    const filteredPoints =
      state.voronoi.points?.filter((p) => p.id != point.id) ?? [];

    runAction({
      type: "fetch-voronoi-state",
      points: filteredPoints,
      point: null,
      project_id: state.project.project_id ?? 0,
      radius: state.voronoi.radius,
      quad_segs: state.voronoi.quad_seg,
    });
  };

  useEffect(() => {
    if (mapRef.current == null) return;
    const isVoronoiMode = mode == MAP_MODES.voronoi;
    if (isVoronoiMode) {
      const map = mapRef.current;
      let draw = voronoiModeMap(
        map,
        state.voronoi.polygons,
        state.voronoi.points,
        state.lines,
        addVoronoiPoint,
        moveVoronoiPoint,
        deleteVoronoiPoint
      );
      voronoiRef.current = draw;
      return () => {
        let map = mapRef.current;
        let Draw = voronoiRef.current;
        if (!map || !Draw || !isVoronoiMode) return;
        try {
          map.off("draw.create", map.addVoronoiPoint);
          map.off("draw.update", map.moveVoronoiPoint);
          map.off("draw.delete", map.deleteVoronoiPoint);
          Draw.onRemove();
        } catch (error) {
          console.log(error);
        }
      };
    }
  }, [
    mode,
    mapRef,
    state.voronoi.polygons,
    state.voronoi.quad_seg,
    state.voronoi.radius,
    state.lines,
  ]);

  useEffect(() => {
    if (mapRef.current == null) return;
    if (mode == MAP_MODES.properties) {
      propertyViewMap(
        mapRef.current,
        state,
        features,
        setFeatures,
        setOpen,
        setLegendColumns
      );
      return () => {
        var mapLayer = mapRef.current.getLayer("column-fill");
        if (typeof mapLayer !== "undefined") {
          mapRef.current.removeLayer("column-fill");
          mapRef.current.removeLayer("outline");
          mapRef.current.removeSource("columns");
        }
      };
    }
  }, [state.columns, mode, mapRef]);

  const mapToolsClassName =
    mode == MAP_MODES.topology
      ? "map-tools-control-left"
      : "map-tools-control-right";

  const addGeomToDraw = (geom) => {
    const draw = drawRef.current;
    if (typeof draw === "undefined") return;
    let feature = draw.add(geom);

    const obj = {
      action: "draw.create",
      feature: { type: "Feature", id: feature[0], geometry: geom },
    };

    addToChangeSet(obj);
  };

  return (
    <div>
      <ImportDialog />
      <div>
        <MapNavBar
          onSave={onSave}
          onCancel={onCancel}
          changeMode={changeMode}
          mode={mode}
          project_id={state.project.project_id}
          polygons={state.voronoi.polygons}
          changeSet={changeSet}
        />
      </div>
      <VoronoiToolBar
        runAction={runAction}
        quad_segs={state.voronoi.quad_seg}
        radius={state.voronoi.radius}
        mode={mode}
      />

      <div>
        <div className="map-container" ref={mapContainerRef} />
      </div>
      <div className={mapToolsClassName}>
        <MapToolsControl
          addGeomToDraw={addGeomToDraw}
          columns={legendColumns}
          editMode={mode == MAP_MODES.topology}
        />
      </div>
      {mode == MAP_MODES.topology ? null : (
        <div>
          <PropertyDialog
            open={open}
            features={features}
            setFeatures={setFeatures}
            closeOpen={closeOpen}
          />
        </div>
      )}
    </div>
  );
}

export const M = "Mapbobgl";
