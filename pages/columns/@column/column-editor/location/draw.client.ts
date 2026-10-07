/** Drawing and dragging the footprint on the map, through mapbox-gl-draw.
 *
 * One feature at a time: the geometry of the part being edited (the
 * location, or the region). The draw control's own buttons are off; the
 * panel decides when a new point, line or polygon is started
 * (`drawingAtom`), and everything else is direct manipulation — drag a
 * vertex, drag the point. Changes flow out through the footprint atoms;
 * changes from the panel (a typed coordinate) flow back in by replacing the
 * feature. Client only: the library touches `window` on import. */
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import type mapboxgl from "mapbox-gl";
import type { Feature, Geometry } from "geojson";
import { useEffect, useRef, useState } from "react";
import { partGeometry, roundCoordinate } from "./geometry";
import {
  drawingAtom,
  footprintAtom,
  footprintPartAtom,
  setLineAtom,
  setPointAtom,
  setRegionAtom,
  useAtomValue,
  useSetAtom,
} from "../state";

const FEATURE_ID = "footprint";
// The control's source, present once it has attached its layers to the map
const DRAW_SOURCE = "mapbox-gl-draw-cold";

const DRAW_STYLES = drawStyles("#d9480f", "#ff922b");

export function FootprintDraw({ map }: { map: mapboxgl.Map | null }) {
  const footprint = useAtomValue(footprintAtom);
  const part = useAtomValue(footprintPartAtom);
  const drawing = useAtomValue(drawingAtom);
  const setDrawing = useSetAtom(drawingAtom);
  const setPoint = useSetAtom(setPointAtom);
  const setLine = useSetAtom(setLineAtom);
  const setRegion = useSetAtom(setRegionAtom);
  const drawRef = useRef<MapboxDraw | null>(null);
  // A feature added before the control attaches its layers is never drawn
  const [ready, setReady] = useState(false);
  // A new style drops the control's layers, so it is mounted again
  const [generation, setGeneration] = useState(0);
  // The geometry as last written to the control, so an echo of our own
  // change doesn't bounce back into the atoms
  const lastWritten = useRef<string>("");

  const kind = footprint.location.kind;

  // Mount the control once per map and style
  useEffect(() => {
    if (map == null) return;
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      userProperties: true,
      styles: DRAW_STYLES,
    });
    map.addControl(draw, "top-left");
    drawRef.current = draw;
    lastWritten.current = "";
    setReady(false);

    const checkReady = () => {
      if (map.getSource(DRAW_SOURCE) == null) return;
      map.off("sourcedata", checkReady);
      setReady(true);
    };
    map.on("sourcedata", checkReady);
    checkReady();

    // The control's layers are gone once a new style has loaded
    const onStyleLoad = () => {
      if (map.getSource(DRAW_SOURCE) == null) setGeneration((g) => g + 1);
    };
    map.on("style.load", onStyleLoad);

    const onChange = (evt: { features: Feature[] }) => {
      const feature = evt.features?.[0];
      if (feature == null) return;
      const geometry = roundGeometry(feature.geometry);
      lastWritten.current = JSON.stringify(geometry);
      // Whatever was drawn before gives way: one feature at a time
      for (const other of draw.getAll().features) {
        if (other.id !== feature.id) draw.delete(String(other.id));
      }
      if (geometry.type === "Point") {
        setPoint({ lng: geometry.coordinates[0], lat: geometry.coordinates[1] });
      } else if (geometry.type === "LineString") {
        setLine(geometry);
      } else if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
        setRegion(geometry);
      }
    };
    const onCreate = (evt: any) => {
      onChange(evt);
      setDrawing(false);
    };
    const onModeChange = (evt: { mode: string }) => {
      if (!evt.mode.startsWith("draw_")) setDrawing(false);
    };
    map.on("draw.create", onCreate);
    map.on("draw.update", onChange);
    map.on("draw.modechange", onModeChange);

    return () => {
      map.off("sourcedata", checkReady);
      map.off("style.load", onStyleLoad);
      map.off("draw.create", onCreate);
      map.off("draw.update", onChange);
      map.off("draw.modechange", onModeChange);
      try {
        map.removeControl(draw);
      } catch (err) {
        // The map may already be gone
      }
      drawRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one control per map and style
  }, [map, generation]);

  // Keep the control's feature in step with the part being edited
  useEffect(() => {
    const draw = drawRef.current;
    if (draw == null || !ready) return;
    const geometry = partGeometry(footprint, part);
    const key = JSON.stringify(geometry);
    if (key === lastWritten.current) return;
    lastWritten.current = key;
    draw.deleteAll();
    if (geometry == null) return;
    draw.add({ type: "Feature", id: FEATURE_ID, properties: {}, geometry });
    if (geometry.type === "Point") {
      draw.changeMode("simple_select", { featureIds: [FEATURE_ID] });
    } else {
      draw.changeMode("direct_select", { featureId: FEATURE_ID });
    }
  }, [footprint, part, ready, generation]);

  // Start drawing when the panel asks
  useEffect(() => {
    const draw = drawRef.current;
    if (draw == null || !ready) return;
    if (!drawing) return;
    let mode = "draw_polygon";
    if (part === "location") mode = kind === "line" ? "draw_line_string" : "draw_point";
    draw.changeMode(mode as any);
  }, [drawing, part, kind, ready]);

  return null;
}

function roundGeometry<T extends Geometry>(geometry: T): T {
  const round = (coords: any): any => {
    if (typeof coords[0] === "number") {
      return [roundCoordinate(coords[0]), roundCoordinate(coords[1])];
    }
    return coords.map(round);
  };
  return { ...geometry, coordinates: round((geometry as any).coordinates) } as T;
}

/** The library's default style set, recoloured. */
function drawStyles(color: string, activeColor: string): any[] {
  return [
    {
      id: "gl-draw-polygon-fill",
      type: "fill",
      filter: ["all", ["==", "$type", "Polygon"]],
      paint: { "fill-color": color, "fill-opacity": 0.12 },
    },
    {
      id: "gl-draw-lines",
      type: "line",
      filter: ["any", ["==", "$type", "LineString"], ["==", "$type", "Polygon"]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["case", ["==", ["get", "active"], "true"], activeColor, color],
        "line-width": 2.5,
      },
    },
    {
      id: "gl-draw-point-outer",
      type: "circle",
      filter: ["all", ["==", "$type", "Point"], ["==", "meta", "feature"]],
      paint: { "circle-radius": 9, "circle-color": "#fff" },
    },
    {
      id: "gl-draw-point-inner",
      type: "circle",
      filter: ["all", ["==", "$type", "Point"], ["==", "meta", "feature"]],
      paint: {
        "circle-radius": 6,
        "circle-color": ["case", ["==", ["get", "active"], "true"], activeColor, color],
      },
    },
    {
      id: "gl-draw-vertex-outer",
      type: "circle",
      filter: ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"]],
      paint: { "circle-radius": 6, "circle-color": "#fff" },
    },
    {
      id: "gl-draw-vertex-inner",
      type: "circle",
      filter: ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"]],
      paint: { "circle-radius": 4, "circle-color": activeColor },
    },
    {
      id: "gl-draw-midpoint",
      type: "circle",
      filter: ["all", ["==", "meta", "midpoint"], ["==", "$type", "Point"]],
      paint: { "circle-radius": 3, "circle-color": activeColor, "circle-opacity": 0.7 },
    },
  ];
}
