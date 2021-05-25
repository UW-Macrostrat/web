import "regenerator-runtime/runtime";
import React, { useRef, useEffect, useState } from "react";
import * as topojson from "topojson-client";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import doubleClickZoom from "@mapbox/mapbox-gl-draw/src/lib/double_click_zoom";
import * as Constants from "@mapbox/mapbox-gl-draw/src/constants";

import mapboxgl from "mapbox-gl";
import axios from "axios";

import {
  SnapLineClosed,
  MultVertDirectSelect,
  MultVertSimpleSelect,
} from "./modes";

import { SnapLineMode, SnapModeDrawStyles } from "mapbox-gl-draw-snap-mode";
import {
  TopoJSONToLineString,
  coordinatesAreEqual,
  distance_between_points,
} from "./utils";
import "./map.css";

/**
 * Next Steps:
 *
 *  Use the snap-to add on to create a custom mode for new polygons
 *  Starting from scratch
 *
 *
 * Edge cases to fix:
 *
 *  Multi-junction where it has a point in same line AND a point from another line
 *  Deleting node that has 2 shared verticies in same feature.
 *  Deleting lines
 *  Dragging Whole lines
 *
 * For delete point, feature.removeCoordinate()
 *
 * TODO: The utility function to tell if point are the same vertex needs to become more sophisticated.
 *        To ensure some reliability, it checks to the tenths decimal point on longitude and latitude.
 *        This might be acceptable, unless someone wants to create a column with incredible granularity.
 */

// Topojson
// topojson.feautre(topology, object) returns geojson
// topojson.mesh(topology, object, filter) returns merged arcs as linestrings
// topojson.neighbors(objects) list of adjacent objects

interface tomove {
  id: string;
  index: number;
}

const url =
  "https://macrostrat.org/api/v2/columns?project_id=10&format=topojson_bare&status_code=in%20process";
// const url =
//   "https://macrostrat.org/api/v2/columns?project_id=1&format=topojson_bare";

const local_url = "http://0.0.0.0:8000/lines";
const put_url = "http://0.0.0.0:8000/updates";

mapboxgl.accessToken =
  "pk.eyJ1IjoidGhlZmFsbGluZ2R1Y2siLCJhIjoiY2tsOHAzeDZ6MWtsaTJ2cXhpMDAxc3k5biJ9.FUMK57K0UP7PSrTUi3DiFQ";

export function Map() {
  const mapContainerRef = useRef(null);

  const [topo, setTopo] = useState(null);
  const [lng, setLng] = useState(-89);
  const [lat, setLat] = useState(43);
  const [zoom, setZoom] = useState(5);

  const [changeSet, setChangeSet] = useState([]);

  const onSave = async (e) => {
    // can do cleaning on changeSet by the internal id string.
    // Combine like edits so I'm not running a million
    // transactions on the db.
    console.log(changeSet);
    // const res = await axios.put(
    //   put_url,
    //   { change_set: changeSet },
    //   { headers: { "Access-Control-Allow-Origin": "*" } }
    // );
    // console.log(res.data);
    // setChangeSet([]);
    // window.location.reload();
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
    if (!topo) return;
    var map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v11", // style URL
      center: [lng, lat], // starting position [lng, lat]
      zoom: zoom, // starting zoom
    });

    const addToChangeSet = (obj) => {
      setChangeSet((prevState) => {
        return [...prevState, ...new Array(obj)];
      });
    };

    var nav = new mapboxgl.NavigationControl();

    map.addControl(nav);

    map.addToChangeSet = addToChangeSet;

    /// draw.create, draw.delete, draw.update, draw.selectionchange
    /// draw.modechange, draw.actionable, draw.combine, draw.uncombine
    var Draw = new MapboxDraw({
      //defaultMode: "mult_vert",
      modes: Object.assign(
        {
          direct_select: MultVertDirectSelect,
          simple_select: MultVertSimpleSelect,
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

    map.on("move", () => {
      setLng(map.getCenter().lng.toFixed(4));
      setLat(map.getCenter().lat.toFixed(4));
      setZoom(map.getZoom().toFixed(2));
    });
    map.on("click", function() {
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
    return () => map.remove();
  }, [topo]);

  return (
    <div style={{ display: "flex" }}>
      <button
        style={{ background: "lightgreen", marginRight: "10px" }}
        onClick={onSave}
      >
        SAVE!!!
      </button>
      <button
        style={{ background: "orangered", marginLeft: "10px" }}
        onClick={onCancel}
      >
        CANCEL!!!
      </button>

      <div>
        <div className="map-container" ref={mapContainerRef} />
      </div>
    </div>
  );
}

export const M = "Mapbobgl";
