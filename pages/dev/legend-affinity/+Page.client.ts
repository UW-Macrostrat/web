import h from "./main.module.sass";
import { mapboxAccessToken, tileserverDomain } from "@macrostrat-web/settings";
import {
  buildQueryString,
  useDarkMode,
  useStoredState,
} from "@macrostrat/ui-components";
import { Select, SelectProps } from "@blueprintjs/select";
import mapboxgl from "mapbox-gl";
import { useCallback, useState, useEffect, useMemo } from "react";
import {
  MapMarker,
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
  getMapPositionForHash,
  applyMapPositionToHash,
} from "@macrostrat/map-interface";
import { MapPosition } from "@macrostrat/mapbox-utils";
import { PageBreadcrumbs } from "~/components";
import { Button, Collapse, InputGroup } from "@blueprintjs/core";
import { DataField } from "~/components/unit-details";
import { getQueryString, setQueryString } from "@macrostrat/ui-components";

import { useDebouncedCallback } from "use-debounce";

export function Page() {
  const dark = useDarkMode();
  const isEnabled = dark?.isEnabled;

  const startPos = {
    camera: {
      lng: -100,
      lat: 40,
      altitude: 500_000,
    },
  };

  const [mapPosition, setMapPosition] = useMapPosition(startPos.camera);

  // For now, we just have cmbert
  const models = [
    {
      name: "cm_bert",
      description: "Embeddings against mining documents using xDD",
    },
  ];

  // const modelData =
  //   useAPIResult(embeddingTileserverDomain, null, null)?.models ?? {};
  // const models = Object.entries(modelData).map(([key, value]) => ({
  //   name: key,
  //   description: value,
  // }));
  //
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
        h(PageBreadcrumbs, { title: "Legend affinity" }),
        h("div.flex.row", [
          h(InputGroup, {
            placeholder: "Search",
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
      ["exponential", 1.2],
      ["get", "similarity"],
      0,
      `rgba(50, 50, 200, 0.02)`,
      0.5,
      `rgba(50, 50, 200, 0.4)`,
      1,
      "rgba(255, 0, 0, 0.5)",
    ],
  };
}

function tileserverURL(term: string | null, model: string | null) {
  if (term == null) {
    return tileserverDomain + "/carto/{z}/{x}/{y}";
  }
  let termSuffix = "?term=" + term;
  let model_ = model ?? "cmbert";
  return tileserverDomain + `/search/${model_}/tiles/{z}/{x}/{y}` + termSuffix;
}

function getStartingText() {
  let query = getQueryString(window.location.search)?.term;
  if (Array.isArray(query)) {
    query = query[0];
  }
  return decodeURIComponent(query ?? "");
}

function useSearchTerm() {
  const startingText = useMemo(getStartingText, []);
  const [term, setTerm] = useState(startingText.length > 3 ? startingText : "");
  const [userText, setUserText] = useState(startingText);
  // Set the search term, debounced
  const setTermDebounced = useDebouncedCallback((term) => {
    setTerm(term);
    // Set term on the URL
    // Modify the query string without affecting other parameters
    updateSearchTerm(term);
  }, 500);

  function getUserInput(text) {
    setUserText(text);
    if (text.length <= 3) {
      setTerm(null);
    } else {
      setTermDebounced(text);
    }
  }

  return [userText, term, getUserInput];
}

function updateSearchTerm(term) {
  // Modify the query string without affecting other parameters
  const qst = new URLSearchParams(window.location.search);
  if (term == null || term.length == 0) {
    qst.delete("term");
  } else {
    qst.set("term", encodeURIComponent(term));
  }
  window.history.replaceState({}, "", "?" + qst.toString());
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

function useMapPosition(startPos) {
  /** Use map position stored in the query string */
  const [mapPosition, setMapPosition_] = useState<MapPosition | null>(null);

  useEffect(() => {
    const hashData = getQueryString(window.location.search) ?? {};
    const position = getMapPositionForHash(hashData, startPos);
    setMapPosition_(position);
  }, []);

  const setMapPosition = useCallback((position) => {
    setMapPosition_(position);
    let params = getQueryString(window.location.search) ?? {};
    applyMapPositionToHash(params, position);
    setQueryString(params);
  }, []);

  return [mapPosition, setMapPosition];
}
