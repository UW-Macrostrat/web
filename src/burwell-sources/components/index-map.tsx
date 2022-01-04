import { useEffect, useRef, useState } from "react";
import {
  getVisibleScale,
  useBurwellActions,
  useBurwellState,
} from "~/burwell-sources/app-state";
import h from "@macrostrat/hyper";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface IndexMapProps {
  maps: [] | any;
  onSelectFeatures: (e) => {};
  selectedFeatures: [];
  openMenu: () => void;
  activeFeature: object;
  view: string;
}

async function initializeMap(mapContainerRef, viewport, setViewport) {
  mapboxgl.accessToken =
    "pk.eyJ1IjoiamN6YXBsZXdza2kiLCJhIjoiY2tpcjQ1cG1yMGZvcTJ6b3psbXB6bmtweiJ9.TkabsM8gNsZ7bHGJXu6vOQ";
  var map = new mapboxgl.Map({
    container: mapContainerRef,
    style: "mapbox://styles/mapbox/outdoors-v11", // style URL
    center: [viewport.longitude, viewport.latitude], // starting position [lng, lat]
    zoom: viewport.zoom, // starting zoom
  });
  map.on("move", () => {
    const [zoom, latitude, longitude] = [
      map.getZoom().toFixed(2),
      map.getCenter().lat.toFixed(4),
      map.getCenter().lng.toFixed(4),
    ];
    setViewport({ longitude, latitude, zoom });
  });

  return map;
}

async function mapSources(
  map,
  maps,
  onSelectFeatures,
  selectedFeatures,
  openMenu,
  activeFeature,
  view
) {
  map.on("load", () => {
    map.addSource("burwell-sources", {
      type: "geojson",
      data: maps,
    });
    map.addLayer({
      id: "sources-fill",
      type: "fill",
      source: "burwell-sources", // reference the data source
      paint: {
        "fill-opacity": 0.5,
        "fill-color": [
          "case",
          ["boolean", ["feature-state", "active"], false],
          "#ffae80",
          "#aaaaaa",
        ],
      },
    });
    map.addLayer({
      id: "outline",
      type: "line",
      source: "burwell-sources",
      layout: {},
      paint: {
        "line-color": [
          "case",
          ["boolean", ["feature-state", "clicked"], false],
          "#ffae80",
          "#333",
        ],
        "line-width": 2,
      },
    });
  });
  if (map.getLayer("sources-fill")) {
    if (activeFeature.id !== undefined) {
      map.setFeatureState(
        { source: "burwell-sources", id: activeFeature.id },
        { active: true }
      );
    } else {
      let features = map.queryRenderedFeatures({
        layers: ["sources-fill"],
      });
      features.map((f) => {
        map.setFeatureState(
          { source: "burwell-sources", id: f.id },
          { active: false }
        );
      });
    }
  }
  map.on("click", (e) => {
    let features = map.queryRenderedFeatures({
      layers: ["sources-fill"],
    });
    features.map((f) => {
      map.setFeatureState(
        { source: "burwell-sources", id: f.id },
        { clicked: false }
      );
    });
  });
  map.on("click", "sources-fill", (e) => {
    let features = map.queryRenderedFeatures({
      layers: ["sources-fill"],
    });
    features.map((f) => {
      map.setFeatureState(
        { source: "burwell-sources", id: f.id },
        { clicked: false }
      );
    });
    let features_ = [];
    e.features.map((f) => {
      if (f.state.clicked) {
        map.setFeatureState(
          { source: "burwell-sources", id: f.id },
          { clicked: false }
        );
      } else {
        features_.push(f);
        map.setFeatureState(
          { source: "burwell-sources", id: f.id },
          { clicked: true }
        );
      }
    });
    if (e.features.length) {
      onSelectFeatures(features_);
      openMenu();
    }
  });
}

function IndexMapContainer() {
  const [viewport, setViewport] = useState({
    longitude: 0,
    latitude: 40,
    zoom: 1,
  });

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  const { maps, selectedScale, selectedFeatures, activeFeature, view } =
    useBurwellState((state) => state);

  const filteredMaps = {
    type: "FeatureCollection",
    features: getVisibleScale(maps, selectedScale)
      .map((feature, i) => {
        feature.id = i;
        return feature;
      })
      .filter((f) => f.properties.source_id != 154),
  };
  const runAction = useBurwellActions();
  const onSelectFeatures = (features) => {
    runAction({ type: "select-features", selectedFeatures: features });
  };
  const openMenu = () => {
    runAction({ type: "toggle-menu", menuOpen: true });
  };

  useEffect(() => {
    if (mapContainerRef.current == null) return;
    initializeMap(mapContainerRef.current, viewport, setViewport).then(
      (mapObj) => {
        mapRef.current = mapObj;
      }
    );
    return () => {
      mapRef.current.remove();
    };
  }, [mapContainerRef]);

  useEffect(() => {
    if (mapRef.current == null) return;
    mapSources(
      mapRef.current,
      filteredMaps,
      onSelectFeatures,
      selectedFeatures,
      openMenu,
      activeFeature,
      view
    );
    return () => {
      var mapLayer = mapRef.current.getLayer("source-fill");
      if (typeof mapLayer !== "undefined") {
        mapRef.current.removeLayer("source-fill");
        mapRef.current.removeLayer("outline");
        mapRef.current.removeSource("source");
      }
    };
  }, [maps, mapRef, activeFeature]);

  return h("div.index-map-container", { ref: mapContainerRef });
}

export default IndexMapContainer;
