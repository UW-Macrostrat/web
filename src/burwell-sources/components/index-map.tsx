import { useEffect, useRef, useState } from "react";
import {
  useBurwellActions,
  useBurwellState,
} from "~/burwell-sources/app-state";
import { initializeMap, mapSources } from "./map-pieces";
import h from "@macrostrat/hyper";
import "mapbox-gl/dist/mapbox-gl.css";

function IndexMapContainer() {
  const [viewport, setViewport] = useState({
    longitude: 0,
    latitude: 40,
    zoom: 1,
  });

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  const { maps, selectedScale, activeFeature, view } = useBurwellState(
    (state) => state
  );
  const runAction = useBurwellActions();
  const onSelectFeatures = (features) => {
    runAction({ type: "select-features", selectedFeatures: features });
  };
  const openMenu = () => {
    runAction({ type: "toggle-menu", menuOpen: true });
  };

  useEffect(() => {
    if (mapContainerRef.current == null) return;
    console.log("Map Container rerendered");
    initializeMap({
      mapContainer: mapContainerRef.current,
      viewport,
      setViewport,
    }).then((mapObj) => {
      mapRef.current = mapObj;
    });
    return () => {
      mapRef.current.remove();
    };
  }, [mapContainerRef]);

  useEffect(() => {
    if (mapRef.current == null) return;
    console.log("map rerendered");
    mapSources(
      mapRef.current,
      maps,
      onSelectFeatures,
      openMenu,
      activeFeature,
      selectedScale
    );
  }, [mapRef, maps, activeFeature, selectedScale]);

  return h("div.index-map-container", { ref: mapContainerRef });
}

export default IndexMapContainer;
