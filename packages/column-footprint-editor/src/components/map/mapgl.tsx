import "regenerator-runtime/runtime";
import React, { useRef, useEffect, useState } from "react";
import * as topojson from "topojson-client";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import mapboxgl from "mapbox-gl";

import { TopoJSONToLineString } from "./utils";
import "./map.css";

// Topojson
// topojson.feautre(topology, object) returns geojson
// topojson.mesh(topology, object, filter) returns merged arcs as linestrings
// topojson.neighbors(objects) list of adjacent objects

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

  topo ? console.log(topo) : console.log("...loading"); //topo.objects.output

  useEffect(() => {
    if (!topo) return;
    var map = new mapboxgl.Map({
      container: mapContainerRef.current, // container id (the div I create above)
      style: "mapbox://styles/mapbox/streets-v11", // style URL
      center: [lng, lat], // starting position [lng, lat]
      zoom: zoom, // starting zoom
    });

    var nav = new mapboxgl.NavigationControl();

    map.addControl(nav);

    /// draw.create, draw.delete, draw.update, draw.selectionchange
    /// draw.modechange, draw.actionable, draw.combine, draw.uncombine
    var Draw = new MapboxDraw();
    map.addControl(Draw, "top-left");

    var featureIds = Draw.add(topo);

    map.on("draw.create", function(e) {
      console.log(Draw.getAll());
    });

    map.on("move", () => {
      setLng(map.getCenter().lng.toFixed(4));
      setLat(map.getCenter().lat.toFixed(4));
      setZoom(map.getZoom().toFixed(2));
    });

    // maybe a custom editing that checks if there is another vertix at same point, and also select
    // that one.
    map.on("draw.update", function(e) {
      console.log(e);
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
