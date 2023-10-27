import h from "@macrostrat/hyper";
import { MacrostratVectorTileset } from "~/dev/map-layers";
import { buildMacrostratStyle } from "@macrostrat/mapbox-styles";
import mapboxgl from "mapbox-gl";
import { useCallback, useMemo } from "react";
import { SETTINGS } from "~/map-interface/settings";
import { Switch, HTMLSelect } from "@blueprintjs/core";
import { Spacer, useDarkMode, useStoredState } from "@macrostrat/ui-components";
import { useState, useEffect } from "react";
import {
  FeaturePanel,
  FeatureSelectionHandler,
  TileInfo,
  MapView,
  LocationPanel,
  MapMarker,
  MapAreaContainer,
  MapLoadingButton,
  FloatingNavbar,
  PanelCard,
  buildInspectorStyle,
} from "@macrostrat/map-interface";
import { MapPosition } from "@macrostrat/mapbox-utils";
import { TimescalePanel } from "./timescale";
import { useAPIResult } from "@macrostrat/ui-components";

// Having to include these global styles is a bit awkward
import "~/styles/global.styl";

// Import other components

export default function PaleoMap({
  tileset = MacrostratVectorTileset.CartoSlim,
  overlayStyle = _macrostratStyle,
  title = null,
  headerElement = null,
  children,
}: {
  headerElement?: React.ReactElement;
  title?: string;
  tileset?: MacrostratVectorTileset;
  overlayStyle?: mapboxgl.Style;
  children?: React.ReactNode;
}) {
  // A stripped-down page for map development

  const _overlayStyle = useMemo(() => {
    return replaceSourcesForTileset(overlayStyle, 6, 0);
  }, [tileset, overlayStyle]) as mapboxgl.Style;

  return h(DevMapPage, {
    headerElement,
    mapboxToken: SETTINGS.mapboxAccessToken,
    title: "Paleogeography",
    overlayStyle: _overlayStyle,
  });
}

export function DevMapPage({
  title = "Map inspector",
  headerElement = null,
  transformRequest = null,
  mapPosition = null,
  mapboxToken = null,
  overlayStyle = null,
  children,
  style,
  focusedSource = null,
  focusedSourceTitle = null,
  projection = null,
}: {
  headerElement?: React.ReactElement;
  transformRequest?: mapboxgl.TransformRequestFunction;
  title?: string;
  style?: mapboxgl.Style | string;
  children?: React.ReactNode;
  mapboxToken?: string;
  overlayStyle?: mapboxgl.Style | string;
  focusedSource?: string;
  focusedSourceTitle?: string;
  projection?: string;
  mapPosition?: MapPosition;
}) {
  /* We apply a custom style to the panel container when we are interacting
    with the search bar, so that we can block map interactions until search
    bar focus is lost.
    We also apply a custom style when the infodrawer is open so we can hide
    the search bar on mobile platforms
  */

  const dark = useDarkMode();
  const isEnabled = dark?.isEnabled;

  if (mapboxToken != null) {
    mapboxgl.accessToken = mapboxToken;
  }

  style ??= isEnabled
    ? "mapbox://styles/mapbox/dark-v10"
    : "mapbox://styles/mapbox/light-v10";

  const [isOpen, setOpen] = useState(false);

  const [state, setState] = useStoredState("macrostrat:dev-map-page", {
    showTileExtent: false,
    xRay: false,
  });
  const { showTileExtent, xRay } = state;

  const [actualStyle, setActualStyle] = useState(style);

  const [plateModelId, setPlateModelId] = useState(null);
  const [age, setAge] = useState(null);

  const models: { id: string; max_age: number; min_age: number }[] =
    useAPIResult(SETTINGS.burwellTileDomain + "/carto/rotation-models");

  useEffect(() => {
    if (models == null) return;
    if (plateModelId == null) {
      setPlateModelId(models[0].id);
    }
  }, [models]);

  const model = models?.find((d) => d.id == plateModelId);

  useEffect(() => {
    if (model == null) return;
    const { max_age, min_age } = model;
    if (age > max_age) {
      setAge(max_age);
    } else if (age < min_age) {
      setAge(min_age);
    }
  }, [model]);

  useEffect(() => {
    buildInspectorStyle(style, overlayStyle, {
      mapboxToken,
      inDarkMode: isEnabled,
      xRay,
    }).then(setActualStyle);
  }, [style, xRay, mapboxToken, isEnabled, overlayStyle]);

  const [inspectPosition, setInspectPosition] =
    useState<mapboxgl.LngLat | null>(null);

  const [data, setData] = useState(null);

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
          feature: data?.[0] ?? null,
          showExtent: showTileExtent,
          setShowExtent() {
            setState({ ...state, showTileExtent: !showTileExtent });
          },
        }),
        h(FeaturePanel, { features: data, focusedSource, focusedSourceTitle }),
      ]
    );
  }

  let tile = null;

  return h(
    MapAreaContainer,
    {
      navbar: h(FloatingNavbar, [
        headerElement ?? h("h2", title),
        h(Spacer),
        h(MapLoadingButton, {
          active: isOpen,
          onClick: () => setOpen(!isOpen),
        }),
      ]),
      contextPanel: h(PanelCard, [
        h(PlateModelControls, {
          models,
          activeModel: plateModelId,
          setModel: setPlateModelId,
          age,
        }),
        h(Switch, {
          checked: xRay,
          label: "X-ray mode",
          onChange() {
            setState({ ...state, xRay: !xRay });
          },
        }),
        children,
      ]),
      detailPanel: detailElement,
      contextPanelOpen: isOpen,
      bottomPanel: h(TimescalePanel, {
        age,
        setAge,
        ageRange: ageRangeForModel(model),
      }),
    },
    h(
      MapView,
      {
        style: actualStyle,
        transformRequest,
        mapPosition,
        projection: { name: "globe" },
        mapboxToken,
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
    SETTINGS.burwellTileDomain +
    `/carto-slim-rotated/{z}/{x}/{y}?model_id=${model_id}&time=${age}`;

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
  tileserverDomain: SETTINGS.burwellTileDomain,
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
