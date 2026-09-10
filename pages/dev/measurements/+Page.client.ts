import h from "./main.module.sass";

import {
  MapAreaContainer,
  MapView,
  PanelCard,
} from "@macrostrat/map-interface";
import { mapboxAccessToken, tileserverDomain } from "@macrostrat-web/settings";
import { removeMapLabels } from "@macrostrat/mapbox-utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDarkMode, FlexRow } from "@macrostrat/ui-components";
import { MultiSelect } from "@blueprintjs/select";
import { MenuItem, Switch, Divider, Icon } from "@blueprintjs/core";
import { atom, useAtom, useAtomValue } from "jotai";
import { fetchAPIV2Result, fetchPGData } from "~/_utils";
import { macrostratCartoStyle } from "~/_utils/map-layers";
import { atomWithSearchParam } from "~/_utils/url-atoms";
import { BaseLayerForm, Basemap, basemapStyle } from "~/components";
import { MapPageNavbar } from "~/components/map-navbar/map-page-navbar";
import { Measurement } from "./measurement.ts";
import { usePageContext } from "vike-react/usePageContext";

/** Shared width for the floating navbar and the context panel below it. */
const PANEL_WIDTH = 320;

/** The base map style, persisted in the URL (parallel to the other map pages).
 * "basic" is the default and is kept out of the query string. */
const basemapParamAtom = atomWithSearchParam("basemap");
const basemapAtom = atom(
  (get): Basemap => {
    const value = get(basemapParamAtom);
    if (value === Basemap.Satellite || value === Basemap.None) {
      return value as Basemap;
    }
    return Basemap.Basic;
  },
  (get, set, value: Basemap) => {
    let param: Basemap | null = value;
    if (value === Basemap.Basic) param = null;
    set(basemapParamAtom, param);
  }
);

/** Whether the basemap's text labels are shown. On by default; the "off" state
 * is stored in the URL. */
const labelsParamAtom = atomWithSearchParam("labels");
const showLabelsAtom = atom(
  (get) => get(labelsParamAtom) !== "off",
  (get, set, value: boolean) => {
    let param: string | null = null;
    if (!value) param = "off";
    set(labelsParamAtom, param);
  }
);

/** Whether to underlay the Macrostrat geologic map, for geological context
 * behind the measurement points. Off by default; "on" is stored in the URL. */
const cartoParamAtom = atomWithSearchParam("carto");
const showCartoAtom = atom(
  (get) => get(cartoParamAtom) === "on",
  (get, set, value: boolean) => {
    let param: string | null = null;
    if (value) param = "on";
    set(cartoParamAtom, param);
  }
);

export function Page() {
  const [types, setTypes] = useState([]);

  useEffect(() => {
    fetchAPIV2Result("/defs/measurements", { all: true })
      .then((res) => {
        setTypes(res.data);
      })
      .catch((err) => console.error("Error fetching data:", err));
  }, []);
  return h(Map, { types });
}

function Map({ types }) {
  const id = usePageContext().urlOriginal.split("=")[1];
  const [clustered, setClustered] = useState(true);
  const [selectedMeasurement, setSelectedMeasurement] = useState(null);

  const [selectedTypes, setSelectedTypes] = useState([]);

  useEffect(() => {
    if (types.length > 0 && id != null) {
      const matching = types.filter((d) => d.measure_id === parseInt(id));
      setSelectedTypes(matching);
    }
  }, [types, id]);

  const [isOpen, setOpen] = useState(true);

  const dark = useDarkMode();
  const isEnabled = dark?.isEnabled;

  const basemap = useAtomValue(basemapAtom);
  const showLabels = useAtomValue(showLabelsAtom);
  const showCarto = useAtomValue(showCartoAtom);

  const baseStyle = basemapStyle(basemap, isEnabled);
  const overlayStyles = useOverlayStyles({
    selectedTypes,
    clustered,
    showCarto,
  });

  // Toggle basemap labels by stripping label layers from the resolved style.
  const transformStyle = useCallback(
    (style) => {
      if (showLabels) return style;
      return removeMapLabels(style, true);
    },
    [showLabels]
  );

  const mapPosition = {
    camera: {
      lat: 39,
      lng: -98,
      altitude: 6000000,
    },
  };

  const handleClick = (map, e) => {
    const cluster = map.queryRenderedFeatures(e.point, {
      layers: ["clusters"],
    });

    if (cluster.length > 0) {
      const zoom = cluster[0].properties.expansion_zoom ?? 12;

      map.flyTo({
        center: cluster[0].geometry.coordinates,
        zoom: zoom + 2,
        speed: 10,
        curve: 0.5,
      });
    }

    const features = map.queryRenderedFeatures(e.point, {
      layers: ["unclustered-point"],
    });

    if (features.length > 0) {
      const properties = features[0].properties;
      setSelectedMeasurement(properties.id);
    }
  };

  // Mirror the navbar width. PanelCard doesn't expose a flexible width, so we
  // set it here until that can be addressed upstream in map-interface.
  const contextPanel = h(
    PanelCard,
    { style: { width: PANEL_WIDTH } },
    h(Panel, {
      selectedTypes,
      setSelectedTypes,
      clustered,
      setClustered,
      selectedMeasurement,
      setSelectedMeasurement,
      types,
    })
  );

  return h(
    MapAreaContainer,
    {
      navbar: h(MapPageNavbar, {
        isOpen,
        onToggle: () => setOpen(!isOpen),
        width: PANEL_WIDTH,
      }),
      contextPanel,
      contextPanelOpen: isOpen,
    },
    h(MapView, {
      style: baseStyle,
      overlayStyles,
      transformStyle,
      mapboxToken: mapboxAccessToken,
      mapPosition,
      onMapLoaded: (map) => {
        map.on("click", (e) => handleClick(map, e));
      },
    })
  );
}

/** Overlay styles drawn above the basemap: the Macrostrat geologic map (when
 * enabled, so it sits beneath the points) and the measurement tile layer. */
function useOverlayStyles({ selectedTypes, clustered, showCarto }) {
  const ids = selectedTypes.map((t) => t.measure_id);

  const baseURL = tileserverDomain + "/measurements/tile/{z}/{x}/{y}";
  const params =
    "cluster=" +
    clustered +
    (ids.length > 0 ? "&measurement_id=" + ids.join(",") : "");

  const url = baseURL + "?" + params;

  const baseColor = "#868aa2";
  const endColor = "#212435";

  const clusteredLayers = [
    {
      id: "clusters",
      type: "circle",
      source: "measurements",
      "source-layer": "default",
      filter: [">", ["get", "n"], 1],
      paint: {
        "circle-radius": [
          "step",
          ["get", "n"],
          7,
          50,
          9,
          100,
          11,
          150,
          13,
          200,
          15,
        ],
        "circle-color": [
          "step",
          ["get", "n"],
          "#7b7fa0",
          50,
          "#636b8d",
          100,
          "#4a546e",
          150,
          "#353b49",
          200,
          endColor,
        ],
        "circle-stroke-color": [
          "step",
          ["get", "n"],
          "#8b8eab",
          50,
          "#7a7e96",
          100,
          "#5d5f7c",
          150,
          "#484b63",
        ],
        "circle-stroke-width": 3,
        "circle-stroke-opacity": 1,
      },
    },
    {
      id: "cluster-count",
      type: "symbol",
      source: "measurements",
      "source-layer": "default",
      filter: ["has", "n"],
      layout: {
        "text-field": ["get", "n"],
        "text-size": 10,
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: {
        "text-color": "#fff",
      },
    },
    {
      id: "unclustered-point",
      type: "circle",
      source: "measurements",
      "source-layer": "default",
      filter: ["<=", ["get", "n"], 1],
      paint: {
        "circle-color": baseColor,
        "circle-radius": 4,
        "circle-stroke-width": 1,
        "circle-stroke-color": "#fff",
      },
    },
  ];

  const unclusteredLayers = [
    {
      id: "points",
      type: "circle",
      source: "measurements",
      "source-layer": "default",
      paint: {
        "circle-color": "#373ec4",
        "circle-radius": 4,
      },
    },
  ];

  let layers = unclusteredLayers;
  if (clustered) {
    layers = clusteredLayers;
  }

  const measurementStyle = {
    version: 8,
    sources: {
      measurements: {
        type: "vector",
        tiles: [url],
      },
    },
    layers,
  };

  // MapView re-applies the style whenever this array's identity changes, so it
  // has to be memoized on the things that actually affect it.
  return useMemo(() => {
    const overlays = [];
    // The geologic map goes first, so measurement points draw on top of it.
    if (showCarto) {
      overlays.push(macrostratCartoStyle());
    }
    overlays.push(measurementStyle);
    return overlays;
  }, [url, clustered, showCarto]);
}

function Panel({
  selectedTypes,
  setSelectedTypes,
  clustered,
  setClustered,
  selectedMeasurement,
  setSelectedMeasurement,
  types,
}) {
  const isItemSelected = (item) =>
    selectedTypes.some((selected) => selected.measure_id === item.measure_id);

  const handleItemSelect = (item) => {
    if (!isItemSelected(item)) {
      setSelectedTypes([...selectedTypes, item]);
    }
  };

  const handleItemDelete = (itemToDelete) => {
    const next = selectedTypes.filter(
      (item) => item.measure_id !== itemToDelete.measure_id
    );
    setSelectedTypes(next);
  };

  const itemPredicate = (query, item) =>
    item.name.toLowerCase().includes(query.toLowerCase());

  const itemRenderer = (item, { handleClick, modifiers }) => {
    if (!modifiers.matchesPredicate) return null;

    const { measure_id, name, type } = item;

    return h(MenuItem, {
      key: measure_id,
      text: h("div.type", [
        h("p", name),
        h(FlexRow, { alignItems: "center", gap: ".25em" }, [
          h("div.text", item.class),
          h(Icon, { icon: "chevron-right", size: 12 }),
          h("div.text", type),
        ]),
      ]),
      onClick: handleClick,
      active: modifiers.active,
      shouldDismissPopover: false,
    });
  };

  const items = types.filter((f) => !isItemSelected(f));

  return h("div.panel", [
    h.if(!selectedMeasurement)("div.filter", [
      h("h3", "Filter Measurements"),
      h(Divider),
      h("div.filter-select", [
        h(MultiSelect, {
          items,
          itemRenderer,
          itemPredicate,
          selectedItems: selectedTypes,
          onItemSelect: handleItemSelect,
          onRemove: handleItemDelete,
          tagRenderer: (item) => item.name,
          tagInputProps: { tagKey: "measure_id" },
          popoverProps: { minimal: true },
          fill: true,
        }),
        h(
          "a.view-filters",
          { href: "/lex/measurements/filters" },
          "View Filters"
        ),
        h(Switch, {
          checked: clustered,
          label: "Clustered",
          onChange: () => setClustered(!clustered),
        }),
      ]),
    ]),
    h.if(selectedMeasurement)(SelectedMeasurement, {
      selectedMeasurement,
      setSelectedMeasurement,
    }),
    h(MapLayerControls),
  ]);
}

/** Contextual map layers, shared with the other map pages: the Macrostrat
 * geologic map beneath the measurements, plus the basemap/labels form. */
function MapLayerControls() {
  const [basemap, setBasemap] = useAtom(basemapAtom);
  const [showCarto, setShowCarto] = useAtom(showCartoAtom);
  const [showLabels, setShowLabels] = useAtom(showLabelsAtom);

  return h("div.map-layer-controls", [
    h(Switch, {
      className: "carto-toggle",
      label: "Macrostrat map",
      checked: showCarto,
      onChange: (evt) => setShowCarto(evt.currentTarget.checked),
    }),
    h(BaseLayerForm, { basemap, setBasemap, showLabels, setShowLabels }),
  ]);
}

function SelectedMeasurement({ selectedMeasurement, setSelectedMeasurement }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchPGData("/measurements_with_type", { id: "eq." + selectedMeasurement })
      .then((data) => setData(data[0]))
      .catch((err) => console.error("Error fetching data:", err));
  }, [selectedMeasurement]);

  if (selectedMeasurement == null || data == null) {
    return null;
  }

  return h(Measurement, { data, setSelectedMeasurement });
}
