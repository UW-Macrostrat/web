import "regenerator-runtime/runtime";
import React, { useRef, useEffect, useState } from "react";
import * as topojson from "topojson-client";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import mapboxgl from "mapbox-gl";
import axios from "axios";

import { SnapLineClosed } from "./modes";

import { SnapLineMode, SnapModeDrawStyles } from "mapbox-gl-draw-snap-mode";
import { TopoJSONToLineString, coordinatesAreEqual } from "./utils";
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
    const res = await axios.put(
      put_url,
      { change_set: changeSet },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
    console.log(res.data);
    setChangeSet([]);
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

    let toMoveCoordPath;
    let toMoveFeature;
    let movedCoordPath;
    let sameFeature;

    console.log(toMoveCoordPath);

    var nav = new mapboxgl.NavigationControl();

    map.addControl(nav);

    const MultVertSimpleSelect = MapboxDraw.modes.simple_select;
    const MultVertDirectSelect = MapboxDraw.modes.direct_select;

    MultVertDirectSelect.onDrag = function(state, e) {
      if (state.canDragMove !== true) return;
      state.dragMoving = true;
      e.originalEvent.stopPropagation();

      //console.log(e);

      const delta = {
        lng: e.lngLat.lng - state.dragMoveLocation.lng,
        lat: e.lngLat.lat - state.dragMoveLocation.lat,
      };
      if (state.selectedCoordPaths.length > 0) this.dragVertex(state, e, delta);
      //else this.dragFeature(state, e, delta);

      state.dragMoveLocation = e.lngLat;

      if (movedCoordPath) {
        let newCoord = [e.lngLat.lng, e.lngLat.lat];

        if (sameFeature) {
          //logic for if multiple verticies, same point, same feature
          let coordsToChange = [...toMoveFeature.coordinates];
          toMoveCoordPath.map((coordPath) => {
            coordsToChange.splice(coordPath, 1, newCoord);
          });
          toMoveFeature.setCoordinates(coordsToChange);
        } else {
          // different features, works for more than 2 shared vertices
          toMoveFeature.map((feature, index) => {
            let coordsToChange = [...feature.coordinates];
            coordsToChange.splice(toMoveCoordPath[index], 1, newCoord);
            feature.setCoordinates(coordsToChange);
          });
        }
      }
    };

    // need to just pass off it there aren't other verticies at point
    MultVertSimpleSelect.clickOnVertex = function(state, e) {
      console.log("mult_vert clicked vertix");
      console.log(e.lngLat);
      //console.log(this._ctx);

      // this block gets features other than the clicked one at point
      var point = map.project(e.lngLat);
      const idsAtPoint = this._ctx.api.getFeatureIdsAt(point);
      let features = idsAtPoint.map((id) => this.getFeature(id));

      const currentId = e.featureTarget.properties.parent;
      const currentFeature = this.getFeature(currentId);
      const targetCoords = e.featureTarget.geometry.coordinates;

      features = features.filter((f) => f != null && f.id != currentId); // this will return the other vertix

      if (features.length > 0) {
        console.log("You've clicked multiple vertices");
        movedCoordPath = e.featureTarget.properties.coord_path;

        const coords = [...targetCoords];

        toMoveFeature = features;

        let match = [];
        features.map((f) => {
          if (f) {
            let coord_path = f.coordinates.map((coord, index) => {
              if (coordinatesAreEqual({ coord1: coord, coord2: coords })) {
                match.push(index);
              }
            });
          }
        });
        toMoveCoordPath = match; // will have same index as toMoveFeature
      } else {
        let truthy = [];
        let coordPaths = [];
        currentFeature.coordinates.map((coord, index) => {
          if (coordinatesAreEqual({ coord1: coord, coord2: targetCoords })) {
            truthy.push(1);
            coordPaths.push(index);
          }
        });
        if (truthy.length > 1) {
          //there will always be at least 1 point the same
          // need to set to moveId to an array of the pathcoords that are the same
          console.log("Vertices in same feature");
          toMoveCoordPath = coordPaths;
          toMoveFeature = currentFeature;
          movedCoordPath = e.featureTarget.properties.coord_path;
          sameFeature = true;
        }
      }

      // this is what the normal simple_select does, we want to keep that the same
      this.changeMode("direct_select", {
        featureId: e.featureTarget.properties.parent,
        coordPath: e.featureTarget.properties.coord_path,
        startPos: e.lngLat,
      });
    };

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
      console.log(e);
      const { action, features } = e;

      features.map((feature) => {
        const obj = { action, feature };

        addToChangeSet(obj);
      });

      console.log("updated a feature!");

      if (movedCoordPath) {
        let newCoord = e.features[0].geometry.coordinates[movedCoordPath];

        if (sameFeature) {
          //logic for if multiple verticies, same point, same feature
          let coordsToChange = [...toMoveFeature.coordinates];
          toMoveCoordPath.map((coordPath) => {
            coordsToChange.splice(coordPath, 1, newCoord);
          });
          toMoveFeature.setCoordinates(coordsToChange);
        } else {
          // different features, works for more than 2 shared vertices
          toMoveFeature.map((feature, index) => {
            let coordsToChange = [...feature.coordinates];
            coordsToChange.splice(toMoveCoordPath[index], 1, newCoord);
            feature.setCoordinates(coordsToChange);
            console.log(feature);
            const geometry = {
              coordinates: feature.coordinates,
              type: feature.type,
            };
            const obj = {
              action,
              feature: {
                geometry,
                properties: feature.properties,
                type: "Feature",
              },
            };
            addToChangeSet(obj);
          });
        }
      }
      Draw.changeMode("simple_select", [e.features[0].id]);
      // reset the state to undefined
      toMoveCoordPath = undefined;
      toMoveFeature = undefined;
      movedCoordPath = undefined;
      sameFeature = undefined;
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
