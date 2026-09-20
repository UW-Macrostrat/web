/** The live half of the homepage hero: the geologic map around the featured
 * location beside the stratigraphic column beneath it. Client-only (mapbox-gl);
 * `+Page.ts` shows the static hero until this mounts. */
import h from "./hero.module.sass";
import { useMemo } from "react";
import { getBasicMapStyle, MapView } from "@macrostrat/map-interface";
import { buildMacrostratStyle } from "@macrostrat/map-styles";
import { setMapPosition } from "@macrostrat/mapbox-utils";
import { MapboxMapProvider, ZoomControl } from "@macrostrat/mapbox-react";
import {
  Column,
  ColoredUnitComponent,
  MacrostratColumnStateProvider,
} from "@macrostrat/column-views";
import { ColumnAxisType } from "@macrostrat/column-components";
import { MacrostratDataProvider } from "@macrostrat/data-provider";
import { ErrorBoundary, useInDarkMode } from "@macrostrat/ui-components";
import {
  apiV2Prefix,
  mapboxAccessToken,
  tileserverDomain,
} from "@macrostrat-web/settings";
import { PatternProvider } from "~/_providers";
import type { HeroData } from "./+data";

const geologyStyle = buildMacrostratStyle({
  tileserverDomain,
  fillOpacity: 0.6,
  strokeOpacity: 0.25,
});

export function HeroLive({ hero }: { hero: HeroData }) {
  return h("div.hero-live", [
    h(ErrorBoundary, h(HeroMap, { hero })),
    h(ErrorBoundary, h(HeroColumn, { hero })),
  ]);
}

function HeroMap({ hero }: { hero: HeroData }) {
  const inDarkMode = useInDarkMode();
  const { location, footprint } = hero;

  const overlayStyles = useMemo(() => {
    const styles: any[] = [geologyStyle];
    if (footprint != null) {
      styles.push(footprintStyle(footprint));
    }
    return styles;
  }, [footprint]);

  const style = useMemo(() => getBasicMapStyle({ inDarkMode }), [inDarkMode]);

  // `MapView` reads its map from a `MapboxMapProvider`; outside `MapAreaContainer`
  // it has to bring its own, or it throws "Missing Provider from createIsolation".
  return h("div.hero-map", [
    h(MapboxMapProvider, h(MapView, {
      style,
      accessToken: mapboxAccessToken,
      standalone: true,
      overlayStyles,
      infoMarkerPosition: [location.lng, location.lat],
      onMapLoaded: (map) => {
        setMapPosition(map, {
          lat: location.lat,
          lng: location.lng,
          zoom: location.zoom,
        });
      },
    }, [h(ZoomControl, { key: "zoom", className: "hero-zoom-control" })])),
    h(
      "a.hero-panel-link",
      { href: `/map/#${location.zoom}/${location.lat}/${location.lng}` },
      "Open in the map"
    ),
  ]);
}

function footprintStyle(geometry: GeoJSON.Geometry) {
  return {
    sources: {
      "hero-footprint": {
        type: "geojson",
        data: { type: "Feature", geometry, properties: {} },
      },
    },
    layers: [
      {
        id: "hero-footprint-outline",
        type: "line",
        source: "hero-footprint",
        paint: { "line-color": "rgba(73, 47, 122, 0.9)", "line-width": 2 },
      },
    ],
  };
}

function HeroColumn({ hero }: { hero: HeroData }) {
  const { column, units } = hero;
  return h("div.hero-column", [
    h(
      MacrostratDataProvider,
      { baseURL: apiV2Prefix },
      h(
        PatternProvider,
        h(
          MacrostratColumnStateProvider,
          { units, selectedUnit: null },
          h("div.hero-column-scroll", [
            h(Column, {
              units,
              unitComponent: ColoredUnitComponent,
              axisType: ColumnAxisType.AGE,
              showTimescale: true,
              showLabels: false,
              showLabelColumn: false,
              allowUnitSelection: false,
              unconformityLabels: "none",
              collapseSmallUnconformities: true,
              width: 220,
              columnWidth: 150,
              targetUnitHeight: 10,
            }),
          ])
        )
      )
    ),
    h(
      "a.hero-panel-link",
      { href: `/columns/${column.col_id}` },
      "See the full column"
    ),
  ]);
}
