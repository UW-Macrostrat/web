/** EMIT mineral maps.
 *
 * Two ways to look at the same data:
 *
 * - **the mosaic** (default) — the `emit-minerals` layer in Macrostrat's raster
 *   index, served by the tileserver at `/rasters/emit-minerals/...`. Every
 *   registered dataset composites into one continuous layer, rendered with the
 *   palette stored on the layer. This is the integration target; until the
 *   rasters are registered the layer is simply empty, and the panel says so.
 * - **a single COG** — titiler's generic `/cog` route pointed straight at a file
 *   in the bucket. Kept for comparison and for debugging a single dataset.
 *
 * Mineral-class isolation works differently in each, because the two routes
 * hand back different pixels: the mosaic applies a colormap server-side (so we
 * isolate a class by *sending* a one-entry colormap), while `/cog` returns raw
 * class indices (so we isolate in the Mapbox paint expression).
 */

import h from "@macrostrat/hyper";
import { burwellTileDomain, mapboxAccessToken } from "@macrostrat-web/settings";
import { Box, Spacer, useDarkMode } from "@macrostrat/ui-components";
import { removeMapLabels } from "@macrostrat/mapbox-utils";
import { useCallback, useMemo, useState } from "react";
import {
  FloatingNavbar,
  MapLoadingButton,
  MapAreaContainer,
  MapView,
  PanelCard,
} from "@macrostrat/map-interface";
import { atom, useAtom, useAtomValue } from "jotai";
import {
  Callout,
  ControlGroup,
  FormGroup,
  HTMLSelect,
  Slider,
  Switch,
} from "@blueprintjs/core";
import { loadable } from "jotai/utils";
import { useMapEaseTo } from "@macrostrat/mapbox-react";
import { buildMacrostratStyle } from "@macrostrat/map-styles";
import { atomWithSearchParam } from "~/_utils/url-atoms";
import {
  BaseLayerForm,
  Basemap,
  basemapStyle,
  NullableDropdown,
} from "~/components";

/** The layer slug registered in the raster index (and mounted by the
 * tileserver as `/rasters/<slug>`). */
const RASTER_LAYER = "emit-minerals";

/** titiler 1.x makes the tile matrix set explicit in every tile path. */
const TMS = "WebMercatorQuad";

/** MVT layer name emitted by `raster_layers.footprint_tile` — a cross-repo
 * contract with the tileserver's SQL. */
const FOOTPRINTS_SOURCE_LAYER = "raster_footprints";

/** Sentinel for "show the whole mosaic" in the dataset selector. */
const MOSAIC = "mosaic";

/** Both routes live on the configured tileserver, so this page follows the
 * environment (local, dev, production) rather than pinning one instance. */
const cogBaseURL = `${burwellTileDomain}/cog`;
const mosaicBaseURL = `${burwellTileDomain}/rasters/${RASTER_LAYER}`;

/** The individual datasets in the bucket, for single-COG mode and for flying to
 * a region. Registration into the index is a separate, server-side step. */
const bucketURL =
  "https://storage.macrostrat.org/remote-sensing-data/emit-mineral-maps/Group2min/";

const datasetOptions = [
  { name: "Utah", key: "utah_clipped" },
  { name: "California", key: "cali_clipped" },
  { name: "Nevada", key: "nevada_clipped" },
  { name: "Southern Bolivia", key: "S_Bolivia" },
];

/** Fallback view: the conterminous US, where most of the datasets sit. */
const DEFAULT_BOUNDS = [-125, 24, -66, 49];

export function Page() {
  const [isOpen, setOpen] = useState(false);
  const dark = useDarkMode();

  const basemap = useAtomValue(basemapAtom);
  const showLabels = useAtomValue(showLabelsAtom);
  const showGeology = useAtomValue(showGeologyAtom);
  const showFootprints = useAtomValue(showFootprintsAtom);
  const mapBounds = useAtomValue(mapBoundsAtom);
  const rasterOverlayStyle = useAtomValue(mapOverlayStyleAtom);

  const baseStyle = basemapStyle(basemap, dark?.isEnabled);

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

  return h(
    MapAreaContainer,
    {
      navbar: h(FloatingNavbar, { width: 300 }, [
        h("h2", "EMIT mineral maps"),
        h(Spacer),
        h(MapLoadingButton, {
          active: isOpen,
          onClick: () => setOpen(!isOpen),
        }),
      ]),
      contextPanel: h(
        PanelCard,
        { style: { width: "300px" } },
        h(MapSelectorPanel)
      ),
      detailPanel: null,
      contextPanelOpen: isOpen,
    },
    h(
      MapView,
      {
        style: baseStyle,
        overlayStyles,
        transformStyle,
        mapPosition: null,
        projection: { name: "globe" },
        mapboxToken: mapboxAccessToken,
        bounds: mapBounds,
      },
      [h(FlyToMapManager)]
    )
  );
}

/* -- View state ----------------------------------------------------------- */

/** The selected dataset, or the mosaic. Shareable, so it lives in the URL; the
 * mosaic is the default and stays out of the query string. */
const datasetParamAtom = atomWithSearchParam("dataset");
const selectedDatasetAtom = atom(
  (get) => get(datasetParamAtom) ?? MOSAIC,
  (get, set, value: string) => {
    let param: string | null = value;
    if (value === MOSAIC) param = null;
    set(datasetParamAtom, param);
  }
);

const showingMosaicAtom = atom((get) => get(selectedDatasetAtom) === MOSAIC);

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
const selectedMineralClassAtom = atom<number>();

/* -- Data ----------------------------------------------------------------- */

/** The COG behind single-dataset mode. Null when showing the mosaic. */
const cogURLAtom = atom((get) => {
  const dataset = get(selectedDatasetAtom);
  if (dataset === MOSAIC) return null;
  return `${bucketURL}${dataset}.tif`;
});

/** A dataset to read the mineral-class list from. All of these maps share one
 * classification scheme, so in mosaic mode any of them will do. */
const referenceCogURLAtom = atom((get) => {
  return get(cogURLAtom) ?? `${bucketURL}${datasetOptions[0].key}.tif`;
});

const layerInfoAtom = atom(async (get, { signal }) => {
  const url = get(referenceCogURLAtom);
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
  const response = await fetch(`${mosaicBaseURL}/footprints`, { signal });
  if (!response.ok) {
    throw new Error(`Failed to fetch mosaic footprints: ${response.statusText}`);
  }
  return response.json();
});

const footprintsLoadableAtom = loadable(footprintsAtom);

const mosaicIsEmptyAtom = atom((get) => {
  const footprints = get(footprintsLoadableAtom);
  if (footprints.state !== "hasData") return false;
  return (footprints.data.features?.length ?? 0) === 0;
});

const mineralClassesAtom = atom((get) => {
  const layerInfo = get(layerInfoLoadableAtom);
  if (layerInfo.state !== "hasData") return [];
  try {
    const val = layerInfo.data.band_metadata[0][1]["MINERAL_CLASSES"];
    const v1 = val.replace("{", "").replace("}", "").replace(/'/g, "");
    return v1.split(",").map((d) => {
      const [k, v] = d.split(":");
      return { id: Number(k.trim()), name: v.trim() };
    });
  } catch (e) {
    return [];
  }
});

/** Where to fly. The mosaic uses the extent of its registered footprints; a
 * single dataset uses its own bounds. */
const mapBoundsAtom = atom((get) => {
  if (get(showingMosaicAtom)) {
    const footprints = get(footprintsLoadableAtom);
    if (footprints.state === "loading") return null;
    if (footprints.state === "hasData") {
      return featureCollectionBounds(footprints.data) ?? DEFAULT_BOUNDS;
    }
    return DEFAULT_BOUNDS;
  }

  const layerInfo = get(layerInfoLoadableAtom);
  if (layerInfo.state === "loading") return null;
  if (layerInfo.state === "hasData") return layerInfo.data.bounds;
  return DEFAULT_BOUNDS;
});

/* -- Map styles ----------------------------------------------------------- */

const macrostratStyle = buildMacrostratStyle({
  tileserverDomain: burwellTileDomain,
  fillOpacity: 0.1,
  strokeOpacity: 0.2,
}) as mapboxgl.Style;

const mapOverlayStyleAtom = atom((get) => {
  const opacity = get(rasterOpacityAtom);
  const mineralClass = get(selectedMineralClassAtom);

  let tileURL: string;
  let paint: object;
  if (get(showingMosaicAtom)) {
    tileURL = mosaicTileURL(mineralClass);
    paint = { "raster-opacity": opacity };
  } else {
    tileURL = cogTileURL(get(cogURLAtom));
    paint = { "raster-opacity": opacity, ...cogIsolationPaint(mineralClass) };
  }

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

/** Mosaic tiles. The layer's own palette is applied server-side unless we send
 * a colormap, so isolating a class is a one-entry colormap: every other class
 * falls out of the lookup table and renders transparent. */
function mosaicTileURL(mineralClass: number | undefined): string {
  const url = `${mosaicBaseURL}/tiles/${TMS}/{z}/{x}/{y}@2x.png`;
  if (mineralClass == null) return url;
  const colormap = JSON.stringify({ [mineralClass]: [255, 0, 0, 255] });
  return `${url}?colormap=${encodeURIComponent(colormap)}`;
}

function cogTileURL(url: string): string {
  return `${cogBaseURL}/tiles/${TMS}/{z}/{x}/{y}@2x?resampling=nearest&url=${encodeURIComponent(
    url
  )}`;
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

/** Class isolation for raw `/cog` tiles, whose red channel carries the class
 * index. A narrow ramp around the target value keeps that one class opaque and
 * drops everything else. */
function cogIsolationPaint(mineralClass: number | undefined) {
  if (mineralClass == null) return {};
  return {
    "raster-color-mix": [1, 0, 0, 0],
    "raster-color-range": [0, 1],
    "raster-color": [
      "interpolate",
      ["linear"],
      ["raster-value"],
      0,
      "rgba(0,0,0,0)",
      (mineralClass - 10) / 255,
      "rgba(255,0,0,0)",
      mineralClass / 255,
      "rgba(255, 0, 0, 1.0)",
      (mineralClass + 10) / 255,
      "rgba(255,0,0,0)",
      1,
      "rgba(0,0,0,0)",
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
    h(SelectedMapControl),
    h(MosaicStatus),
    h(MineralClassDropdown),
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

function SelectedMapControl() {
  const [dataset, setDataset] = useAtom(selectedDatasetAtom);

  const options = [
    { label: "All datasets (mosaic)", value: MOSAIC },
    ...datasetOptions.map((d) => ({ label: d.name, value: d.key })),
  ];

  return h(
    FormGroup,
    { label: "Dataset", inline: true },
    h(
      ControlGroup,
      { fill: true },
      h(HTMLSelect, {
        options,
        value: dataset,
        onChange: (evt) => setDataset(evt.target.value),
      })
    )
  );
}

/** Reports the state of the indexed mosaic: how many rasters back it, or that
 * none have been registered yet. Only relevant in mosaic mode. */
function MosaicStatus() {
  const showingMosaic = useAtomValue(showingMosaicAtom);
  const footprints = useAtomValue(footprintsLoadableAtom);
  const isEmpty = useAtomValue(mosaicIsEmptyAtom);

  if (!showingMosaic) return null;

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

function MineralClassDropdown() {
  const [mineralClass, setMineralClass] = useAtom(selectedMineralClassAtom);
  const classes = useAtomValue(mineralClassesAtom);

  return h(
    FormGroup,
    { label: "Mineral class" },
    h(NullableDropdown, {
      options: classes.map((d) => ({ label: d.name, value: d.id })),
      placeholder: "All classes",
      value: mineralClass,
      onChange: (value) => {
        // The dropdown clears to null; anything else is a class index.
        if (value == null) {
          setMineralClass(undefined);
        } else {
          setMineralClass(Number(value));
        }
      },
    })
  );
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

function LayerErrorReporter() {
  const layerInfo = useAtomValue(layerInfoLoadableAtom);

  if (layerInfo.state === "hasError") {
    return h("div.layer-error", [
      h("h3", "Error loading layer info"),
      h("p", String(layerInfo.error)),
    ]);
  }
  if (layerInfo.state === "loading") {
    return h("div.layer-loading", [h("h3", "Loading layer info...")]);
  }
  return null;
}

function FlyToMapManager() {
  const bounds = useAtomValue(mapBoundsAtom);
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
    for (const [lng, lat] of flattenCoordinates(feature.geometry?.coordinates)) {
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
