/** The location page: where a column is, in two independent parts.
 *
 * **Location** is where the data were gathered — a point with an uncertainty
 * radius, or a line for a measured section's traverse. It is meaningful for
 * measured sections and drill cores; a composite column has no single place.
 * **Region** is the area the column stands for, as a polygon: what a
 * composite column is, and what a measured section may also claim. A
 * measured section can have both. One is edited at a time, the column
 * type's own first; the other is marked optional.
 *
 * The map is the working surface — place, draw, drag — and the panel beside
 * it is the exact form: coordinates typed in a declared format and read
 * back, the radius, a place search to frame the map. State is the editing
 * session's, so the footprint is saved or reverted with the rest of the
 * column (`../state/location`). */
import hyper from "@macrostrat/hyper";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AnchorButton,
  Button,
  Callout,
  FormGroup,
  HTMLSelect,
  InputGroup,
  NumericInput,
  OverlayToaster,
  SegmentedControl,
} from "@blueprintjs/core";
import type mapboxgl from "mapbox-gl";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import bbox from "@turf/bbox";
import { MapView } from "@macrostrat/map-interface";
import { MapboxMapProvider } from "@macrostrat/mapbox-react";
import { mapboxAccessToken } from "@macrostrat-web/settings";
import { onDemand } from "~/_utils";
import { useInsetMapStyleProps } from "~/components/map-settings";
import { HybridPage, layoutShellAtom, type LayoutCapabilities } from "~/layouts/hybrid";
import { useAtomValue as useFrameAtomValue } from "jotai";
import { downloadText } from "../export";
import {
  circlePolygon,
  footprintFeatures,
  formatLngLat,
  lineLengthKm,
  locationGeometry,
  partGeometry,
  toWKT,
  vertexCount,
  type Footprint,
  type FootprintPart,
  type LocationKind,
} from "./geometry";
import {
  COORDINATE_FORMATS,
  describe,
  formatCoordinates,
  parseCoordinates,
  type CoordinateFormat,
} from "./formats";
import { PlaceSearch, type PlaceResult } from "./place-search";
import { saveColumnGeometry, storedFootprint, unstoredParts } from "./geometry-api";
import {
  drawingAtom,
  editedColumnInfoAtom,
  footprintAtom,
  footprintPartAtom,
  isLocationDirtyAtom,
  loadedFootprintAtom,
  locationKindAtom,
  locationMapAtom,
  locationOutsideRegionAtom,
  primaryFootprintPart,
  setLineAtom,
  setPointAtom,
  setRadiusAtom,
  setRegionAtom,
  snapshotAtom,
  useAtom,
  useAtomValue,
  useSetAtom,
} from "../state";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

const FootprintDraw = onDemand(() =>
  import("./draw.client").then((mod) => mod.FootprintDraw)
);

/** Map only, under a breadcrumbs-only bar: the whole-column actions (Check,
 * Write, Reset all) belong to the other editor pages, and the footprint has
 * its own save. */
const capabilities: Partial<LayoutCapabilities> = {
  modes: ["map-primary"],
  defaultMode: "map-primary",
  hasAssistant: false,
  itemName: "Location",
  contentScroll: "panel",
};

export const COORDINATE_DOCS_HREF = "/docs/columns/column-locations";

export function LocationEditorPage() {
  const snapshot = useAtomValue(snapshotAtom);
  return h(HybridPage, {
    key: snapshot?.col_id ?? "draft",
    className: "location-editor-page",
    capabilities,
    content: h(LocationPanel),
    map: h(LocationMap),
  });
}

/* ------------------------------------------------------------------ panel */

const PART_LABELS: Record<FootprintPart, string> = {
  location: "Location",
  region: "Region",
};

/** The column type's own part first; the other marked optional. */
function footprintPartOptions(primary: FootprintPart) {
  let secondary: FootprintPart = "region";
  if (primary === "region") secondary = "location";
  return [
    { label: PART_LABELS[primary], value: primary },
    { label: `${PART_LABELS[secondary]} (optional)`, value: secondary },
  ];
}

function LocationPanel() {
  const info = useAtomValue(editedColumnInfoAtom);
  const [part, setPart] = useAtom(footprintPartAtom);
  const setDrawing = useSetAtom(drawingAtom);
  const locationOutside = useAtomValue(locationOutsideRegionAtom);
  const isSection = info?.col_type === "section";

  const choosePart = (value: FootprintPart) => {
    setDrawing(false);
    setPart(value);
  };

  let section = h(RegionSection, { isSection });
  if (part === "location") section = h(LocationSection, { isSection });

  let containmentError = null;
  if (locationOutside) {
    containmentError = h(
      Callout,
      { intent: "danger", icon: "error", compact: true },
      "The location is outside the region. Move one so the region contains the location."
    );
  }

  return h("div.location-panel", [
    h(PlaceSearch, { onPick: useFramePlace() }),
    h(SegmentedControl, {
      fill: true,
      options: footprintPartOptions(primaryFootprintPart(info?.col_type)),
      value: part,
      onValueChange: (value: string) => choosePart(value as FootprintPart),
    }),
    containmentError,
    section,
    h(SaveGeometry),
    h(ExportActions),
    h(StoredFootprint),
  ]);
}

/** Frame the map on a chosen place. */
function useFramePlace() {
  const map = useAtomValue(locationMapAtom);
  return useCallback(
    (place: PlaceResult) => {
      if (map == null) return;
      const [w, s, e, n] = place.bbox;
      map.fitBounds(
        [
          [w, s],
          [e, n],
        ],
        { padding: 40, duration: 600 }
      );
    },
    [map]
  );
}

function LocationSection({ isSection }: { isSection: boolean }) {
  const [kind, setKind] = useAtom(locationKindAtom);

  let description =
    "Where the data were gathered: a point with how far it might be off, or the line a section was measured along.";
  if (!isSection) {
    description =
      "Optional. A composite column has no single place — it is located by its region, and its point is derived from it. Give one only for a column that really was measured somewhere.";
  }

  let form = h(PointForm);
  if (kind === "line") form = h(LineForm);

  return h("section.panel-section", [
    h("p.section-description", description),
    h(SegmentedControl, {
      small: true,
      options: [
        { label: "Point", value: "point" },
        { label: "Line", value: "line" },
      ],
      value: kind,
      onValueChange: (value: LocationKind) => setKind(value),
    }),
    form,
    h(UnstoredNote),
  ]);
}

/** A line or a radius is kept in the session but not yet by the backend. */
function UnstoredNote() {
  const footprint = useAtomValue(footprintAtom);
  const parts = unstoredParts(footprint);
  if (parts.length === 0) return null;
  return h(
    Callout,
    { intent: "warning", icon: "warning-sign", compact: true },
    `Saving keeps the point and region only: the ${parts.join(" and ")} can't be stored yet.`
  );
}

/** Lat/lng typed in a declared format and read back, or placed on the map;
 * and the radius the location is known to. */
function PointForm() {
  const footprint = useAtomValue(footprintAtom);
  const setPoint = useSetAtom(setPointAtom);
  const setRadius = useSetAtom(setRadiusAtom);
  const [drawing, setDrawing] = useAtom(drawingAtom);
  const point = footprint.location.point;

  let placeLabel = "Place on map";
  if (point != null) placeLabel = "Move on map";
  if (drawing) placeLabel = "Click the map…";

  return h("div.coordinate-entry", [
    h(CoordinateEntry, { onPoint: setPoint }),
    h("div.coordinate-fields", [
      h(
        FormGroup,
        { label: "Latitude" },
        h(NumericInput, {
          value: point?.lat ?? "",
          min: -90,
          max: 90,
          stepSize: 0.001,
          minorStepSize: 0.00001,
          majorStepSize: 0.1,
          buttonPosition: "none",
          placeholder: "°N",
          fill: true,
          onValueChange: (lat: number) => {
            if (Number.isFinite(lat)) setPoint({ lng: point?.lng ?? 0, lat });
          },
        })
      ),
      h(
        FormGroup,
        { label: "Longitude" },
        h(NumericInput, {
          value: point?.lng ?? "",
          min: -180,
          max: 180,
          stepSize: 0.001,
          minorStepSize: 0.00001,
          majorStepSize: 0.1,
          buttonPosition: "none",
          placeholder: "°E",
          fill: true,
          onValueChange: (lng: number) => {
            if (Number.isFinite(lng)) setPoint({ lat: point?.lat ?? 0, lng });
          },
        })
      ),
      h(
        FormGroup,
        { label: "Uncertainty", helperText: "Radius, km" },
        h(NumericInput, {
          value: footprint.location.radius_km ?? "",
          min: 0,
          stepSize: 0.5,
          majorStepSize: 5,
          minorStepSize: 0.1,
          buttonPosition: "none",
          placeholder: "km",
          fill: true,
          onValueChange: (value: number, text: string) => {
            if (text.trim() === "") {
              setRadius(null);
              return;
            }
            if (Number.isFinite(value) && value >= 0) setRadius(value);
          },
        })
      ),
    ]),
    h("div.row-actions", [
      h(Button, {
        icon: "map-marker",
        text: placeLabel,
        small: true,
        active: drawing,
        onClick: () => setDrawing(!drawing),
      }),
      h.if(point != null)(Button, {
        icon: "eraser",
        text: "Clear",
        small: true,
        minimal: true,
        onClick: () => setPoint(null),
      }),
      h.if(point != null)("span.geometry-note", formatLngLat(point)),
    ]),
  ]);
}

/** A format picker, a field for it, and what was read. */
function CoordinateEntry({ onPoint }: { onPoint: (p: { lat: number; lng: number }) => void }) {
  const [format, setFormat] = useState<CoordinateFormat>("decimal");
  const [text, setText] = useState("");
  const [echo, setEcho] = useState<{ ok: boolean; text: string } | null>(null);
  const def = useMemo(
    () => COORDINATE_FORMATS.find((d) => d.id === format) ?? COORDINATE_FORMATS[0],
    [format]
  );

  const apply = useCallback(() => {
    if (text.trim() === "") return;
    const result = parseCoordinates(format, text);
    if (result.ok) {
      onPoint(result.point);
      setEcho({ ok: true, text: `Read as ${result.echo}` });
      setText("");
    } else {
      setEcho({ ok: false, text: result.error });
    }
  }, [format, text, onPoint]);

  let echoEl = null;
  if (echo != null) {
    echoEl = h("div.coordinate-echo", { className: echo.ok ? "" : "error" }, echo.text);
  }

  return h(
    FormGroup,
    {
      label: "Coordinates",
      helperText: h([
        def.hint,
        " ",
        h(AnchorButton, {
          className: "docs-link",
          minimal: true,
          small: true,
          icon: "help",
          text: "Formats",
          href: COORDINATE_DOCS_HREF,
          target: "_blank",
        }),
      ]),
    },
    h("div.coordinate-entry", [
      h("div.coordinate-entry-row", [
        h(HTMLSelect, {
          value: format,
          options: COORDINATE_FORMATS.map((d) => ({ value: d.id, label: d.label })),
          onChange: (evt: any) => {
            setFormat(evt.currentTarget.value);
            setEcho(null);
          },
        }),
        h(InputGroup, {
          placeholder: def.example,
          value: text,
          onValueChange: (value: string) => {
            setText(value);
            setEcho(null);
          },
          onKeyDown(evt) {
            if (evt.key === "Enter") apply();
          },
        }),
        h(Button, { icon: "arrow-right", small: true, disabled: text.trim() === "", onClick: apply }),
      ]),
      echoEl,
    ])
  );
}

function LineForm() {
  const footprint = useAtomValue(footprintAtom);
  const setLine = useSetAtom(setLineAtom);
  const [drawing, setDrawing] = useAtom(drawingAtom);
  const line = footprint.location.line;

  let note = "Nothing drawn yet. Click along the traverse; double-click to finish.";
  if (line != null) {
    const length = lineLengthKm(line);
    note = `${vertexCount(line)} vertices · ${length.toFixed(length < 10 ? 2 : 1)} km. Drag a vertex to move it; drag a midpoint to add one.`;
  }
  let drawLabel = "Draw line";
  if (line != null) drawLabel = "Redraw";
  if (drawing) drawLabel = "Drawing…";

  return h([
    h("p.geometry-note", note),
    h("div.row-actions", [
      h(Button, {
        icon: "draw",
        text: drawLabel,
        small: true,
        active: drawing,
        onClick: () => setDrawing(!drawing),
      }),
      h.if(line != null)(Button, {
        icon: "eraser",
        text: "Clear",
        small: true,
        minimal: true,
        onClick: () => setLine(null),
      }),
    ]),
  ]);
}

function RegionSection({ isSection }: { isSection: boolean }) {
  const footprint = useAtomValue(footprintAtom);
  const setRegion = useSetAtom(setRegionAtom);
  const [drawing, setDrawing] = useAtom(drawingAtom);
  const region = footprint.region;

  let description =
    "The area the column stands for. Its stored point is the polygon's representative point.";
  if (isSection) {
    description =
      "Optional. The area this section is taken to represent, if it stands for more than the place it was measured.";
  }

  let note = "No region. Click around the area; click the first point to close.";
  if (region != null) {
    note = `${vertexCount(region)} vertices. Drag a vertex to move it; drag a midpoint to add one.`;
  }
  let drawLabel = "Draw region";
  if (region != null) drawLabel = "Redraw";
  if (drawing) drawLabel = "Drawing…";

  // The point's uncertainty circle is a fair first region
  const { point, radius_km } = footprint.location;
  const canCircle = point != null && (radius_km ?? 0) > 0;

  return h("section.panel-section", [
    h("p.section-description", description),
    h("p.geometry-note", note),
    h("div.row-actions", [
      h(Button, {
        icon: "polygon-filter",
        text: drawLabel,
        small: true,
        active: drawing,
        onClick: () => setDrawing(!drawing),
      }),
      h.if(canCircle)(Button, {
        icon: "circle",
        text: "From point and radius",
        small: true,
        minimal: true,
        title: "Start from the circle the location's uncertainty radius draws",
        onClick: () => setRegion(circlePolygon(point!, radius_km!)),
      }),
      h.if(region != null)(Button, {
        icon: "eraser",
        text: "Clear",
        small: true,
        minimal: true,
        onClick: () => setRegion(null),
      }),
    ]),
  ]);
}

/* ------------------------------------------------------------------ save */

let toasterPromise: Promise<OverlayToaster> | null = null;

function getToaster() {
  toasterPromise ??= OverlayToaster.createAsync({ position: "top" });
  return toasterPromise;
}

/** Save the footprint on its own, for a column the database already holds. */
function SaveGeometry() {
  const snapshot = useAtomValue(snapshotAtom);
  const footprint = useAtomValue(footprintAtom);
  const dirty = useAtomValue(isLocationDirtyAtom);
  const outside = useAtomValue(locationOutsideRegionAtom);
  const setLoaded = useSetAtom(loadedFootprintAtom);
  const [saving, setSaving] = useState(false);
  const col_id = snapshot?.col_id ?? null;

  let disabledReason: string | null = null;
  if (col_id == null || snapshot?.isDraft || snapshot?.source === "dry-run") {
    disabledReason = "Only a column already in the database can have its location saved";
  } else if (!dirty) {
    disabledReason = "No changes to the location or region";
  } else if (outside) {
    disabledReason = "The location must be inside the region";
  }

  const save = async () => {
    setSaving(true);
    const toaster = await getToaster();
    try {
      const result = await saveColumnGeometry(col_id!, footprint);
      // What wasn't stored stays an unsaved edit
      setLoaded(storedFootprint(footprint));
      toaster.show({ message: "Location saved", intent: "success", icon: "tick-circle" });
      for (const notice of result.notices) {
        toaster.show({ message: notice.message, intent: "warning", icon: "warning-sign" });
      }
    } catch (err) {
      toaster.show({
        message: `Location not saved: ${err?.message ?? err}`,
        intent: "danger",
        icon: "error",
        timeout: 0,
      });
    } finally {
      setSaving(false);
    }
  };

  return h("div.row-actions", [
    h(Button, {
      icon: "floppy-disk",
      text: "Save location",
      intent: "primary",
      small: true,
      loading: saving,
      disabled: disabledReason != null,
      title: disabledReason ?? "Save the location and region to the database",
      onClick: save,
    }),
  ]);
}

/* ---------------------------------------------------------------- export */

function ExportActions() {
  const info = useAtomValue(editedColumnInfoAtom);
  const footprint = useAtomValue(footprintAtom);
  const part = useAtomValue(footprintPartAtom);
  const [copied, setCopied] = useState(false);

  const collection = footprintFeatures(footprint, info?.col_id ?? null);
  const hasGeometry = collection.features.length > 0;
  const partGeom = partGeometry(footprint, part);

  const download = useCallback(() => {
    downloadText(
      `column-${info?.col_id ?? "draft"}-footprint.geojson`,
      JSON.stringify(collection, null, 2),
      "application/geo+json"
    );
  }, [collection, info]);

  const copyWKT = useCallback(async () => {
    const wkt = toWKT(partGeom);
    if (wkt === "") return;
    await navigator.clipboard?.writeText(wkt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [partGeom]);

  const point = footprint.location.point;
  let asFormats = null;
  if (point != null) {
    asFormats = h(
      "div.stored-footprint",
      h("dl", [
        h("dt", "DMS"),
        h("dd", formatCoordinates("dms", point)),
        h("dt", "UTM"),
        h("dd", formatCoordinates("utm", point)),
        h("dt", "MGRS"),
        h("dd", formatCoordinates("mgrs", point)),
      ])
    );
  }

  return h("section.panel-section", [
    h("h3", "Export"),
    h("div.row-actions", [
      h(Button, {
        icon: "download",
        text: "GeoJSON",
        small: true,
        disabled: !hasGeometry,
        onClick: download,
      }),
      h(Button, {
        icon: copied ? "tick" : "duplicate",
        text: copied ? "Copied" : `Copy ${part} WKT`,
        small: true,
        disabled: partGeom == null,
        onClick: copyWKT,
      }),
    ]),
    asFormats,
  ]);
}

/** What the database holds now, for comparison. */
function StoredFootprint() {
  const snapshot = useAtomValue(snapshotAtom);
  const loaded = useAtomValue(loadedFootprintAtom);
  const info = snapshot?.columnInfo;
  if (info == null) return null;
  const area = Number(info.col_area ?? 0);
  let shape = "point only";
  if (loaded.region != null) shape = `polygon, ${area.toLocaleString()} km²`;
  return h("div.stored-footprint", [
    "Stored footprint",
    h("dl", [
      h("dt", "Location"),
      h("dd", formatLngLat(loaded.location.point) || "none"),
      h("dt", "Shape"),
      h("dd", shape),
    ]),
  ]);
}

/* --------------------------------------------------------------------- map */

const STORED_SOURCE = "footprint-stored";
const RADIUS_SOURCE = "footprint-radius";
const OTHER_PART_SOURCE = "footprint-other-part";

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

/** The map: the stored footprint for reference, the part not being edited,
 * the uncertainty circle, and the draw control over all of it.
 *
 * In the map shell `MapAreaContainer` lays the map out full-bleed and
 * supplies the map store; beside the content the view sizes itself and the
 * provider is ours, inheriting the container's where there is one. */
function LocationMap() {
  const [map, setMap] = useAtom(locationMapAtom);
  const shell = useFrameAtomValue(layoutShellAtom);
  const { mapStyle } = useInsetMapStyleProps();
  const loaded = useAtomValue(loadedFootprintAtom);
  const footprint = useAtomValue(footprintAtom);
  const part = useAtomValue(footprintPartAtom);
  const drawing = useAtomValue(drawingAtom);

  const onMapLoaded = useCallback(
    (m: mapboxgl.Map) => {
      setMap(m);
      fitToFootprint(m, loaded);
    },
    [loaded, setMap]
  );

  useEffect(() => () => setMap(null), [setMap]);

  // Reference layers, re-added whenever the style reloads (basemap change)
  useEffect(() => {
    if (map == null) return;
    const stored = footprintFeatures(loaded, null);
    const apply = () => {
      ensureSource(map, STORED_SOURCE, stored);
      ensureLayer(map, {
        id: `${STORED_SOURCE}-line`,
        type: "line",
        source: STORED_SOURCE,
        paint: { "line-color": "#555", "line-width": 1.5, "line-dasharray": [2, 2] },
      });
      ensureLayer(map, {
        id: `${STORED_SOURCE}-point`,
        type: "circle",
        source: STORED_SOURCE,
        filter: ["==", "$type", "Point"],
        paint: { "circle-radius": 5, "circle-color": "#555", "circle-opacity": 0.6 },
      });
      ensureSource(map, OTHER_PART_SOURCE, EMPTY);
      ensureLayer(map, {
        id: `${OTHER_PART_SOURCE}-fill`,
        type: "fill",
        source: OTHER_PART_SOURCE,
        paint: { "fill-color": "#1f77b4", "fill-opacity": 0.08 },
      });
      ensureLayer(map, {
        id: `${OTHER_PART_SOURCE}-line`,
        type: "line",
        source: OTHER_PART_SOURCE,
        paint: { "line-color": "#1f77b4", "line-width": 1.5 },
      });
      ensureLayer(map, {
        id: `${OTHER_PART_SOURCE}-point`,
        type: "circle",
        source: OTHER_PART_SOURCE,
        filter: ["==", "$type", "Point"],
        paint: { "circle-radius": 5, "circle-color": "#1f77b4" },
      });
      ensureSource(map, RADIUS_SOURCE, EMPTY);
      ensureLayer(map, {
        id: `${RADIUS_SOURCE}-fill`,
        type: "fill",
        source: RADIUS_SOURCE,
        paint: { "fill-color": "#d9480f", "fill-opacity": 0.08 },
      });
      ensureLayer(map, {
        id: `${RADIUS_SOURCE}-line`,
        type: "line",
        source: RADIUS_SOURCE,
        paint: { "line-color": "#d9480f", "line-width": 1, "line-dasharray": [3, 2] },
      });
    };
    if (map.isStyleLoaded()) apply();
    map.on("style.load", apply);
    return () => {
      map.off("style.load", apply);
    };
  }, [map, loaded]);

  // The part not being edited is drawn for reference; the circle follows
  // the point and the radius
  useEffect(() => {
    if (map == null) return;
    const otherPart: FootprintPart = part === "location" ? "region" : "location";
    const other = partGeometry(footprint, otherPart);
    let otherCollection: FeatureCollection = EMPTY;
    if (other != null) {
      otherCollection = featureCollection({ type: "Feature", properties: {}, geometry: other });
    }
    (map.getSource(OTHER_PART_SOURCE) as mapboxgl.GeoJSONSource | undefined)?.setData(otherCollection);

    let circle: FeatureCollection = EMPTY;
    const { kind, point, radius_km } = footprint.location;
    if (kind === "point" && point != null && (radius_km ?? 0) > 0) {
      circle = featureCollection({
        type: "Feature",
        properties: {},
        geometry: circlePolygon(point, radius_km!),
      });
    }
    (map.getSource(RADIUS_SOURCE) as mapboxgl.GeoJSONSource | undefined)?.setData(circle);
  }, [map, footprint, part]);

  let hint = null;
  if (drawing) {
    let text = "Click to place the point";
    if (part === "region") text = "Click around the region; click the first point to close";
    else if (footprint.location.kind === "line") text = "Click along the line; double-click to finish";
    hint = h("div.map-hint", text);
  }

  return h(
    MapboxMapProvider,
    h(
      MapView,
      {
        style: mapStyle,
        accessToken: mapboxAccessToken,
        standalone: shell !== "map",
        height: "100%",
        onMapLoaded,
      },
      [h(FootprintDraw, { map, key: "draw" }), hint]
    )
  );
}

function featureCollection(feature: Feature | null): FeatureCollection {
  if (feature == null) return EMPTY;
  return { type: "FeatureCollection", features: [feature] };
}

function ensureSource(map: mapboxgl.Map, id: string, data: FeatureCollection) {
  const source = map.getSource(id) as mapboxgl.GeoJSONSource | undefined;
  if (source != null) {
    source.setData(data);
    return;
  }
  map.addSource(id, { type: "geojson", data });
}

function ensureLayer(map: mapboxgl.Map, layer: any) {
  if (map.getLayer(layer.id) != null) return;
  map.addLayer(layer);
}

/** Frame the stored region, or settle on the stored point. */
function fitToFootprint(map: mapboxgl.Map, footprint: Footprint) {
  if (footprint.region != null) {
    const [w, s, e, n] = bbox(footprint.region as Polygon | MultiPolygon);
    map.fitBounds(
      [
        [w, s],
        [e, n],
      ],
      { padding: 40, duration: 0 }
    );
    return;
  }
  const point = locationGeometry(footprint.location);
  if (point?.type === "Point") {
    map.jumpTo({ center: point.coordinates as [number, number], zoom: 8 });
  }
}
