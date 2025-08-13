import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import React, { useState, useEffect, useRef, useMemo } from "react";

import { ContentPage } from "~/layouts";
import {
  LinkCard,
  SearchBar,
  PageBreadcrumbs,
  StickyHeader,
} from "~/components";
import {
  MapAreaContainer,
  MapView,
} from "@macrostrat/map-interface";

import { darkMapURL, mapboxAccessToken, tileserverDomain } from "@macrostrat-web/settings";
import { buildInspectorStyle } from "@macrostrat/map-interface";


import { postgrestPrefix } from "@macrostrat-web/settings";
import { PostgRESTInfiniteScrollView, useDarkMode } from "@macrostrat/ui-components"

const h = hyper.styled(styles);

export function Page() {
  const [input, setInput] = useState("");
  const style = useMapStyle(mapboxAccessToken)

  console.log("input", input)

  return h("div.column-list-page", [
    h(ContentPage, [
      h("div.flex-row", [
        h("div.main", [
          h(StickyHeader, [h(PageBreadcrumbs, { showLogo: true })]),
          h(PostgRESTInfiniteScrollView, {
            route: postgrestPrefix + "/fossils",
            id_key: "collection_no",
            limit: 20,
            itemComponent: BaseFossilItem,
            SearchBarComponent: SearchBar,
            filterable: true,
            searchColumns: [{ value: "name", label: "Fossil Name" }],
            onSearchChange: setInput,
          }),
        ]),
        h("div.sidebar", [h("div.sidebar-content", [
          h(Map, { input, style })
        ])]),
      ]),
    ]),
  ]);
}

function BaseFossilItem({ data }) {
  const { name, collection_no } = data;

  return h(LinkCard, {
    href: 'https://paleobiodb.org/classic/displayCollResults?collection_no=col:' + collection_no,
    className: "fossil-item",
    title: name,
  });
}

function Map({ input, style }) {
  return h(
    MapAreaContainer,
    {
      className: "map-area-container"
    },
    h(
      MapView,
      {
        style,
        mapboxToken: mapboxAccessToken,
        mapPosition: {
          camera: {
            lat: 39, 
            lng: -98, 
            altitude: 10000000,
          },
        }
      },
      []
    )
  )
}

function useMapStyle(mapboxToken) {
  const dark = useDarkMode();
  const isEnabled = dark?.isEnabled;

  const baseStyle = isEnabled
    ? "mapbox://styles/mapbox/dark-v10"
    : "mapbox://styles/mapbox/light-v10";

  const [actualStyle, setActualStyle] = useState(null);

  // Auto select sample type
  useEffect(() => {
      buildInspectorStyle(baseStyle, fossilStyle(), {
        mapboxToken,
        inDarkMode: isEnabled,
      }).then((s) => {
        setActualStyle(s);
      });
  }, [isEnabled]);

  return actualStyle;
}

function fossilStyle() {
  const clusterThreshold = 1;

  const baseColor = "#868aa2";
  const endColor = "#212435";

  return {
    sources: {
      weaver: {
        type: "vector",
        tiles: [ tileserverDomain + "/pbdb/fossils/{z}/{x}/{y}"],
      }
    },
    layers: [
      {
        id: "clusters",
        type: "circle",
        source: "weaver",
        "source-layer": "default",
        filter: ['>', ['get', 'n'], clusterThreshold],
        paint: {
          "circle-radius": [
            'step',
            ['get', 'n'],
            7, 50,
            9, 100,
            11, 150,
            13, 200,
            15, 
          ],
          "circle-color": [
            'step',
            ['get', 'n'],
            "#7b7fa0", 50,
            '#636b8d', 100,
            '#4a546e', 150,
            '#353b49', 200,
            endColor
          ],
          "circle-stroke-color": [
            'step',
            ['get', 'n'],
            "#8b8eab", 50,
            '#7a7e96', 100,
            '#5d5f7c', 150,
            '#484b63', 
          ],
          "circle-stroke-width": 3,
          "circle-stroke-opacity": 1,
        },
      },
      {
        id: 'cluster-count',
        type: 'symbol',
        source: 'weaver',
        "source-layer": "default",
        filter: ['has', 'n'],
        layout: {
          'text-field': ['get', 'n'],
          'text-size': 10,
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          "text-color": "#fff"
        },
      },
      {
        id: 'unclustered-point',
        type: 'circle',
        source: 'weaver',
        "source-layer": "default",
        filter: ['<=', ['get', 'n'], clusterThreshold],
        paint: {
          'circle-color': baseColor,
          'circle-radius': 4,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#fff'
        }
      },
    ],
  };
}