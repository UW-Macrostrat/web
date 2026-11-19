/** One raster from the index, drawn by itself.
 *
 * The layer viewer draws a raster through its layer, with the layer's colors
 * and classes. A raster waiting in the inbox has no layer, so this reads it
 * from the tileserver's by-id route instead: the picture is the file's own
 * colormap when it has one, else a stretch over the range typed here. Its
 * extent, zoom range and bands come from that route, not from the admin API.
 */
import hyper from "@macrostrat/hyper";
import { burwellTileDomain, mapboxAccessToken } from "@macrostrat-web/settings";
import { Box, useDarkMode } from "@macrostrat/ui-components";
import {
  MapAreaContainer,
  MapView,
  PanelCard,
} from "@macrostrat/map-interface";
import { useMapEaseTo } from "@macrostrat/mapbox-react";
import {
  Callout,
  FormGroup,
  InputGroup,
  Intent,
  Slider,
} from "@blueprintjs/core";
import { atom, useAtom, useAtomValue } from "jotai";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  basemapAtom,
  showLabelsAtom,
  useBasemapTransform,
} from "~/_utils/basemap";
import { getTileToken } from "~/_utils/tile-token";
import { atomWithSearchParam } from "~/_utils/url-atoms";
import { BaseLayerForm, basemapStyle } from "~/components";
import { MapPageNavbar } from "~/components/map-navbar/map-page-navbar";
import styles from "./viewer.module.sass";

const h = hyper.styled(styles);

const PANEL_WIDTH = 320;

/** titiler 1.x makes the tile matrix set explicit in every tile path. */
const TMS = "WebMercatorQuad";

/** The tileserver's route for one indexed raster. */
export function singleRasterURL(id: string): string {
  return `${burwellTileDomain}/rasters/raster/${encodeURIComponent(id)}`;
}

interface RasterDescription {
  bounds: [number, number, number, number];
  minzoom: number | null;
  maxzoom: number | null;
  dtype: string | null;
  bands: number | null;
  hasColormap: boolean;
}

function rasterFetch(baseURL: string, path: string, signal: AbortSignal) {
  const headers = new Headers();
  const token = getTileToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${baseURL}${path}`, { headers, signal });
}

async function describeRaster(
  baseURL: string,
  signal: AbortSignal
): Promise<RasterDescription> {
  const [tilejson, info] = await Promise.all([
    rasterFetch(baseURL, `/${TMS}/tilejson.json`, signal),
    rasterFetch(baseURL, "/info", signal),
  ]);
  if (!tilejson.ok) {
    throw new Error(`The tileserver answered ${tilejson.status}`);
  }
  const tiles = await tilejson.json();
  let details: any = {};
  if (info.ok) details = await info.json();
  return {
    bounds: tiles.bounds,
    minzoom: tiles.minzoom ?? null,
    maxzoom: tiles.maxzoom ?? null,
    dtype: details.dtype ?? null,
    bands: details.count ?? null,
    hasColormap: details.colormap != null,
  };
}

function useRasterDescription(baseURL: string) {
  const [description, setDescription] = useState<RasterDescription | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    describeRaster(baseURL, controller.signal)
      .then(setDescription)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e?.message ?? "Unreadable");
      });
    return () => controller.abort();
  }, [baseURL]);
  return { description, error };
}

const opacityAtom = atom(0.8);

/** `min,max` to stretch the values over. Shareable, so it lives in the URL. */
const rescaleParamAtom = atomWithSearchParam("rescale");
const rescaleAtom = atom((get): string | null => {
  const value = get(rescaleParamAtom);
  if (value == null) return null;
  const parts = value.split(",").map(Number);
  if (parts.length !== 2 || !parts.every(Number.isFinite)) return null;
  return parts.join(",");
});

function overlayStyle(
  baseURL: string,
  rescale: string | null,
  opacity: number
) {
  let tileURL = `${baseURL}/tiles/${TMS}/{z}/{x}/{y}@2x.png`;
  if (rescale != null) tileURL += `?rescale=${rescale}`;
  return {
    version: 8,
    sources: { raster: { type: "raster", tiles: [tileURL] } },
    layers: [
      {
        type: "raster",
        source: "raster",
        paint: { "raster-opacity": opacity },
      },
    ],
  };
}

export function SingleRasterViewer({ id }: { id: string }) {
  const baseURL = singleRasterURL(id);
  const [isOpen, setOpen] = useState(true);
  const dark = useDarkMode();
  const basemap = useAtomValue(basemapAtom);
  const rescale = useAtomValue(rescaleAtom);
  const opacity = useAtomValue(opacityAtom);
  const { description, error } = useRasterDescription(baseURL);

  const overlayStyles = useMemo(
    () => [overlayStyle(baseURL, rescale, opacity)],
    [baseURL, rescale, opacity]
  );
  const transformStyle = useBasemapTransform();

  // Mapbox fetches the tiles itself, so the token is attached here, and only
  // to this raster's own route.
  const transformRequest = useCallback(
    (url: string) => {
      const token = getTileToken();
      if (!token || !url.startsWith(baseURL)) return { url };
      return { url, headers: { Authorization: `Bearer ${token}` } };
    },
    [baseURL]
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
        { style: { width: `${PANEL_WIDTH}px` } },
        h(RasterPanel, { id, description, error })
      ),
      contextPanelOpen: isOpen,
    },
    h(
      MapView,
      {
        style: basemapStyle(basemap, dark?.isEnabled),
        overlayStyles,
        transformStyle,
        transformRequest,
        projection: { name: "globe" },
        mapboxToken: mapboxAccessToken,
      },
      h(FrameRaster, { bounds: description?.bounds ?? null })
    )
  );
}

/** Always frames the raster: this page is about one place. */
function FrameRaster({ bounds }: { bounds: number[] | null }) {
  useMapEaseTo({ bounds, padding: 50 });
  return null;
}

function RasterPanel({
  id,
  description,
  error,
}: {
  id: string;
  description: RasterDescription | null;
  error: string | null;
}) {
  const [basemap, setBasemap] = useAtom(basemapAtom);
  const [showLabels, setShowLabels] = useAtom(showLabelsAtom);

  let status = h("p", "Reading the raster…");
  if (error != null) {
    status = h(
      Callout,
      { intent: Intent.DANGER, title: "Can't read it" },
      error
    );
  } else if (description != null) {
    status = h(RasterFacts, { description });
  }

  return h("div.map-selector-panel", [
    h("h3", `Raster ${id}`),
    status,
    h(RescaleControl, { hasColormap: description?.hasColormap ?? false }),
    h(OpacitySlider),
    h(BaseLayerForm, { basemap, setBasemap, showLabels, setShowLabels }),
  ]);
}

function RasterFacts({ description }: { description: RasterDescription }) {
  const facts: string[] = [];
  if (description.dtype != null) facts.push(description.dtype);
  if (description.bands != null) facts.push(`${description.bands} band(s)`);
  if (description.minzoom != null && description.maxzoom != null) {
    facts.push(`zoom ${description.minzoom}–${description.maxzoom}`);
  }
  if (description.hasColormap) facts.push("own colormap");
  return h("p", facts.join(" · "));
}

/** A file with its own colormap is drawn with it and needs no stretch. */
function RescaleControl({ hasColormap }: { hasColormap: boolean }) {
  const [param, setParam] = useAtom(rescaleParamAtom);
  const applied = useAtomValue(rescaleAtom);
  if (hasColormap) return null;

  let intent: Intent = Intent.NONE;
  if (param != null && applied == null) intent = Intent.WARNING;

  return h(
    FormGroup,
    { label: "Value range", helperText: "min,max — for continuous data" },
    h(InputGroup, {
      placeholder: "e.g. 0,3000",
      value: param ?? "",
      intent,
      onChange: (e) => setParam(e.target.value.trim() || null),
    })
  );
}

function OpacitySlider() {
  const [opacity, setOpacity] = useAtom(opacityAtom);
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
