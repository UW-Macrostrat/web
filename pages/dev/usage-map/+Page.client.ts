import { SETTINGS } from "@macrostrat-web/settings";
import {buildInspectorStyle } from "@macrostrat/map-interface";
import { buildMacrostratStyle } from "@macrostrat/map-styles";
import { mergeStyles } from "@macrostrat/mapbox-utils";
import { useDarkMode } from "@macrostrat/ui-components";
import mapboxgl from "mapbox-gl";
import { useEffect, useState } from "react";
import h from "@macrostrat/hyper";
import "@macrostrat/style-system";
import { MapPosition } from "@macrostrat/mapbox-utils";
import {
  MapAreaContainer,
  MapView,
} from "@macrostrat/map-interface";
import { mapboxAccessToken, tileserverDomain } from "@macrostrat-web/settings";
import { FullscreenPage } from "~/layouts";

export function Page() {
  return h(FullscreenPage,
    h(FossilMap, { mapboxToken: SETTINGS.mapboxAccessToken })
  )
}

mapboxgl.accessToken = SETTINGS.mapboxAccessToken;

const type = 
  {
    id: "Sample",
    name: "Sample",
    color: "purple",
  };

function todayStyle() {
  return {
    sources: {
      today: {
        type: "vector",
        tiles: [ tileserverDomain + "/usage-stats/macrostrat/{z}/{x}/{y}?today=true" ],
      }
    },
    layers: [
      {
        id: 'today-points',
        type: 'circle',
        source: 'today',
        "source-layer": "default",
        paint: {
          'circle-color': "#373ec4",
          'circle-radius': 4,
        }
      },
    ],
  };
}

function allStyle() {
  return {
    sources: {
      all: {
        type: "vector",
        tiles: [ tileserverDomain + "/usage-stats/macrostrat/{z}/{x}/{y}" ],
      }
    },
    layers: [
      {
        id: 'all-points',
        type: 'circle',
        source: 'all',
        "source-layer": "default",
        paint: {
          'circle-color': "#838383",
          'circle-radius': 4,
        }
      },
    ],
  };
}


function FossilMap({
  mapboxToken,
}: {
  headerElement?: React.ReactElement;
  title?: string;
  children?: React.ReactNode;
  mapboxToken?: string;
}) {

  const style = useMapStyle(type, mapboxToken);
  if(style == null) return null;

  const mapPosition: MapPosition = {
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
            [
              h(MapView, { style, mapboxToken: mapboxAccessToken, mapPosition }),
            ]
          ),
        ]
      );
}

function useMapStyle(type, mapboxToken) {
  const dark = useDarkMode();
  const isEnabled = dark?.isEnabled;

  const baseStyle = isEnabled
    ? "mapbox://styles/mapbox/dark-v10"
    : "mapbox://styles/mapbox/light-v10";

  const [actualStyle, setActualStyle] = useState(null);
    const overlayStyle = mergeStyles(allStyle(), todayStyle()); // OVERLAY

  // Auto select sample type
  useEffect(() => {
      buildInspectorStyle(baseStyle, overlayStyle, {
        mapboxToken,
        inDarkMode: isEnabled,
      }).then((s) => {
        setActualStyle(s);
      });
  }, [isEnabled]);

  return actualStyle;
}