/** One map or compilation, on its own: its units over a basemap, with its
 * legend beside them.
 *
 * Built like `/dev/map/legend`: the map fills everything left of one fixed
 * column, which holds the page header, the map's controls and the legend. The
 * legend is the source's own (`/map/<slug>/legend` on the v3 API), resolved the
 * way its tiles are -- every entry it draws, or only those in view.
 *
 * The source's TileJSON (`/map/<slug>/tilejson.json`) says where and at which
 * zooms its units are drawn. A compilation also has faces there -- the maps it
 * resolves to -- which are drawn below that range, where no units are, and on
 * request above it. A map without faces is simply held within its range.
 *
 * Clicking the map opens the location drawer in place of the legend: the unit
 * this map shows at that point.
 */

import {
  NonIdealState,
  SegmentedControl,
  Spinner,
  Switch,
} from "@blueprintjs/core";
import {
  mapboxAccessToken,
  apiV2Prefix,
  apiV3Prefix,
} from "@macrostrat-web/settings";
import {
  DetailPanelStyle,
  LocationPanel,
  MapAreaContainer,
  MapMarker,
  MapView,
  MacrostratLinkedData,
} from "@macrostrat/map-interface";
import { MacrostratInteractionProvider } from "@macrostrat/data-components";
import { buildMacrostratStyleLayers } from "@macrostrat/map-styles";
import { useMapElement, useMapStyleOperator } from "@macrostrat/mapbox-react";
import { removeMapLabels } from "@macrostrat/mapbox-utils";
import { MacrostratDataProvider } from "@macrostrat/data-provider";
import {
  DataField,
  ErrorBoundary,
  useDarkMode,
} from "@macrostrat/ui-components";
import boundingBox from "@turf/bbox";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { LngLatBoundsLike } from "mapbox-gl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useData } from "vike-react/useData";

import { tileRequestTransform } from "~/_utils/compilations";
import {
  BaseLayerForm,
  Basemap,
  basemapStyle,
  DevLink,
  MapReference,
  MenuButton,
  SitePageHeader,
} from "~/components";
import {
  LegendEntries,
  LegendEntryDetailView,
  sortByAge,
} from "~/components/map-legend";
import { GeologicMapInfo } from "../../map/map-interface/components/info-drawer/geo-map";
import { fetchMapInfo } from "./fetch";
import { NeighborMaps } from "./neighbors";
import { tileJSONURL, type TileJSON } from "./tilejson";
import h from "./main.module.sass";

/** The fill layer `buildMacrostratStyleLayers` builds over the `units`
 * source-layer; the selection highlight addresses it by name. */
const UNITS_FILL_LAYER = "burwell_fill";

/** The faces overlay's colour, the one the compilations page draws faces in. */
const FACES_COLOR = { light: "#2b6cb0", dark: "#7bb5ff" };

interface MapData {
  mapInfo: {
    source_id: number;
    slug: string | null;
    name: string;
    description: string;
  };
  geometry: GeoJSON.Geometry;
  tileJSON: (TileJSON & { faces?: string }) | null;
}

/** What the map shows, for the legend: its bounds and zoom. */
interface View {
  bounds: [number, number, number, number];
  zoom: number;
}

// --- Page state ---

const basemapAtom = atomWithStorage("basemap", Basemap.Basic);
const showLabelsAtom = atom(true);

enum UnitScope {
  All = "all",
  Visible = "visible",
}

const unitScopeAtom = atom(UnitScope.Visible);

/** Faces are always drawn below the units' range; this adds them above it. */
const facesAboveRangeAtom = atom(false);

const selectedLegendIDAtom = atom<number | null>(null);
const viewAtom = atom<View | null>(null);

enum MenuPage {
  Legend = "legend",
  Neighbors = "neighbors",
}

const activePageAtom = atom(MenuPage.Legend);

// --- Page ---

export function Page() {
  const { mapInfo, geometry, tileJSON } = useData<MapData>();
  const ident = mapInfo.slug ?? mapInfo.source_id;
  const dark = useDarkMode()?.isEnabled ?? false;

  const basemap = useAtomValue(basemapAtom);
  const baseStyle = basemapStyle(basemap, dark);
  const transformStyle = useLabelTransform();
  const facesAboveRange = useAtomValue(facesAboveRangeAtom);

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapRef, setMapRef] = useState<mapboxgl.Map | null>(null);

  const bounds: LngLatBoundsLike = useMemo(
    () => ensureBoxInGeographicRange(boundingBox(geometry)),
    [geometry]
  );
  const maxBounds = useMemo(() => bufferedBounds(bounds), [bounds]);

  const overlayStyles = useMemo(() => {
    const styles = [unitsStyle(ident)];
    if (tileJSON?.faces != null) {
      styles.push(facesStyle(tileJSON, facesAboveRange, dark));
    }
    return styles;
  }, [ident, tileJSON, facesAboveRange, dark]);

  const setView = useSetAtom(viewAtom);
  const onMapMoved = useCallback(
    (_position, map: mapboxgl.Map) => setView(viewOf(map)),
    [setView]
  );

  // Fit the map's bounds, unless they are too large to see at the zoom its
  // units are drawn from; then open where the TileJSON says the map is.
  let initialView: any = { bounds, fitBoundsOptions: { padding: 50 } };
  if (tileJSON?.center != null) {
    const [lng, lat, zoom] = tileJSON.center;
    initialView = { center: [lng, lat], zoom };
  }

  // A compilation may be zoomed out past its units, where its faces show what
  // it resolves to; a map is held within the zooms it is drawn at.
  let minZoom = tileJSON?.minzoom ?? 0;
  if (tileJSON?.faces != null) minZoom = 0;

  let detailPanel = h(PagePanel, { mapInfo, tileJSON });
  if (selectedLocation != null) {
    detailPanel = h(InfoDrawer, {
      compilation: ident,
      selectedLocation,
      mapRef,
      setSelectedLocation,
    });
  }

  return h(
    MapAreaContainer,
    { detailPanel, detailPanelStyle: DetailPanelStyle.FIXED },
    h(
      MapView,
      {
        style: baseStyle,
        transformStyle,
        overlayStyles,
        mapboxToken: mapboxAccessToken,
        transformRequest: tileRequestTransform,
        ...initialView,
        mapPosition: null,
        maxBounds,
        minZoom,
        infoMarkerPosition: selectedLocation,
        onMapLoaded: setMapRef,
        onMapMoved,
      },
      [
        h(MapManager),
        h(MapMarker, {
          position: selectedLocation,
          setPosition: setSelectedLocation,
        }),
      ]
    )
  );
}

// --- Map styles ---

/** The source's units, from its TileJSON: its tiles, and the zooms it is drawn
 * at, so none is requested outside them. The tiles are guarded, so requests
 * carry the tile token (`tileRequestTransform`). */
function unitsStyle(ident: string | number) {
  return {
    version: 8,
    sources: {
      burwell: { type: "vector", url: tileJSONURL(ident) },
    },
    layers: buildMacrostratStyleLayers({
      fillOpacity: 0.5,
      strokeOpacity: 0.3,
      lineOpacity: 1,
    }),
  };
}

/** The compilation's faces: where each map it resolves to wins. Below the
 * units' range always; above it only on request. */
function facesStyle(tileJSON: MapData["tileJSON"], aboveRange: boolean, dark) {
  let color = FACES_COLOR.light;
  if (dark) color = FACES_COLOR.dark;

  // A layer's `maxzoom` is exclusive: drawn below the units' first zoom.
  const range: any = {};
  if (!aboveRange) range.maxzoom = tileJSON.minzoom;

  return {
    version: 8,
    sources: {
      faces: { type: "vector", tiles: [tileJSON.faces] },
    },
    layers: [
      {
        id: "faces-fill",
        type: "fill",
        source: "faces",
        "source-layer": "map_faces",
        paint: { "fill-color": color, "fill-opacity": 0.12 },
        ...range,
      },
      {
        id: "faces-line",
        type: "line",
        source: "faces",
        "source-layer": "map_faces",
        paint: { "line-color": color, "line-width": 0.8, "line-opacity": 0.8 },
        ...range,
      },
    ],
  };
}

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

/** Everything the page does to the map itself, mounted inside `MapView`. */
function MapManager() {
  useInitialView();
  useLegendHighlight();
  return null;
}

/** Seed the view from the starting camera: `onMapMoved` does not fire until the
 * map actually moves. */
function useInitialView() {
  const map = useMapElement();
  const [view, setView] = useAtom(viewAtom);
  useEffect(() => {
    if (map == null || view != null) return;
    setView(viewOf(map));
  }, [map, view, setView]);
}

/** Dim everything but the selected unit. */
function useLegendHighlight() {
  const selectedID = useAtomValue(selectedLegendIDAtom);
  useMapStyleOperator(
    (map) => {
      if (map.getLayer(UNITS_FILL_LAYER) == null) return;
      if (selectedID == null) {
        map.setPaintProperty(UNITS_FILL_LAYER, "fill-opacity", 0.5);
        return;
      }
      map.setPaintProperty(UNITS_FILL_LAYER, "fill-opacity", [
        "case",
        ["==", ["get", "legend_id"], selectedID],
        0.8,
        0.1,
      ]);
    },
    [selectedID]
  );
}

function viewOf(map: mapboxgl.Map): View {
  const b = map.getBounds();
  return {
    bounds: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
    zoom: map.getZoom(),
  };
}

// --- The page's column ---

/** One scroll container: the site header, expanded at rest, condenses into
 * its sticky bar as the column scrolls. It is the header's sticky boundary,
 * so the header must stay its direct child. */
function PagePanel({ mapInfo, tileJSON }) {
  const activePage = useAtomValue(activePageAtom);

  let content = h(LegendContent, { mapInfo, tileJSON });
  if (activePage === MenuPage.Neighbors) {
    // Mounted only while its tab is open, so the overlap query runs on demand.
    content = h(NeighborMaps, { mapInfo });
  }

  return h(
    MacrostratDataProvider,
    { baseURL: apiV2Prefix },
    h("div.page-panel", [
      h(
        SitePageHeader,
        { variant: "hybrid", className: "panel-page-header" },
        h(MapSummary, { mapInfo })
      ),
      h(PanelControls, { tileJSON }),
      h("div.panel-body", h(ErrorBoundary, content)),
    ])
  );
}

/** Under the large title: the map's reference, description and slug. */
function MapSummary({ mapInfo }) {
  return h("div.map-summary", [
    h(
      ErrorBoundary,
      h(MapReference, { reference: mapInfo, showSourceID: false })
    ),
    h.if(mapInfo.description != null)(
      "p.page-description",
      mapInfo.description
    ),
    h.if(mapInfo.slug != null)(DataField, {
      label: "Slug",
      value: h("code", mapInfo.slug),
      inline: true,
    }),
    h("div.dev-links", [
      h(DevLink, { href: `/maps/${mapInfo.source_id}/legend` }, "Legend table"),
      h(
        DevLink,
        { href: `/maps/${mapInfo.source_id}/correlation` },
        "Correlation of units"
      ),
    ]),
  ]);
}

function PanelControls({ tileJSON }) {
  const [basemap, setBasemap] = useAtom(basemapAtom);
  const [showLabels, setShowLabels] = useAtom(showLabelsAtom);

  return h("div.panel-controls", [
    h(MenuButtons),
    h(MapControls, { tileJSON }),
    h(BaseLayerForm, { basemap, setBasemap, showLabels, setShowLabels }),
  ]);
}

function MenuButtons() {
  return h("div.menu-buttons", [
    h(MapMenuButton, { text: "Legend", icon: "tags", page: MenuPage.Legend }),
    h(MapMenuButton, {
      text: "Other maps",
      icon: "map",
      page: MenuPage.Neighbors,
    }),
  ]);
}

function MapMenuButton({ text, icon, page }) {
  const [activePage, setActivePage] = useAtom(activePageAtom);
  return h(MenuButton, {
    text,
    icon,
    size: "large",
    active: activePage === page,
    onClick: () => setActivePage(page),
  });
}

/** Which units the legend lists, and whether faces are drawn over the units.
 * "Visible" means nothing while the whole map is in view, so it is greyed
 * out then. */
function MapControls({ tileJSON }) {
  const [scope, setScope] = useAtom(unitScopeAtom);
  const [facesAbove, setFacesAbove] = useAtom(facesAboveRangeAtom);
  const view = useAtomValue(viewAtom);
  const wholeMap = showsWholeMap(view, tileJSON);

  let value = scope;
  if (wholeMap) value = UnitScope.All;

  return h("div.map-controls", [
    h("div.control-row", [
      h("span.control-label", "Show units"),
      h(SegmentedControl, {
        options: [
          { label: "All", value: UnitScope.All },
          { label: "Visible", value: UnitScope.Visible },
        ],
        small: true,
        value,
        disabled: wholeMap,
        onValueChange: (v) => setScope(v as UnitScope),
      }),
    ]),
    h.if(tileJSON?.faces != null)(Switch, {
      label: "Show resolved maps over units",
      checked: facesAbove,
      onChange: (evt) => setFacesAbove(evt.currentTarget.checked),
    }),
  ]);
}

/** The legend for the current view, or the entry selected from it. */
function LegendContent({ mapInfo, tileJSON }) {
  const [selectedID, setSelectedID] = useAtom(selectedLegendIDAtom);
  const view = useAtomValue(viewAtom);
  const scope = useAtomValue(unitScopeAtom);
  const ident = mapInfo.slug ?? mapInfo.source_id;

  const minzoom = tileJSON?.minzoom ?? 0;
  const belowRange = view != null && Math.floor(view.zoom) < minzoom;

  let useBounds = scope === UnitScope.Visible;
  if (showsWholeMap(view, tileJSON)) useBounds = false;

  const legend = useLegend(ident, view, useBounds, !belowRange);

  if (belowRange) {
    let description = `Units are drawn from zoom ${minzoom}.`;
    if (tileJSON?.faces != null) {
      description +=
        " Zoomed out, the map shows the maps this compilation resolves to.";
    }
    return h(NonIdealState, { icon: "zoom-in", title: "Zoom in", description });
  }
  if (legend.error != null) {
    return h(NonIdealState, {
      icon: "error",
      title: "Couldn't load the legend",
      description: String(legend.error),
    });
  }
  if (legend.data == null) {
    return h(NonIdealState, {
      icon: h(Spinner, { size: 24 }),
      title: "Loading legend",
    });
  }

  const selected = legend.data.find((d) => d.legend_id === selectedID);
  if (selected != null) {
    return h(LegendEntryDetailView, {
      entry: selected,
      onClose: () => setSelectedID(null),
    });
  }
  return h(LegendEntries, { data: legend.data, onSelect: setSelectedID });
}

/** The source's legend at the view's zoom: every entry it draws, or only those
 * within the view. Re-requested as the view changes; a request made stale by
 * a newer one is abandoned. */
function useLegend(
  ident: string | number,
  view: View | null,
  useBounds: boolean,
  enabled: boolean
) {
  const [state, setState] = useState<{ data: any[] | null; error: any }>({
    data: null,
    error: null,
  });

  let query: string | null = null;
  if (enabled && view != null) {
    const params = new URLSearchParams({ zoom: String(Math.floor(view.zoom)) });
    if (useBounds) params.set("bounds", view.bounds.map(roundCoord).join(","));
    query = params.toString();
  }

  useEffect(() => {
    if (query == null) return;
    const controller = new AbortController();
    setState({ data: null, error: null });
    fetch(`${apiV3Prefix}/map/${ident}/legend?${query}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Legend request failed (${res.status})`);
        return res.json();
      })
      .then((data) => setState({ data: sortByAge(data), error: null }))
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({ data: null, error });
      });
    return () => controller.abort();
  }, [ident, query]);

  return state;
}

/** Whether the view holds the whole map, when "visible" and "all" agree. */
function showsWholeMap(view: View | null, tileJSON: MapData["tileJSON"]) {
  if (view == null || tileJSON?.bounds == null) return false;
  const [w, s, e, n] = tileJSON.bounds;
  const [vw, vs, ve, vn] = view.bounds;
  return vw <= w && vs <= s && ve >= e && vn >= n;
}

/** Five decimal places is ~1 m, and keeps the request stable across redraws. */
function roundCoord(value: number): number {
  return Math.round(value * 1e5) / 1e5;
}

function ensureBoxInGeographicRange(bounds: LngLatBoundsLike) {
  // An empty geometry's bounding box is infinite.
  if (bounds[0] > 180) {
    return [-90, -90, 90, 90];
  }
  if (bounds[1] < -90) bounds[1] = -90;
  if (bounds[3] > 90) bounds[3] = 90;
  return bounds;
}

/** Room to pan around the map: its bounds, grown by their larger side. */
function bufferedBounds(bounds: LngLatBoundsLike): LngLatBoundsLike {
  const dx = bounds[2] - bounds[0];
  const dy = bounds[3] - bounds[1];
  const buf = Math.max(dx, dy);
  return ensureBoxInGeographicRange([
    bounds[0] - buf,
    bounds[1] - buf,
    bounds[2] + buf,
    bounds[3] + buf,
  ]);
}

// --- Location drawer ---

/** What this map says at a clicked point: the unit it maps there, then what
 * that unit is linked to in Macrostrat. */
function InfoDrawer({
  compilation,
  selectedLocation,
  mapRef,
  setSelectedLocation,
}) {
  const lat = selectedLocation?.lat;
  const lng = selectedLocation?.lng;
  const zoom = mapRef?.getZoom() ?? 0;

  // Answered from this map or compilation, the way its tiles are drawn; the
  // v2 lookup otherwise answers from the legacy carto build.
  const mapInfo = fetchMapInfo(lng, lat, zoom, compilation);

  let content: any = h(NonIdealState, {
    icon: h(Spinner, { size: 24 }),
    title: "Loading",
  });
  if (mapInfo != null) {
    const source = mapInfo.mapData?.[0];
    content = h(NonIdealState, {
      icon: "map",
      title: "No unit mapped here",
      description: "This map has nothing at this point.",
    });
    if (source != null) {
      content = [
        h(GeologicMapInfo, { source, bedrockExpanded: true }),
        h(MacrostratLinkedData, {
          mapInfo,
          source,
          stratNameURL: "/lex/strat-names",
          environmentURL: "/lex/environments",
          intervalURL: "/lex/intervals",
          lithologyURL: "/lex/lithologies",
        }),
      ];
    }
  }

  return h(
    MacrostratInteractionProvider,
    { linkDomain: "/" },
    h(
      LocationPanel,
      {
        position: selectedLocation,
        onClose: () => setSelectedLocation(null),
      },
      content
    )
  );
}
