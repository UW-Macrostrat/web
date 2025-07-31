import h from "./main.module.sass";

import {
  MapAreaContainer,
  MapView,
  buildInspectorStyle
} from "@macrostrat/map-interface";
import { mapboxAccessToken } from "@macrostrat-web/settings";
import { Footer } from "~/components/general";
import { useEffect, useState } from "react";
import { useDarkMode } from "@macrostrat/ui-components";
import { FullscreenPage } from "~/layouts";
import { MultiSelect } from "@blueprintjs/select"
import { MenuItem, Switch, Divider } from "@blueprintjs/core";

export function Page() {
    return  h(FullscreenPage, h(Map))
}

function Map({
  mapboxToken,
}: {
  headerElement?: React.ReactElement;
  title?: string;
  children?: React.ReactNode;
  mapboxToken?: string;
}) {
    const [selectedTypes, setSelectedTypes] = useState([]);
    const [clustered, setClustered] = useState(true);

    const style = useMapStyle({ selectedTypes, clustered });

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
                contextPanel: h(Panel, { selectedTypes, setSelectedTypes, clustered, setClustered }),
                key: selectedTypes.join(",") + clustered,
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

function useMapStyle({selectedTypes, clustered}) {
    const dark = useDarkMode();
    const isEnabled = dark?.isEnabled;

    const baseStyle = isEnabled
        ? "mapbox://styles/mapbox/dark-v10"
        : "mapbox://styles/mapbox/light-v10";

    const [actualStyle, setActualStyle] = useState(null);

    const baseURL = "http://localhost:8000/measurements/tile/{z}/{x}/{y}"
    const params = "cluster=" + clustered + (selectedTypes.length > 0 ? "&type=" + selectedTypes.map(encodeURIComponent).join(",") : "");

    const url = baseURL + "?" + params;

    const clusteredLayers = [
        // Clustered points
        {
        id: 'clusters',
        type: 'circle',
        source: 'today',
        'source-layer': 'default',
        filter: ['>', ['get', 'n'], 1],
        paint: {
            'circle-color': [
                'step',
                ['get', 'n'],
                '#51bbd6',
                100, '#f1f075',
                750, '#f28cb1'
            ],
            'circle-radius': [
                'step',
                ['get', 'n'],
                10,     
                100, 12,
                750, 14
            ]
        }
        },
        // Cluster count labels
        {
            id: 'cluster-count',
            type: 'symbol',
            source: 'today',
            'source-layer': 'default',
            filter: ['>', ['get', 'n'], 1],
            layout: {
                'text-field': '{n}',
                'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                'text-size': 12
            }
        },
        // Individual (non-clustered) points
        {
            id: 'unclustered-point',
            type: 'circle',
            source: 'today',
            'source-layer': 'default',
            filter: ['==', ['get', 'n'], 1],
            paint: {
                'circle-color': 'rgba(140, 144, 228, 1)',
                'circle-radius': 4
            }
        }
    ];

    const unclusteredLayers = [
        {
            id: 'points',
            type: 'circle',
            source: 'today',
            "source-layer": "default",
            paint: {
            'circle-color': "#373ec4",
            'circle-radius': 4,
            }
        },
    ];

    console.log("Using URL: ", url);

    const overlayStyle = {
        sources: {
        today: {
            type: "vector",
            tiles: [ url ],
        }
        },
        layers: clustered ? clusteredLayers : unclusteredLayers,
    }

  // Auto select sample type
  useEffect(() => {
      buildInspectorStyle(baseStyle, overlayStyle, {
        mapboxToken: mapboxAccessToken,
        inDarkMode: isEnabled,
      }).then((s) => {
        setActualStyle(s);
      });
  }, [isEnabled, clustered, selectedTypes]);

  return actualStyle;
}

function Panel({selectedTypes, setSelectedTypes, clustered, setClustered}) {
    const types = [
        "petrologic",
        "environmental",
        "stable isotopes",
        "minor elements",
        "major elements",
        "material properties",
        "radiogenic isotopes",
        "geochronological"
    ]

    const isItemSelected = (item) => selectedTypes.includes(item);

    const handleItemSelect = (item) => {
        if (!isItemSelected(item)) {
            setSelectedTypes([...selectedTypes, item]);
        }
    };

    const handleItemDelete = (itemToDelete) => {
        const next = selectedTypes.filter((item) => item !== itemToDelete);
        setSelectedTypes(next);
    };

    const itemPredicate = (query, item) =>
        item.toLowerCase().includes(query.toLowerCase());

    const itemRenderer = (item, { handleClick, modifiers }) => {
        if (!modifiers.matchesPredicate) return null;

        return h(MenuItem, {
            key: item,
            text: item,
            onClick: handleClick,
            active: modifiers.active,
            shouldDismissPopover: false,
        });
    };

    const items = types.filter((f) => !isItemSelected(f))

    return h('div.panel', [
        h(MultiSelect, {
            items,
            itemRenderer,
            itemPredicate,
            selectedItems: selectedTypes,
            onItemSelect: handleItemSelect,
            onRemove: handleItemDelete,
            tagRenderer: (item) => item,
            popoverProps: { minimal: true },
            fill: true,
        }),
        h(Divider),
        h(
            Switch, 
            {
               checked: clustered,
               label: "Clustered",
               onChange: () => setClustered(!clustered), 
            }
        )
    ]);
}