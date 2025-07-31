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
import { MenuItem, Switch } from "@blueprintjs/core";

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
    const [clustered, setClustered] = useState(false);

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

    console.log("Using URL: ", url);

    const overlayStyle = {
        sources: {
        today: {
            type: "vector",
            tiles: [ url ],
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