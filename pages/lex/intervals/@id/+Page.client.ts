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

export function Page() {
    const pageContext = usePageContext();
    const id = parseInt(pageContext.urlParsed.pathname.split("/")[3]);
    const intRes = useAPIResult(SETTINGS.apiV2Prefix + "/defs/intervals?int_id=" + id)?.success.data[0];
    const fossilRes = useAPIResult(SETTINGS.apiV2Prefix + "/fossils?int_id=" + id)?.success.data;
    console.log(SETTINGS.apiV2Prefix + "/fossils?int_id=" + id);

    if (!intRes || !fossilRes) return h("div", "Loading...");

    console.log("fossil res", fossilRes);
    console.log("int res", intRes);

    const { name, color, abbrev, b_age, int_id, t_age, timescales, int_type } = intRes;

    return h(ContentPage, { className: 'int-page'}, [
        h(PageBreadcrumbs, { title: "#" + int_id }),
        h('div.int-names', [
            h('div.int-name', { style: { "backgroundColor": color, "color": getContrastTextColor(color)} }, name),
            abbrev ? h('div.int-abbrev', [
                h('p', " aka "),
                h('div.int-abbrev-item', { style: { "backgroundColor": color, "color": getContrastTextColor(color)} }, abbrev)
            ]) : null,
        ]),
        h('div.table', [
            h('div.table-content', [
                h('div.int-type', "Type: " + UpperCase(int_type)),
                h('div.int-age', b_age + " - " + t_age + " Ma"),
            ]),
            h(Map)
        ]),
        h('div.int-timescales', [
            h('h3', "Timescales"),
            h('ul', timescales.map((t) => h('li', h(Link, { href: "/lex/timescales/" + t.timescale_id}, titleCase(t.name))))),
        ]),
        h(References, { id: int_id }),
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

    console.log("DATA", data)

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
                const url = "/columns/" + feature.properties.col_id;
                window.open(url, "_blank");
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
        const sourceId = 'geojson-data';

        if (map.getSource(sourceId)) {
            // Update existing source with new data
            (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(data);
        } else {
            // Add source if it doesn't exist
            map.addSource(sourceId, {
                type: 'geojson',
                data: data,
            });
        }

        if (!map.getLayer('geojson-layer')) {
            map.addLayer({
                id: 'geojson-layer',
                type: 'fill',
                source: sourceId,
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