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
} from "@macrostrat/map-interface";
import {
  DarkModeButton,
  Spacer,
  useAPIResult,
  useStoredState,
} from "@macrostrat/ui-components";
import mapboxgl from "mapbox-gl";
import { useCallback, useState } from "react";
import { TimescalePanel } from "./timescale";
import { usePaleogeographyState } from "./state";
import { usePaleogeographyStyle } from "./map-style";

// Import other components

export function Page() {
  const mapboxToken = mapboxAccessToken;
  mapboxgl.accessToken = mapboxToken;

  const [isOpen, setOpen] = useState(false);

  const [state, setState] = useStoredState("macrostrat:dev-map-page", {
    showTileExtent: false,
    xRay: false,
  });
  const { showTileExtent, xRay } = state;

  const [paleoState, dispatch] = usePaleogeographyState();

  const { age, mapPosition, allModels: models, activeModel } = paleoState ?? {};

  const model_id = activeModel?.id;

  const style = usePaleogeographyStyle({
    age,
    model_id,
    xRay,
  });

  const model = activeModel;

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
        h("h2", "Paleogeography"),
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
          activeModel: model_id,
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
        style,
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
