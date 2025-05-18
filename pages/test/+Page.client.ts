import h from "@macrostrat/hyper";
import { useAPIResult } from "@macrostrat/ui-components";
import { SETTINGS } from "@macrostrat-web/settings";
import { PageHeader, Link, AssistantLinks, DevLinkButton } from "~/components";
import { Card, Icon, Popover, Divider, RangeSlider } from "@blueprintjs/core";
import { useState } from "react";
import { ContentPage } from "~/layouts";
import { usePageContext } from 'vike-react/usePageContext';
import {
  MapAreaContainer,
  MapMarker,
  MapView,
  buildInspectorStyle,
} from "@macrostrat/map-interface";
import { useMapRef } from "@macrostrat/mapbox-react";
import { contextPanelIsInitiallyOpen } from "#/map/map-interface/app-state";
import { useEffect } from "react";

// DATA fetches correctly, layer isnt added correctly


export function Page() {
    // Define state for data and loading
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    console.log(SETTINGS.apiV2Prefix + "/columns?int_id=10&response=long&format=topojson")

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(SETTINGS.apiV2Prefix + "/columns?int_id=1&response=long&format=geojson");
                const result = await response.json();

                if (result.success) {
                    setData(result.success.data);  // Assume this is the correct data
                    setLoading(false);
                } else {
                    setError("Failed to load data");
                    setLoading(false);
                }
            } catch (error) {
                setError("Error fetching data");
                setLoading(false);
            }
        };

        fetchData();
    }, []);  // Empty dependency array means this effect runs only once after the first render

    if (loading) {
        return h("div", "Loading...");  // Show loading state
    }

    if (error) {
        return h("div", error);  // Show error state
    }

    console.log("Data fetched:", data);  // Log the fetched data

    const handleMapLoaded = (map: mapboxgl.Map) => {
        if (!map.isStyleLoaded()) {
            map.once('style.load', () => addGeoJsonLayer(map));
        } else {
            addGeoJsonLayer(map);
        }
    };

    const addGeoJsonLayer = (map: mapboxgl.Map) => {
        if (!map.getSource('geojson-data')) {
            map.addSource('geojson-data', {
                type: 'geojson',
                // data: 'https://docs.mapbox.com/mapbox-gl-js/assets/earthquakes.geojson',
                data: data,
            });
        }

        if (!map.getLayer('geojson-layer')) {
            map.addLayer({
                id: 'geojson-layer',
                type: 'fill', // Use 'fill' for rendering polygons
                source: 'geojson-data',
                paint: {
                    'fill-color': '#000000',  // Color of the polygon fill
                    'fill-opacity': 0.5,       // Opacity of the fill
                },
            });
        }
    };


    return h("div.map-container",
        h(MapAreaContainer,
            { className: "map-area-container" },
            h(MapView, {
                style: "mapbox://styles/mapbox/dark-v10",
                mapboxToken: SETTINGS.mapboxAccessToken,
                onMapLoaded: handleMapLoaded,
            }),
        ),
    );
    
}

/*
import { onDemand } from "~/_utils";

const ColumnMap = onDemand(() => import("./map").then((mod) => mod.ColumnMap));

export function Page() {
    // Define state for data and loading
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    console.log(SETTINGS.apiV2Prefix + "/columns?int_id=1&response=long&format=topojson")

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(SETTINGS.apiV2Prefix + "/columns?int_id=1&response=long&format=geojson");
                const result = await response.json();

                if (result.success) {
                    setData(result.success.data);  // Assume this is the correct data
                    setLoading(false);
                } else {
                    setError("Failed to load data");
                    setLoading(false);
                }
            } catch (error) {
                setError("Error fetching data");
                setLoading(false);
            }
        };

        fetchData();
    }, []);  // Empty dependency array means this effect runs only once after the first render

    if (loading) {
        return h("div", "Loading...");  // Show loading state
    }

    if (error) {
        return h("div", error);  // Show error state
    }

    console.log("Data fetched:", data);  // Log the fetched data


    return h(ContentPage, [
        h(ColumnMap, {
            className: "column-map",
            inProcess: true,
            projectID: 1,
            selectedColumn: 1,
            onSelectColumn: null,
          }),
    ])
}

*/