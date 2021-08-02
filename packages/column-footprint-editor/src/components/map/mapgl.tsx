import "regenerator-runtime/runtime";
import React, { useRef, useEffect, useState, useContext } from "react";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

import mapboxgl from "mapbox-gl";
import axios from "axios";

import { AppContext } from "../../context";

import {
  SnapLineClosed,
  MultVertDirectSelect,
  MultVertSimpleSelect,
  DrawPolygon,
} from "./modes";

import {
  MapNavBar,
  AppToaster,
  SavingToast,
  SuccessfullySaved,
  BadSaving,
} from "../blueprint";
import { PropertyDialog } from "../editor";
import { ImportDialog } from "../importer";

import { SnapModeDrawStyles } from "mapbox-gl-draw-snap-mode";
import { setWindowHash, locationFromHash } from "./utils";
import "./map.css";
import { initializeMap, propertyViewMap, editModeMap } from "./map-pieces";

/**
 *
 * For delete point, feature.removeCoordinate()
 *
 *
 * For the "preview" mode. Add layer, fill will be based on property. Hover would be nice touch. Then popup
 *
 */

mapboxgl.accessToken =
  "pk.eyJ1IjoidGhlZmFsbGluZ2R1Y2siLCJhIjoiY2tsOHAzeDZ6MWtsaTJ2cXhpMDAxc3k5biJ9.FUMK57K0UP7PSrTUi3DiFQ";

export function Map() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef();

  const { state, runAction, updateLinesAndColumns } = useContext(AppContext);
  console.log(state);

  const [viewport, setViewport] = useState(
    locationFromHash(window.location.hash)
  );

  const [edit, setEdit] = useState(false);

  const [open, setOpen] = useState(false);
  const [features, setFeatures] = useState([]);

  const closeOpen = () => {
    setOpen(false);
  };

  const [changeSet, setChangeSet] = useState([]);

  const onSave = async (e) => {
    // can do cleaning on changeSet by the internal id string.
    // Combine like edits so I'm not running a million
    // transactions on the db.
    runAction({ type: "is-saving", payload: { isSaving: true } });

    AppToaster.show({
      message: <SavingToast />,
      intent: "primary",
    });
    if (changeSet.length != 0) {
      try {
        let url = `http://0.0.0.0:8000/${state.project_id}/updates`;
        const res = await axios.put(url, { change_set: changeSet });
        AppToaster.show({
          message: <SuccessfullySaved />,
          intent: "success",
          timeout: 3000,
        });
        updateLinesAndColumns(state.project_id);
        runAction({ type: "is-saving", payload: { isSaving: false } });
      } catch (error) {
        AppToaster.show({
          message: <BadSaving />,
          intent: "danger",
          timeout: 5000,
        });
        updateLinesAndColumns(state.project_id);
        runAction({ type: "is-saving", payload: { isSaving: false } });
      }
      setChangeSet([]);
    }
  };

  const onCancel = () => {
    AppToaster.show({
      message: "Undoing all Changes...",
      intent: "warning",
      timeout: 1000,
    });
    setChangeSet([]);
    updateLinesAndColumns(state.project_id);
  };

  useEffect(() => {
    if (mapContainerRef.current == null) return;
    initializeMap(
      mapContainerRef.current,
      viewport,
      setChangeSet,
      setViewport
    ).then((mapObj) => {
      mapRef.current = mapObj;
    });
    return () => {
      mapRef.current.remove();
    };
  }, [mapContainerRef]);

  useEffect(() => {
    if (mapRef.current == null) return;
    if (edit) {
      const map = mapRef.current;

      var Draw = new MapboxDraw({
        controls: { point: false },
        modes: Object.assign(
          {
            direct_select: MultVertDirectSelect,
            simple_select: MultVertSimpleSelect,
            draw_polygon: DrawPolygon,
          },
          MapboxDraw.modes,
          { draw_line_string: SnapLineClosed }
        ),
        styles: SnapModeDrawStyles,
        snap: true,
        snapOptions: {
          snapPx: 25,
        },
      });

      map.addControl(Draw, "top-left");

      var featureIds = Draw.add(state.lines);

      map.on("click", async function(e) {
        console.log("Mode", Draw.getMode());
      });

      map.on("draw.create", async function(e) {
        console.log("created new feature!");
        const { type: action, features } = e;

        features.map((feature) => {
          const obj = { action, feature };
          map.addToChangeSet(obj);
        });
      });

      map.on("draw.delete", async function(e) {
        console.log("Deleted a Feature");
        const { type: action, features } = e;

        features.map((feature) => {
          console.log("Deleteing", feature);
          const obj = { action, feature };
          map.addToChangeSet(obj);
        });
      });

      // use the splice to replace coords
      // This needs to account for deleteing nodes. That falls under change_coordinates
      map.on("draw.update", async function(e) {
        console.log(e);
        Draw.changeMode("simple_select");
      });
      return () => {
        let map = mapRef.current;
        if (!map || !Draw || !edit) return;
        try {
          Draw.onRemove();
        } catch (error) {
          console.log(error);
        }
      };
    }
  }, [state.lines, edit, mapRef]);

  useEffect(() => {
    if (mapRef.current == null) return;
    if (!edit) {
      propertyViewMap(mapRef.current, state, setFeatures, setOpen);
      return () => {
        var mapLayer = mapRef.current.getLayer("column-fill");
        if (typeof mapLayer !== "undefined") {
          mapRef.current.removeLayer("column-fill");
          mapRef.current.removeLayer("outline");
          mapRef.current.removeSource("columns");
        }
      };
    }
  }, [state.columns, edit, mapRef]);

  return (
    <div
      style={{ display: "flex", justifyContent: "center", marginTop: "30px" }}
    >
      <ImportDialog />
      <div>
        <MapNavBar
          onSave={onSave}
          onCancel={onCancel}
          enterEditMode={() => setEdit(true)}
          enterPropertyMode={() => setEdit(false)}
          editMode={edit}
          columns={state.columns}
        />
      </div>

      <div>
        <div className="map-container" ref={mapContainerRef} />
      </div>
      <PropertyDialog open={open} features={features} closeOpen={closeOpen} />
    </div>
  );
}

export const M = "Mapbobgl";
