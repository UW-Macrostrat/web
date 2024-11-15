import { hyperStyled } from "@macrostrat/hyper";
import { JSONView, useAPIResult, useDarkMode } from "@macrostrat/ui-components";
import mapboxgl from "mapbox-gl";
import { useCallback, useEffect, useState } from "react";
import * as styles from "./main.module.styl";

import {
  FloatingNavbar,
  MapAreaContainer,
  PanelCard,
  MapStyledContainer,
  MapView,
  LocationPanel,
} from "@macrostrat/map-interface";

import { getBaseMapStyle } from "@macrostrat-web/map-utils";
import { burwellTileDomain } from "@macrostrat-web/settings";
import { useMap } from "@macrostrat/mapbox-react";
import {
  buildMacrostratStyle,
  getOrientationSymbolName,
  pointLayoutProperties,
  setupPointSymbols,
} from "@macrostrat/mapbox-styles";
import { mergeStyles } from "@macrostrat/mapbox-utils";
import { ParentRouteButton } from "~/components/map-navbar";
import { useMapStyle } from "#/dev/map/layers/lib/utils";

const h = hyperStyled(styles);

const featureLayers = [];

const _macrostratStyle = buildMacrostratStyle({
  tileserverDomain: burwellTileDomain,
  fillOpacity: 0.1,
  strokeOpacity: 0.2,
}) as mapboxgl.Style;

const pointLayout = pointLayoutProperties(true);

console.log(pointLayout);

const straboOverlays = {
  version: 8,
  sources: {
    datasets: {
      type: "geojson",
      data: "https://strabospot.org/search/newsearchdatasets.json",
    },
    spots: {
      type: "geojson",
      data: null,
    },
  },
  layers: [
    {
      id: "strabo-datasets",
      type: "circle",
      source: "datasets",
      paint: {
        "circle-radius": 5,
        "circle-color": "magenta",
        "circle-opacity": 0.3,
        "circle-stroke-width": 1,
        "circle-stroke-color": "magenta",
        // Scale datasets by spot count
        // @ts-ignore
        "circle-radius": [
          "interpolate",
          ["exponential", 1.5],
          ["get", "count"],
          0,
          5,
          10,
          10,
          100,
          15,
          1000,
          20,
          10000,
          25,
        ],
      },
    },
    {
      id: "strabo-spots",
      type: "circle",
      source: "spots",
      paint: {
        "circle-radius": 3,
        "circle-color": "magenta",
        "circle-opacity": 0.3,
        "circle-stroke-width": 1,
        "circle-stroke-color": "magenta",
      },
      filter: [
        "all",
        ["==", ["geometry-type"], "Point"],
        ["==", ["get", "orientation"], null],
      ],
    },
    {
      id: "strabo-orientations",
      type: "symbol",
      source: "spots",
      // layout: {
      //   "icon-image": "point",
      // },
      layout: pointLayout,
      filter: [
        "all",
        ["==", ["geometry-type"], "Point"],
        ["!=", ["get", "orientation"], null],
      ],
    },
    {
      id: "strabo-spots-line",
      type: "line",
      source: "spots",
      paint: {
        "line-color": "magenta",
        "line-width": 1,
        "line-opacity": 0.8,
      },
      filter: ["==", ["geometry-type"], "LineString"],
    },
    {
      id: "strabo-spots-polygon",
      type: "fill",
      source: "spots",
      paint: {
        "fill-color": "magenta",
        "fill-opacity": 0.3,
      },
      filter: ["==", ["geometry-type"], "Polygon"],
    },
    ...featureLayers,
  ],
};
const overlays = mergeStyles(_macrostratStyle, straboOverlays);

// All datasets for searching:
// https://www.strabospot.org/search/newsearchdatasets.json

// https://www.strabospot.org/search/interfacesearch.php?dsids=8-204825

export function Page({
  children,
}: {
  headerElement?: React.ReactElement;
  title?: string;
  children?: React.ReactNode;
}) {
  // A stripped-down page for map development
  const [loaded, setLoaded] = useState(false);
  /* We apply a custom style to the panel container when we are interacting
    with the search bar, so that we can block map interactions until search
    bar focus is lost.
    We also apply a custom style when the infodrawer is open so we can hide
    the search bar on mobile platforms
  */

  const isOpen = true;

  const [selectedDataset, setSelectedDataset] = useState(null);
  const [selectedSpots, setSelectedSpots] = useState(null);

  let detailElement = null;
  if (selectedSpots != null) {
    const jsonData = selectedSpots.map((d) => d.properties);
    detailElement = h(
      LocationPanel,
      {
        onClose() {
          setSelectedSpots(null);
        },
        title: "Spots",
        showCopyPositionButton: false,
      },
      [
        h(JSONView, {
          data: jsonData,
          shouldExpandNode: (keyName, data, level) => level < 2,
          hideRoot: true,
        }),
      ]
    );
  }

  const { isEnabled } = useDarkMode();

  const onMapLoaded = useCallback((map: mapboxgl.Map) => {
    setupPointSymbols(map);
    setLoaded(true);
  }, []);

  // const datasets = useAPIResult(
  //   "https://www.strabospot.org/search/newsearchdatasets.json"
  // );

  //console.log(datasets);

  // Style management
  const baseMapURL = getBaseMapStyle(false, isEnabled);

  const style = useMapStyle(baseMapURL, overlays);

  return h(
    MapAreaContainer,
    {
      navbar: h(FloatingNavbar, [
        h([
          // TODO: change the route to be auto-managed.
          h(ParentRouteButton, { parentRoute: "/dev/map" }),
          "Macrostrat + StraboSpot",
        ]),
      ]),
      contextPanel: h(PanelCard, [
        h.if(selectedDataset == null)("h3", "No dataset selected"),
        h.if(selectedDataset != null)([
          h("h3", selectedDataset?.properties.id ?? ""),
          h("h4", [selectedDataset?.properties.count ?? "?", " spots"]),
        ]),
      ]),
      detailPanel: detailElement,
      contextPanelOpen: isOpen,
    },
    h(MapView, { style, onMapLoaded }, [
      h(HideSelectedDataset, { selectedDataset }),
      h(LayerClickReporter, {
        loaded,
        layerID: "strabo-datasets",
        onSelectItems: (features) => setSelectedDataset(features[0]),
      }),
      h(LayerClickReporter, {
        loaded,
        layerID: [
          "strabo-spots",
          "strabo-spots-line",
          "strabo-spots-polygon",
          "strabo-orientations",
        ],
        onSelectItems: (features) => setSelectedSpots(features),
      }),
      h.if(selectedDataset != null)(DatasetFeatures, { selectedDataset }),
    ])
  );
}

function processSpots(spots) {
  const features = spots?.features?.map((spot, i) => {
    const { geometry, properties } = spot;
    let orientationData = properties?.orientation_data;
    // deserieslize orientation data if it is a string
    if (typeof orientationData === "string") {
      orientationData = JSON.parse(orientationData);
    }

    const orientation = orientationData?.[0] ?? null;
    return {
      type: "Feature",
      geometry,
      properties: {
        ...properties,
        orientation,
        symbolName: getOrientationSymbolName(orientation),
      },
    };
  });

  console.log(features);

  return {
    type: "FeatureCollection",
    features,
  };
}

function DatasetFeatures({ selectedDataset }) {
  const data = useAPIResult(
    "https://strabospot.org/search/interfacesearch.php?dsids=" +
      selectedDataset.properties.id
  );
  const map = useMap();
  useEffect(() => {
    if (data == null) return;
    map?.getSource("spots")?.setData(processSpots(data));
    () => map?.getSource("spots")?.setData(null);
  }, [data, map]);

  return null;
}

function HideSelectedDataset({ selectedDataset }) {
  const map = useMap();
  useEffect(() => {
    if (selectedDataset == null) return;
    const { id } = selectedDataset.properties;
    // Set map filter
    map?.setFilter("strabo-datasets", ["!=", "id", id]);
    return () => {
      map?.setFilter("strabo-datasets", null);
    };
  }, [map, selectedDataset]);

  return null;
}

function LayerClickReporter({ onSelectItems, layerID }) {
  const map = useMap();
  useEffect(() => {
    //map?.on("styleimagemissing", console.log);
    map?.on("click", layerID, (e) => {
      const { features } = e;
      onSelectItems(features);
    });
    return () => {
      map?.off("click", layerID);
    };
  }, [map, layerID]);
  return null;
}

export { MapStyledContainer };
