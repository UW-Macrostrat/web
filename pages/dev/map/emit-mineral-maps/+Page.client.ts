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
import { NullableDropdown } from "~/components";

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

const layerInfoDataAtom = atom((get) => {
  const layerInfo = get(layerInfoLoadableAtom);
  if (layerInfo.state === "hasData") {
    return layerInfo.data;
  }
  return null;
});

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

const mineralClassesAtom = atom((get) => {
  const layerInfo = get(layerInfoDataAtom);
  if (layerInfo == null) {
    return [];
  }
  try {
    const val = layerInfo.band_metadata[0][1]["MINERAL_CLASSES"];
    const v1 = val.replace("{", "").replace("}", "").replace(/'/g, "");
    const vals = v1.split(",").map((d) => {
      const [k, v] = d.split(":");
      return {
        id: Number(k.trim()),
        name: v.trim(),
      };
    });
    return vals;
  } catch (e) {
    return [];
  }
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
  const mineralSpecie = get(selectedMineralClassAtom);
  let mineralSpecieStyle = {};
  if (mineralSpecie != null) {
    // Render only the single raster value and ignore the rest
    mineralSpecieStyle = {
      // 2. Decode the specific color channel you want to isolate (e.g., Red channel)
      // Format: [multiply_r, multiply_g, multiply_b, offset]
      "raster-color-mix": [1, 0, 0, 0],
      // 3. Define the bounding range of your target value (e.g., Target pixel value = 150)
      // Maps standard 0-255 values to a 0.0 - 1.0 range
      "raster-color-range": [0, 1],
      // 4. Drop all other values to 0 opacity, colorizing only your single target value
      "raster-color": [
        "interpolate",
        ["linear"],
        ["raster-value"],
        0,
        "rgba(0,0,0,0)",
        (mineralSpecie - 10) / 255,
        "rgba(255,0,0,0)", // Everything below 150 is invisible
        mineralSpecie / 255,
        "rgba(255, 0, 0, 1.0)", // Target value 150 is solid Red
        (mineralSpecie + 10) / 255,
        "rgba(255,0,0,0)", // Everything above 150 is invisible
        1,
        "rgba(0,0,0,0)",
      ],
    };
  }

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
          ...mineralSpecieStyle,
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

const selectedMineralClassAtom = atom<number>();

const layerInfoLoadableAtom = loadable(layerInfoAtom);

function MineralClassDropdown() {
  const [mineralClass, setMineralClass] = useAtom(selectedMineralClassAtom);
  const value = useAtomValue(mineralClassesAtom);
  console.log(value);

  return h(NullableDropdown, {
    options: value.map((d) => ({ label: d.name, value: d.id })),
    placeholder: "Select mineral class",
    value: mineralClass,
    onChange: (value) => setMineralClass(Number(value)),
  });
}

function MapSelectorPanel() {
  return h("div.map-selector-panel", [
    h(
      "p",
      "EMIT mineral maps created by Zaid Al-Attar and Thomas Monecke, Colorado School of Mines."
    ),
    h(SelectedMapControl),
    h(MineralClassDropdown),
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
