import { forwardRef, useRef } from "react";
import {
  useAppActions,
  useAppState,
  MapLayer,
} from "~/map-interface/app-state";
import Map from "./map";
import hyper from "@macrostrat/hyper";
import { useEffect } from "react";
import useResizeObserver from "use-resize-observer";
import styles from "../main.module.styl";
import {
  useMapRef,
  CompassControl,
  GlobeControl,
  ThreeDControl,
  useMapConditionalStyle,
  useMapLabelVisibility,
} from "@macrostrat/mapbox-react";
import classNames from "classnames";
import { Icon } from "@blueprintjs/core";
import { debounce } from "lodash";
import {
  mapViewInfo,
  getMapPosition,
  setMapPosition,
} from "@macrostrat/mapbox-utils";
import { MapSourcesLayer, toggleLineSymbols } from "../map-style";

const h = hyper.styled(styles);

const _Map = forwardRef((props, ref) => h(Map, { ...props, ref }));

function calcMapPadding(rect, childRect) {
  return {
    left: Math.max(rect.left - childRect.left, 0),
    top: Math.max(rect.top - childRect.top, 0),
    right: Math.max(childRect.right - rect.right, 0),
    bottom: Math.max(childRect.bottom - rect.bottom, 0),
  };
}

function useElevationMarkerLocation(mapRef, elevationMarkerLocation) {
  // Handle elevation marker location
  useEffect(() => {
    const map = mapRef.current;
    if (map == null) return;
    if (elevationMarkerLocation == null) return;
    const src = map.getSource("elevationMarker");
    if (src == null) return;
    src.setData({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: elevationMarkerLocation,
          },
        },
      ],
    });
  }, [mapRef, elevationMarkerLocation]);
}

function MapContainer(props) {
  const {
    filters,
    filteredColumns,
    mapLayers,
    mapCenter,
    elevationChartOpen,
    elevationData,
    elevationMarkerLocation,
    mapPosition,
    infoDrawerOpen,
    mapIsLoading,
    mapShowLabels,
    mapShowLineSymbols,
  } = useAppState((state) => state.core);

  const runAction = useAppActions();
  const offset = useRef([0, 0]);

  const mapRef = useMapRef();

  const ref = useRef<HTMLDivElement>();
  const parentRef = useRef<HTMLDivElement>();

  useEffect(() => {
    // Get the current value of the map. Useful for gradually moving away
    // from class component
    const map = mapRef.current;
    if (map == null) return;

    setMapPosition(map, mapPosition);
    // Update the URI when the map moves

    const mapMovedCallback = () => {
      runAction({
        type: "map-moved",
        data: getMapPosition(map),
      });
    };
    map.on("moveend", debounce(mapMovedCallback, 100));
  }, [mapRef]);

  // useMapConditionalStyle(mapRef, true, (map, isOn) => {
  //   map.showTileBoundaries = isOn;
  // });

  useEffect(() => {
    if (mapLayers.has(MapLayer.COLUMNS)) {
      runAction({ type: "get-filtered-columns" });
    }
    runAction({ type: "map-layers-changed", mapLayers });
  }, [filters, mapLayers]);

  useMapLabelVisibility(mapRef, mapShowLabels);
  useMapConditionalStyle(
    mapRef,
    mapShowLineSymbols && mapLayers.has(MapLayer.LINES),
    toggleLineSymbols
  );

  useResizeObserver({
    ref: parentRef,
    onResize(sz) {
      const rect = parentRef.current?.getBoundingClientRect();
      const childRect = ref.current?.getBoundingClientRect();
      if (rect == null || childRect == null) return;
      const padding = calcMapPadding(rect, childRect);
      mapRef.current?.easeTo({ padding }, { duration: 800 });
    },
  });

  const debouncedResize = useRef(
    debounce(() => {
      mapRef.current?.resize();
    }, 100)
  );

  useResizeObserver({
    ref,
    onResize: debouncedResize.current,
  });

  useElevationMarkerLocation(mapRef, elevationMarkerLocation);

  const { mapUse3D, mapIsRotated } = mapViewInfo(mapPosition);

  console.log(mapLayers);
  return h("div.map-view-container.main-view", { ref: parentRef }, [
    h(_Map, {
      filters,
      filteredColumns,
      mapHasBedrock: mapLayers.has(MapLayer.BEDROCK),
      mapHasLines: mapLayers.has(MapLayer.LINES),
      mapHasSatellite: mapLayers.has(MapLayer.SATELLITE),
      mapHasColumns: mapLayers.has(MapLayer.COLUMNS),
      mapHasFossils: mapLayers.has(MapLayer.FOSSILS),
      mapCenter,
      elevationChartOpen,
      elevationData,
      elevationMarkerLocation,
      mapPosition,
      infoDrawerOpen,
      runAction,
      mapIsLoading,
      mapIsRotated,
      mapRef,
      markerLoadOffset: offset.current,
      ...props,
      use3D: mapUse3D,
      ref,
    }),
    h.if(mapLayers.has(MapLayer.SOURCES))(MapSourcesLayer),
  ]);
}

export function MapBottomControls() {
  return h("div.map-controls", [
    h(ThreeDControl, { className: "map-3d-control" }),
    h(CompassControl, { className: "compass-control" }),
    h(GlobeControl, { className: "globe-control" }),
  ]);
}

export function MapStyledContainer({ className, children }) {
  const { mapIsRotated, mapUse3D, mapIsGlobal } = mapViewInfo(
    useAppState((state) => state.core.mapPosition)
  );
  className = classNames(className, {
    "map-is-rotated": mapIsRotated,
    "map-3d-available": mapUse3D,
    "map-is-global": mapIsGlobal,
  });

  return h("div", { className }, children);
}

export default MapContainer;
