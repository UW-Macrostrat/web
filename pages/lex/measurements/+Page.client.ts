import h from "./main.module.sass";

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
    const [types, setTypes] = useState([]);

    console.log(types)

    useEffect(() => {
        fetchAPIData("/defs/measurements", { all: true})
            .then(data => setTypes(data))
            .catch(err => console.error("Error fetching data:", err));
    }, []);
    return  h(FullscreenPage, h(Map, {types}))
}

function Map({types}) {
    const id = usePageContext().urlOriginal.split("=")[1];
    const [clustered, setClustered] = useState(true);
    const [selectedMeasurement, setSelectedMeasurement] = useState(null);

    const [selectedTypes, setSelectedTypes] = useState([]);

    useEffect(() => {
    if (types.length > 0 && id != null) {
        const matching = types.filter((d) => d.measure_id === parseInt(id));
        setSelectedTypes(matching);
    }
    }, [types, id]);


    const style = useMapStyle({ selectedTypes, clustered });

    if(style == null) return null;

    const mapPosition = {
            camera: {
                lat: 39, 
                lng: -98, 
                altitude: 6000000,
            },
        };

    const handleClick = (map, e) => {
        const cluster = map.queryRenderedFeatures(e.point, {
            layers: ['clusters']
        });

        if(cluster.length > 0) {
            const zoom = cluster[0].properties.expansion_zoom;

            map.flyTo({
                center: cluster[0].geometry.coordinates,
                zoom: zoom + 2,
                speed: 10,
                curve: .5,
            });
        }

        const features = map.queryRenderedFeatures(e.point, {
            layers: ['unclustered-point']
        });

        if (features.length > 0) {
            const properties = features[0].properties;
            setSelectedMeasurement(properties.id);
        } 
    };

    return types.length == 0 ? h(Loading) : h(
        "div.map-container",
        [
        // The Map Area Container
        h(
            MapAreaContainer,
            {
                className: 'map-area-container',
                contextPanel: h(Panel, { selectedTypes, setSelectedTypes, clustered, setClustered, selectedMeasurement, setSelectedMeasurement, types }),
                key: selectedTypes.join(",") + clustered,
            },
            [
                h(MapView, { 
                    style, 
                    mapboxToken: mapboxAccessToken, 
                    mapPosition,
                    onMapLoaded: (map) => {
                        map.on('click', (e) => handleClick(map, e));
                    }
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
    console.log(selectedTypes)

    const ids = selectedTypes.map((t) => t.measure_id)

    const baseURL = "http://localhost:8000/measurements/tile/{z}/{x}/{y}"
    const params = "cluster=" + clustered + (ids.length > 0 ? "&measurement_id=" + ids.join(",") : "");

    const url = baseURL + "?" + params;

    const baseColor = "#868aa2";
    const endColor = "#212435";

    const clusteredLayers = [
      {
        id: "clusters",
        type: "circle",
        source: "measurements",
        "source-layer": "default",
        filter: ['>', ['get', 'n'], 1],
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
        source: 'measurements',
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
        source: 'measurements',
        "source-layer": "default",
        filter: ['<=', ['get', 'n'], 1],
        paint: {
          'circle-color': baseColor,
          'circle-radius': 4,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#fff'
        }
      },
    ];

    const unclusteredLayers = [
        {
            id: 'points',
            type: 'circle',
            source: 'measurements',
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
        measurements: {
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

function Panel({selectedTypes, setSelectedTypes, clustered, setClustered, selectedMeasurement, setSelectedMeasurement, types}) {
    console.log("selectedTypes", selectedTypes)
    const isItemSelected = (item) =>
        selectedTypes.some((selected) => selected.measure_id === item.measure_id);

    const handleItemSelect = (item) => {
        if (!isItemSelected(item)) {
            setSelectedTypes([...selectedTypes, item]);
        }
    };

    const handleItemDelete = (itemToDelete) => {
        const next = selectedTypes.filter(
            (item) => item.measure_id !== itemToDelete.measure_id
        );
        setSelectedTypes(next);
    };

    const itemPredicate = (query, item) =>
        item.name.toLowerCase().includes(query.toLowerCase());

    const itemRenderer = (item, { handleClick, modifiers }) => {
        if (!modifiers.matchesPredicate) return null;

        const { measure_id, name, type } = item;

        return h(MenuItem, {
            key: measure_id,
            text: h('div.type', [
                h('p', name),
                h(FlexRow, { alignItems: "center", gap: ".25em"}, [
                    h('div.text', item.class),
                    h(Icon, {icon: "chevron-right", size: 12}),
                    h('div.text', type),
                ]),
            ]),
            onClick: handleClick,
            active: modifiers.active,
            shouldDismissPopover: false,
        });
    };

    const items = types.filter((f) => !isItemSelected(f));

    return h('div.panel', [
        h.if(!selectedMeasurement)('div.filter', [
            h("h3", "Filter Measurements"),
            h(Divider),
            h('div.filter-select', [
                h(MultiSelect, {
                    items,
                    itemRenderer,
                    itemPredicate,
                    selectedItems: selectedTypes,
                    onItemSelect: handleItemSelect,
                    onRemove: handleItemDelete,
                    tagRenderer: (item) => item.name,
                    tagInputProps: { tagKey: "measure_id" },
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
                ),
            ]),
        ]),
        h.if(selectedMeasurement)(SelectedMeasurement, { selectedMeasurement, setSelectedMeasurement }),
    ]);
}

function SelectedMeasurement({ selectedMeasurement, setSelectedMeasurement }) {
    const [data, setData] = useState(null);

    useEffect(() => {
        fetchPGData("/measurements_with_type", { id: "eq." + selectedMeasurement })
            .then(data => setData(data[0]))
            .catch(err => console.error("Error fetching data:", err));
    }, [selectedMeasurement]);

    if (selectedMeasurement == null || data == null) {
        return null;
    }

    return h(Measurement, { data, setSelectedMeasurement });
}