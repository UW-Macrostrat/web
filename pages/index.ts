import { onDemand } from "~/_utils";
import h from "./layout.module.sass";
import { MacrostratIcon } from "~/components";
import { SETTINGS } from "@macrostrat-web/settings";
import { useAPIResult } from "@macrostrat/ui-components";
import { DarkModeButton } from "@macrostrat/ui-components";
import { Spinner } from "@blueprintjs/core";
import {
  MapAreaContainer,
  MapView,
} from "@macrostrat/map-interface";
import { useState, useEffect } from 'react'

export function Image({ src, className, width, height }) {
    const srcWithAddedPrefix = "https://storage.macrostrat.org/assets/web/main-page/" + src;
    return h("img", {src: srcWithAddedPrefix, className, width, height})
}

export function Navbar() {
    return h("div", {className: "nav"}, [
            h("a", {className: "nav-link", href: "/"}, h(MacrostratIcon)),
            h("a", {href: "/about"}, "About"),
            h("a", {href: "/publications"}, "Publications"),
            h("a", {href: "/people"}, "People"),
            h("a", {href: "/donate"}, "Donate"),
    ]);
}

export function Footer() {
    return h("div", {className: "footer"}, [
        h("div", {className: "footer-container"}, [
            h("div", {className: "footer-text-container"}, [
                h(Image, {className: "logo_white", src: "logo_white.png", width: "100px"}),
                h("p", {className: "footer-text"}, [
                    "Produced by the ",
                    h("a", {href: "http://strata.geology.wisc.edu", target: "_blank"}, "UW Macrostrat Lab"),
                    h("a", {href: "https://github.com/UW-Macrostrat", target: "_blank"}, h(Image, {className: "git_logo", src: "git-logo.png", width: "18px"})),
                ])
            ]),
            h("div", {className: "footer-nav"}, [
                h(DarkModeButton, { showText: true}),
                h("a", {href: "/dev/test-site/about"}, "About"),
                h("a", {href: "/dev/test-site/publications"}, "Publications"),
                h("a", {href: "/dev/test-site/people"}, "People"),
                h("a", {href: "/dev/test-site/donate"}, "Donate"),
            ]),
            h("div", {className: "footer-text-container"}, [
                h(Image, {className: "funding-logo", src: "nsf.png", width: "100px"}),
                h("div", {className: "funding-line"}, "Current support:"),
                h("div", {className: "funding-line"}, "EAR-1948843"),
                h("div", {className: "funding-line"}, "ICER-1928323"),
                h("div", {className: "funding-line"}, "UW-Madison Dept. Geoscience")
            ])
        ])
    ]);
}

export function useMacrostratAPI(str) {
    return useAPIResult(SETTINGS.apiV2Prefix + str)
}

export const ColumnMap = onDemand(() => import("./map").then((mod) => mod.ColumnMap));

export function BlankImage({ src, className, width, height }) {
    return h("img", {src, className, width, height})
}

export function Loading() {
    return h("div", {className: "loading"}, [
        h(Spinner),
        h("h3", "Loading..."),
    ]);
}

export function ColumnsMap(columns) {
    // Define state for data and loading
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
                data: columns,
            });
        }

        if (!map.getLayer('geojson-layer')) {
            map.addLayer({
                id: 'geojson-layer',
                type: 'fill', 
                source: 'geojson-data',
                paint: {
                    'fill-color': '#FFFFFF',  
                    'fill-opacity': 0.5,      
                },
            });

            map.on('click', 'geojson-layer', (e) => {
                const feature = e.features?.[0];
                const col_id = feature.properties.col_id
                const url = "/columns/" + col_id
                window.open(url, "_blank")
            })

            map.on('mousemove', 'geojson-layer', (e) => {
                map.getCanvas().style.cursor = 'pointer';
                const feature = e.features?.[0];
                const col_id = feature.properties?.col_id;
                map.setFilter('highlight-layer', ['==', 'col_id', col_id]);
            });

            map.on('mouseleave', 'geojson-layer', () => {
                map.getCanvas().style.cursor = '';
                map.setFilter('highlight-layer', ['==', 'id', '']);
            });
        }

        if (!map.getLayer('highlight-layer')) {
            map.addLayer({
            id: 'highlight-layer',
            type: 'line', 
            source: 'geojson-data',
            paint: {
                'line-color': '#FF0000',
                'line-width': 3,
            },
            filter: ['==', 'col_id', ''], 
            });
        }
    };

    const mapPosition = {
        camera: {
        lat: 39,
        lng: -98,
        altitude: 9000000,
        },
    };


    return h("div.map-container",
        h(MapAreaContainer,
            { className: "map-area-container" },
          h(MapAreaContainer, { className: "map-area-container" },
            h(MapView, {
                style: "mapbox://styles/mapbox/dark-v10",
                mapboxToken: SETTINGS.mapboxAccessToken,
                mapPosition,
                onMapLoaded: handleMapLoaded,
            }),
        ),
    ));
}
