import h from "@macrostrat/hyper";
// Import other components
import { mapboxAccessToken } from "@macrostrat-web/settings";
// Import other components
import { Spacer, useDarkMode } from "@macrostrat/ui-components";
import { useState, useEffect } from "react";
import {
  FloatingNavbar,
  MapLoadingButton,
  MapAreaContainer,
  buildInspectorStyle,
  MapView,
  PanelCard,
} from "@macrostrat/map-interface";
import { boundingGeometryMapStyle } from "~/map-styles";
import { atom, useAtom, useAtomValue } from "jotai";
import { ControlGroup, FormGroup, HTMLSelect } from "@blueprintjs/core";
import { loadable } from "jotai/utils";
import { useMapEaseTo } from "@macrostrat/mapbox-react";

export function Page() {
  const [isOpen, setOpen] = useState(false);

  const mapBounds = useAtomValue(mapBoundsAtom);
  const rasterOverlayStyle = useAtomValue(mapOverlayStyleAtom);

  const overlayStyles = [rasterOverlayStyle];

  return h(
    MapAreaContainer,
    {
      navbar: h(FloatingNavbar, { width: 300 }, [
        h("h2", "EMIT mineral maps"),
        h(Spacer),
        h(MapLoadingButton, {
          active: isOpen,
          onClick: () => setOpen(!isOpen),
        }),
      ]),
      contextPanel: h(
        PanelCard,
        { style: { width: "300px" } },
        h(MapSelectorPanel)
      ),
      detailPanel: null,
      contextPanelOpen: isOpen,
    },
    h(
      MapView,
      {
        style: baseStyle,
        overlayStyles,
        mapPosition: null,
        projection: { name: "globe" },
        mapboxToken: mapboxAccessToken,
        bounds: mapBounds,
      },
      [h(FlyToMapManager)]
    )
  );
}

// https://storage.macrostrat.org/remote-sensing-data/emit-mineral-maps/Group2min/utah_clipped.tif

const mapOptions = [
  { name: "Utah", key: "utah_clipped" },
  { name: "California", key: "cali_clipped" },
  { name: "Nevada", key: "nevada_clipped" },
  { name: "Southern Bolivia", key: "S_Bolivia" },
];

const selectedMapAtom = atom(mapOptions[0].key);

const mapBoundsAtom = atom((get) => {
  const layerInfo = get(layerInfoLoadableAtom);
  if (layerInfo.state === "loading") {
    return null;
  }
  if (layerInfo.state === "hasData") {
    return layerInfo.data.bounds;
  }
  // Default map bounds
  return [-125, 24, -66, 49];
});

const baseURL = "https://tiles.dev.macrostrat.org/cog";

const cogURLAtom = atom((get) => {
  const bucketURL =
    "https://storage.macrostrat.org/remote-sensing-data/emit-mineral-maps/Group2min/";
  const selectedMap = get(selectedMapAtom);
  return `${bucketURL}${selectedMap}.tif`;
});

const tileLayerAtom = atom((get) => {
  const url = get(cogURLAtom);
  return {
    id: "mineral-maps",
    type: "raster",
    source: {
      type: "raster",
      tiles: [`${baseURL}/tiles/{z}/{x}/{y}?url=${encodeURIComponent(url)}`],
      tileSize: 256,
    },
  };
});

const mapOverlayStyleAtom = atom((get) => {
  return {
    version: 8,
    sources: {
      "mineral-maps": {
        type: "raster",
        tiles: [
          `${baseURL}/tiles/{z}/{x}/{y}?url=${encodeURIComponent(
            get(cogURLAtom)
          )}`,
        ],
      },
    },
    layers: [
      {
        type: "raster",
        source: "mineral-maps",
      },
    ],
  };
});

const layerInfoAtom = atom(async (get, { signal }) => {
  const url = get(cogURLAtom);
  const layerInfoURL = `${baseURL}/info?url=${encodeURIComponent(url)}`;
  const response = await fetch(layerInfoURL, { signal });
  if (!response.ok) {
    throw new Error(`Failed to fetch layer info: ${response.statusText}`);
  }
  const data = await response.json();
  return data;
});

const baseStyle = "mapbox://styles/mapbox/light-v10";

const layerInfoLoadableAtom = loadable(layerInfoAtom);

function MapSelectorPanel() {
  return h("div.map-selector-panel", [
    h(SelectedMapControl),
    h(LayerErrorReporter),
  ]);
}

function FlyToMapManager() {
  const bounds = useAtomValue(mapBoundsAtom);
  useMapEaseTo({ bounds, padding: 50 });
  return null;
}

function SelectedMapControl() {
  const [facet, setFacet] = useAtom(selectedMapAtom);
  const options = mapOptions.map((d) => ({ label: d.name, value: d.key }));

  return h("div.facet-control", [
    h(
      FormGroup,
      {
        label: "Selected map",
        inline: true,
      },
      h(ControlGroup, { fill: true }, [
        h(HTMLSelect, {
          options,
          value: facet,
          onChange: (evt) => {
            const value = evt.target.value;
            setFacet(value);
          },
        }),
      ])
    ),
  ]);
}

function LayerErrorReporter() {
  const layerInfo = useAtomValue(layerInfoLoadableAtom);

  if (layerInfo.state === "hasError") {
    return h("div.layer-error", [
      h("h3", "Error loading layer info"),
      h("p", layerInfo.error),
    ]);
  } else if (layerInfo.state === "loading") {
    return h("div.layer-loading", [h("h3", "Loading layer info...")]);
  } else if (layerInfo.state === "hasData") {
    return null; // No error, so render nothing
  }
}
