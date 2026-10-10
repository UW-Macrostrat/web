/** A small map for choosing where to match: click to set the coordinates,
 * and the point shows where the query stands. The same inset basemap the
 * column location editor uses. */
import hyper from "@macrostrat/hyper";
import { useCallback, useEffect, useRef, useState } from "react";
import type mapboxgl from "mapbox-gl";
import type { FeatureCollection } from "geojson";
import { MapView } from "@macrostrat/map-interface";
import { MapboxMapProvider } from "@macrostrat/mapbox-react";
import { mapboxAccessToken } from "@macrostrat-web/settings";
import { useInsetMapStyleProps } from "~/components/map-settings";
import styles from "../match.module.sass";

const h = hyper.styled(styles);

export interface MapPoint {
  lat: number;
  lng: number;
}

const POINT_SOURCE = "match-point";
const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

/** Five decimals, about a metre: past the resolution of any column. */
function round(n: number): number {
  return Math.round(n * 1e5) / 1e5;
}

function pointCollection(point: MapPoint | null): FeatureCollection {
  if (point == null) return EMPTY;
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [point.lng, point.lat] },
      },
    ],
  };
}

export function PointMap({
  point,
  onPick,
}: {
  point: MapPoint | null;
  onPick(point: MapPoint): void;
}) {
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const { mapStyle } = useInsetMapStyleProps();
  // The handler the click reaches is always the latest one; the listener is
  // bound once, when the map loads.
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const openingPoint = useRef(point);

  const onMapLoaded = useCallback((m: mapboxgl.Map) => {
    const start = openingPoint.current;
    if (start != null) {
      m.jumpTo({ center: [start.lng, start.lat], zoom: 5 });
    } else {
      m.jumpTo({ center: [-100, 40], zoom: 2 });
    }
    m.on("click", (event) => {
      pickRef.current({
        lat: round(event.lngLat.lat),
        lng: round(event.lngLat.lng),
      });
    });
    setMap(m);
  }, []);

  // The point's layer, re-added whenever the style reloads (basemap change).
  useEffect(() => {
    if (map == null) return;
    const apply = () => {
      if (map.getSource(POINT_SOURCE) == null) {
        map.addSource(POINT_SOURCE, { type: "geojson", data: EMPTY });
      }
      if (map.getLayer(POINT_SOURCE) == null) {
        map.addLayer({
          id: POINT_SOURCE,
          type: "circle",
          source: POINT_SOURCE,
          paint: {
            "circle-radius": 6,
            "circle-color": "#7868fd",
            "circle-stroke-color": "#fff",
            "circle-stroke-width": 2,
          },
        });
      }
    };
    if (map.isStyleLoaded()) apply();
    map.on("style.load", apply);
    return () => {
      map.off("style.load", apply);
    };
  }, [map]);

  // The point follows the form; the map follows the point only when it has
  // left the view, so clicking around never yanks the map.
  useEffect(() => {
    if (map == null) return;
    const source = map.getSource(POINT_SOURCE) as
      | mapboxgl.GeoJSONSource
      | undefined;
    source?.setData(pointCollection(point));
    if (point == null) return;
    const inView = map.getBounds()?.contains([point.lng, point.lat]);
    if (!inView) {
      map.easeTo({
        center: [point.lng, point.lat],
        zoom: Math.max(map.getZoom(), 4),
      });
    }
  }, [map, point]);

  return h("div.point-map", [
    h(
      MapboxMapProvider,
      h(MapView, {
        style: mapStyle,
        accessToken: mapboxAccessToken,
        standalone: true,
        height: "100%",
        onMapLoaded,
      })
    ),
    h("div.map-hint", "Click the map to set the coordinates."),
  ]);
}
