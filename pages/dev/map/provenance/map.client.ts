/** The map slot: the selected map's bounds beside the maps it is related to.
 *
 * One source — the tileserver's `/dev/topology/maps` route with no slug, which
 * carries every map's bounds tagged by `slug` — filtered and coloured per role,
 * so switching the selection or hovering an overlapping map costs no request.
 */

import { burwellTileDomain, mapboxAccessToken } from "@macrostrat-web/settings";
import { MapView } from "@macrostrat/map-interface";
import {
  MapboxMapProvider,
  useMapRef,
  useMapStatus,
} from "@macrostrat/mapbox-react";
import { ErrorBoundary, useInDarkMode } from "@macrostrat/ui-components";
import h from "@macrostrat/hyper";
import { useAtom, useAtomValue } from "jotai";
import { useEffect, useMemo } from "react";

import { basemapStyle, Basemap } from "~/components";
import { lastMapPositionAtom } from "~/_utils/last-map-position";
import { layoutShellAtom } from "~/layouts/hybrid";

import {
  compareSlugAtom,
  detailAtom,
  effectiveSupersederAtom,
  nodesByIdAtom,
  selectedNodeAtom,
  supersededByIdAtom,
} from "./state";

const colors = {
  selected: "#f5a623",
  superseder: "#2b8a3e",
  supersedes: "#868e96",
  compare: "#7048e8",
};

export function ProvenanceMap() {
  return h(ErrorBoundary, h(ProvenanceMapShell));
}

/** The map shell supplies a `MapboxMapProvider`; the content and split shells
 * do not, so the map brings its own there (as on the compilations page). */
function ProvenanceMapShell() {
  const shell = useAtomValue(layoutShellAtom);
  if (shell === "map") return h(ProvenanceMapInner, { shell });
  return h(MapboxMapProvider, h(ProvenanceMapInner, { shell }));
}

function ProvenanceMapInner({ shell }) {
  const inDarkMode = useInDarkMode();
  const [mapPosition, setMapPosition] = useAtom(lastMapPositionAtom);
  const overlayStyles = useOverlayStyles();

  return h(
    MapView,
    {
      style: basemapStyle(Basemap.Basic, inDarkMode),
      mapPosition,
      onMapMoved: setMapPosition,
      mapboxToken: mapboxAccessToken,
      accessToken: mapboxAccessToken,
      projection: { name: "globe" },
      overlayStyles,
      standalone: shell !== "map",
      height: "100%",
    },
    h(FitToSelection)
  );
}

/** Slugs to draw, by role. */
function useRoles() {
  const node = useAtomValue(selectedNodeAtom);
  const byId = useAtomValue(nodesByIdAtom);
  const superseding = useAtomValue(supersededByIdAtom);
  const superseder = useAtomValue(effectiveSupersederAtom);
  const compare = useAtomValue(compareSlugAtom);

  return useMemo(() => {
    const roles: Record<keyof typeof colors, string[]> = {
      selected: [],
      superseder: [],
      supersedes: [],
      compare: [],
    };
    if (node == null) return roles;
    roles.selected.push(node.slug);
    const by = byId.get(superseder ?? -1);
    if (by != null) roles.superseder.push(by.slug);
    for (const s of superseding.get(node.source_id) ?? []) {
      roles.supersedes.push(s.slug);
    }
    if (compare != null) roles.compare.push(compare);
    return roles;
  }, [node, byId, superseding, superseder, compare]);
}

function useOverlayStyles() {
  const roles = useRoles();

  return useMemo(() => {
    // Drawn bottom to top, so the selection sits over what it is compared with.
    const order: (keyof typeof colors)[] = [
      "supersedes",
      "superseder",
      "compare",
      "selected",
    ];
    const layers = order.flatMap((role) => {
      const filter = ["in", ["get", "slug"], ["literal", roles[role]]];
      return [
        {
          id: `provenance-${role}-fill`,
          type: "fill",
          source: "provenance-maps",
          "source-layer": "maps",
          filter,
          paint: { "fill-color": colors[role], "fill-opacity": 0.12 },
        },
        {
          id: `provenance-${role}-line`,
          type: "line",
          source: "provenance-maps",
          "source-layer": "maps",
          filter,
          paint: { "line-color": colors[role], "line-width": 2 },
        },
      ];
    });

    return [
      {
        version: 8,
        sources: {
          "provenance-maps": {
            type: "vector",
            tiles: [`${burwellTileDomain}/dev/topology/maps/{z}/{x}/{y}`],
          },
        },
        layers,
      },
    ];
  }, [roles]);
}

/** Frame the selection when it changes. Bounds spanning more than half the
 * globe are left alone: they are either global or wrap the antimeridian (Alaska
 * does), and fitting either shows the whole world. */
function FitToSelection() {
  const mapRef = useMapRef();
  const { isStyleLoaded } = useMapStatus();
  const detail = useAtomValue(detailAtom);

  let bounds: [number, number, number, number] | null = null;
  if (detail.state === "hasData") bounds = detail.data?.bounds ?? null;
  const key = bounds?.join(",") ?? null;

  useEffect(() => {
    const map = mapRef.current;
    if (map == null || !isStyleLoaded || bounds == null) return;
    const [west, south, east, north] = bounds;
    if (east - west > 180) return;
    map.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      { padding: 50, maxZoom: 10 }
    );
  }, [key, isStyleLoaded]);

  return null;
}
