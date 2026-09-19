/** Map legend for the current viewport.
 *
 * A port of the `Map interface/Map legend` story from `web-components`, brought
 * over as a `/dev` page more or less as the story had it: the Macrostrat carto
 * overlay on a basic basemap, with a fixed detail panel listing the legend
 * entries that fall within the map's bounds, youngest unit first.
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
  PanelCard,
  useBasicStylePair,
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
import { JSONView } from "@macrostrat/ui-components";
import { useMapElement, useMapStyleOperator } from "@macrostrat/mapbox-react";
import type { MapPosition } from "@macrostrat/mapbox-utils";
import {
  apiV2Prefix,
  apiV3Prefix,
  burwellTileDomain,
  mapboxAccessToken,
} from "@macrostrat-web/settings";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { loadable } from "jotai/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { lastMapPositionAtom } from "~/_utils/last-map-position";
import { MapPageNavbar } from "~/components/map-navbar/map-page-navbar";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

/** Shared width for the floating navbar and the context panel below it. */
const PANEL_WIDTH = 320;

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

/** The legend is assembled from carto's own scale-dependent unit selection, so
 * the request is keyed on a tile zoom several levels finer than the map's —
 * the offset the story arrived at. */
const LEGEND_ZOOM_OFFSET = 4;

interface MapArea {
  name: string;
  bounds: [number, number, number, number];
}

/** The areas the story shipped as its individual stories, kept here as quick
 * jumps — each is somewhere the legend has enough variety to be worth reading. */
const MAP_AREAS: MapArea[] = [
  { name: "South Dakota", bounds: [-100, 43, -98, 44] },
  { name: "Utah", bounds: [-112, 38, -110, 40] },
  { name: "Appalachia", bounds: [-82, 36, -79, 38] },
];

/** Where to start when there's no recent last-viewed position: roughly the
 * story's South Dakota view. */
const DEFAULT_MAP_POSITION: MapPosition = {
  camera: { lng: -99, lat: 43.5, altitude: 250_000 },
};

// --- Page state ---

/** The camera, shared with the other map pages and restored on revisit
 * (see `~/_utils/last-map-position`). Deliberately not in the URL. */
const mapPositionAtom = lastMapPositionAtom;

/** The query string the legend is fetched with — bounds and zoom, already
 * rounded. Holding the *string* rather than the bounds object means a camera
 * nudge too small to change the request doesn't refetch. */
const legendQueryAtom = atom<string | null>(null);

/** An area waiting to be flown to, cleared once the map has been sent there. */
const pendingAreaAtom = atom<MapArea | null>(null);

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
  const [isOpen, setOpen] = useState(true);
  const style = useBasicStylePair();
  const mapPosition = useInitialMapPosition();
  const onMapMoved = useMapMovedHandler();

  // The definition maps the detail panel resolves interval and lithology IDs
  // against; the map itself needs nothing from the provider.
  const detailPanel = h(
    MacrostratDataProvider,
    { baseURL: apiV2Prefix },
    h(LegendPanel)
  );

  return h(
    MapAreaContainer,
    {
      navbar: h(MapPageNavbar, {
        isOpen,
        onToggle: () => setOpen(!isOpen),
        width: PANEL_WIDTH,
      }),
      contextPanel: h(
        PanelCard,
        { style: { width: PANEL_WIDTH } },
        h(AreaPanel)
      ),
      contextPanelOpen: isOpen,
      detailPanel,
      detailPanelStyle: DetailPanelStyle.FIXED,
    },
    h(
      MapView,
      {
        style,
        mapPosition,
        mapboxToken: mapboxAccessToken,
        enableTerrain: true,
        overlayStyles: [macrostratOverlay],
        onMapMoved,
      },
      h(MapLegendManager)
    )
  );
}

/** The camera to open at. `MapView` applies `mapPosition` at initialization
 * only, so this is frozen on first render rather than tracking the atom it
 * came from — which the map updates on every move. */
function useInitialMapPosition(): MapPosition {
  const stored = useAtomValue(mapPositionAtom);
  const [initial] = useState(() => stored ?? DEFAULT_MAP_POSITION);
  return initial;
}

function useMapMovedHandler() {
  const setMapPosition = useSetAtom(mapPositionAtom);
  const setLegendQuery = useSetAtom(legendQueryAtom);

  return useCallback(
    (position: MapPosition, map: mapboxgl.Map) => {
      setMapPosition(position);
      setLegendQuery(legendQueryFor(map));
    },
    [setMapPosition, setLegendQuery]
  );
}

/** Everything this page does to the map itself, mounted inside `MapView` so it
 * can reach the map context. */
function MapLegendManager() {
  useInitialLegendQuery();
  useLegendHighlight();
  useLegendClickHandler();
  useAreaFocus();
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

/** Fly to an area picked in the context panel. */
function useAreaFocus() {
  const map = useMapElement();
  const [area, setArea] = useAtom(pendingAreaAtom);

  useEffect(() => {
    if (map == null || area == null) return;
    map.fitBounds(area.bounds, { padding: 40 });
    setArea(null);
  }, [map, area, setArea]);
}

// --- Context panel ---

function AreaPanel() {
  const setArea = useSetAtom(pendingAreaAtom);

  return h("div.area-panel", [
    h("p.intro", [
      "Legend entries for the units in view, youngest first. Click a unit on ",
      "the map or in the list to isolate it.",
    ]),
    h("h3.areas-title", "Jump to"),
    h(
      "div.areas",
      MAP_AREAS.map((area) =>
        h(Button, {
          key: area.name,
          minimal: true,
          alignText: "left",
          fill: true,
          text: area.name,
          onClick: () => setArea(area),
        })
      )
    ),
  ]);
}

// --- Detail panel ---

function LegendPanel() {
  const selectedEntry = useAtomValue(selectedEntryAtom);
  if (selectedEntry != null) {
    return h(LegendDetailPanel, { entry: selectedEntry });
  }
  return h(LegendListPanel);
}

/** The scrollable list of legend entries for the current viewport. */
function LegendListPanel() {
  const res = useAtomValue(legendResultAtom);

  let content;
  if (res.state === "hasError") {
    content = h(NonIdealState, {
      icon: "error",
      title: "Couldn't load the legend",
      description: String(res.error),
    });
  } else if (res.state === "hasData" && res.data != null) {
    content = h(LegendEntries, { data: res.data });
  } else {
    content = h(NonIdealState, {
      icon: h(Spinner, { size: 24 }),
      title: "Loading legend data",
    });
  }

  return h(
    LocationPanel,
    { title: "Map legend", style: { flexShrink: 1 } },
    content
  );
}

/** A single selected legend entry, as details or as its raw record. */
function LegendDetailPanel({ entry }: { entry: any }) {
  const setSelectedID = useSetAtom(selectedLegendIDAtom);
  const [viewMode, setViewMode] = useAtom(viewModeAtom);

  const headerElement = h(LegendDetailHeader, {
    entry,
    viewMode,
    setViewMode,
    onClose: () => setSelectedID(null),
  });

  let content = h(LegendEntryDetails, { entry });
  if (viewMode === LegendViewMode.JSON) {
    content = h(JSONView, { data: entry, showRoot: false });
  }

  return h(LocationPanel, { headerElement, style: { flexShrink: 1 } }, content);
}

/** Mirrors the panel header `@macrostrat/map-interface` builds from a `title`,
 * with the unit's color and the view-mode toggle alongside the name. The
 * library's own header component isn't part of its public API, so the markup
 * lives here. */
function LegendDetailHeader({ entry, viewMode, setViewMode, onClose }) {
  return h("header.legend-panel-header", [
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
