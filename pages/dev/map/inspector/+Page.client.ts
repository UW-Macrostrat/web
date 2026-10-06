/** Tile inspector for the main map's geologic layer.
 *
 * The modern counterpart of the legacy `/dev/map/layers/carto` inspector. It
 * draws exactly what `/map` draws: the Macrostrat style over a compilation's
 * tiles (`carto` by default), with the tile token attached for the guarded
 * compilations. Click anywhere to see every rendered feature under the point,
 * the geologic map tiles' first, with the tile they came from.
 *
 * Everything that identifies a view is in the URL, so `/map` can link straight
 * to what is under its info marker:
 *  - the camera, in the hash, in the main map's `x`/`y`/`z` form;
 *  - the compilation, as `?compilation=` (absent for `carto`), as on `/map`;
 *  - the inspected point, as `?pin=lng,lat`, as on the diff page.
 */

import hyper from "@macrostrat/hyper";
import { AnchorButton, HTMLSelect, Switch } from "@blueprintjs/core";
import {
  buildInspectorStyle,
  FeaturePanel,
  FeatureSelectionHandler,
  LocationPanel,
  MapAreaContainer,
  MapMarker,
  MapView,
  PanelCard,
  TileExtentLayer,
  TileInfo,
} from "@macrostrat/map-interface";
import { buildMacrostratStyle } from "@macrostrat/map-styles";
import { useDarkMode } from "@macrostrat/ui-components";
import type { MapPosition } from "@macrostrat/mapbox-utils";
import { burwellTileDomain, mapboxAccessToken } from "@macrostrat-web/settings";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import mapboxgl from "mapbox-gl";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  basemapAtom,
  showLabelsAtom,
  useLabelTransform,
} from "~/_utils/basemap";
import { atomWithSearchParam, locationAtom } from "~/_utils/url-atoms";
import { lastMapPositionAtom } from "~/_utils/last-map-position";
import { hashWithMapPosition, initialMapPosition } from "~/_utils/map-position";
import {
  applyCompilationTiles,
  compilationLabel,
  compilationOrDefault,
  compilationsAtom,
  DEFAULT_COMPILATION,
  tileRequestTransform,
} from "~/_utils/compilations";
import { LineSymbolManager } from "~/_utils/map-layers.client";
import {
  BaseLayerForm,
  Basemap,
  basemapStyle,
  PageBreadcrumbs,
} from "~/components";
import { mainMapHref } from "~/_utils/tile-inspector";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

/** The source `buildMacrostratStyle` draws the geologic map from. */
const GEOLOGY_SOURCE = "burwell";

const DEFAULT_MAP_POSITION: MapPosition = {
  camera: { lng: -100, lat: 40, altitude: 5_000_000 },
};

// --- Page state ---

/** The compilation drawn, as on `/map`: absent means `carto`. */
const compilationParamAtom = atomWithSearchParam("compilation");
const compilationAtom = atom(
  (get) => compilationOrDefault(get(compilationParamAtom)),
  (get, set, slug: string) => {
    let param: string | null = slug;
    if (slug == DEFAULT_COMPILATION) param = null;
    set(compilationParamAtom, param);
  }
);

/** The inspected point. Rounded to ~1 m, which also keeps the URL stable. */
const pinParamAtom = atomWithSearchParam("pin");
const pinAtom = atom(
  (get) => parsePin(get(pinParamAtom)),
  (get, set, value: { lng: number; lat: number } | null) => {
    let param: string | null = null;
    if (value != null) {
      param = `${roundCoord(value.lng)},${roundCoord(value.lat)}`;
    }
    set(pinParamAtom, param);
  }
);

/** The camera in the hash, written through `locationAtom` so the query string
 * above survives (see `hashWithMapPosition`). */
const mapPositionHashAtom = atom(null, (get, set, position: MapPosition) => {
  const loc = get(locationAtom);
  set(locationAtom, { ...loc, hash: hashWithMapPosition(loc.hash, position) });
});

/** Display options: a viewer's preference, not part of the view. */
const displayOptionsAtom = atomWithStorage("macrostrat:tile-inspector", {
  xRay: false,
  showTileExtent: false,
  showLineSymbols: false,
});

function roundCoord(value: number): number {
  return Math.round(value * 1e5) / 1e5;
}

function parsePin(param: string | null): { lng: number; lat: number } | null {
  if (param == null) return null;
  const [lng, lat] = param.split(",").map(Number);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return { lng, lat };
}

// --- Page ---

export function Page() {
  const compilation = useAtomValue(compilationAtom);
  const { xRay } = useAtomValue(displayOptionsAtom);
  const basemap = useAtomValue(basemapAtom);
  const style = useInspectorStyle(compilation, basemap, xRay);
  const transformStyle = useLabelTransform();

  const mapPosition = useInitialMapPosition();
  const onMapMoved = useMapMovedHandler();
  const [pin, setPin] = usePin();
  const [features, setFeatures] = useState(null);

  // `MapAreaContainer` opens the detail panel whenever it is given one.
  let detailPanel = null;
  if (pin != null) {
    detailPanel = h(InspectorDetails, {
      pin,
      features,
      onClose: () => setPin(null),
    });
  }

  return h(
    MapAreaContainer,
    {
      contextPanel: h(InspectorControls),
      contextPanelOpen: true,
      detailPanel,
    },
    h(
      MapView,
      {
        style,
        mapPosition,
        projection: { name: "globe" },
        mapboxToken: mapboxAccessToken,
        // Compilations other than `carto` are guarded on the tileserver.
        transformRequest: tileRequestTransform,
        transformStyle,
        onMapMoved,
      },
      [
        h(FeatureSelectionHandler, {
          key: "selection",
          selectedLocation: pin,
          setFeatures,
        }),
        h(MapMarker, { key: "marker", position: pin, setPosition: setPin }),
        h(InspectorLayers, { key: "layers", features }),
      ]
    )
  );
}

/** The basemap with the compilation's geologic map over it, run through the
 * inspector's x-ray treatment when asked. Built asynchronously, since the
 * basemap is fetched to be merged. */
function useInspectorStyle(
  compilation: string,
  basemap: Basemap,
  xRay: boolean
) {
  const inDarkMode = useDarkMode()?.isEnabled ?? false;
  const [style, setStyle] = useState(null);

  const overlayStyle = useMemo(() => {
    const base = buildMacrostratStyle({ tileserverDomain: burwellTileDomain });
    return applyCompilationTiles(base as mapboxgl.Style, compilation);
  }, [compilation]);

  useEffect(() => {
    let cancelled = false;
    const baseStyle = basemapStyle(basemap, inDarkMode);
    buildInspectorStyle(baseStyle, overlayStyle, {
      mapboxToken: mapboxAccessToken,
      inDarkMode,
      xRay,
    }).then((s) => {
      if (!cancelled) setStyle(s);
    });
    return () => {
      cancelled = true;
    };
  }, [overlayStyle, basemap, inDarkMode, xRay]);

  return style;
}

/** Frozen on first render: `MapView` applies `mapPosition` at initialization
 * only. See `~/_utils/map-position` for the order the sinks are read in. */
function useInitialMapPosition(): MapPosition {
  const [initial] = useState(() => initialMapPosition(DEFAULT_MAP_POSITION));
  return initial;
}

function useMapMovedHandler() {
  const setStoredPosition = useSetAtom(lastMapPositionAtom);
  const setHashPosition = useSetAtom(mapPositionHashAtom);

  return useCallback(
    (position: MapPosition) => {
      setStoredPosition(position);
      setHashPosition(position);
    },
    [setStoredPosition, setHashPosition]
  );
}

/** The inspected point as a `LngLat` — stable across renders, so the feature
 * query only re-runs when the point moves. */
function usePin(): [
  mapboxgl.LngLat | null,
  (lngLat: mapboxgl.LngLat | null) => void
] {
  const [location, setLocation] = useAtom(pinAtom);
  const lng = location?.lng;
  const lat = location?.lat;

  const pin = useMemo(() => {
    if (lng == null || lat == null) return null;
    return new mapboxgl.LngLat(lng, lat);
  }, [lng, lat]);

  const setPin = useCallback(
    (lngLat: mapboxgl.LngLat | null) => {
      let value = null;
      if (lngLat != null) value = { lng: lngLat.lng, lat: lngLat.lat };
      setLocation(value);
    },
    [setLocation]
  );

  return [pin, setPin];
}

// --- Map layers ---

/** Inspector-only additions to the map: the inspected feature's tile outline
 * and the line symbols. */
function InspectorLayers({ features }) {
  const { showTileExtent, showLineSymbols } = useAtomValue(displayOptionsAtom);
  const inDarkMode = useDarkMode()?.isEnabled ?? false;

  let tile = null;
  const feature = features?.[0];
  if (showTileExtent && feature != null) {
    tile = { x: feature._x, y: feature._y, z: feature._z };
  }

  let color = "black";
  if (inDarkMode) color = "white";

  return h([
    h(TileExtentLayer, { key: "extent", tile, color }),
    h(LineSymbolManager, { key: "symbols", showLineSymbols }),
  ]);
}

// --- Panels ---

function InspectorControls() {
  const [options, setOptions] = useAtom(displayOptionsAtom);
  const [basemap, setBasemap] = useAtom(basemapAtom);
  const [showLabels, setShowLabels] = useAtom(showLabelsAtom);
  const update = (patch) => setOptions({ ...options, ...patch });

  return h(PanelCard, { className: "inspector-controls" }, [
    h(PageBreadcrumbs, { separateTitle: false }),
    h(
      "p.page-description",
      "The main map's geologic tiles. Click to inspect the features under a point."
    ),
    h(CompilationSelect),
    h("div.display-options", [
      h(Switch, {
        label: "X-ray",
        checked: options.xRay,
        inline: true,
        onChange: () => update({ xRay: !options.xRay }),
      }),
      h(Switch, {
        label: "Line symbols",
        checked: options.showLineSymbols,
        inline: true,
        onChange: () => update({ showLineSymbols: !options.showLineSymbols }),
      }),
    ]),
    h(BaseLayerForm, { basemap, setBasemap, showLabels, setShowLabels }),
    h(MainMapLink),
  ]);
}

/** Every compilation the tileserver can draw. Before the list loads (or for a
 * slug it doesn't know), the current slug is still offered, so a shared link
 * renders right away. */
function CompilationSelect() {
  const [compilation, setCompilation] = useAtom(compilationAtom);
  const res = useAtomValue(compilationsAtom);

  let compilations = [];
  if (res.state == "hasData") compilations = res.data;

  const options = compilations.map((c) => ({
    value: c.slug,
    label: compilationLabel(c),
  }));
  if (!options.some((o) => o.value == compilation)) {
    options.unshift({ value: compilation, label: compilation });
  }

  return h(HTMLSelect, {
    value: compilation,
    options,
    fill: true,
    minimal: true,
    "aria-label": "Compilation",
    onChange: (e) => setCompilation(e.currentTarget.value),
  });
}

/** Back to `/map` at the inspected point (or the camera), on the same
 * compilation. */
function MainMapLink() {
  const compilation = useAtomValue(compilationAtom);
  const pin = useAtomValue(pinAtom);
  const location = useAtomValue(locationAtom);

  const href = mainMapHref({ compilation, pin, hash: location.hash ?? "" });

  return h(AnchorButton, {
    href,
    icon: "map",
    text: "Open on the main map",
    minimal: true,
    small: true,
    alignText: "left",
  });
}

function InspectorDetails({ pin, features, onClose }) {
  const [options, setOptions] = useAtom(displayOptionsAtom);

  return h(LocationPanel, { position: pin, onClose }, [
    h(TileInfo, {
      feature: features?.[0] ?? null,
      showExtent: options.showTileExtent,
      setShowExtent() {
        setOptions({ ...options, showTileExtent: !options.showTileExtent });
      },
    }),
    h(FeaturePanel, {
      features,
      focusedSource: GEOLOGY_SOURCE,
      focusedSourceTitle: "Geologic map tiles",
    }),
  ]);
}
