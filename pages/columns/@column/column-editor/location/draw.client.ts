/** Drawing and dragging the footprint on the map.
 *
 * One feature at a time: the geometry of the part being edited (the
 * location, or the region), through the shared `GeometryDraw`. The panel
 * decides when a new point, line or polygon is started (`drawingAtom`);
 * changes flow out through the footprint atoms, and changes from the panel
 * (a typed coordinate) flow back in by replacing the feature. Client only:
 * the draw library touches `window` on import. */
import h from "@macrostrat/hyper";
import type mapboxgl from "mapbox-gl";
import type { Geometry } from "geojson";
import { useCallback, useMemo } from "react";
import { GeometryDraw, type DrawMode } from "~/components/geometry-draw/draw.client";
import { partGeometry } from "./geometry";
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

export function FootprintDraw({ map }: { map: mapboxgl.Map | null }) {
  const footprint = useAtomValue(footprintAtom);
  const part = useAtomValue(footprintPartAtom);
  const drawing = useAtomValue(drawingAtom);
  const setDrawing = useSetAtom(drawingAtom);
  const onChange = useFootprintChange();

  const geometry = useMemo(() => partGeometry(footprint, part), [footprint, part]);
  const drawMode = footprintDrawMode(drawing, part, footprint.location.kind);
  const onDrawEnd = useCallback(() => setDrawing(false), [setDrawing]);

  return h(GeometryDraw, {
    map,
    geometry,
    onChange,
    drawMode,
    onDrawEnd,
    color: "#d9480f",
    activeColor: "#ff922b",
  });
}

/** Route an edited geometry to the atom for its kind. */
function useFootprintChange() {
  const setPoint = useSetAtom(setPointAtom);
  const setLine = useSetAtom(setLineAtom);
  const setRegion = useSetAtom(setRegionAtom);
  return useCallback(
    (geometry: Geometry) => {
      if (geometry.type === "Point") {
        setPoint({ lng: geometry.coordinates[0], lat: geometry.coordinates[1] });
      } else if (geometry.type === "LineString") {
        setLine(geometry);
      } else if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
        setRegion(geometry);
      }
    },
    [setPoint, setLine, setRegion]
  );
}

function footprintDrawMode(drawing: boolean, part: string, kind: string): DrawMode | null {
  if (!drawing) return null;
  if (part !== "location") return "draw_polygon";
  if (kind === "line") return "draw_line_string";
  return "draw_point";
}
