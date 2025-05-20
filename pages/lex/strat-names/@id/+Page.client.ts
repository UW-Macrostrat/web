import "./main.scss";
import h from "@macrostrat/hyper";
import { useAPIResult } from "@macrostrat/ui-components";
import { SETTINGS } from "@macrostrat-web/settings";
import { PageHeader, Link, AssistantLinks, DevLinkButton, PageBreadcrumbs } from "~/components";
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
import { useEffect } from "react";
import { MapPosition } from "@macrostrat/mapbox-utils";
import { useNavigate } from "react-router";
import { titleCase } from "../../index";
import { features } from "process";
import { b } from "vitest/dist/suite-IbNSsUWN";

export function Page() {
    const pageContext = usePageContext();
    const id = parseInt(pageContext.urlParsed.pathname.split("/")[3]);
    const stratRes = useAPIResult(SETTINGS.apiV2Prefix + "/defs/strat_names?strat_name_id=" + id)?.success.data[0];

    if (stratRes == null) return h("div", "Loading...");

    console.log(stratRes);

    const { strat_name, strat_name_id, rank, subgp, b_age, t_age, b_period, t_period } = stratRes;

    return h(ContentPage, { className: 'int-page'}, [
        h(PageBreadcrumbs, { title: "#" + id }),
        h('div.strat-name-page', [
            h('h1', strat_name),
            h('h3', b_age + " - " + t_age + " Ma"),
            h('h3', b_period + " - " + t_period),
            h('h3', "Rank: " + UpperCase(rank)),
            subgp ? h('h3', "Subgroup: " + UpperCase(subgp)) : null,
        ]),
    ]);
}

function getContrastTextColor(bgColor) {
  // Remove '#' if present
  const color = bgColor.replace('#', '');

  // Parse r, g, b
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return black or white depending on luminance
  return luminance > 0.6 ? '#000000' : '#FFFFFF';
}

function UpperCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function References({ id }) {
    const res1 = useAPIResult(SETTINGS.apiV2Prefix + "/columns?int_id=" + id)?.success;
    const res2 = useAPIResult(SETTINGS.apiV2Prefix + "/fossils?int_id=" + id)?.success;

    if (res1 == null || res2 == null) return h("div", "Loading...");

    const refArray1 = Object.values(res1.refs);
    const refArray2 = Object.values(res2.refs);
    const refs = [...refArray1, ...refArray2];

    return h('div.int-references', [
        h('h3', "Primary Sources"),
        h(Divider),
        h('ol.ref-list', refs.map((r) => h('li.ref-item', r))),
    ]);
}

function Map() {
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

        map.on('click', 'geojson-layer', (e) => {
            const features = map.queryRenderedFeatures(e.point, {
                layers: ['geojson-layer'],
            });

            if (features.length > 0) {
                const feature = features[0];
                console.log("Feature clicked:", feature.properties.col_id);
                // route to column
            }
        });

        map.on('mouseenter', 'geojson-layer', (e) => {
            map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', 'geojson-layer', () => {
            map.getCanvas().style.cursor = '';
        });
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
                    'fill-color': '#00aaff',
                    'fill-opacity': 0.5,       
                },
            });
        }
    };

    const mapPosition: MapPosition = {
        camera: {
        lat: 39,
        lng: -98,
        altitude: 6000000,
        },
    };


    return h("div.map-container",
          h(MapAreaContainer, { className: "map-area-container",},
            h(MapView, {
              style: "mapbox://styles/mapbox/dark-v10",
              mapboxToken: SETTINGS.mapboxAccessToken,
              onMapLoaded: handleMapLoaded,
              mapPosition,
            })
          )
        );
}