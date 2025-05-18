import { ContentPage } from "~/layouts";
import { PageHeader, Link, AssistantLinks, DevLinkButton } from "~/components";
import { Divider, AnchorButton, Tag, Card, Collapse, Icon } from "@blueprintjs/core";
import { useData } from "vike-react/useData";
import { useState } from "react";
import "./main.scss";
import h from "@macrostrat/hyper";
import {
  MapAreaContainer,
  MapMarker,
  MapView,
  buildInspectorStyle,
} from "@macrostrat/map-interface";
import { SETTINGS } from "@macrostrat-web/settings";
import mapboxgl, { LngLat } from "mapbox-gl";
import { MapPosition } from "@macrostrat/mapbox-utils";



export function Page(props) {
  return h(ColumnListPage, props);
}

function ColumnListPage({ title = "Columns", linkPrefix = "/" }) {
  const { columnGroups } = useData();

  const [columnInput, setColumnInput] = useState("");
  const filteredGroups = columnGroups.filter((group) => {
    const name = group.name.toLowerCase();
    const columns = group.columns.map((col) => col.col_name.toLowerCase());
    const input = columnInput.toLowerCase();
    return name.includes(input) || columns.some((col) => col.includes(input));
  });

  const mapPosition: MapPosition = {
        camera: {
          lat: 39, 
          lng: -98, 
          altitude: 6000000,
        },
      };

  const handleMapLoaded = (map: mapboxgl.Map) => {
        if (!map.isStyleLoaded()) {
            map.once('style.load', () => addGeoJsonLayer(map));
        } else {
            addGeoJsonLayer(map);
        }
    };

  const addGeoJsonLayer = (map: mapboxgl.Map) => {
    const geojson = {
        type: "FeatureCollection",
        features: columnGroups.flatMap((group) =>
            group.columns.map((col) => ({
                type: "Feature",
                properties: {
                    name: col.col_name,
                    id: col.col_id,
                    status: col.status,
                },
                geometry: {
                    type: "Point",
                    coordinates: [col.lng, col.lat],
                },
            }))
        ),
    };

    if (!map.getSource('geojson-data')) {
        map.addSource('geojson-data', {
            type: 'geojson',
            data: geojson,
        });
    } else {
        map.getSource('geojson-data').setData(geojson);
    }

    if (!map.getLayer('geojson-layer')) {
        map.addLayer({
            id: 'geojson-layer',
            type: 'circle',
            source: 'geojson-data',
            paint: {
                'circle-radius': 6,
                'circle-color': '#007cbf',
                'circle-opacity': 0.75,
            },
        });
    }

    // popups
    map.on('click', 'geojson-layer', (e) => {
      const feature = e.features?.[0];
      if (!feature) return;

      const coordinates = feature.geometry.coordinates as [number, number];
      const { name, id, status } = feature.properties;

      // Create content
      const el = document.createElement('div');
      el.className = 'popup';
      el.innerHTML = `<a href="${linkPrefix}columns/${id}" class="popup-link">
        <h3>${name}</h3>
        </a>
      `;

    // Create and add popup to map
    new mapboxgl.Popup({ offset: 12 }) // optional: tweak placement
      .setLngLat(coordinates)
      .setDOMContent(el)
      .addTo(map);
  });


  };

  const handleInputChange = (event) => {
    setColumnInput(event.target.value.toLowerCase());
  }
  
  return h('div.column-list-page', [
    h(AssistantLinks, [
      h(AnchorButton, { href: "/projects", minimal: true }, "Projects"),
      h(DevLinkButton, { href: "/columns/correlation" }, "Correlation chart"),
    ]),
    h(ContentPage, [
      h(PageHeader, { title }),
      h('div.map-section', [
        h('h2', "Map of Columns"),
        h("div.map-container",
          h(MapAreaContainer,
              { className: "map-area-container" },
              h(MapView, {
                  style: "mapbox://styles/mapbox/dark-v10",
                  mapboxToken: SETTINGS.mapboxAccessToken,
                  onMapLoaded: handleMapLoaded,
                  mapPosition,
              }),
          ),
        ),
      ]),
      h(Card, {className: "search-bar"}, [
        h(Icon, { icon: "search" }),
        h('input', {
          type: "text",
          placeholder: "Search columns...",
          onChange: handleInputChange 
        }),
      ]),      
      h('div.column-groups', 
        filteredGroups.map((d) => h(ColumnGroup, { data: d, key: d.id, linkPrefix, columnInput }) ),
      )
    ])
  ]);
}

function ColumnGroup({ data, linkPrefix, columnInput }) {
  const [isOpen, setIsOpen] = useState(false);
  const filteredColumns = data.columns.filter((col) => {
    const name = col.col_name.toLowerCase();
    const input = columnInput.toLowerCase();
    return name.includes(input);
  });

  if (filteredColumns?.length === 0) return null;

  const { name } = data;
  return h('div', { className: 'column-group', onClick : () => setIsOpen(!isOpen) }, [
    h('div.column-group-header', [
      h("h2.column-group-name", name + " (Group #" + filteredColumns[0].col_group_id + ")"),
    ]),
    h(
      "div.column-list", [
        h(Divider),
        h('div.column-table', [
          h("div.column-row.column-header", [
            h("span.col-id", "Id"),
            h("span.col-name", "Name"),
            h("span.col-status", "Status"),
          ]),
          h(Divider),
          filteredColumns.map((data) =>
            h(ColumnItem, { data, linkPrefix })
          )
        ]),
    ])
  ]);
}

function ColumnItem({ data, linkPrefix = "/" }) {
  const { col_id, col_name, status } = data;
  const href = linkPrefix + `columns/${col_id}`;
  return h("div.column-row", [
    h("span.col-id", "#" + col_id),
    h(Link, { className: 'col-link', href }, [col_name]),
    h("span", { className: status === "active" ? 'active' : status === 'obsolete' ? "obsolete" : 'inprocess'},  UpperCase(status)),
  ]);
}

function UpperCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}