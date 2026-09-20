/** Map legend for the current viewport.
 *
 * A port of the `Map interface/Map legend` story from `web-components`: the
 * Macrostrat carto overlay on a basemap, with a fixed panel on the right
 * listing the legend entries that fall within the map's bounds, youngest unit
 * first.
 *
 * The page has no navbar and no context panel — the map fills everything to
 * the left of a single column, which carries the way back out, the page's
 * title and description, and the map controls above the legend itself.
 *
 * The two directions of selection are the point of the page:
 *  - clicking a map polygon selects its legend entry and opens its details
 *  - clicking a legend entry selects it, dimming every other unit on the map
 *
 * Legend entries come from `/map/carto/legend` on the v3 API, keyed on the
 * viewport. Intervals and lithologies arrive as bare IDs and are resolved
 * against the definition maps that `MacrostratDataProvider` manages, so the
 * panel costs one fetch per definition table for the life of the page.
 */

import hyper from "@macrostrat/hyper";
import { Button, NonIdealState, Spinner, Tag } from "@blueprintjs/core";
import classNames from "classnames";
import {
  DetailPanelStyle,
  LocationPanel,
  MapAreaContainer,
  MapView,
} from "@macrostrat/map-interface";
import { buildMacrostratStyle } from "@macrostrat/map-styles";
import {
  DataField,
  IntervalField,
  LithologyList,
} from "@macrostrat/data-components";
import {
  MacrostratDataProvider,
  useMacrostratDefs,
} from "@macrostrat/data-provider";
import { JSONView, useDarkMode } from "@macrostrat/ui-components";
import { useMapElement, useMapStyleOperator } from "@macrostrat/mapbox-react";
import { removeMapLabels, type MapPosition } from "@macrostrat/mapbox-utils";
import {
  apiV2Prefix,
  apiV3Prefix,
  burwellTileDomain,
  mapboxAccessToken,
} from "@macrostrat-web/settings";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { loadable } from "jotai/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { atomWithSearchParam, locationAtom } from "~/_utils/url-atoms";
import { lastMapPositionAtom } from "~/_utils/last-map-position";
import { hashWithMapPosition, initialMapPosition } from "~/_utils/map-position";
import {
  BaseLayerForm,
  Basemap,
  basemapStyle,
  PageBreadcrumbs,
} from "~/components";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

/** The fill layer `buildMacrostratStyle` builds over the carto `units`
 * source-layer. Both the selection highlight and the click handler address it
 * by name. */
const CARTO_FILL_LAYER = "burwell_fill";

const legendAPIRoute = apiV3Prefix + "/map/carto/legend";

/** The carto overlay, built once: a stable style object means `MapView` doesn't
 * re-apply the style on every render. */
const macrostratOverlay = buildMacrostratStyle({
  tileserverDomain: burwellTileDomain,
});

/** Hoisted, and not rebuilt per render: `MapView` re-applies the map style —
 * which reloads every tile — whenever the identity of `overlayStyles` changes. */
const OVERLAY_STYLES = [macrostratOverlay];

/** The legend is assembled from carto's own scale-dependent unit selection, so
 * the request is keyed on a tile zoom several levels finer than the map's —
 * the offset the story arrived at. */
const LEGEND_ZOOM_OFFSET = 4;

/** Where to start when neither the URL nor the last-viewed position says
 * otherwise: roughly the story's South Dakota view. */
const DEFAULT_MAP_POSITION: MapPosition = {
  camera: { lng: -99, lat: 43.5, altitude: 250_000 },
};

// --- Page state ---

/** The camera, shared with the other map pages and restored on revisit
 * (see `~/_utils/last-map-position`). */
const mapPositionAtom = lastMapPositionAtom;

/** The camera in the URL hash, written in the same `x`/`y`/`z` (plus `a`/`e`)
 * form as the main map page — so a link from here opens the same view there,
 * and vice versa.
 *
 * Write-only, and routed through `locationAtom` rather than `setHashString`:
 * the query-string params below are managed by the same atom, and a bare
 * `setHashString` rewrites the URL from the pathname up, dropping them.
 */
const mapPositionHashAtom = atom(null, (get, set, position: MapPosition) => {
  const loc = get(locationAtom);
  set(locationAtom, { ...loc, hash: hashWithMapPosition(loc.hash, position) });
});

/** The base map style, persisted in the URL as on the other map pages. "basic"
 * is the default and is kept out of the query string. */
const basemapParamAtom = atomWithSearchParam("basemap");
const basemapAtom = atom(
  (get): Basemap => {
    const value = get(basemapParamAtom);
    if (value === Basemap.Satellite) return value as Basemap;
    return Basemap.Basic;
  },
  (get, set, value: Basemap) => {
    let param: Basemap | null = value;
    if (value === Basemap.Basic) param = null;
    set(basemapParamAtom, param);
  }
);

/** Whether the basemap's text labels are shown. On by default; the "off" state
 * is stored in the URL. */
const labelsParamAtom = atomWithSearchParam("labels");
const showLabelsAtom = atom(
  (get) => get(labelsParamAtom) !== "off",
  (get, set, value: boolean) => {
    let param: string | null = null;
    if (!value) param = "off";
    set(labelsParamAtom, param);
  }
);

/** The query string the legend is fetched with — bounds and zoom, already
 * rounded. Holding the *string* rather than the bounds object means a camera
 * nudge too small to change the request doesn't refetch. */
const legendQueryAtom = atom<string | null>(null);

const legendDataAtom = atom(async (get, { signal }) => {
  const query = get(legendQueryAtom);
  if (query == null) return null;

  const res = await fetch(`${legendAPIRoute}?${query}`, { signal });
  if (!res.ok) {
    throw new Error(`Legend request failed (${res.status})`);
  }
  return sortByAge(legendEntries(await res.json()));
});

const legendResultAtom = loadable(legendDataAtom);

const selectedLegendIDAtom = atom<number | null>(null);

const selectedEntryAtom = atom((get) => {
  const id = get(selectedLegendIDAtom);
  if (id == null) return null;
  const res = get(legendResultAtom);
  if (res.state !== "hasData" || res.data == null) return null;
  return res.data.find((d) => d.legend_id === id) ?? null;
});

enum LegendViewMode {
  Pretty = "pretty",
  JSON = "json",
}

const viewModeAtom = atom(LegendViewMode.Pretty);

// --- Legend queries ---

/** Five decimal places is ~1 m at the equator, well past the resolution of any
 * Macrostrat dataset, and keeps the request URL stable across redraws. */
function roundCoord(value: number): number {
  return Math.round(value * 1e5) / 1e5;
}

function legendQueryFor(map: mapboxgl.Map): string {
  const bounds = map.getBounds().toArray().flat().map(roundCoord);
  const zoom = Math.round(map.getZoom() + LEGEND_ZOOM_OFFSET);
  return new URLSearchParams({
    bounds: bounds.join(","),
    zoom: String(zoom),
  }).toString();
}

/** The route returns a bare array of entries; a `{data: [...]}` envelope is
 * tolerated so a change on the API side degrades to an empty legend rather
 * than a thrown render. */
function legendEntries(payload: any): any[] {
  const entries = payload?.data ?? payload;
  if (!Array.isArray(entries)) return [];
  return entries;
}

/** Youngest unit first, the order a geologic legend is normally read in. */
function sortByAge(entries: any[]): any[] {
  return [...entries].sort((a, b) => bestAge(a) - bestAge(b));
}

function bestAge(unit: any): number {
  return (unit.t_age + unit.b_age) / 2;
}

// --- Page ---

export function Page() {
  const dark = useDarkMode();
  const basemap = useAtomValue(basemapAtom);
  const baseStyle = basemapStyle(basemap, dark?.isEnabled);
  const transformStyle = useLabelTransform();

  const mapPosition = useInitialMapPosition();
  const onMapMoved = useMapMovedHandler();

  // The definition maps the panel resolves interval and lithology IDs against;
  // the map itself needs nothing from the provider.
  const detailPanel = h(
    MacrostratDataProvider,
    { baseURL: apiV2Prefix },
    h(LegendPanel)
  );

  return h(
    MapAreaContainer,
    { detailPanel, detailPanelStyle: DetailPanelStyle.FIXED },
    h(
      MapView,
      {
        style: baseStyle,
        transformStyle,
        mapPosition,
        mapboxToken: mapboxAccessToken,
        enableTerrain: true,
        overlayStyles: OVERLAY_STYLES,
        onMapMoved,
      },
      h(MapLegendManager)
    )
  );
}

/** The camera to open at — see `~/_utils/map-position` for the order the sinks
 * are resolved in.
 *
 * Frozen on first render: `MapView` applies `mapPosition` at initialization
 * only, and subscribing to either source would re-render the page on every
 * map move.
 */
function useInitialMapPosition(): MapPosition {
  const [initial] = useState(() => initialMapPosition(DEFAULT_MAP_POSITION));
  return initial;
}

/** On every move: record the camera in the URL and in the shared last-viewed
 * position, and re-key the legend request. */
function useMapMovedHandler() {
  const setStoredPosition = useSetAtom(mapPositionAtom);
  const setHashPosition = useSetAtom(mapPositionHashAtom);
  const setLegendQuery = useSetAtom(legendQueryAtom);

  return useCallback(
    (position: MapPosition, map: mapboxgl.Map) => {
      setStoredPosition(position);
      setHashPosition(position);
      setLegendQuery(legendQueryFor(map));
    },
    [setStoredPosition, setHashPosition, setLegendQuery]
  );
}

/** Hide the basemap's own labels by stripping the label layers from the
 * resolved style, as the other map pages do. */
function useLabelTransform() {
  const showLabels = useAtomValue(showLabelsAtom);

  return useCallback(
    (style) => {
      if (showLabels) return style;
      return removeMapLabels(style, true);
    },
    [showLabels]
  );
}

/** Everything this page does to the map itself, mounted inside `MapView` so it
 * can reach the map context. */
function MapLegendManager() {
  useInitialLegendQuery();
  useLegendHighlight();
  useLegendClickHandler();
  return null;
}

/** Seed the legend from the starting viewport: `onMapMoved` doesn't fire until
 * the camera actually moves, so without this the panel spins until the user
 * pans. */
function useInitialLegendQuery() {
  const map = useMapElement();
  const [query, setQuery] = useAtom(legendQueryAtom);

  useEffect(() => {
    if (map == null || query != null) return;
    setQuery(legendQueryFor(map));
  }, [map, query, setQuery]);
}

/** Dim everything but the selected unit. */
function useLegendHighlight() {
  const selectedID = useAtomValue(selectedLegendIDAtom);

  useMapStyleOperator(
    (map) => {
      if (map.getLayer(CARTO_FILL_LAYER) == null) return;
      if (selectedID == null) {
        map.setPaintProperty(CARTO_FILL_LAYER, "fill-opacity", 0.5);
        return;
      }
      map.setPaintProperty(CARTO_FILL_LAYER, "fill-opacity", [
        "case",
        ["==", ["get", "legend_id"], selectedID],
        0.8,
        0.1,
      ]);
    },
    [selectedID]
  );
}

/** Select the legend entry for a clicked polygon.
 *
 * Bound through the map element rather than `useMapStyleOperator`, which has no
 * way to tear a listener back down — re-registering on every style load would
 * stack up handlers for the life of the page.
 */
function useLegendClickHandler() {
  const map = useMapElement();
  const setSelectedID = useSetAtom(selectedLegendIDAtom);

  useEffect(() => {
    if (map == null) return;

    const onClick = (e: mapboxgl.MapMouseEvent) => {
      if (map.getLayer(CARTO_FILL_LAYER) == null) return;
      const features = map.queryRenderedFeatures(e.point, {
        layers: [CARTO_FILL_LAYER],
      });
      const legendID = features[0]?.properties?.legend_id;
      if (legendID == null) return;
      setSelectedID(legendID);
    };

    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, [map, setSelectedID]);
}

// --- The page's single column ---

/** The page header, then either the legend for the current viewport or the
 * details of the entry selected from it. */
function LegendPanel() {
  const selectedEntry = useAtomValue(selectedEntryAtom);

  let content = h(LegendList);
  if (selectedEntry != null) {
    content = h(LegendEntryDetailView, { entry: selectedEntry });
  }

  return h(LocationPanel, { headerElement: h(PageHeader) }, content);
}

/** Everything above the legend. With no navbar and no context panel this is
 * the page's whole chrome: the way back out, what the page is, and the map
 * controls. It sits in the panel's header, so it stays put while the legend
 * scrolls beneath it. */
function PageHeader() {
  const [basemap, setBasemap] = useAtom(basemapAtom);
  const [showLabels, setShowLabels] = useAtom(showLabelsAtom);

  return h("header.page-header", [
    h(PageBreadcrumbs, { separateTitle: false }),
    h("p.page-description", [
      "Legend entries for the units in view, youngest first. Click a unit on ",
      "the map or in the list to isolate it.",
    ]),
    h(BaseLayerForm, { basemap, setBasemap, showLabels, setShowLabels }),
  ]);
}

/** The scrollable list of legend entries for the current viewport. */
function LegendList() {
  const res = useAtomValue(legendResultAtom);

  if (res.state === "hasError") {
    return h(NonIdealState, {
      icon: "error",
      title: "Couldn't load the legend",
      description: String(res.error),
    });
  }
  if (res.state === "hasData" && res.data != null) {
    return h(LegendEntries, { data: res.data });
  }
  return h(NonIdealState, {
    icon: h(Spinner, { size: 24 }),
    title: "Loading legend data",
  });
}

/** A single selected legend entry, as details or as its raw record. */
function LegendEntryDetailView({ entry }: { entry: any }) {
  const setSelectedID = useSetAtom(selectedLegendIDAtom);
  const [viewMode, setViewMode] = useAtom(viewModeAtom);

  let content = h(LegendEntryDetails, { entry });
  if (viewMode === LegendViewMode.JSON) {
    content = h(JSONView, { data: entry, showRoot: false });
  }

  return h("div.legend-detail", [
    h(LegendDetailHeader, {
      entry,
      viewMode,
      setViewMode,
      onClose: () => setSelectedID(null),
    }),
    content,
  ]);
}

/** Names the selected unit above its details, with its color and the
 * view-mode toggle alongside. Mirrors the panel header
 * `@macrostrat/map-interface` builds from a `title`; the library's own header
 * component isn't part of its public API, so the markup lives here. */
function LegendDetailHeader({ entry, viewMode, setViewMode, onClose }) {
  return h("header.legend-detail-header", [
    h(ColorSwatch, { color: entry.color }),
    h("span.unit-name", entry.map_unit_name ?? "Unknown unit"),
    h("div.spacer"),
    h(JSONToggleButton, { viewMode, setViewMode }),
    h(Button, { minimal: true, icon: "cross", onClick: onClose }),
  ]);
}

/** Subtle toggle between the details and the raw record, revealed on hover of
 * the header (and held visible while the raw record is showing). */
function JSONToggleButton({ viewMode, setViewMode }) {
  const isJSON = viewMode === LegendViewMode.JSON;

  let title = "Show raw record";
  let nextMode = LegendViewMode.JSON;
  if (isJSON) {
    title = "Show details";
    nextMode = LegendViewMode.Pretty;
  }

  return h(Button, {
    className: classNames("json-toggle", { active: isJSON }),
    icon: "code",
    minimal: true,
    small: true,
    active: isJSON,
    title,
    onClick: () => setViewMode(nextMode),
  });
}

function ColorSwatch({ color }: { color: string | null }) {
  if (color == null || color === "") return null;
  return h("span.color-swatch", { style: { backgroundColor: color } });
}

function LegendEntries({ data }: { data: any[] }) {
  if (data.length === 0) {
    return h(NonIdealState, {
      icon: "map",
      title: "No legend entries",
      description: "No mapped units fall within the current view.",
    });
  }

  return h(
    "div.legend-entries",
    data.map((entry) => h(LegendEntry, { key: entry.legend_id, entry }))
  );
}

function LegendEntry({ entry }: { entry: any }) {
  const setSelectedID = useSetAtom(selectedLegendIDAtom);
  const { map_unit_name, color, age } = entry;

  return h(
    "div.legend-entry",
    { onClick: () => setSelectedID(entry.legend_id) },
    [
      h(ColorSwatch, { color }),
      h("span.unit-name", map_unit_name ?? "Unknown unit"),
      h.if(age != null)(Tag, { minimal: true, className: "age-tag" }, age),
    ]
  );
}

function LegendEntryDetails({ entry }: { entry: any }) {
  const {
    strat_name,
    lith,
    descrip,
    comments,
    age,
    b_age,
    t_age,
    b_interval,
    t_interval,
    lith_id,
    lith_types,
  } = entry;

  const intervals = useResolvedIntervals([b_interval, t_interval]);
  const lithologies = useResolvedLithologies(lith_id, lith_types);

  return h("div.legend-entry-details", [
    h.if(strat_name != null)(DataField, {
      label: "Stratigraphic name",
      value: strat_name,
    }),
    h.if(age != null && age !== "")(DataField, { label: "Age", value: age }),
    h.if(intervals.length > 0)(IntervalField, { intervals }),
    h.if(b_age != null && t_age != null)(DataField, {
      label: "Age range",
      value: `${b_age}–${t_age}`,
      unit: "Ma",
    }),
    h.if(lith != null && lith !== "")(DataField, {
      label: "Lithology",
      value: lith,
    }),
    h.if(lithologies != null)(LithologyList, {
      label: "Matched lithologies",
      lithologies: lithologies ?? [],
    }),
    h.if(descrip != null)(DataField, { label: "Description", value: descrip }),
    h.if(comments != null)(DataField, { label: "Comments", value: comments }),
  ]);
}

/** Resolve interval IDs against the definitions the data provider manages. */
function useResolvedIntervals(intervalIDs: (number | null)[]) {
  const intervalMap = useMacrostratDefs("intervals");

  const ids = intervalIDs.filter((d) => d != null);

  return useMemo(() => {
    if (intervalMap == null) return [];
    return ids
      .map((id) => intervalMap.get(id))
      .filter((d) => d != null)
      .map((d) => ({ ...d, id: d.int_id }));
  }, [intervalMap, ids.join(",")]);
}

/** Resolve lithology IDs the same way, falling back to the entry's unmatched
 * lithology *types* when the IDs don't resolve — a legend entry whose liths
 * haven't been matched still has something to show. */
function useResolvedLithologies(
  lithIDs: number[] | null,
  lithTypes: string[] | null
) {
  const lithMap = useMacrostratDefs("lithologies");

  return useMemo(() => {
    const resolved = resolveLithologies(lithMap, lithIDs);
    if (resolved != null) return resolved;
    return fallbackLithologies(lithTypes);
  }, [lithMap, lithIDs, lithTypes]);
}

function resolveLithologies(lithMap: Map<number, any> | null, lithIDs) {
  if (lithMap == null || lithIDs == null || lithIDs.length === 0) return null;
  const resolved = lithIDs
    .map((id) => lithMap.get(id))
    .filter((d) => d != null)
    .map((d) => ({ ...d, name: d.lith ?? d.name, color: d.color ?? "#888" }));
  if (resolved.length === 0) return null;
  return resolved;
}

function fallbackLithologies(lithTypes: string[] | null) {
  if (lithTypes == null || lithTypes.length === 0) return null;
  return lithTypes.map((type, i) => ({
    name: type,
    color: "#888",
    lith_id: i,
  }));
}
