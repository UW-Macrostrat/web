import h from "@macrostrat/hyper";
// Import other components
import { burwellTileDomain, mapboxAccessToken } from "@macrostrat-web/settings";
// Import other components
import { Box, Spacer } from "@macrostrat/ui-components";
import { useState } from "react";
import {
  FloatingNavbar,
  MapLoadingButton,
  MapAreaContainer,
  MapView,
  PanelCard,
} from "@macrostrat/map-interface";
import { atom, useAtom, useAtomValue } from "jotai";
import { ControlGroup, FormGroup, HTMLSelect, Slider } from "@blueprintjs/core";
import { loadable } from "jotai/utils";
import { useMapEaseTo } from "@macrostrat/mapbox-react";
import { buildMacrostratStyle } from "@macrostrat/map-styles";

export function Page() {
  const [isOpen, setOpen] = useState(false);

  const mapBounds = useAtomValue(mapBoundsAtom);
  const rasterOverlayStyle = useAtomValue(mapOverlayStyleAtom);

  const overlayStyles = [macrostratStyle, rasterOverlayStyle];

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

const mapOverlayStyleAtom = atom((get) => {
  const opacity = get(rasterOpacityAtom);
  return {
    version: 8,
    sources: {
      "mineral-maps": {
        type: "raster",
        tiles: [
          `${baseURL}/tiles/{z}/{x}/{y}@2x?resampling=nearest&url=${encodeURIComponent(
            get(cogURLAtom)
          )}`,
        ],
      },
    },
    layers: [
      {
        type: "raster",
        source: "mineral-maps",
        paint: {
          "raster-opacity": opacity,
        },
      },
    ],
  };
});

const macrostratStyle = buildMacrostratStyle({
  tileserverDomain: burwellTileDomain,
  fillOpacity: 0.1,
  strokeOpacity: 0.2,
}) as mapboxgl.Style;

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
    h(
      "p",
      "EMIT mineral maps created by Zaid Al-Attar and Thomas Monecke, Colorado School of Mines."
    ),
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
    h(RasterOpacitySlider),
  ]);
}

const rasterOpacityAtom = atom(0.8);

function RasterOpacitySlider() {
  const [opacity, setOpacity] = useAtom(rasterOpacityAtom);
  return h(
    FormGroup,
    { label: "Raster opacity" },
    h(
      Box,
      { paddingX: 20 },
      h(Slider, {
        min: 0,
        max: 1,
        stepSize: 0.05,
        value: opacity,
        onChange: (v) => {
          setOpacity(v);
        },
      })
    )
  );
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
