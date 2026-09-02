/** EMIT mineral maps.
 *
 * Everything here is the `emit-minerals` layer in Macrostrat's raster index,
 * served by the tileserver at `/rasters/emit-minerals/...`. Every registered
 * raster composites into one layer, rendered with the palette stored on the
 * layer. Until the rasters are registered the layer is simply empty, and the
 * panel says so.
 *
 * Two filters narrow what's drawn, both server-side, both composable:
 *
 * - **classes** — `?classes=Alunite,Muscovite`, resolved against the class
 *   vocabulary the index stores for the layer. Excluded classes are masked after
 *   compositing, so survivors keep their own palette colors.
 * - **datasets** — `?datasets=<slug>`, narrowing the mosaic to one raster.
 *
 * There is deliberately no separate single-file rendering path any more. Viewing
 * one dataset used to mean pointing titiler's generic `/cog` route at a
 * hard-coded bucket URL, which returned raw class indices and so needed its own
 * Mapbox paint expression, its own one-class-at-a-time limit, and its own
 * point-query shape. Going through the mosaic means a focused dataset is the
 * same route with a narrower asset selection — same palette, same class names,
 * same transparent empty tiles.
 *
 * Which datasets exist is likewise not hard-coded: the layer's `/footprints` and
 * `/point` routes report them, so the picker is whatever the index holds.
 */

import hyper from "@macrostrat/hyper";
import {
  burwellTileDomain,
  emitMineralsToken,
  mapboxAccessToken,
} from "@macrostrat-web/settings";
import { Box, useDarkMode } from "@macrostrat/ui-components";
import { Tag as ClassTag, TagSize } from "@macrostrat/data-components";
import { removeMapLabels, type MapPosition } from "@macrostrat/mapbox-utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LocationPanel,
  MapAreaContainer,
  MapMarker,
  MapView,
  PanelCard,
} from "@macrostrat/map-interface";
import { atom, useAtom, useAtomValue } from "jotai";
import {
  Button,
  Callout,
  Checkbox,
  ControlGroup,
  FormGroup,
  HTMLSelect,
  Intent,
  Slider,
  Switch,
  Tag,
} from "@blueprintjs/core";
import { loadable } from "jotai/utils";
import { useMapEaseTo } from "@macrostrat/mapbox-react";
import { buildMacrostratStyle } from "@macrostrat/map-styles";
import { atomWithSearchParam } from "~/_utils/url-atoms";
import {
  BaseLayerForm,
  Basemap,
  basemapStyle,
  ExpandablePanel,
} from "~/components";
import { MapPageNavbar } from "~/components/map-navbar/map-page-navbar";
import { lastMapPositionAtom } from "~/_utils/last-map-position";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

/** Shared width for the floating navbar and the context panel below it, so the
 * two read as one column — the same arrangement as the topology page. */
const PANEL_WIDTH = 320;

/** The layer slug registered in the raster index (and mounted by the
 * tileserver as `/rasters/<slug>`). */
const RASTER_LAYER = "emit-minerals";

/** titiler 1.x makes the tile matrix set explicit in every tile path. */
const TMS = "WebMercatorQuad";

/** MVT layer name emitted by `raster_layers.footprint_tile` — a cross-repo
 * contract with the tileserver's SQL. */
const FOOTPRINTS_SOURCE_LAYER = "raster_footprints";

/** Both routes live on the configured tileserver, so this page follows the
 * environment (local, dev, production) rather than pinning one instance. */
const cogBaseURL = `${burwellTileDomain}/cog`;
const mosaicBaseURL = `${burwellTileDomain}/rasters/${RASTER_LAYER}`;

/** Every route under `/rasters/emit-minerals` requires a delegated token — the
 * tiles, but also `/layer`, `/footprints` and `/point`. So the token goes on
 * this layer's own requests, in a header rather than the query string (a tile
 * URL ends up in access logs, history and `Referer`).
 *
 * `/cog` is not guarded, so `cogBaseURL` requests use plain `fetch`. */
function mosaicFetch(url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (emitMineralsToken) {
    headers.set("Authorization", `Bearer ${emitMineralsToken}`);
  }
  return fetch(url, { ...init, headers });
}

/** Fallback view: the conterminous US, where most of the datasets sit. */
const DEFAULT_BOUNDS = [-125, 24, -66, 49];

export function Page() {
  const [isOpen, setOpen] = useState(false);
  const dark = useDarkMode();

  const [inspectPosition, setInspectPosition] = useAtom(inspectPositionAtom);
  // Shared across every Macrostrat map page, so arriving here lands wherever the
  // last one was left.
  const [mapPosition, setMapPosition] = useAtom(lastMapPositionAtom);

  const basemap = useAtomValue(basemapAtom);
  const showLabels = useAtomValue(showLabelsAtom);
  const showGeology = useAtomValue(showGeologyAtom);
  const showFootprints = useAtomValue(showFootprintsAtom);
  const rasterOverlayStyle = useAtomValue(mapOverlayStyleAtom);

  const baseStyle = basemapStyle(basemap, dark?.isEnabled);

  const onMapMoved = useCallback(
    (pos: MapPosition) => setMapPosition(pos),
    [setMapPosition]
  );

  // Memoized so a re-render doesn't hand MapView a new array and force the
  // overlay styles to be re-applied.
  const overlayStyles = useMemo(() => {
    const styles = [rasterOverlayStyle];
    if (showGeology) {
      // Geology sits beneath the mineral maps, as context rather than subject.
      styles.unshift(macrostratStyle);
    }
    if (showFootprints) {
      // Outlines go on top, so coverage stays visible over the imagery.
      styles.push(footprintsStyle());
    }
    return styles;
  }, [rasterOverlayStyle, showGeology, showFootprints]);

  // Labels are removed from the resolved style rather than toggled per-layer.
  const transformStyle = useCallback(
    (style) => {
      if (showLabels) return style;
      return removeMapLabels(style, true);
    },
    [showLabels]
  );

  // Mapbox fetches the raster tiles and the footprints MVT itself, so the
  // delegated token has to be attached here rather than at a call site. Scoped
  // to this layer's prefix so no token is sent to any other tileserver route.
const transformRequest = useCallback(
  (url: string) => {
    if (!emitMineralsToken || !url.startsWith(mosaicBaseURL)) return { url };
    return { url, headers: { Authorization: `Bearer ${emitMineralsToken}` } };
  },
  [emitMineralsToken]
);

  let detailPanel = null;
  if (inspectPosition != null) {
    detailPanel = h(
      LocationPanel,
      {
        position: { lng: inspectPosition[0], lat: inspectPosition[1] },
        onClose: () => setInspectPosition(null),
      },
      h(PointDetails)
    );
  }

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
        { style: { width: `${PANEL_WIDTH}px` } },
        h(MapSelectorPanel)
      ),
      detailPanel,
      contextPanelOpen: isOpen,
    },
    h(
      MapView,
      {
        style: baseStyle,
        overlayStyles,
        transformStyle,
        transformRequest,
        mapPosition,
        onMapMoved,
        projection: { name: "globe" },
        mapboxToken: mapboxAccessToken,
      },
      [
        h(FlyToMapManager),
        // Click-to-inspect: the marker owns the click handler, and the panel
        // follows from the position it sets.
        h(MapMarker, {
          position: inspectPosition,
          setPosition: setInspectPosition,
        }),
      ]
    )
  );
}

/* -- View state ----------------------------------------------------------- */

/** The selected dataset, or the mosaic. Shareable, so it lives in the URL; the
 * mosaic is the default and stays out of the query string. */
const datasetParamAtom = atomWithSearchParam("dataset");
const selectedDatasetAtom = atom(
  (get): string | null => get(datasetParamAtom),
  (get, set, value: string | null) => set(datasetParamAtom, value)
);

/** The base map style, and whether its labels are shown — the same URL-synced
 * pair used by the topology page. */
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

const labelsParamAtom = atomWithSearchParam("labels");
const showLabelsAtom = atom(
  (get) => get(labelsParamAtom) !== "off",
  (get, set, value: boolean) => {
    let param: string | null = null;
    if (!value) param = "off";
    set(labelsParamAtom, param);
  }
);

/** Whether the Macrostrat geologic map underlies the mineral maps. On by
 * default; "off" is stored in the URL. */
const geologyParamAtom = atomWithSearchParam("geology");
const showGeologyAtom = atom(
  (get) => get(geologyParamAtom) !== "off",
  (get, set, value: boolean) => {
    let param: string | null = null;
    if (!value) param = "off";
    set(geologyParamAtom, param);
  }
);

/** Whether to outline the rasters backing the mosaic. Off by default; "on" is
 * stored in the URL. */
const footprintsParamAtom = atomWithSearchParam("footprints");
const showFootprintsAtom = atom(
  (get) => get(footprintsParamAtom) === "on",
  (get, set, value: boolean) => {
    let param: string | null = null;
    if (value) param = "on";
    set(footprintsParamAtom, param);
  }
);

const rasterOpacityAtom = atom(0.8);

/** The mineral classes to show, by name. Empty means "all of them".
 *
 * Names rather than class indices, because names are what the tile request now
 * takes and what a shared link should read as. Comma-joined in the URL. */
const classesParamAtom = atomWithSearchParam("classes");
const selectedClassesAtom = atom(
  (get): string[] => {
    const value = get(classesParamAtom);
    if (value == null || value === "") return [];
    return value.split(",").filter((d) => d !== "");
  },
  (get, set, value: string[]) => {
    let param: string | null = value.join(",");
    if (value.length === 0) param = null;
    set(classesParamAtom, param);
  }
);

/** The inspected point, if any. Shareable — a link to "what's here?" is worth
 * sending — so it lives in the URL, rounded to something readable. */
const pointParamAtom = atomWithSearchParam("point");
const inspectPositionAtom = atom(
  (get): [number, number] | null => {
    const value = get(pointParamAtom);
    if (value == null) return null;
    const [lng, lat] = value.split(",").map(Number);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    return [lng, lat];
  },
  (get, set, value: mapboxgl.LngLatLike | null) => {
    if (value == null) {
      set(pointParamAtom, null);
      return;
    }
    const [lng, lat] = lngLatArray(value);
    set(pointParamAtom, `${round5(lng)},${round5(lat)}`);
  }
);

/** Mapbox hands positions back in several shapes depending on the caller:
 * a `[lng, lat]` pair, a `LngLat`, or an object keyed `lon` rather than `lng`. */
function lngLatArray(value: mapboxgl.LngLatLike): [number, number] {
  if (Array.isArray(value)) return [value[0], value[1]];
  if ("lon" in value) return [value.lon, value.lat];
  return [value.lng, value.lat];
}

function round5(value: number): number {
  return Math.round(value * 1e5) / 1e5;
}

/* -- Data ----------------------------------------------------------------- */

/** What the indexed layer is: its palette and its class vocabulary.
 *
 * The vocabulary is resolved once at ingest and stored on the layer, so this is
 * a single request that reads no pixels — no reference COG, and no parsing GDAL
 * metadata in the browser. */
const mosaicLayerAtom = atom(async (get, { signal }) => {
  const response = await mosaicFetch(`${mosaicBaseURL}/layer`, { signal });
  if (!response.ok) {
    throw new Error(`Failed to fetch layer metadata: ${response.statusText}`);
  }
  return response.json();
});

const mosaicLayerLoadableAtom = loadable(mosaicLayerAtom);

/** A raster to read the class names from when the index has no vocabulary.
 *
 * Only reached before `macrostrat raster set-categories` has been run: with a
 * vocabulary on the layer, no raster header is read at all. The href comes from
 * the indexed footprints rather than a hard-coded bucket path, so this degraded
 * path still doesn't need to know where the files live. All of these maps share
 * one classification scheme, so any of them will do. */
const classFallbackURLAtom = atom((get): string | null => {
  const layer = get(mosaicLayerLoadableAtom);
  if (layer.state !== "hasData") return null;
  if ((layer.data.categories ?? []).length > 0) return null;

  const footprints = get(footprintsLoadableAtom);
  if (footprints.state !== "hasData") return null;
  return footprints.data.features?.[0]?.properties?.href ?? null;
});

/** `/cog/info` for that fallback raster, or null when it isn't needed. */
const layerInfoAtom = atom(async (get, { signal }) => {
  const url = get(classFallbackURLAtom);
  if (url == null) return null;

  const layerInfoURL = `${cogBaseURL}/info?url=${encodeURIComponent(url)}`;
  const response = await fetch(layerInfoURL, { signal });
  if (!response.ok) {
    throw new Error(`Failed to fetch layer info: ${response.statusText}`);
  }
  return response.json();
});

const layerInfoLoadableAtom = loadable(layerInfoAtom);

/** Footprints of every raster registered in the mosaic layer.
 *
 * This doubles as the "is anything registered yet?" check: an empty
 * FeatureCollection means the index has no rasters for this layer, which is the
 * expected state until they're added. */
const footprintsAtom = atom(async (get, { signal }) => {
  const response = await mosaicFetch(`${mosaicBaseURL}/footprints`, { signal });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch mosaic footprints: ${response.statusText}`
    );
  }
  return response.json();
});

const footprintsLoadableAtom = loadable(footprintsAtom);

const mosaicIsEmptyAtom = atom((get) => {
  const footprints = get(footprintsLoadableAtom);
  if (footprints.state !== "hasData") return false;
  return (footprints.data.features?.length ?? 0) === 0;
});

/** What every contributing raster reads at the inspected point.
 *
 * The mosaic's `/point` route answers per raster, which is exactly the "which
 * datasets are under the cursor" question — including rasters that cover the
 * point but hold nodata there, which a rendered tile can't tell you. */
const pointDataAtom = atom(async (get, { signal }) => {
  const position = get(inspectPositionAtom);
  if (position == null) return null;

  const [lng, lat] = position;
  // Deliberately *not* narrowed by `?datasets=`: this list is what the dataset
  // picker is built from, so it has to report the whole overlap even while the
  // map is showing one raster. The focused one is marked in the panel instead.
  const url = `${mosaicBaseURL}/point/${lng},${lat}`;

  const response = await mosaicFetch(url, { signal });
  // Outside coverage the mosaic answers 204 with no body, so this has to be
  // checked before parsing — `json()` on an empty body throws.
  if (response.status === 204) return { assets: [] };
  if (!response.ok) {
    throw new Error(`Point query failed: ${response.statusText}`);
  }
  return response.json();
});

const pointDataLoadableAtom = loadable(pointDataAtom);

interface PointReading {
  dataset: string;
  href: string;
  value: number | null;
  mineralClass: MineralClass | null;
}

/** The readings at the inspected point, in compositing order.
 *
 * The same order the tile read them in, so the first entry with a value is the
 * one whose pixel is actually visible. */
const pointReadingsAtom = atom((get): PointReading[] => {
  const loaded = get(pointDataLoadableAtom);
  if (loaded.state !== "hasData" || loaded.data == null) return [];

  const byValue = new Map(get(mineralClassesAtom).map((d) => [d.value, d]));

  return loaded.data.assets.map((asset) => {
    let value: number | null = null;
    if (asset.values?.[0] != null) {
      value = Number(asset.values[0]);
    }
    let mineralClass: MineralClass | null = null;
    if (value != null) {
      mineralClass = byValue.get(value) ?? null;
    }
    return {
      dataset: datasetName(asset.name),
      href: asset.name,
      value,
      mineralClass,
    };
  });
});

/** The reading that supplies the visible pixel, if any raster has data here. */
const visibleReadingAtom = atom((get): PointReading | null => {
  return get(pointReadingsAtom).find((d) => d.value != null) ?? null;
});

/** The class under the cursor, highlighted in the selector so the sidebar and
 * the map agree on what you're looking at.
 *
 * Derived rather than stored: it can't drift out of step with the inspected
 * point, and closing the inspector clears it for free. */
const focusedClassAtom = atom((get): string | null => {
  return get(visibleReadingAtom)?.mineralClass?.name ?? null;
});

/** A raster's name for display: the file's stem, which is also its slug in the
 * index and in the footprints layer. */
function datasetName(href: string | null): string {
  if (href == null) return "unknown";
  const file = href.split("?")[0].split("/").pop() ?? href;
  return file.replace(/\.tiff?$/i, "");
}

/** The classification scheme: a value, a name, and the color it's drawn in.
 *
 * The index is the source of truth — `macrostrat raster set-categories` resolves
 * the vocabulary from the rasters' own metadata at ingest. Parsing it out of a
 * COG header is kept only as a fallback for a layer that hasn't been given one
 * yet, which is also the state in which single-dataset mode is most useful. */
const mineralClassesAtom = atom((get): MineralClass[] => {
  const layer = get(mosaicLayerLoadableAtom);
  if (layer.state === "hasData") {
    const categories = layer.data.categories ?? [];
    if (categories.length > 0) {
      return categories.map((d) => ({
        value: d.value,
        name: d.label,
        color: hexColor(d.color),
      }));
    }
  }
  const layerInfo = get(layerInfoLoadableAtom);
  if (layerInfo.state !== "hasData") return [];
  return parseClassMetadata(layerInfo.data);
});

interface MineralClass {
  value: number;
  name: string;
  color: string | null;
}

/** Where to fly: the extent of the registered footprints, narrowed to the
 * focused dataset when there is one. Both come from the same index query, so a
 * dataset's extent no longer means opening the file to ask. */
const mapBoundsAtom = atom((get) => {
  const footprints = get(footprintsLoadableAtom);
  if (footprints.state === "loading") return null;
  if (footprints.state !== "hasData") return DEFAULT_BOUNDS;

  const dataset = get(selectedDatasetAtom);
  let features = footprints.data.features ?? [];
  if (dataset != null) {
    features = features.filter((f) => f.properties?.slug === dataset);
  }
  return (
    featureCollectionBounds({ features }) ??
    featureCollectionBounds(footprints.data) ??
    DEFAULT_BOUNDS
  );
});

/** A `[r,g,b,a]` color from the index as a hex string.
 *
 * Hex rather than `rgba()` because `Tag` hands the value to chroma to derive a
 * text/background pair, and an `rgba()` string with alpha is a poor input for
 * that.
 * A fully transparent entry (the palette's nodata slot) has no color to show. */
function hexColor(color: number[] | null | undefined): string | null {
  if (color == null) return null;
  const [r, g, b, a = 255] = color;
  if (a === 0) return null;
  const hex = [r, g, b]
    .map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0"))
    .join("");
  return `#${hex}`;
}

/** Class names from a COG's band metadata — the fallback path.
 *
 * GDAL stores the vocabulary as a stringified Python dict, which is why this is
 * a fallback: `set-categories` parses it properly at ingest. */
function parseClassMetadata(layerInfo): MineralClass[] {
  if (layerInfo == null) return [];
  try {
    const val = layerInfo.band_metadata[0][1]["MINERAL_CLASSES"];
    const v1 = val.replace("{", "").replace("}", "").replace(/'/g, "");
    return v1.split(",").map((d) => {
      const [k, v] = d.split(":");
      return { value: Number(k.trim()), name: v.trim(), color: null };
    });
  } catch (e) {
    return [];
  }
}

/* -- Map styles ----------------------------------------------------------- */

const macrostratStyle = buildMacrostratStyle({
  tileserverDomain: burwellTileDomain,
  fillOpacity: 0.1,
  strokeOpacity: 0.2,
}) as mapboxgl.Style;

const mapOverlayStyleAtom = atom((get) => {
  const opacity = get(rasterOpacityAtom);
  const tileURL = mosaicTileURL(
    get(selectedClassesAtom),
    get(selectedDatasetAtom)
  );
  const paint = { "raster-opacity": opacity };

  return {
    version: 8,
    sources: {
      "mineral-maps": {
        type: "raster",
        tiles: [tileURL],
      },
    },
    layers: [
      {
        type: "raster",
        source: "mineral-maps",
        paint,
      },
    ],
  };
});

/** Mosaic tiles, optionally filtered to named mineral classes.
 *
 * Filtering happens server-side, *after* the mosaic is composited, so excluded
 * classes are masked and the layer's own palette still colors what survives —
 * several classes at once, each in its own color, named rather than numbered.
 *
 * `?classes=` is the tileserver's shorthand for titiler's generic
 * `?algorithm=classes&algorithm_params={"classes":[...]}` (both produce
 * identical tiles). The shorthand is used here deliberately: these URLs are the
 * ones people copy out of the network tab and edit by hand, and it's the form
 * worth discovering. The cost is that a tileserver without the shorthand ignores
 * the parameter and returns every class instead of failing — so if this page
 * ever shows an unfiltered mosaic, suspect a tileserver older than the
 * `?classes=` overlay before suspecting the selection.
 *
 * Either way the parameter is a cross-repo contract with the tileserver. */
function mosaicTileURL(classes: string[], dataset: string | null): string {
  const url = `${mosaicBaseURL}/tiles/${TMS}/{z}/{x}/{y}@2x.png`;

  // Built by hand rather than with URLSearchParams, which percent-encodes the
  // comma separator (`classes=A%2CB`) and undoes the readability this is here
  // for. The values themselves are still encoded — several class names contain
  // spaces.
  const params: string[] = [];
  if (classes.length > 0) {
    params.push(`classes=${classes.map(encodeURIComponent).join(",")}`);
  }
  if (dataset != null) {
    params.push(`datasets=${encodeURIComponent(dataset)}`);
  }
  if (params.length === 0) return url;
  return `${url}?${params.join("&")}`;
}

/** Outlines of every raster backing the mosaic, from the index's vector-tile
 * footprints layer. Coverage without reading a single pixel — the raster
 * counterpart to the map-footprints layer. */
function footprintsStyle() {
  return {
    version: 8,
    sources: {
      "raster-footprints": {
        type: "vector",
        tiles: [`${mosaicBaseURL}/footprints/{z}/{x}/{y}`],
      },
    },
    layers: [
      {
        id: "raster-footprints-outline",
        type: "line",
        source: "raster-footprints",
        "source-layer": FOOTPRINTS_SOURCE_LAYER,
        paint: {
          "line-color": "#3b82f6",
          "line-width": 1.5,
          "line-dasharray": [3, 2],
        },
      },
    ],
  };
}

/* -- Panel ---------------------------------------------------------------- */

function MapSelectorPanel() {
  const [basemap, setBasemap] = useAtom(basemapAtom);
  const [showLabels, setShowLabels] = useAtom(showLabelsAtom);
  const [showGeology, setShowGeology] = useAtom(showGeologyAtom);
  const [showFootprints, setShowFootprints] = useAtom(showFootprintsAtom);

  return h("div.map-selector-panel", [
    h(
      "p",
      "EMIT mineral maps created by Zaid Al-Attar and Thomas Monecke, Colorado School of Mines."
    ),
    h(FocusedDatasetControl),
    h(MosaicStatus),
    h(MineralClassSelector),
    h(RasterOpacitySlider),
    h(Switch, {
      label: "Geologic map",
      checked: showGeology,
      onChange: (evt) => setShowGeology(evt.currentTarget.checked),
    }),
    h(Switch, {
      label: "Coverage footprints",
      checked: showFootprints,
      onChange: (evt) => setShowFootprints(evt.currentTarget.checked),
    }),
    h(LayerErrorReporter),
    h(BaseLayerForm, { basemap, setBasemap, showLabels, setShowLabels }),
  ]);
}

/** The focused dataset, when there is one.
 *
 * There is no dropdown of datasets to pick from: the list would either be
 * hard-coded (which it was) or a second copy of what the index already knows.
 * Selection happens in the point inspector, where the datasets under the cursor
 * are already listed with what each one reads there — the only place the choice
 * is actually informed. This is the counterpart: it shows what's focused and
 * lets you clear it. */
function FocusedDatasetControl() {
  const [dataset, setDataset] = useAtom(selectedDatasetAtom);

  if (dataset == null) {
    return h(
      "p.dataset-hint",
      "Showing every dataset in the mosaic. Click the map to inspect a point and focus one."
    );
  }

  return h(FormGroup, { label: "Focused dataset" }, [
    h("div.focused-dataset", [
      h("code.dataset-name", dataset),
      h(Button, {
        icon: "cross",
        minimal: true,
        small: true,
        title: "Show every dataset",
        "aria-label": "Show every dataset",
        onClick: () => setDataset(null),
      }),
    ]),
  ]);
}

/** Reports the state of the indexed mosaic: how many rasters back it, or that
 * none have been registered yet. */
function MosaicStatus() {
  const footprints = useAtomValue(footprintsLoadableAtom);
  const isEmpty = useAtomValue(mosaicIsEmptyAtom);

  if (footprints.state === "loading") {
    return h("p.mosaic-status", "Loading mosaic coverage…");
  }

  if (footprints.state === "hasError") {
    return h(
      Callout,
      { intent: "danger", icon: "error", title: "Mosaic unavailable" },
      h(
        "p",
        `The tileserver has no /rasters/${RASTER_LAYER} layer. It appears once macrostrat.raster_layers is installed there.`
      )
    );
  }

  if (isEmpty) {
    return h(
      Callout,
      { intent: "warning", icon: "warning-sign", title: "No rasters indexed" },
      h("p", [
        "Nothing is registered in the ",
        h("code", RASTER_LAYER),
        " layer yet. Add datasets with ",
        h("code", "macrostrat raster scan"),
        ", then reload. Single datasets can be viewed in the meantime.",
      ])
    );
  }

  const count = footprints.data.features.length;
  return h(
    "p.mosaic-status",
    `${count} raster${count === 1 ? "" : "s"} in the mosaic.`
  );
}

/** The class selector, which doubles as the legend.
 *
 * A checkbox per class with the color it is drawn in: with the mosaic filtering
 * by name and preserving the palette, "which classes are shown" and "what do
 * these colors mean" are the same question. */
function MineralClassSelector() {
  const classes = useAtomValue(mineralClassesAtom);
  const [selected, setSelected] = useAtom(selectedClassesAtom);
  const focused = useAtomValue(focusedClassAtom);

  if (classes.length === 0) return null;

  const toggle = (name: string, checked: boolean) => {
    let next = selected.filter((d) => d !== name);
    if (checked) {
      next = [...selected, name];
    }
    setSelected(next);
  };

  return h(FormGroup, { label: "Mineral classes" }, [
    h(
      ExpandablePanel,
      { icon: "filter", title: "Mineral classes", isOpen: true },
      [
        h("div.mineral-classes", [
          h(
            "div.class-list",
            classes.map((d) =>
              h(MineralClassRow, {
                key: d.name,
                mineralClass: d,
                checked: selected.includes(d.name),
                focused: d.name === focused,
                onChange: toggle,
              })
            )
          ),
          h(MineralClassActions, {
            selectedCount: selected.length,
            totalCount: classes.length,
            onClear: () => setSelected([]),
          }),
        ]),
      ]
    ),
  ]);
}

/** One class: a checkbox for whether it's shown, and a `Tag` carrying the name
 * and the color together.
 *
 * The Tag is the row's label rather than a swatch beside text, because on a
 * classification map the color *is* the identity — and it fills the row so the
 * list reads as a legend at a glance. Clicking it toggles, same as the checkbox.
 *
 * A focused row (the class under the cursor) scrolls itself into view: with ~40
 * classes the one you just clicked on the map is usually outside the viewport.
 */
function MineralClassRow({ mineralClass, checked, focused, onChange }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focused) return;
    // `nearest` so a class already on screen doesn't cause a jump.
    ref.current?.scrollIntoView({ block: "nearest" });
  }, [focused]);

  const classes = ["class-item"];
  if (checked) {
    classes.push("selected");
  }
  if (focused) {
    classes.push("focused");
  }

  return h("div", { ref, className: classes.join(" ") }, [
    h(Checkbox, {
      checked,
      onChange: (evt) => onChange(mineralClass.name, evt.currentTarget.checked),
      "aria-label": mineralClass.name,
    }),
    h(ClassTag, {
      name: mineralClass.name,
      color: mineralClass.color ?? undefined,
      className: "class-tag",
      onClick: () => onChange(mineralClass.name, !checked),
    }),
  ]);
}

function MineralClassActions({ selectedCount, totalCount, onClear }) {
  let summary = `All ${totalCount} classes`;
  if (selectedCount > 0) {
    summary = `${selectedCount} of ${totalCount} shown`;
  }

  return h("div.class-actions", [
    h("span", summary),
    h(Button, {
      icon: "cross",
      minimal: true,
      small: true,
      disabled: selectedCount === 0,
      text: "Clear",
      onClick: onClear,
      intent: selectedCount === 0 ? null : Intent.DANGER,
    }),
  ]);
}

function RasterOpacitySlider() {
  const [opacity, setOpacity] = useAtom(rasterOpacityAtom);
  return h(
    FormGroup,
    { label: "Raster opacity" },
    h(
      Box,
      { paddingX: 20 },
      h(Slider, {
        min: 0,
        max: 1,
        stepSize: 0.05,
        value: opacity,
        onChange: setOpacity,
      })
    )
  );
}

/** Reports on the indexed layer's metadata request.
 *
 * Only the layer route now — with a class vocabulary on the layer, no raster
 * header is read at all, so there is no second source to report on. */
function LayerErrorReporter() {
  const layer = useAtomValue(mosaicLayerLoadableAtom);

  if (layer.state === "hasError") {
    return h("div.layer-error", [
      h("h3", "Error loading layer info"),
      h("p", String(layer.error)),
    ]);
  }
  if (layer.state === "loading") {
    return h("div.layer-loading", [h("h3", "Loading layer info...")]);
  }
  return null;
}

/* -- Point inspector ------------------------------------------------------ */

/** What's under the cursor: the class you can see, and every dataset that had
 * something to say about the point.
 *
 * The per-dataset breakdown is the part a rendered tile can't give you. A raster
 * may cover the point and hold nodata there, and several may overlap with only
 * the first contributing a pixel — both are worth seeing when you're deciding
 * whether a mosaic is compositing the way you meant. */
function PointDetails() {
  const state = useAtomValue(pointDataLoadableAtom);
  const readings = useAtomValue(pointReadingsAtom);
  const visible = useAtomValue(visibleReadingAtom);

  if (state.state === "loading") {
    return h("p.point-status", "Reading rasters…");
  }
  if (state.state === "hasError") {
    return h(
      Callout,
      { intent: "danger", icon: "error", title: "Point query failed" },
      h("p", String(state.error))
    );
  }
  if (readings.length === 0) {
    return h("p.point-status", "No raster coverage at this point.");
  }

  return h("div.point-details", [
    h(VisibleClass, { reading: visible }),
    h(DatasetReadings, { readings, visible }),
  ]);
}

/** The class actually drawn at the point, with a note when the current
 * selection is hiding it — otherwise "the map shows nothing here" and "this
 * class is filtered out" look identical. */
function VisibleClass({ reading }) {
  const [selected, setSelected] = useAtom(selectedClassesAtom);

  if (reading == null) {
    return h(
      "div.visible-class",
      h("p.point-status", "Covered, but no data at this point.")
    );
  }

  const label = reading.mineralClass?.name ?? `Class ${reading.value}`;

  let hidden = null;
  const isHidden = selected.length > 0 && !selected.includes(label);
  if (isHidden) {
    hidden = h(
      "p.hidden-note",
      "Hidden by the current class selection — the map is showing other classes here."
    );
  }

  return h("div.visible-class", [
    h("div.class-heading", [
      h(ClassTag, {
        name: label,
        color: reading.mineralClass?.color ?? undefined,
        details: `${reading.value}`,
        // Sized through the component's own API rather than a CSS override: the
        // package sets `font-size` on `.tag` at the same specificity anything
        // here could reach, so overriding it would depend on stylesheet order.
        size: TagSize.Large,
      }),
      h(IsolateClassButton, { reading, selected, setSelected }),
    ]),
    hidden,
  ]);
}

/** "Show only this class" — the point of identifying a class in the first place.
 *
 * Clicking a mineral on the map and then hunting for it in an 80-row list is the
 * long way round, so the answer to "what is this?" carries the action straight
 * to the map. A second click goes back to showing everything, making it a round
 * trip rather than a one-way door.
 *
 * Only offered for a class the layer's vocabulary actually names: filtering is
 * by name, so an unnamed value has nothing to send and the tileserver would
 * answer 400. */
function IsolateClassButton({ reading, selected, setSelected }) {
  const name = reading.mineralClass?.name;
  if (name == null) return null;

  const isolated = selected.length === 1 && selected[0] === name;

  // The icon names the action, not the state: once the map is filtered to this
  // one class, the only thing left to do is clear it. That also makes `active`
  // redundant — a pressed-looking button next to a "clear" icon reads as a
  // contradiction.
  let icon = "filter";
  let title = `Show only ${name}`;
  let intent = null;
  if (isolated) {
    icon = "filter-remove";
    title = "Show all classes";
    intent = Intent.DANGER;
  }

  const onClick = () => {
    if (isolated) {
      setSelected([]);
      return;
    }
    setSelected([name]);
  };

  return h(Button, {
    className: "isolate-button",
    icon,
    minimal: true,
    title,
    "aria-label": title,
    intent,
    onClick,
  });
}

/** Every raster covering the point, in the order the mosaic read them.
 *
 * This is also the dataset picker. The choice of "which dataset" is only
 * meaningful where you can see which ones overlap and what each reads at the
 * point in question, which is here — so a row is clickable, and focusing one
 * narrows the map to it (`?datasets=<slug>`). Clicking the focused row again
 * releases it. */
function DatasetReadings({ readings, visible }) {
  const [focusedDataset, setFocusedDataset] = useAtom(selectedDatasetAtom);

  const onSelect = (dataset: string) => {
    if (dataset === focusedDataset) {
      setFocusedDataset(null);
      return;
    }
    setFocusedDataset(dataset);
  };

  return h("div.dataset-readings", [
    h("h4", `Datasets (${readings.length})`),
    h(
      "ul.reading-list",
      readings.map((reading) =>
        h(DatasetReading, {
          key: reading.href,
          reading,
          isVisible: reading === visible,
          isFocused: reading.dataset === focusedDataset,
          onSelect,
        })
      )
    ),
    h(
      "p.reading-hint",
      "Click a dataset to show only that one; click it again to show them all."
    ),
  ]);
}

function DatasetReading({ reading, isVisible, isFocused, onSelect }) {
  let value = h("span.no-data", "no data");
  if (reading.value != null) {
    const label = reading.mineralClass?.name ?? `Class ${reading.value}`;
    value = h("span.class-name", `${label} (${reading.value})`);
  }

  // "drawn" is about compositing — which raster won this pixel in the full
  // mosaic — while "focused" is about the view. They're different facts and can
  // disagree, so both are shown.
  let tags = [];
  if (isVisible) {
    tags.push(h(Tag, { key: "drawn", minimal: true }, "drawn"));
  }
  if (isFocused) {
    tags.push(
      h(Tag, { key: "focused", minimal: true, intent: "primary" }, "focused")
    );
  }

  let itemClass = "li.reading-item";
  if (isFocused) {
    itemClass = "li.reading-item.focused";
  }

  return h(itemClass, [
    h(
      "button.dataset-name",
      {
        onClick: () => onSelect(reading.dataset),
        title: `Show only ${reading.dataset}`,
      },
      reading.dataset
    ),
    value,
    ...tags,
  ]);
}

/** Frames the data on a first visit.
 *
 * Only when there's no remembered position — otherwise this would yank the map
 * away from wherever the last session left it, which is the opposite of what
 * restoring it is for. */
function FlyToMapManager() {
  const rememberedPosition = useAtomValue(lastMapPositionAtom);
  const dataBounds = useAtomValue(mapBoundsAtom);

  let bounds = dataBounds;
  if (rememberedPosition != null) {
    bounds = null;
  }

  useMapEaseTo({ bounds, padding: 50 });
  return null;
}

/* -- Helpers -------------------------------------------------------------- */

/** The bounding box of a GeoJSON FeatureCollection, or null if it's empty.
 * The footprints route returns polygons, so walking the coordinate arrays is
 * enough — no need for a geometry library here. */
function featureCollectionBounds(
  collection
): [number, number, number, number] | null {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;

  for (const feature of collection.features ?? []) {
    for (const [lng, lat] of flattenCoordinates(
      feature.geometry?.coordinates
    )) {
      west = Math.min(west, lng);
      south = Math.min(south, lat);
      east = Math.max(east, lng);
      north = Math.max(north, lat);
    }
  }

  if (!Number.isFinite(west)) return null;
  return [west, south, east, north];
}

function* flattenCoordinates(coordinates): Generator<[number, number]> {
  if (coordinates == null) return;
  if (typeof coordinates[0] === "number") {
    yield coordinates as [number, number];
    return;
  }
  for (const item of coordinates) {
    yield* flattenCoordinates(item);
  }
}
