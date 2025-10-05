import h from "@macrostrat/hyper";

import {
  MapAreaContainer,
  MapView,
  buildInspectorStyle
} from "@macrostrat/map-interface";
import { mapboxAccessToken } from "@macrostrat-web/settings";
import { useEffect, useState } from "react";
import { useDarkMode, FlexRow } from "@macrostrat/ui-components";
import { FullscreenPage } from "~/layouts";
import { MultiSelect } from "@blueprintjs/select"
import { MenuItem, Switch, Divider, Icon } from "@blueprintjs/core";
import { tileserverDomain } from "@macrostrat-web/settings";
import { fetchAPIData, fetchPGData } from "~/_utils";
import { Measurement } from "./measurement";
import { usePageContext } from "vike-react/usePageContext";
import { Loading } from "~/components";

export function Page() {
    return  h(FullscreenPage, h(Map))
}

function Map() {



    const style = useMapStyle();

    if(style == null) return null;

    const mapPosition = {
            camera: {
                lat: 39, 
                lng: -98, 
                altitude: 6000000,
            },
        };


    return h(
        "div.map-container",
        [
        // The Map Area Container
        h(
            MapAreaContainer,
            {
                className: 'map-area-container',
            },
            [
                h(MapView, { 
                    style, 
                    mapboxToken: mapboxAccessToken, 
                    mapPosition,
                }),
            ]
        ),
        ]
    );
}

function useMapStyle() {
  const dark = useDarkMode();
  const isEnabled = dark?.isEnabled;

  const baseStyle = isEnabled
    ? "mapbox://styles/mapbox/dark-v10"
    : "mapbox://styles/mapbox/light-v10";

  const [actualStyle, setActualStyle] = useState(null);

  const url = tileserverDomain + "/carto-slim/{z}/{x}/{y}";

  const overlayStyle = {
    sources: {
      cartoSlim: {
        type: "vector",
        tiles: [url],
      },
    },
    layers: [
      {
        id: "carto-slim-fill",
        type: "fill",
        source: "cartoSlim",
        "source-layer": "default", // Ensure this matches your vector tile layer name
        paint: {
          "fill-color": "#377eb8",
          "fill-opacity": 0.5,
        },
      },
      {
        id: "carto-slim-outline",
        type: "line",
        source: "cartoSlim",
        "source-layer": "carto-slim", // Same layer name
        paint: {
          "line-color": "#1f78b4",
          "line-width": 1,
        },
      },
    ],
  };

  useEffect(() => {
    buildInspectorStyle(baseStyle, overlayStyle, {
      mapboxToken: mapboxAccessToken,
      inDarkMode: isEnabled,
    }).then(setActualStyle);
  }, [baseStyle, overlayStyle, mapboxAccessToken, isEnabled]);

  return actualStyle;
}

