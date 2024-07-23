import h from "./main.module.sass";
import { getRuntimeConfig } from "@macrostrat-web/settings/utils";
import { mapboxAccessToken, tileserverDomain } from "@macrostrat-web/settings";
import {
  CollapseCard,
  CollapsePanel,
  Spacer,
  useAPIResult,
  useDarkMode,
  useStoredState,
} from "@macrostrat/ui-components";
import { Select, SelectProps } from "@blueprintjs/select";
import mapboxgl from "mapbox-gl";
import { useCallback, useState, useEffect } from "react";
import {
  MapMarker,
  FloatingNavbar,
  MapLoadingButton,
  MapAreaContainer,
  buildInspectorStyle,
  LocationPanel,
  MapView,
  FeaturePanel,
  FeatureSelectionHandler,
  TileInfo,
  MapMovedReporter,
  PanelCard,
  ExpandableDetailsPanel,
} from "@macrostrat/map-interface";
import { MapPosition } from "@macrostrat/mapbox-utils";
import { PageBreadcrumbs } from "~/components";
import { Button, Collapse, InputGroup } from "@blueprintjs/core";
import { debounce, get } from "underscore";
import { DataField } from "~/components/unit-details";

const embeddingTileserverDomain = getRuntimeConfig(
  "EMBEDDINGS_TILESERVER_DOMAIN"
);

export function Page() {
  const dark = useDarkMode();
  const isEnabled = dark?.isEnabled;

  const [mapPosition, setMapPosition] = useStoredState<MapPosition>(
    "macrostrat:map-position",
    {
      camera: {
        lng: -100,
        lat: 40,
        altitude: 500_000,
      },
    },
    isValidMapPosition
  );

  const modelData =
    useAPIResult(embeddingTileserverDomain, null, null)?.models ?? {};
  const models = Object.entries(modelData).map(([key, value]) => ({
    name: key,
    description: value,
  }));

  const [model, setModel] = useState(null);
  const activeModel = model ?? models?.[0]?.name;

  const [value, term, setValue] = useSearchTerm();

  const style = useMapStyle({
    inDarkMode: isEnabled,
    term,
    model: activeModel,
  });

  const [inspectPosition, setInspectPosition] =
    useState<mapboxgl.LngLat | null>(null);
  const [features, setFeatures] = useState(null);

  const onSelectPosition = useCallback((position: mapboxgl.LngLat) => {
    setInspectPosition(position);
  }, []);

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
      [
        h(TileInfo, {
          feature: features?.[0] ?? null,
        }),
        h(FeaturePanel, { features: features }),
      ]
    );
  }

  if (style == null) {
    return null;
  }

  return h(
    MapAreaContainer,
    {
      contextPanel: h(PanelCard, [
        h(PageBreadcrumbs, { title: "Embeddings" }),
        h("div.flex.row", [
          h(InputGroup, {
            placeholder: "Geologic characteristics ",
            large: true,
            onChange: (e) => setValue(e.target.value),
            value,
            rightElement: h(MapLoadingButton, {
              disabled: term == null,
              icon: "search",
            }),
          }),
        ]),
        h("div.settings-panel", [
          h(ExpandableDetailsPanel, { title: "Settings" }, [
            h(ModelSelector, {
              models,
              model: activeModel,
              setModel,
            }),
          ]),
        ]),
      ]),
      detailPanel: detailElement,
      contextPanelOpen: true,
    },
    h(
      MapView,
      {
        style,
        mapPosition,
        projection: { name: "globe" },
        mapboxToken: mapboxAccessToken,
      },
      [
        h(FeatureSelectionHandler, {
          selectedLocation: inspectPosition,
          setFeatures: setFeatures,
        }),
        h(MapMovedReporter, {
          onMapMoved: setMapPosition,
        }),
        h(MapMarker, {
          position: inspectPosition,
          setPosition: onSelectPosition,
        }),
      ]
    )
  );
}

function isValidMapPosition(data: any): boolean {
  if (data == null) return false;
  if (typeof data !== "object") return false;
  if (data?.camera?.lng == null) return false;
  if (data?.camera?.lat == null) return false;
  return true;
}

interface StyleParams {
  inDarkMode: boolean;
  term: string | null;
  model: string | null;
}

function useMapStyle(params: StyleParams): mapboxgl.Style | null {
  const [actualStyle, setActualStyle] = useState(null);
  const { inDarkMode, term, model } = params;

  useEffect(() => {
    console.log("Building style", term, model);
    buildStyle({
      inDarkMode,
      term,
      model,
    }).then(setActualStyle);
  }, [inDarkMode, term, model]);

  return actualStyle;
}

async function buildStyle(params: StyleParams) {
  const { inDarkMode, term, model } = params;

  const baseStyle = inDarkMode
    ? "mapbox://styles/mapbox/dark-v10"
    : "mapbox://styles/mapbox/light-v10";

  const greyColor = inDarkMode ? 255 : 20;

  const overlayStyle: mapboxgl.Style = {
    version: 8,
    sources: {
      macrostrat: {
        type: "vector",
        tiles: [tileserverURL(term, model)],
        maxzoom: 9,
      },
    },
    layers: [
      {
        id: "macrostrat",
        type: "fill",
        source: "macrostrat",
        "source-layer": "units",
        paint: paintProperties(term, greyColor),
      },
    ],
  };

  return buildInspectorStyle(baseStyle, overlayStyle, {
    mapboxToken: mapboxAccessToken,
    inDarkMode,
    xRay: false,
  });
}

function paintProperties(term: string | null, grayColor: number) {
  if (term == null) {
    return {
      "fill-color": `rgba(${grayColor}, ${grayColor}, ${grayColor}, 0.1)`,
    };
  }
  // Data-driven styling by the 'similarity' property [0, 1]
  return {
    "fill-color": [
      "interpolate",
      ["exponential", 1.8],
      ["get", "similarity"],
      0,
      `rgba(${grayColor}, ${grayColor}, ${grayColor}, 0.02)`,
      1,
      "rgba(255, 0, 0, 0.5)",
    ],
  };
}

function tileserverURL(term: string | null, model: string | null) {
  if (term == null) {
    return tileserverDomain + "/carto/{z}/{x}/{y}";
  }
  let modelSuffix = "";
  if (model == null) {
    modelSuffix = "?model=" + model;
  }

  return (
    embeddingTileserverDomain +
    `/search/${term}/tiles/{z}/{x}/{y}` +
    modelSuffix
  );
}

function useSearchTerm() {
  const [term, setTerm] = useState(null);
  const [userText, setUserText] = useState("");
  // Set the search term, debounced
  const setTermDebounced = debounce((term) => {
    setTerm(term);
  }, 200);

  function getUserInput(text) {
    setUserText(text);
    console.log("User input", text);
    if (text.length <= 3 && term != null) {
      setTerm(null);
      return null;
    }
    setTermDebounced(text);
  }

  return [userText, term, getUserInput];
}

interface Model {
  name: string;
  description: string;
}

function ModelSelector({ models, model, setModel }) {
  return h(
    DataField,
    { label: "Model" },
    h<SelectProps<Model>>(
      Select,
      {
        items: models,
        onItemSelect: (item) => {
          setModel(item.name);
        },
        itemPredicate: (query, item) => {
          return item.name.toLowerCase().includes(query.toLowerCase());
        },
        itemRenderer: (item, { handleClick, modifiers }) => {
          return h(
            "div.model-item",
            {
              onClick: handleClick,
              key: item.name,
              className: modifiers.active ? "active" : "",
            },
            [
              h("span", null, item.name),
              ": ",
              h("span", { className: "bp5-text-muted" }, item.description),
            ]
          );
        },
      },
      [
        h(Button, {
          text: model,
          rightIcon: "caret-down",
          minimal: true,
        }),
      ]
    )
  );
}
