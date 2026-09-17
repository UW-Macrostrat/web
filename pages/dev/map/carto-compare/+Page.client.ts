/** Swipe-to-compare QC page for the two generations of Macrostrat's carto tiles.
 *
 * - **Carto v1**: `tile_layers.carto_slim`, the tiles the main map serves today,
 *   at `{tileserver}/carto-slim/{z}/{x}/{y}`.
 * - **Carto v2**: the compilation tiles assembled from the map topology
 *   (`carto_new/carto-dynamic.sql`), at `{tileserver}/dev/carto/{z}/{x}/{y}`.
 *
 * Both routes emit the same `units` and `lines` MVT layers, so both sides are
 * drawn with the identical Macrostrat style. Any visible difference between the
 * two panes is therefore a difference in the *data* — which is the point.
 */

import hyper from "@macrostrat/hyper";
import { burwellTileDomain, mapboxAccessToken } from "@macrostrat-web/settings";
import { useDarkMode } from "@macrostrat/ui-components";
import { removeMapLabels, type MapPosition } from "@macrostrat/mapbox-utils";
import { buildMacrostratStyle } from "@macrostrat/map-styles";
import { useCallback, useMemo, useState } from "react";
import {
  CompareMapView,
  type CompareOrientation,
  MapAreaContainer,
  PanelCard,
} from "@macrostrat/map-interface";
import { FormGroup, SegmentedControl, Switch, Tag } from "@blueprintjs/core";
import { atom, useAtom, useAtomValue } from "jotai";
import { atomWithSearchParam } from "~/_utils/url-atoms";
import { lastMapPositionAtom } from "~/_utils/last-map-position";
import { BaseLayerForm, Basemap, basemapStyle } from "~/components";
import { MapPageNavbar } from "~/components/map-navbar/map-page-navbar";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

/** Shared width for the floating navbar and the context panel below it. */
const PANEL_WIDTH = 320;

type CartoVersion = "v1" | "v2";

interface CartoVersionInfo {
  version: CartoVersion;
  label: string;
  route: string;
  description: string;
}

const CARTO_VERSIONS: Record<CartoVersion, CartoVersionInfo> = {
  v1: {
    version: "v1",
    label: "Carto v1",
    route: "/carto-slim",
    description: "Current production tiles (tile_layers.carto_slim).",
  },
  v2: {
    version: "v2",
    label: "Carto v2",
    route: "/dev/carto",
    description: "Compilation tiles assembled from the map topology.",
  },
};

/** Identical style parameters for both sides, so the comparison is of data. */
const CARTO_STYLE_OPTS = {
  tileserverDomain: burwellTileDomain,
  fillOpacity: 0.5,
  strokeOpacity: 0.4,
  lineOpacity: 0.8,
};

/** The Macrostrat map overlay for one carto generation. Built from the shared
 * style builder in both cases; the v2 side only swaps the tile route, keeping
 * the `burwell` source name and the `units`/`lines` source-layers. */
function cartoOverlayStyle(version: CartoVersion): mapboxgl.Style {
  const style = buildMacrostratStyle(CARTO_STYLE_OPTS);
  if (version == "v1") return style;
  const burwell = style.sources.burwell;
  return {
    ...style,
    sources: {
      burwell: {
        ...burwell,
        tiles: [`${burwellTileDomain}${CARTO_VERSIONS.v2.route}/{z}/{x}/{y}`],
      },
    },
  };
}

/** The map camera, shared with the other map pages and restored on revisit
 * (see `~/_utils/last-map-position`). Deliberately not in the URL. */
const mapPositionAtom = lastMapPositionAtom;

/** Which generation sits before the divider (left, or top). v1 is the default
 * and is kept out of the URL. */
const flipParamAtom = atomWithSearchParam("flip");
const v2FirstAtom = atom(
  (get) => get(flipParamAtom) === "on",
  (get, set, value: boolean) => {
    let param: string | null = null;
    if (value) param = "on";
    set(flipParamAtom, param);
  }
);

/** The divider's orientation. Vertical is the default and stays out of the URL. */
const DEFAULT_ORIENTATION: CompareOrientation = "vertical";
const orientationParamAtom = atomWithSearchParam("orientation");
const orientationAtom = atom(
  (get): CompareOrientation => {
    const value = get(orientationParamAtom);
    if (value === "horizontal") return value;
    return DEFAULT_ORIENTATION;
  },
  (get, set, value: CompareOrientation) => {
    let param: CompareOrientation | null = value;
    if (value === DEFAULT_ORIENTATION) param = null;
    set(orientationParamAtom, param);
  }
);

/** The base map style, persisted in the URL (parallel to the main map page).
 * "basic" is the default and is kept out of the query string. */
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

/** The generation on each side of the divider, in [before, after] order. */
const sidesAtom = atom((get): [CartoVersionInfo, CartoVersionInfo] => {
  if (get(v2FirstAtom)) return [CARTO_VERSIONS.v2, CARTO_VERSIONS.v1];
  return [CARTO_VERSIONS.v1, CARTO_VERSIONS.v2];
});

export function Page() {
  const dark = useDarkMode();
  const isEnabled = dark?.isEnabled;

  const basemap = useAtomValue(basemapAtom);
  const baseStyle = basemapStyle(basemap, isEnabled);

  const orientation = useAtomValue(orientationAtom);
  const showLabels = useAtomValue(showLabelsAtom);
  const [beforeVersion, afterVersion] = useAtomValue(sidesAtom);

  // Restore the last-viewed camera, and persist it on move.
  const [mapPosition, setMapPosition] = useAtom(mapPositionAtom);
  const [isOpen, setOpen] = useState(true);

  // Only the "before" map reports position: the two cameras are linked, so the
  // "after" map would report the same movement a second time.
  const onMapMoved = useCallback(
    (pos: MapPosition) => setMapPosition(pos),
    [setMapPosition]
  );

  const before = useMemo(
    () => ({
      overlayStyles: [cartoOverlayStyle(beforeVersion.version)],
      onMapMoved,
    }),
    [beforeVersion, onMapMoved]
  );
  const after = useMemo(
    () => ({ overlayStyles: [cartoOverlayStyle(afterVersion.version)] }),
    [afterVersion]
  );

  // Toggle basemap labels by stripping label layers from the resolved style.
  const transformStyle = useCallback(
    (style) => {
      if (showLabels) return style;
      return removeMapLabels(style, true);
    },
    [showLabels]
  );

  // Mirror the navbar width, as the other map dev pages do.
  const contextPanel = h(
    PanelCard,
    { style: { width: PANEL_WIDTH } },
    h(ComparePanel)
  );

  return h(
    MapAreaContainer,
    {
      navbar: h(MapPageNavbar, {
        isOpen,
        onToggle: () => setOpen(!isOpen),
        width: PANEL_WIDTH,
      }),
      contextPanel,
      contextPanelOpen: isOpen,
    },
    h(CompareMapView, {
      style: baseStyle,
      mapPosition,
      mapboxToken: mapboxAccessToken,
      transformStyle,
      orientation,
      before,
      after,
    })
  );
}

function ComparePanel() {
  const [orientation, setOrientation] = useAtom(orientationAtom);
  const [v2First, setV2First] = useAtom(v2FirstAtom);
  const [basemap, setBasemap] = useAtom(basemapAtom);
  const [showLabels, setShowLabels] = useAtom(showLabelsAtom);
  const [beforeVersion, afterVersion] = useAtomValue(sidesAtom);

  let sideLabels = ["Left", "Right"];
  if (orientation == "horizontal") {
    sideLabels = ["Top", "Bottom"];
  }

  return h("div.compare-panel", [
    h("p.intro", [
      "Drag the divider to reveal one generation of Macrostrat's carto tiles beneath the other. ",
      "Both sides use the same style, so any difference is in the data.",
    ]),
    h("div.sides", [
      h(SideDescription, { side: sideLabels[0], info: beforeVersion }),
      h(SideDescription, { side: sideLabels[1], info: afterVersion }),
    ]),
    h(Switch, {
      className: "flip-toggle",
      label: "Swap sides",
      checked: v2First,
      onChange: (evt) => setV2First(evt.currentTarget.checked),
    }),
    h(
      FormGroup,
      { label: "Divider", className: "orientation-field" },
      h(SegmentedControl, {
        fill: true,
        small: true,
        options: [
          { label: "Vertical", value: "vertical" },
          { label: "Horizontal", value: "horizontal" },
        ],
        value: orientation,
        onValueChange: (value) => setOrientation(value as CompareOrientation),
      })
    ),
    h(BaseLayerForm, { basemap, setBasemap, showLabels, setShowLabels }),
  ]);
}

/** One side of the divider: where it is, which generation it shows, and the
 * tile route it is drawn from. */
function SideDescription({
  side,
  info,
}: {
  side: string;
  info: CartoVersionInfo;
}) {
  return h("div.side", [
    h("div.side-header", [
      h(Tag, { minimal: true, className: "side-tag" }, side),
      h("span.version-label", info.label),
      h("code.route", info.route),
    ]),
    h("p.side-description", info.description),
  ]);
}
