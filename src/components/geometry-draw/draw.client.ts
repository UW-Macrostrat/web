/** Drawing and dragging one geometry on a map, through mapbox-gl-draw.
 *
 * Controlled: `geometry` is the feature being edited and `onChange` receives
 * every edit; a new feature is started by setting `drawMode`, and `onDrawEnd`
 * says drawing has finished or been abandoned. The control's own buttons are
 * off, so the caller's panel decides when drawing starts; everything else is
 * direct manipulation — drag a vertex, drag the point. One feature at a time.
 * Delete or Backspace removes the vertex last placed while drawing, or the one
 * last touched while reshaping. Client only: the library touches `window` on
 * import. */
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
// Modes in which Delete removes a vertex
const VERTEX_MODES = new Set(["draw_polygon", "draw_line_string", "direct_select"]);

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
      modes: VERTEX_UNDO_MODES,
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

    // The library binds Delete only alongside its trash button, which is off
    const container = map.getContainer();
    const onKeyDown = (evt: KeyboardEvent) => {
      if (evt.key !== "Backspace" && evt.key !== "Delete") return;
      if (!(evt.target as HTMLElement)?.classList?.contains("mapboxgl-canvas")) return;
      if (!VERTEX_MODES.has(draw.getMode())) return;
      evt.preventDefault();
      draw.trash();
    };
    container.addEventListener("keydown", onKeyDown);

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
      container.removeEventListener("keydown", onKeyDown);
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

/* Delete as undo. The stock modes' trash deletes the whole feature while
 * drawing, and while reshaping deletes it outright once too few vertices are
 * left; these remove one vertex and never leave an invalid shape. */

/** Drop the last placed vertex; the one following the pointer moves back. */
function undoPolygonVertex(state: any) {
  const position = state.currentVertexPosition;
  if (position === 0) return;
  // Edited directly: `removeCoordinate` drops a ring once it is under 3 points
  const ring = state.polygon.coordinates[0];
  ring.splice(position - 1, 1);
  state.polygon.setCoordinates([ring]);
  state.currentVertexPosition = position - 1;
}

function undoLineVertex(state: any) {
  const position = state.currentVertexPosition;
  if (state.direction !== "forward" || position === 0) return;
  const coords = state.line.coordinates;
  coords.splice(position - 1, 1);
  state.line.setCoordinates(coords);
  state.currentVertexPosition = position - 1;
}

/** The stock removal of the selected vertices, unless it would leave a ring
 * under 3 vertices or a line under 2. */
function removeSelectedVertices(this: any, state: any) {
  const paths: string[] = state.selectedCoordPaths ?? [];
  if (paths.length === 0) return;
  const minimum = state.feature.type.endsWith("LineString") ? 2 : 3;
  const removed = new Map<string, number>();
  for (const path of paths) {
    const parent = path.split(".").slice(0, -1).join(".");
    removed.set(parent, (removed.get(parent) ?? 0) + 1);
  }
  for (const [parent, n] of removed) {
    let coords = state.feature.coordinates;
    for (const index of parent.split(".").filter((x) => x !== "")) {
      coords = coords[Number(index)];
    }
    if (coords.length - n < minimum) return;
  }
  MapboxDraw.modes.direct_select.onTrash.call(this, state);
}

const VERTEX_UNDO_MODES = {
  ...MapboxDraw.modes,
  draw_polygon: { ...MapboxDraw.modes.draw_polygon, onTrash: undoPolygonVertex },
  draw_line_string: { ...MapboxDraw.modes.draw_line_string, onTrash: undoLineVertex },
  direct_select: { ...MapboxDraw.modes.direct_select, onTrash: removeSelectedVertices },
};

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
