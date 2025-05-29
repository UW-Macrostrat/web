import h from "@macrostrat/hyper";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";
import {
  flyToData,
  useBurwellActions,
  useBurwellState,
} from "#/map/sources/app-state";
import { initializeMap } from "./initialize-map";
import { mapSources } from "./map-sources";

function IndexMapContainer() {
  const [viewport, setViewport] = useState({
    longitude: 0,
    latitude: 40,
    zoom: 1,
  });
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  const { maps, selectedScale, activeFeature, flyTo } = useBurwellState(
    (state) => state
  );
  const runAction = useBurwellActions();
  const onSelectFeatures = (features) => {
    runAction({ type: "select-features", selectedFeatures: features });
  };

  useEffect(() => {
    if (mapContainerRef.current == null) return;
    initializeMap({
      mapContainer: mapContainerRef.current,
      viewport,
      setViewport,
    }).then((mapObj) => {
      mapRef.current = mapObj;
    });
    return () => {
      mapRef.current?.remove();
    };
  }, [mapContainerRef]);

  useEffect(() => {
    if (mapRef.current == null) return;
    mapSources(
      mapRef.current,
      maps,
      onSelectFeatures,
      activeFeature,
      selectedScale
    );
    return () => {
      // remove current click events to prevent stack overflow
      mapRef.current.off(
        "click",
        "sources-fill",
        mapRef.current.sourcesFillListener
      );
      mapRef.current.off("click", mapRef.current.clickMap);
    };
  }, [mapRef, maps, activeFeature, selectedScale]);

  useEffect(() => {
    if (mapRef.current == null || !activeFeature.id || !flyTo) return;
    const map = mapRef.current;
    map.flyTo(flyToData(activeFeature));
  }, [activeFeature]);

  return h("div.index-map-container", { ref: mapContainerRef });
}

export default IndexMapContainer;
