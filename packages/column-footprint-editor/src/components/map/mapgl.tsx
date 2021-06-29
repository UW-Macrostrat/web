import "regenerator-runtime/runtime";
import React, { useRef, useEffect, useState } from "react";
import * as topojson from "topojson-client";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

import mapboxgl from "mapbox-gl";
import axios from "axios";

import {
  SnapLineClosed,
  MultVertDirectSelect,
  MultVertSimpleSelect,
  DrawPolygon,
} from "./modes";

import { MapNavBar } from "../blueprint";
import { PropertyDialog } from "../editor";
import { ImportDialog } from "../importer";

import { SnapLineMode, SnapModeDrawStyles } from "mapbox-gl-draw-snap-mode";
import { setWindowHash, locationFromHash } from "./utils";
import "./map.css";

/**
 *
 * For delete point, feature.removeCoordinate()
 *
 *
 * For the "preview" mode. Add layer, fill will be based on property. Hover would be nice touch. Then popup
 *
 */

const url =
  "https://macrostrat.org/api/v2/columns?project_id=10&format=topojson_bare&status_code=in%20process";
// const url =
//   "https://macrostrat.org/api/v2/columns?project_id=1&format=topojson_bare";

const local_url = "http://0.0.0.0:8000/lines";
const put_url = "http://0.0.0.0:8000/updates";
const columns_url = "http://0.0.0.0:8000/columns";

mapboxgl.accessToken =
  "pk.eyJ1IjoidGhlZmFsbGluZ2R1Y2siLCJhIjoiY2tsOHAzeDZ6MWtsaTJ2cXhpMDAxc3k5biJ9.FUMK57K0UP7PSrTUi3DiFQ";

export function Map() {
  const mapContainerRef = useRef(null);

  const [topo, setTopo] = useState(null);
  const [columns, setColumns] = useState(null);

  const [viewport, setViewport] = useState(
    locationFromHash(window.location.hash)
  );

  const [edit, setEdit] = useState(false);

  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [features, setFeatures] = useState([]);

  const closeOpen = () => {
    setOpen(false);
  };

  const [changeSet, setChangeSet] = useState([]);

  const onSave = async (e) => {
    // can do cleaning on changeSet by the internal id string.
    // Combine like edits so I'm not running a million
    // transactions on the db.
    if (changeSet.length != 0) {
      console.log(changeSet);
      const res = await axios.put(
        put_url,
        { change_set: changeSet },
        { headers: { "Access-Control-Allow-Origin": "*" } }
      );
      setChangeSet([]);
    }
    window.location.reload();
  };

  const onCancel = () => {
    setChangeSet([]);
    window.location.reload();
  };

  useEffect(() => {
    if (!topo) {
      fetch(local_url)
        .then((res) => res.json())
        .then((json) => setTopo(json));
    }
  }, [topo]);

  useEffect(() => {
    if (!columns) {
      fetch(columns_url)
        .then((res) => res.json())
        .then((json) => {
          if (json["features"].length == 0) {
            setImportOpen(true);
          }
          setColumns(json);
        });
    }
  }, [columns]);

  useEffect(() => {
    if (!topo || !columns) return;
    var map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v11", // style URL
      center: [viewport.longitude, viewport.latitude], // starting position [lng, lat]
      zoom: viewport.zoom, // starting zoom
    });

    const addToChangeSet = (obj) => {
      setChangeSet((prevState) => {
        return [...prevState, ...new Array(obj)];
      });
    };

    var nav = new mapboxgl.NavigationControl();

    map.addControl(nav);

    map.addToChangeSet = addToChangeSet;

    map.on("move", () => {
      const [zoom, latitude, longitude] = [
        map.getZoom().toFixed(2),
        map.getCenter().lat.toFixed(4),
        map.getCenter().lng.toFixed(4),
      ];
      setViewport({ longitude, latitude, zoom });
      setWindowHash({ zoom, latitude, longitude });
    });

    if (edit) {
      /// draw.create, draw.delete, draw.update, draw.selectionchange
      /// draw.modechange, draw.actionable, draw.combine, draw.uncombine
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

      var featureIds = Draw.add(topo);

      map.on("click", function(e) {
        console.log(Draw.getMode());
      });

      map.on("draw.create", function(e) {
        console.log(e);
        console.log("created new feature!");
        const { type: action, features } = e;

        features.map((feature) => {
          const obj = { action, feature };
          addToChangeSet(obj);
        });
      });

      map.on("draw.delete", function(e) {
        console.log(e);
        const { type: action, features } = e;

        features.map((feature) => {
          const obj = { action, feature };
          addToChangeSet(obj);
        });
      });

      // use the splice to replace coords
      // This needs to account for deleteing nodes. That falls under change_coordinates
      map.on("draw.update", function(e) {
        Draw.changeMode("simple_select", [e.features[0].id]);
      });
    } else {
      map.on("load", function() {
        map.addSource("columns", {
          type: "geojson",
          data: columns,
        });
        map.addLayer({
          id: "column-fill",
          type: "fill",
          source: "columns", // reference the data source
          paint: {
            "fill-color": [
              "case",
              ["==", ["get", "col_id"], "nan"],
              "#F95E5E",
              "#0BDCB9",
            ], // blue color fill
            "fill-opacity": 0.5,
          },
        });
        map.addLayer({
          id: "outline",
          type: "line",
          source: "columns",
          layout: {},
          paint: {
            "line-color": "#000",
            "line-width": 1,
          },
        });
      });
      map.on("click", "column-fill", function(e) {
        setFeatures(e.features);
        setOpen(true);
      });
    }
    return () => map.remove();
  }, [topo, edit, columns]);

  return (
    <div
      style={{ display: "flex", justifyContent: "center", marginTop: "30px" }}
    >
      <ImportDialog open={importOpen} />
      <div>
        <MapNavBar
          onSave={onSave}
          onCancel={onCancel}
          enterEditMode={() => setEdit(true)}
          enterPropertyMode={() => setEdit(false)}
          editMode={edit}
          columns={columns}
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
