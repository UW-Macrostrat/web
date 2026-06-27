/** Spatial usage views for Macrostrat.
 *
 * The headline layer is **tile-request density** from the tileserver-stats
 * pipeline (`/dev/request-stats/{z}/{x}/{y}`, MVT source-layer `requests`,
 * feature property `num_requests`). The legacy app-access points
 * (`/usage-stats/macrostrat/...`) remain available as toggles.
 *
 * Styled after /dev/map/topology: a floating navbar + context panel over a
 * full-bleed globe map.
 */

import hyper from "@macrostrat/hyper";
import { mapboxAccessToken } from "@macrostrat-web/settings";
import { Spacer, useDarkMode } from "@macrostrat/ui-components";
import { removeMapLabels } from "@macrostrat/mapbox-utils";
import { useCallback, useMemo, useState } from "react";
import {
  FloatingNavbar,
  MapLoadingButton,
  MapAreaContainer,
  MapView,
  PanelCard,
  LocationPanel,
  MapMarker,
  FeatureSelectionHandler,
  Features,
} from "@macrostrat/map-interface";
import { FormGroup, Switch, NonIdealState } from "@blueprintjs/core";
import { atom, useAtom, useAtomValue } from "jotai";
import { atomWithLocation } from "jotai-location";
import {
  PageBreadcrumbsInternal,
  PageTitle,
  usePageBreadcrumbs,
  BaseLayerDisclosure,
  Basemap,
  basemapStyle,
} from "~/components";
import {
  REQUEST_RAMP,
  requestStatsStyle,
  allAccessStyle,
  todayAccessStyle,
} from "./layer-styles";
import styles from "./main.module.scss";

const h = hyper.styled(styles);

/** Shared width for the floating navbar and the context panel below it. */
const PANEL_WIDTH = 320;

// --- URL-synced view state (defaults kept out of the query string) ----------

const locationAtom = atomWithLocation({ replace: true });

/** Read/write atom backed by a single URL query parameter; writing null clears
 * it, keeping default views out of the URL. */
function atomWithSearchParam(key: string) {
  return atom(
    (get) => get(locationAtom).searchParams?.get(key) ?? null,
    (get, set, value: string | null) => {
      const loc = get(locationAtom);
      const searchParams = new URLSearchParams(loc.searchParams);
      if (value == null || value === "") {
        searchParams.delete(key);
      } else {
        searchParams.set(key, value);
      }
      set(locationAtom, { ...loc, searchParams });
    }
  );
}

/** Boolean toggle synced to the URL. Only the non-default state is written
 * (as "on"/"off"); the default stays out of the query string. */
function toggleAtom(key: string, defaultValue: boolean) {
  const param = atomWithSearchParam(key);
  return atom(
    (get) => {
      const value = get(param);
      if (value == null) return defaultValue;
      return value === "on";
    },
    (get, set, value: boolean) => {
      let param_: string | null = value ? "on" : "off";
      if (value === defaultValue) param_ = null;
      set(param, param_);
    }
  );
}

/** Layer toggles. The request-density layer is the headline and defaults on. */
const showRequestsAtom = toggleAtom("requests", true);
const showAccessAllAtom = toggleAtom("access", false);
const showAccessTodayAtom = toggleAtom("today", false);

/** Base map style, persisted in the URL ("basic" is default and omitted). */
const basemapParamAtom = atomWithSearchParam("basemap");
const basemapAtom = atom(
  (get): Basemap => {
    const value = get(basemapParamAtom);
    if (value === Basemap.Satellite || value === Basemap.None) {
      return value as Basemap;
    }
    return Basemap.Basic;
  },
  (get, set, value: Basemap) => {
    let param: Basemap | null = value;
    if (value === Basemap.Basic) param = null;
    set(basemapParamAtom, param);
  }
);

/** Whether basemap labels are shown (on by default; "off" stored in the URL). */
const labelsParamAtom = atomWithSearchParam("labels");
const showLabelsAtom = atom(
  (get) => get(labelsParamAtom) !== "off",
  (get, set, value: boolean) => {
    let param: string | null = null;
    if (!value) param = "off";
    set(labelsParamAtom, param);
  }
);

export function Page() {
  const dark = useDarkMode();
  const isEnabled = dark?.isEnabled;

  const basemap = useAtomValue(basemapAtom);
  const baseStyle = basemapStyle(basemap, isEnabled);

  const [isOpen, setOpen] = useState(true);

  const [inspectPosition, setInspectPosition] =
    useState<mapboxgl.LngLat | null>(null);
  const [features, setFeatures] = useState(null);

  const showRequests = useAtomValue(showRequestsAtom);
  const showAccessAll = useAtomValue(showAccessAllAtom);
  const showAccessToday = useAtomValue(showAccessTodayAtom);
  const showLabels = useAtomValue(showLabelsAtom);

  // Order matters: the request-density fill sits beneath the access points.
  const overlayStyles = useMemo(() => {
    const overlays: mapboxgl.Style[] = [];
    if (showRequests) overlays.push(requestStatsStyle());
    if (showAccessAll) overlays.push(allAccessStyle());
    if (showAccessToday) overlays.push(todayAccessStyle());
    return overlays;
  }, [showRequests, showAccessAll, showAccessToday]);

  const transformStyle = useCallback(
    (style) => {
      if (showLabels) return style;
      return removeMapLabels(style, true);
    },
    [showLabels]
  );

  const onSelectPosition = useCallback((position: mapboxgl.LngLat) => {
    setInspectPosition(position);
  }, []);

  const contextPanel = h(
    PanelCard,
    { style: { width: PANEL_WIDTH } },
    h(LayerPanel)
  );

  let detailPanel = null;
  if (inspectPosition != null) {
    detailPanel = h(
      LocationPanel,
      {
        onClose: () => setInspectPosition(null),
        position: inspectPosition,
      },
      h(MapInspector, { features })
    );
  }

  return h(
    MapAreaContainer,
    {
      navbar: h(
        FloatingNavbar,
        { className: styles["heatmap-navbar"], width: PANEL_WIDTH },
        h(NavbarHeader, { isOpen, onToggle: () => setOpen(!isOpen) })
      ),
      contextPanel,
      detailPanel,
      contextPanelOpen: isOpen,
    },
    h(
      MapView,
      {
        style: baseStyle,
        mapPosition: null,
        projection: { name: "globe" },
        mapboxToken: mapboxAccessToken,
        overlayStyles,
        transformStyle,
      },
      [
        h(FeatureSelectionHandler, {
          selectedLocation: inspectPosition,
          setFeatures,
        }),
        h(MapMarker, {
          position: inspectPosition,
          setPosition: onSelectPosition,
        }),
      ]
    )
  );
}

/** Vector-tile sources this page renders; everything else queried at the click
 * point is basemap noise we keep out of the inspector. */
const HEATMAP_SOURCES = new Set(["request-stats", "access", "today"]);

/** Click-inspector body: the raw vector-tile feature properties (incl.
 * `num_requests`) via the shared dev feature-display component. */
function MapInspector({ features }) {
  let primitives = null;
  if (features != null) {
    primitives = features.filter((f) => HEATMAP_SOURCES.has(f.source));
  }

  if (primitives == null || primitives.length === 0) {
    return h(NonIdealState, {
      icon: "map-marker",
      title: "No data here",
      description: "No request or access features at this point.",
    });
  }

  return h(Features, { features: primitives });
}

/** Navbar header: collapsing breadcrumb trail with the page title and the panel
 * toggle on the row below (mirrors the topology page). */
function NavbarHeader({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
  const trail = usePageBreadcrumbs().slice(0, -1);

  return h("div.navbar-header", [
    h(PageBreadcrumbsInternal, {
      items: trail,
      showLogo: true,
      separateTitle: false,
    }),
    h("div.title-row", [
      h(PageTitle, { headingLevel: 2 }),
      h(Spacer),
      h(MapLoadingButton, { active: isOpen, onClick: onToggle, large: false }),
    ]),
  ]);
}

function LayerPanel() {
  const [showRequests, setShowRequests] = useAtom(showRequestsAtom);
  const [showAccessAll, setShowAccessAll] = useAtom(showAccessAllAtom);
  const [showAccessToday, setShowAccessToday] = useAtom(showAccessTodayAtom);
  const [basemap, setBasemap] = useAtom(basemapAtom);
  const [showLabels, setShowLabels] = useAtom(showLabelsAtom);

  let legend = null;
  if (showRequests) legend = h(RequestLegend);

  return h("div.layer-panel", [
    h(
      "p.intro",
      "Spatial patterns of Macrostrat usage. Tile-request density shows where map tiles are fetched; access points mark where the site is loaded from."
    ),
    h(FormGroup, { label: "Layers", className: "layers-field" }, [
      h(Switch, {
        label: "Tile request density",
        checked: showRequests,
        onChange: (e) => setShowRequests(e.currentTarget.checked),
      }),
      legend,
      h(Switch, {
        label: "Access points — all time",
        checked: showAccessAll,
        onChange: (e) => setShowAccessAll(e.currentTarget.checked),
      }),
      h(Switch, {
        label: "Access points — today",
        checked: showAccessToday,
        onChange: (e) => setShowAccessToday(e.currentTarget.checked),
      }),
    ]),
    h(BaseLayerDisclosure, { basemap, setBasemap, showLabels, setShowLabels }),
  ]);
}

/** Horizontal color-ramp legend for the request-density layer. */
function RequestLegend() {
  const gradient = `linear-gradient(to right, ${REQUEST_RAMP.join(", ")})`;
  return h("div.request-legend", [
    h("div.legend-bar", { style: { background: gradient } }),
    h("div.legend-labels", [h("span", "fewer"), h("span", "more requests")]),
  ]);
}

