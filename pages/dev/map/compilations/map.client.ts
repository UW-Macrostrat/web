/** The map slot: what a compilation actually covers, and what is defined at a
 * point.
 *
 * Two overlays, both from the tileserver's topology routes, both taking *any*
 * compilation slug rather than only a served layer:
 *
 *  - **`maps/<slug>`** — the footprints of the compilation's members. What it is
 *    assembled from.
 *  - **`faces/<slug>`** — the solved dissolve. Where the compilation actually
 *    *wins* territory, which is a different shape from its footprint wherever a
 *    finer map takes ground inside it.
 *
 * `expand` switches both from the units a compilation presents to the maps it
 * ultimately resolves to — the same distinction the carto tiles are drawn at.
 *
 * Selected rows are highlighted by `slug` within the same sources, so selection
 * costs no extra request.
 */

import { burwellTileDomain, mapboxAccessToken } from "@macrostrat-web/settings";
import { MapView } from "@macrostrat/map-interface";
import { MapboxMapProvider } from "@macrostrat/mapbox-react";
import { removeMapLabels } from "@macrostrat/mapbox-utils";
import { ErrorBoundary, useInDarkMode } from "@macrostrat/ui-components";
import h from "@macrostrat/hyper";
import { useAtom, useAtomValue } from "jotai";
import { useCallback, useMemo } from "react";

import { basemapStyle, Basemap } from "~/components";
import { macrostratCartoStyle } from "~/_utils/map-layers";
import { lastMapPositionAtom } from "~/_utils/last-map-position";
import { MapMarker } from "@macrostrat/map-interface";
import { layoutShellAtom } from "~/layouts/hybrid";

import {
  basemapAtom,
  expandMembersAtom,
  focusNodeAtom,
  focusSlugAtom,
  pointAtom,
  showCartoAtom,
  showFacesAtom,
  showFootprintsAtom,
  showLabelsAtom,
  visibleSlugsAtom,
  type Point,
} from "./state";

/** Fallback focus: the broadest served layer, so the map is never blank before
 * anything has been picked. */
const DEFAULT_FOCUS = "carto-large";

export function CompilationMap() {
  return h(ErrorBoundary, h(CompilationMapShell));
}

/** `MapView` reads its map from a `MapboxMapProvider`. The map shell *is*
 * `MapAreaContainer`, which supplies one; the content and split shells drop the
 * map into a plain grid cell, so it has to bring its own or `MapView` throws
 * "Missing Provider from createIsolation". */
function CompilationMapShell() {
  const shell = useAtomValue(layoutShellAtom);
  if (shell === "map") {
    return h(CompilationMapInner, { shell });
  }
  return h(MapboxMapProvider, h(CompilationMapInner, { shell }));
}

function CompilationMapInner({ shell }) {
  const inDarkMode = useInDarkMode();
  const basemap = useAtomValue(basemapAtom);
  const showLabels = useAtomValue(showLabelsAtom);
  const [mapPosition, setMapPosition] = useAtom(lastMapPositionAtom);
  const [point, setPoint] = useAtom(pointAtom);

  const overlayStyles = useOverlayStyles();

  const transformStyle = useCallback(
    (style) => {
      if (showLabels) return style;
      return removeMapLabels(style, true);
    },
    [showLabels]
  );

  const setPosition = useCallback(
    (position: Point | null) => setPoint(position),
    [setPoint]
  );

  // `MapAreaContainer` makes its map full-bleed via
  // `.map-view-container:not(.standalone)`, so inside the map shell this must
  // not be standalone; in the split and content shells it fills a sized cell
  // and sets its own viewport.
  const standalone = shell !== "map";

  return h(
    MapView,
    {
      style:
        basemapStyle(basemap, inDarkMode) ??
        basemapStyle(Basemap.Basic, inDarkMode),
      mapPosition,
      onMapMoved: setMapPosition,
      mapboxToken: mapboxAccessToken,
      accessToken: mapboxAccessToken,
      projection: { name: "globe" },
      overlayStyles,
      transformStyle,
      standalone,
      height: "100%",
    },
    h(MapMarker, { position: point, setPosition })
  );
}

function useOverlayStyles() {
  const inDarkMode = useInDarkMode();
  const focusSlug = useAtomValue(focusSlugAtom) ?? DEFAULT_FOCUS;
  const expand = useAtomValue(expandMembersAtom);
  const showFootprints = useAtomValue(showFootprintsAtom);
  const showFaces = useAtomValue(showFacesAtom);
  const showCarto = useAtomValue(showCartoAtom);

  // Drawn set: whatever the tree is showing after its filters, matched by slug
  // — what both tile layers carry. Null means no filter, so draw everything.
  const visibleSlugs = useAtomValue(visibleSlugsAtom);
  // The selected node is highlighted within the same sources, so selection
  // costs no extra request.
  const focusNode = useAtomValue(focusNodeAtom);
  const highlighted = useMemo(() => {
    if (focusNode == null) return [];
    return [focusNode.slug];
  }, [focusNode]);

  return useMemo(() => {
    const styles = [];
    if (showCarto) {
      styles.push(macrostratCartoStyle());
    }
    if (showFaces) {
      styles.push(
        facesStyle(focusSlug, expand, inDarkMode, visibleSlugs, highlighted)
      );
    }
    if (showFootprints) {
      styles.push(
        footprintStyle(focusSlug, expand, inDarkMode, visibleSlugs, highlighted)
      );
    }
    return styles;
  }, [
    focusSlug,
    expand,
    inDarkMode,
    showFootprints,
    showFaces,
    showCarto,
    visibleSlugs,
    highlighted,
  ]);
}

/** Null means no filter is active, so draw everything — distinct from an empty
 * list, which genuinely means nothing matched. */
function visibilityFilter(slugs: string[] | null): any {
  if (slugs == null) return null;
  return ["in", ["get", "slug"], ["literal", slugs]];
}

function withFilter(layer: any, filter: any) {
  if (filter == null) return layer;
  return { ...layer, filter };
}

function footprintStyle(
  slug: string,
  expand: boolean,
  inDarkMode: boolean,
  visible: string[] | null,
  highlighted: string[]
) {
  const tone = inDarkMode ? 235 : 30;
  const color = `rgb(${tone}, ${tone}, ${tone})`;
  const filter = visibilityFilter(visible);

  return {
    version: 8,
    sources: {
      "compilation-maps": {
        type: "vector",
        tiles: [
          `${burwellTileDomain}/dev/topology/maps/${slug}/{z}/{x}/{y}?level=${expand ? "map" : "member"}`,
        ],
      },
    },
    layers: [
      withFilter(
        {
          id: "compilation-maps-fill",
          type: "fill",
          source: "compilation-maps",
          "source-layer": "maps",
          paint: { "fill-color": color, "fill-opacity": 0.06 },
        },
        filter
      ),
      withFilter(
        {
          id: "compilation-maps-line",
          type: "line",
          source: "compilation-maps",
          "source-layer": "maps",
          paint: { "line-color": color, "line-width": 1, "line-opacity": 0.6 },
        },
        filter
      ),
      // The selection, drawn over the rest rather than instead of it, so a
      // selected map is read in the context of its neighbours.
      {
        id: "compilation-maps-selected",
        type: "line",
        source: "compilation-maps",
        "source-layer": "maps",
        filter: ["in", ["get", "slug"], ["literal", highlighted]],
        paint: { "line-color": "#f5a623", "line-width": 2.5 },
      },
    ],
  };
}

function facesStyle(
  slug: string,
  expand: boolean,
  inDarkMode: boolean,
  visible: string[] | null,
  highlighted: string[]
) {
  const filter = visibilityFilter(visible);
  const color = inDarkMode ? "#7bb5ff" : "#2b6cb0";

  return {
    version: 8,
    sources: {
      "compilation-faces": {
        type: "vector",
        tiles: [
          `${burwellTileDomain}/dev/topology/faces/${slug}/{z}/{x}/{y}?level=${expand ? "map" : "member"}`,
        ],
      },
    },
    layers: [
      withFilter(
        {
          id: "compilation-faces-fill",
          type: "fill",
          source: "compilation-faces",
          "source-layer": "map_faces",
          paint: { "fill-color": color, "fill-opacity": 0.12 },
        },
        filter
      ),
      withFilter(
        {
          id: "compilation-faces-line",
          type: "line",
          source: "compilation-faces",
          "source-layer": "map_faces",
          paint: {
            "line-color": color,
            "line-width": 0.8,
            "line-opacity": 0.8,
          },
        },
        filter
      ),
      {
        id: "compilation-faces-selected",
        type: "fill",
        source: "compilation-faces",
        "source-layer": "map_faces",
        filter: ["in", ["get", "slug"], ["literal", highlighted]],
        paint: { "fill-color": "#f5a623", "fill-opacity": 0.3 },
      },
    ],
  };
}
