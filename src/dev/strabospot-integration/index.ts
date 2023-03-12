import { hyperStyled } from "@macrostrat/hyper";
import * as styles from "./main.module.styl";
import { Spinner } from "@blueprintjs/core";
import { LinkButton } from "~/map-interface/components/buttons";
import { useDarkMode, useAPIResult } from "@macrostrat/ui-components";
import mapboxgl from "mapbox-gl";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useAppActions } from "~/map-interface/app-state";
import { LocationPanel } from "~/map-interface/components/info-drawer";
import { FloatingNavbar } from "~/map-interface/components/navbar";
import { MapAreaContainer } from "~/map-interface/map-page";
import { PanelCard } from "~/map-interface/map-page/menu";
import {
  getBaseMapStyle,
  MapBottomControls,
  MapStyledContainer,
} from "~/map-interface/map-page/map-view/utils";
import { buildMacrostratStyle } from "~/map-interface/map-page/map-style";
import { FeaturePanel } from "../vector-tile-features";
import { mergeStyles } from "@macrostrat/mapbox-utils";
import { useMap } from "@macrostrat/mapbox-react";

import { DevMapView, useMapStyle, ParentRouteButton } from "../map";

const h = hyperStyled(styles);

const _macrostratStyle = buildMacrostratStyle() as mapboxgl.Style;
const straboOverlays = {
  version: 8,
  sources: {
    datasets: {
      type: "geojson",
      data: "https://www.strabospot.org/search/newsearchdatasets.json",
    },
    "dataset-features": {
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
        "circle-opacity": 0.5,
        "circle-stroke-width": 1,
        "circle-stroke-color": "magenta",
      },
    },
    {
      id: "strabo-dataset-features",
      type: "circle",
      source: "dataset-features",
      paint: {
        "circle-radius": 5,
        "circle-color": "green",
        "circle-opacity": 0.5,
        "circle-stroke-width": 1,
        "circle-stroke-color": "green",
      },
    },
  ],
};
const overlays = mergeStyles(_macrostratStyle, straboOverlays);

// All datasets for searching:
// https://www.strabospot.org/search/newsearchdatasets.json

// https://www.strabospot.org/search/interfacesearch.php?dsids=8-204825

export default function StraboSpotIntegrationPage({
  children,
}: {
  headerElement?: React.ReactElement;
  title?: string;
  children?: React.ReactNode;
}) {
  // A stripped-down page for map development
  const runAction = useAppActions();
  /* We apply a custom style to the panel container when we are interacting
    with the search bar, so that we can block map interactions until search
    bar focus is lost.
    We also apply a custom style when the infodrawer is open so we can hide
    the search bar on mobile platforms
  */

  const loaded = useSelector((state) => state.core.initialLoadComplete);
  useEffect(() => {
    runAction({ type: "get-initial-map-state" });
  }, []);

  const isOpen = true;

  const [inspectPosition, setInspectPosition] =
    useState<mapboxgl.LngLat | null>(null);

  const [data, setData] = useState(null);

  let detailElement = null;
  if (inspectPosition != null) {
    detailElement = h(
      LocationPanel,
      {
        onClose() {
          setInspectPosition(null);
        },
        position: inspectPosition,
      },
      [h(FeaturePanel, { features: data })]
    );
  }

  const { isEnabled } = useDarkMode();

  // const datasets = useAPIResult(
  //   "https://www.strabospot.org/search/newsearchdatasets.json"
  // );

  //console.log(datasets);

  // Style management
  const baseMapURL = getBaseMapStyle(new Set([]), isEnabled);

  const style = useMapStyle(baseMapURL, overlays);

  const [selectedDataset, setSelectedDataset] = useState(null);

  if (!loaded) return h(Spinner);

  return h(
    MapAreaContainer,
    {
      navbar: h(FloatingNavbar, [
        h([h(ParentRouteButton), "Macrostrat + StraboSpot"]),
      ]),
      contextPanel: h(PanelCard, [
        h.if(selectedDataset == null)("h3", "No dataset selected"),
        h.if(selectedDataset != null)([
          h("h3", selectedDataset?.properties.id ?? ""),
          h("h4", [selectedDataset?.properties.spotcount ?? "?", " spots"]),
        ]),
      ]),
      detailPanel: detailElement,
      contextPanelOpen: isOpen,
    },
    h(DevMapView, { style }, [
      h(DatasetClickReporter, {
        loaded,
        selectedDataset,
        setSelectedDataset,
      }),
      h.if(selectedDataset != null)(DatasetFeatures, { selectedDataset }),
    ])
  );
}

function DatasetFeatures({ selectedDataset }) {
  const data = useAPIResult(
    "https://www.strabospot.org/search/interfacesearch.php?dsids=" +
      selectedDataset.properties.id
  );
  const map = useMap();
  useEffect(() => {
    if (data == null) return;
    console.log(data);
    map?.getSource("dataset-features")?.setData(data);
    () => map?.getSource("dataset-features")?.setData(null);
  }, [data, map]);

  return null;
}

function DatasetClickReporter({ selectedDataset, setSelectedDataset }) {
  const map = useMap();
  useEffect(() => {
    map?.on("click", "strabo-datasets", (e) => {
      console.log(e.features);
      const { features } = e;
      setSelectedDataset(features[0]);
    });
  }, [map]);

  // Don't show selected dataset on map
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

export { MapStyledContainer, MapBottomControls };
