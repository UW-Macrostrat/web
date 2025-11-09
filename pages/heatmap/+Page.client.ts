import h from "./main.module.sass";
import { useAPIResult } from "@macrostrat/ui-components";
import {
  MapAreaContainer,
  MapView,
  buildInspectorStyle
} from "@macrostrat/map-interface";
import { mapboxAccessToken, matomoToken, postgrestPrefix, tileserverDomain } from "@macrostrat-web/settings";
import { Footer } from "~/components/general";
import { Divider, Spinner, Tabs, Tab } from "@blueprintjs/core";
import { useEffect, useState } from "react";
import { mergeStyles } from "@macrostrat/mapbox-utils";
import { useDarkMode } from "@macrostrat/ui-components";


export function Page() {
    return h('div.main', [
        h('div.heatmap-page', [
            h(PageHeader),
            h(HeatMap)
        ]),
        h(Footer)
    ]);
}

function PageHeader() {
    const stats = useAPIResult(`${postgrestPrefix}/macrostrat_stats`)?.[0];
    if (stats == null) return null;
    const { rows_last_24_hours, total_rows } = stats;

    return h('div.page-header', [
        h('h1', 'Heatmap'),
        h(Divider),
        h('p', `This is a heatmap of all the locations where Macrostrat has been accessed from.`),
        h('p', [
          "The blue markers indicate today's ",
          h('strong', rows_last_24_hours.toLocaleString()),
          " accesses, while the grey markers indicate the total ",
          h('strong', total_rows.toLocaleString()),
          " accesses from all days."
        ])    
      ]);
}

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
        tiles: [ tileserverDomain + "/usage-stats/macrostrat/{z}/{x}/{y}"],
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


function HeatMap({
  mapboxToken,
}: {
  headerElement?: React.ReactElement;
  title?: string;
  children?: React.ReactNode;
  mapboxToken?: string;
}) {

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
              h(MapView, { style, mapboxToken: mapboxAccessToken, mapPosition }),
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
    const overlayStyle = mergeStyles(allStyle(), todayStyle());

  // Auto select sample type
  useEffect(() => {
      buildInspectorStyle(baseStyle, overlayStyle, {
        mapboxToken: mapboxAccessToken,
        inDarkMode: isEnabled,
      }).then((s) => {
        setActualStyle(s);
      });
  }, [isEnabled]);

  return actualStyle;
}