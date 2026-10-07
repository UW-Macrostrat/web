/** Drawing and dragging one geometry on a map, through mapbox-gl-draw.
 *
 * Controlled: `geometry` is the feature being edited and `onChange` receives
 * every edit; a new feature is started by setting `drawMode`, and `onDrawEnd`
 * says drawing has finished or been abandoned. The control's own buttons are
 * off, so the caller's panel decides when drawing starts; everything else is
 * direct manipulation — drag a vertex, drag the point. One feature at a time.
 * Client only: the library touches `window` on import. */
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import type mapboxgl from "mapbox-gl";
import type { Feature, Geometry } from "geojson";
import { useEffect, useRef, useState } from "react";

export type DrawMode = "draw_polygon" | "draw_line_string" | "draw_point";

export interface GeometryDrawProps {
  map: mapboxgl.Map | null;
  geometry: Geometry | null;
  onChange: (geometry: Geometry) => void;
  /** Start drawing a new feature in this mode; null when not drawing. */
  drawMode: DrawMode | null;
  onDrawEnd: () => void;
  color?: string;
  activeColor?: string;
}

const FEATURE_ID = "drawn";
// The control's source, present once it has attached its layers to the map
const DRAW_SOURCE = "mapbox-gl-draw-cold";

export function GeometryDraw({
  map,
  geometry,
  onChange,
  drawMode,
  onDrawEnd,
  color = "#d9480f",
  activeColor = "#ff922b",
}: GeometryDrawProps) {
  const drawRef = useRef<MapboxDraw | null>(null);
  // A feature added before the control attaches its layers is never drawn
  const [ready, setReady] = useState(false);
  // A new style drops the control's layers, so it is mounted again
  const [generation, setGeneration] = useState(0);
  // The geometry as last written to the control, so an echo of our own
  // change doesn't bounce back out
  const lastWritten = useRef<string>("");
  // The control lives as long as the map; callbacks are read through refs
  const onChangeRef = useRef(onChange);
  const onDrawEndRef = useRef(onDrawEnd);
  onChangeRef.current = onChange;
  onDrawEndRef.current = onDrawEnd;

  // Mount the control once per map and style
  useEffect(() => {
    if (map == null) return;
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      userProperties: true,
      styles: drawStyles(color, activeColor),
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

    const handleChange = (evt: { features: Feature[] }) => {
      const feature = evt.features?.[0];
      if (feature == null) return;
      const rounded = roundGeometry(feature.geometry);
      lastWritten.current = JSON.stringify(rounded);
      // Whatever was drawn before gives way: one feature at a time
      for (const other of draw.getAll().features) {
        if (other.id !== feature.id) draw.delete(String(other.id));
      }
      onChangeRef.current(rounded);
    };
    const handleCreate = (evt: any) => {
      handleChange(evt);
      onDrawEndRef.current();
    };
    const handleModeChange = (evt: { mode: string }) => {
      if (!evt.mode.startsWith("draw_")) onDrawEndRef.current();
    };
    map.on("draw.create", handleCreate);
    map.on("draw.update", handleChange);
    map.on("draw.modechange", handleModeChange);

    return () => {
      map.off("sourcedata", checkReady);
      map.off("style.load", onStyleLoad);
      map.off("draw.create", handleCreate);
      map.off("draw.update", handleChange);
      map.off("draw.modechange", handleModeChange);
      try {
        map.removeControl(draw);
      } catch (err) {
        // The map may already be gone
      }
      drawRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one control per map and style
  }, [map, generation]);

  // Keep the control's feature in step with the geometry being edited
  useEffect(() => {
    const draw = drawRef.current;
    if (draw == null || !ready) return;
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
  }, [geometry, ready, generation]);

  // Start drawing when asked
  useEffect(() => {
    const draw = drawRef.current;
    if (draw == null || !ready || drawMode == null) return;
    draw.changeMode(drawMode as any);
  }, [drawMode, ready]);

  return null;
}

/** Five decimal places: about a metre, and past any Macrostrat dataset. */
function roundGeometry<T extends Geometry>(geometry: T): T {
  const round = (coords: any): any => {
    if (typeof coords[0] === "number") {
      return [Math.round(coords[0] * 1e5) / 1e5, Math.round(coords[1] * 1e5) / 1e5];
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
