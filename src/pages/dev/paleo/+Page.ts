import { HTMLSelect, Spinner, Switch } from "@blueprintjs/core";
import { burwellTileDomain, mapboxAccessToken } from "@macrostrat-web/settings";
import h from "@macrostrat/hyper";
import {
  FeaturePanel,
  FeatureSelectionHandler,
  FloatingNavbar,
  LocationPanel,
  MapAreaContainer,
  MapLoadingButton,
  MapMarker,
  MapView,
  PanelCard,
  TileInfo,
  applyMapPositionToHash,
  buildInspectorStyle,
  getMapPositionForHash,
} from "@macrostrat/map-interface";
import { buildMacrostratStyle } from "@macrostrat/mapbox-styles";
import { MapPosition } from "@macrostrat/mapbox-utils";
import {
  DarkModeButton,
  Spacer,
  getHashString,
  setHashString,
  useAPIResult,
  useDarkMode,
  useStoredState,
} from "@macrostrat/ui-components";
import mapboxgl from "mapbox-gl";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { MacrostratVectorTileset } from "~/pages/map/dev/map-layers";
import { TimescalePanel } from "./timescale";

import "~/styles/global.styl";

// Import other components

type PaleogeographyState = {
  model_id: number;
  age: number;
  mapPosition: MapPosition;
  initialized: boolean;
};

type PaleogeographyAction =
  | { type: "set-model"; model_id: number }
  | { type: "set-age"; age: number }
  | { type: "set-map-position"; mapPosition: MapPosition }
  | { type: "initialize"; state: PaleogeographyState };

function usePaleogeographyState(
  defaultState: PaleogeographyState
): [PaleogeographyState, (s: PaleogeographyAction) => void] {
  /** Use state synced with hash string for paleogeography layer */
  const defaultModelID = defaultState.model_id;
  const defaultAge = defaultState.age;

  const [state, dispatch] = useReducer(
    (state: PaleogeographyState, action: PaleogeographyAction) => {
      switch (action.type) {
        case "set-model":
          return {
            ...state,
            model_id: action.model_id,
            age: state.age ?? defaultAge,
          };
        case "set-age":
          // Round to nearest 5 Ma
          const age = Math.round(action.age / 5) * 5;
          return { ...state, age };
        case "set-map-position":
          return { ...state, mapPosition: action.mapPosition };
        case "initialize":
          return { ...action.state, initialized: true };
      }
    },
    { model_id: null, age: null, mapPosition: null, initialized: false }
  );

  const { model_id, age, mapPosition } = state;

  useEffect(() => {
    if (model_id == null || age == null || mapPosition == null) return;
    let args: any = { model_id, age };
    applyMapPositionToHash(args, mapPosition);
    setHashString(args, { sort: false, arrayFormat: "comma" });
  }, [model_id, age, mapPosition]);

  useEffect(() => {
    const hashData = getHashString(window.location.hash) ?? {};
    const { model_id, age, ...rest } = hashData;
    const mapPosition = getMapPositionForHash(
      rest,
      defaultState.mapPosition.camera
    );

    if (model_id == null || age == null) return;
    if (Array.isArray(model_id)) return;
    if (Array.isArray(age)) return;
    dispatch({
      type: "initialize",
      state: {
        model_id: parseInt(model_id) ?? defaultModelID,
        age: parseInt(age) ?? defaultAge,
        mapPosition,
        initialized: true,
      },
    });
  }, []);

  return [state, dispatch];
}

const baseTilesetURL =
  burwellTileDomain + "/carto-slim-rotated/{z}/{x}/{y}?model_id=3&t_step=0";

const common = {
  version: 8,
  sources: {
    burwell: {
      type: "vector",
      tiles: [baseTilesetURL],
      tileSize: 512,
    },
  },
  glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
  sprite: "", //mapbox://sprites/mapbox/light-v10",
  fog: {
    range: [10, 20],
    color: "#000000",
    "high-color": "hsl(207, 23%, 5%)",
    "space-color": "hsl(207, 23%, 10%)",
    "horizon-blend": 0.1,
    "star-intensity": 0,
  },
};

const darkStyle = {
  name: "PaleoLight",
  ...common,
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "hsl(207, 18%, 21%)",
      },
    },
    {
      id: "plates",
      type: "fill",
      source: "burwell",
      "source-layer": "plates",
      paint: {
        //"fill-color": "color",
        "fill-color": "hsl(207, 18%, 30%)",
        "fill-opacity": 0.8,
      },
    },
  ],
};
const lightStyle = {
  name: "PaleoLight",
  ...common,
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "hsl(185, 9%, 81%)",
      },
    },
    {
      id: "plates",
      type: "fill",
      source: "burwell",
      "source-layer": "plates",
      paint: {
        //"fill-color": "color",
        "fill-color": "hsl(55, 11%, 96%)",
        "fill-opacity": 0.8,
      },
    },
  ],
};

export function Page({
  tileset = MacrostratVectorTileset.CartoSlim,
  overlayStyle = _macrostratStyle,
  children,
}: {
  headerElement?: React.ReactElement;
  title?: string;
  tileset?: MacrostratVectorTileset;
  overlayStyle?: mapboxgl.Style;
  children?: React.ReactNode;
}) {
  const title = "Paleogeography";
  const dark = useDarkMode();
  const isEnabled = dark?.isEnabled;
  const mapboxToken = mapboxAccessToken;
  mapboxgl.accessToken = mapboxToken;

  const style = isEnabled ? darkStyle : lightStyle;

  const [isOpen, setOpen] = useState(false);

  const [state, setState] = useStoredState("macrostrat:dev-map-page", {
    showTileExtent: false,
    xRay: false,
  });
  const { showTileExtent, xRay } = state;

  const [actualStyle, setActualStyle] = useState(style);
  const [paleoState, dispatch] = usePaleogeographyState({
    model_id: 3,
    age: 0,
    initialized: false,
    mapPosition: {
      camera: {
        lng: -40,
        lat: 45,
        altitude: 5000000,
      },
    },
  });

  const { age, model_id, mapPosition } = paleoState;
  const plateModelId = model_id;

  const models: { id: string; max_age: number; min_age: number }[] =
    useAPIResult(burwellTileDomain + "/carto/rotation-models");

  useEffect(() => {
    if (models == null) return;
    if (plateModelId == null) {
      dispatch({ type: "set-model", model_id: parseInt(models[0].id) });
    }
  }, [models]);

  const model = models?.find((d) => d.id == plateModelId);

  // useEffect(() => {
  //   console.log("effect", model, age);
  //   if (model == null) return;
  //   const { max_age = 4000, min_age = 0 } = model;
  //   console.log("effect", model, age, max_age, min_age);
  //   if (age > max_age) {
  //     dispatch({ type: "set-age", age: max_age });
  //   } else if (age < min_age) {
  //     dispatch({ type: "set-age", age: min_age });
  //   }
  // }, [model, age]);

  // Manage location hash

  const _overlayStyle = useMemo(() => {
    if (plateModelId == null || age == null) return overlayStyle;
    return replaceSourcesForTileset(overlayStyle, plateModelId, age);
  }, [tileset, overlayStyle, plateModelId, age]) as mapboxgl.Style;

  useEffect(() => {
    buildInspectorStyle(style, _overlayStyle, {
      mapboxToken,
      inDarkMode: isEnabled,
      xRay,
    }).then(setActualStyle);
  }, [style, xRay, mapboxToken, isEnabled, _overlayStyle]);

  const [inspectPosition, setInspectPosition] =
    useState<mapboxgl.LngLat | null>(null);

  const [data, setData] = useState(null);

  const onSelectPosition = useCallback((position: mapboxgl.LngLat) => {
    setInspectPosition(position);
  }, []);

  const onMapMoved = useCallback(
    (pos) => dispatch({ type: "set-map-position", mapPosition: pos }),
    []
  );

  if (age == null || model_id == null) {
    return h(Spinner);
  }

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
          feature: data?.[0] ?? null,
          showExtent: showTileExtent,
          setShowExtent() {
            setState({ ...state, showTileExtent: !showTileExtent });
          },
        }),
        h(FeaturePanel, {
          features: data,
          focusedSource: "plates",
          focusedSourceTitle: "Paleogeography",
        }),
      ]
    );
  }

  return h(
    MapAreaContainer,
    {
      navbar: h(FloatingNavbar, [
        h("h2", title),
        h(Spacer),
        h(MapLoadingButton, {
          active: isOpen,
          onClick() {
            setOpen(!isOpen);
          },
        }),
      ]),
      contextPanel: h(PanelCard, [
        h(PlateModelControls, {
          models,
          activeModel: plateModelId,
          setModel(model_id) {
            dispatch({ type: "set-model", model_id });
          },
          age,
        }),
        h(Switch, {
          checked: xRay,
          label: "X-ray mode",
          onChange() {
            setState({ ...state, xRay: !xRay });
          },
        }),
        h(DarkModeButton),
        children,
      ]),
      detailPanel: detailElement,
      contextPanelOpen: isOpen,
      bottomPanel: h(TimescalePanel, {
        age,
        setAge(age) {
          dispatch({ type: "set-age", age });
        },
        ageRange: ageRangeForModel(model),
      }),
    },
    h(
      MapView,
      {
        style: actualStyle,
        mapPosition,
        projection: { name: "globe" },
        enableTerrain: false,
        mapboxToken,
        onMapMoved,
      },
      [
        h(FeatureSelectionHandler, {
          selectedLocation: inspectPosition,
          setFeatures: setData,
        }),
        h(MapMarker, {
          position: inspectPosition,
          setPosition: onSelectPosition,
        }),
      ]
    )
  );
}

function ageRangeForModel(model) {
  if (model == null) return [3500, 0];
  const { max_age, min_age } = model;
  return [max_age ?? 3500, min_age ?? 0];
}

function PlateModelControls({ models, activeModel, age, setModel }) {
  return h("div.controls", [
    h("h3", [h("span", "Age:"), " ", h("span.age", age), " ", h("span", "Ma")]),
    h(PlateModelSelector, { models, activeModel, setModel }),
  ]);
}

function PlateModelSelector({ models, activeModel, setModel }) {
  if (models == null) return null;

  const onChange = (evt) => {
    const { value } = evt.target;
    setModel(value);
  };

  return h(HTMLSelect, {
    value: activeModel,
    onChange,
    options: models
      .filter((d) => {
        return d.id != 5;
      })
      .map((d) => ({
        label: d.name,
        value: d.id,
      })),
  });
}

export function replaceSourcesForTileset(
  style: mapboxgl.Style,
  model_id: number = 6,
  age = 0
) {
  const tilesetURL =
    burwellTileDomain +
    `/carto-slim-rotated/{z}/{x}/{y}?model_id=${model_id}&t_step=${age}`;

  return {
    ...style,
    sources: {
      ...style.sources,
      burwell: {
        type: "vector",
        tiles: [tilesetURL],
        tileSize: 512,
      },
    },
  };
}

const _macrostratStyle = buildMacrostratStyle({
  tileserverDomain: burwellTileDomain,
}) as mapboxgl.Style;

function isStateValid(state) {
  if (state == null) {
    return false;
  }
  if (typeof state != "object") {
    return false;
  }
  // Must have several specific boolean keys
  for (let k of ["showLineSymbols", "xRay", "showTileExtent", "bypassCache"]) {
    if (typeof state[k] != "boolean") {
      return false;
    }
  }
  return true;
}
