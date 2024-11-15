/**
 * A development interface for the "Weaver" point data server.
 */

import h from "@macrostrat/hyper";

import { Button, MenuItem, Spinner } from "@blueprintjs/core";
import { Select2 } from "@blueprintjs/select";
import { SETTINGS } from "@macrostrat-web/settings";
import {
  FeatureProperties,
  FloatingNavbar,
  LocationPanel,
  MapAreaContainer,
  MapLoadingButton,
  MapMarker,
  MapView,
  PanelCard,
  buildInspectorStyle,
} from "@macrostrat/map-interface";
import { useMapRef } from "@macrostrat/mapbox-react";
import { buildMacrostratStyle } from "@macrostrat/mapbox-styles";
import { mergeStyles } from "@macrostrat/mapbox-utils";
import {
  DarkModeButton,
  Spacer,
  useAPIResult,
  useDarkMode,
} from "@macrostrat/ui-components";
import mapboxgl from "mapbox-gl";
import { useCallback, useEffect, useState } from "react";

export function WeaverPage() {
  return h(
    "div.weaver-page",
    h(WeaverMap, { mapboxToken: SETTINGS.mapboxAccessToken })
  );
}

mapboxgl.accessToken = SETTINGS.mapboxAccessToken;

const _macrostratStyle = buildMacrostratStyle({
  tileserverDomain: SETTINGS.burwellTileDomain,
  fillOpacity: 0.3,
  strokeOpacity: 0.1,
}) as mapboxgl.Style;

const types = [
  {
    id: "MineralResourceSite",
    name: "Mineral Resource Site",
    color: "dodgerblue",
  },
  { id: "AgeSpectrum", name: "Detrital Zircon Age Spectrum", color: "red" },
  {
    id: "Sample",
    name: "Sample",
    color: "purple",
  },
];

function weaverStyle(type: object) {
  const color = type?.color ?? "dodgerblue";
  return {
    sources: {
      weaver: {
        type: "vector",
        tiles: [
          "http://localhost:8000/weaver-tile/{z}/{x}/{y}?model_name=" +
            type.id,
        ],
      },
    },
    layers: [
      {
        id: "weaver",
        type: "circle",
        source: "weaver",
        "source-layer": "default",
        paint: {
          "circle-radius": [
            "step",
            ["get", "n"],
            2,
            1,
            2,
            5,
            4,
            10,
            8,
            50,
            12,
            100,
            16,
            200,
            20,
          ],
          "circle-color": color,
          "circle-opacity": 0.8,
          "circle-stroke-width": 0.5,
          "circle-stroke-color": color,
        },
      },
    ],
  };
}

function FeatureDetails({ position, model_name }) {
  const mapRef = useMapRef();
  const result = useAPIResult(
    "https://dev.macrostrat.org/weaver-api/rpc/nearby_data",
    {
      x: position.lng,
      y: position.lat,
      zoom: Math.round(mapRef.current?.getZoom()) ?? 10,
      model_name,
    }
  );

  if (result == null) return h(Spinner);

  return h(
    "div.features",
    result.map((f, i) => {
      return h(FeatureProperties, { data: f.data, key: i, expandLevel: 1 });
    })
  );
}

function WeaverMap({
  title = "Weaver",
  headerElement = null,
  mapboxToken,
}: {
  headerElement?: React.ReactElement;
  title?: string;
  children?: React.ReactNode;
  mapboxToken?: string;
}) {
  /* We apply a custom style to the panel container when we are interacting
    with the search bar, so that we can block map interactions until search
    bar focus is lost.
    We also apply a custom style when the infodrawer is open so we can hide
    the search bar on mobile platforms
  */

  const [isOpen, setOpen] = useState(false);

  const [type, setType] = useState(types[0]);

  const style = useMapStyle(type, mapboxToken);

  const [inspectPosition, setInspectPosition] =
    useState<mapboxgl.LngLat | null>(null);

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

      h(FeatureDetails, { position: inspectPosition, model_name: type.id })
    );
  }

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
        h(DarkModeButton, { showText: true, minimal: true }),
        h(
          Select2,
          {
            items: types,
            itemRenderer: (data, { handleClick, modifiers }) =>
              h(MenuItem, {
                roleStructure: "listoption",
                active: modifiers.active,
                disabled: modifiers.disabled,
                text: data.name,
                //style: { color: d.color },
                key: data.id,
                onClick() {
                  handleClick();
                },
              }),
            itemPredicate: (query, item) =>
              item.name.toLowerCase().includes(query.toLowerCase()),
            onItemSelect: (item) => setType(item),
          },
          h(Button, {
            text: type?.name,
            placeholder: "Select type",
            rightIcon: "caret-down",
          })
        ),
      ]),
      detailPanel: detailElement,
      contextPanelOpen: isOpen,
    },
    h(MapView, { style, mapboxToken }, [
      h(MapMarker, {
        position: inspectPosition,
        setPosition: onSelectPosition,
      }),
    ])
  );
}

function useMapStyle(type, mapboxToken) {
  const dark = useDarkMode();
  const isEnabled = dark?.isEnabled;

  const baseStyle = isEnabled
    ? "mapbox://styles/mapbox/dark-v10"
    : "mapbox://styles/mapbox/light-v10";

  const [actualStyle, setActualStyle] = useState(baseStyle);

  useEffect(() => {
    const overlayStyle = mergeStyles(_macrostratStyle, weaverStyle(type));
    buildInspectorStyle(baseStyle, overlayStyle, {
      mapboxToken,
      inDarkMode: isEnabled,
    }).then((s) => {
      setActualStyle(s);
    });
  }, [baseStyle, mapboxToken, isEnabled, type]);
  return actualStyle;
}
