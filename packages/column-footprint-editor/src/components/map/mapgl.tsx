import "regenerator-runtime/runtime";
import React, { useRef, useEffect, useState } from "react";
import * as topojson from "topojson-client";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import mapboxgl from "mapbox-gl";

import { TopoJSONToLineString, coordinatesAreEqual } from "./utils";
import "./map.css";

/**
 * TODO: Instead of snap to after finish drag, drag with...
 *        Might be possible with customizing a direct_select mode and modifying the drag events
 * Edge cases to fix:
 *  Handling vertix clicks where they aren't shared, new node
 *    There seems to be an event that happens sometimes that messes up the proccess
 *    Happens after I add a new node, then try to move a shared vertix.
 *    I think it has to do with the draw modes. It needs to get set back to multi-vert
 *
 *  Deleting node that has 2 shared verticies in same feature.
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
  "https://macrostrat.org/api/v2/columns?project_id=1&format=topojson_bare";

mapboxgl.accessToken =
  "pk.eyJ1IjoidGhlZmFsbGluZ2R1Y2siLCJhIjoiY2tsOHAzeDZ6MWtsaTJ2cXhpMDAxc3k5biJ9.FUMK57K0UP7PSrTUi3DiFQ";

export function Map() {
  const mapContainerRef = useRef(null);

  const [topo, setTopo] = useState(null);
  const [lng, setLng] = useState(-89);
  const [lat, setLat] = useState(43);
  const [zoom, setZoom] = useState(5);

  useEffect(() => {
    if (!topo) {
      fetch(url)
        .then((res) => res.json())
        .then((json) => setTopo(TopoJSONToLineString(json)));
    }
  }, [topo]);

  useEffect(() => {
    if (!topo) return;
    var map = new mapboxgl.Map({
      container: mapContainerRef.current, // container id (the div I create above)
      style: "mapbox://styles/mapbox/streets-v11", // style URL
      center: [lng, lat], // starting position [lng, lat]
      zoom: zoom, // starting zoom
    });

    let toMoveCoordPath;
    let toMoveFeature;
    let movedCoordPath;
    let sameFeature;

    console.log(toMoveCoordPath);

    var nav = new mapboxgl.NavigationControl();

    map.addControl(nav);

    const MultipleVerticiesClick = MapboxDraw.modes.simple_select;

    // need to just pass off it there aren't other verticies at point
    MultipleVerticiesClick.clickOnVertex = function(state, e) {
      console.log("mult_vert clicked vertix");
      //console.log(e);
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
        console.log("Theres a Shared vertix!!");
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
          console.log("More than one!!");
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
      defaultMode: "mult_vert",
      modes: Object.assign(
        {
          mult_vert: MultipleVerticiesClick,
        },
        MapboxDraw.modes
      ),
    });
    map.addControl(Draw, "top-left");

    var featureIds = Draw.add(topo);

    map.on("move", () => {
      setLng(map.getCenter().lng.toFixed(4));
      setLat(map.getCenter().lat.toFixed(4));
      setZoom(map.getZoom().toFixed(2));
    });

    map.on("draw.onDrag", function(state, e) {
      console.log("DRAG");
      console.log(e);
    });

    // maybe a custom editing that checks if there is another vertix at same point, and also select
    // that one.
    // use the splice to replace coords
    // This needs to account for deleteing nodes. That falls under change_coordinates
    map.on("draw.update", function(e) {
      console.log(e);

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
          });
        }
      }
      Draw.changeMode("mult_vert", [e.features[0].id]);
      // reset the state to undefined
      toMoveCoordPath = undefined;
      toMoveFeature = undefined;
      movedCoordPath = undefined;
      sameFeature = undefined;
    });
    return () => map.remove();
  }, [topo]);

  return (
    <div>
      <div className="map-container" ref={mapContainerRef} />
    </div>
  );
}

export const M = "Mapbobgl";
