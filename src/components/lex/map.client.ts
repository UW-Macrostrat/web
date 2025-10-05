import {
  ColumnNavigationMap,
  useMacrostratColumns,
} from "@macrostrat/column-views";
import h from "./map.module.sass";
import { mapboxAccessToken } from "@macrostrat-web/settings";
import { ErrorBoundary, useDarkMode } from "@macrostrat/ui-components";
import { ExpansionPanel, buildInspectorStyle } from "@macrostrat/map-interface";
import { Icon } from "@blueprintjs/core"
import { useState, useRef, useEffect } from "react";
import { useMapStyleOperator } from "@macrostrat/mapbox-react"
import { satelliteMapURL } from "@macrostrat-web/settings";
import { setGeoJSON } from "@macrostrat/mapbox-utils";
import mapboxgl from "mapbox-gl"
import { pbdbDomain, tileserverDomain } from "@macrostrat-web/settings";
import { buildMacrostratStyle } from "@macrostrat/map-styles";
import { getExpressionForFilters } from "./filter-helper";

const _macrostratStyle = buildMacrostratStyle({
  tileserverDomain,
  fillOpacity: 0.3,
  strokeOpacity: 0.1,
}) as mapboxgl.Style;

export function ColumnsMapContainer(props) {
  /* TODO: integrate this with shared web components */
  return h(ErrorBoundary, h(ColumnsMapInner, props));
}

export function ExpansionPanelContainer(props) {
  return h(ExpansionPanel, props);
}

function ColumnsMapInner({
  columnIDs = null,
  className = "map-container",
  columns = null,
  lex = false,
  fossilsData = [],
  filters = [],
}) {
  const [showSatellite, setShowSatellite] = useState(true);
  const [showFossils, setShowFossils] = useState(false);
  const [showOutcrop, setShowOutcrop] = useState(false);
  const fossilClickRef = useRef(false);
  const hasFitted = useRef(false);
  const fossilsExist = fossilsData?.features?.length > 0;

  function LexControls() {
    const handleFossils = () => {
      setShowFossils(!showFossils);
    };

    const handleSatellite = () => {
      setShowSatellite(!showSatellite);
    };

    const handleOutcrop = () => {
      setShowOutcrop(!showOutcrop);
    }


    return h('div.lex-controls', [
      h.if(fossilsExist)('div.btn', { onClick: handleFossils }, h(Icon, { icon: "mountain", className: 'icon' })),
      h.if(filters.length > 0)('div.btn', { onClick: handleOutcrop }, h(Icon, { icon: "excavator", className: 'icon' })),
      h('div.btn', { onClick: handleSatellite }, h(Icon, { icon: "satellite", className: 'icon' })),
    ])
  }

  columns = columns.features

  columns = columns.map((col) => {
    col.id = col.properties.col_id;
    return col;
  });

  return h(
    "div",
    { className },
    [
      h(
        ColumnNavigationMap, 
        {
          columns,
          accessToken: mapboxAccessToken,
          style: {  ..._macrostratStyle, height: "100%" },
          onSelectColumn: (id) => {
              setTimeout(() => {
                console.log("fossilClicked", fossilClickRef.current)
                if(!showFossils || !fossilClickRef.current) {
                  window.open(
                    `/columns/${id}`,
                    "_self"
                  );
                }
              }, 0);
          },
          mapStyle: showSatellite ? satelliteMapURL : null,
          columnColor: showSatellite ? "#000" : null
        }, 
        [
          fossilsExist ? h(FossilsLayer, { fossilsData, showFossils, fossilClickRef }) : null,
          h(LexControls),
          !hasFitted.current ? h(FitBounds, { columnData: columns, hasFitted }) : null,
          h(OutcropLayer, {showOutcrop, filters})
        ]
      ),
    ]
  );
}

function OutcropLayer({showOutcrop, filters}) {
  useMapStyleOperator((map) => {
    if (map == null || filters.length === 0) return;

    const macrostratLayers = _macrostratStyle.layers
    const macrostratSources = _macrostratStyle.sources

    if(!showOutcrop) {
      macrostratLayers?.forEach((lyr) => {
        if (map.getLayer(lyr.id)) {
          map.removeLayer(lyr.id);
        }
      });
      return;
    }

    macrostratLayers?.forEach((lyr) => {
      if (!map.getLayer(lyr.id) && lyr.source) {
        if (!map.getSource(lyr.source)) {
          map.addSource(lyr.source, (_macrostratStyle.sources as any)[lyr.source]);
        }
        map.addLayer(lyr);
      }
    });

    Object.keys(macrostratSources).forEach((src) => {
      if (!map.getSource(src)) {
        map.addSource(src, (macrostratSources as any)[src]);
      }
    });
    
    const expr = getExpressionForFilters(filters);
    map.setFilter("burwell_fill", expr);
  }, [showOutcrop, filters]);

  return null;
}


function FossilsLayer({ fossilsData, showFossils, fossilClickRef }) {
  useMapStyleOperator(
    (map) => {
      if (fossilsData == null) return

      setGeoJSON(map, "points", fossilsData);

      if (showFossils) {
        if (map.getLayer("minimal-layer")) {
          map.removeLayer("minimal-layer");
        }

        if (!map.getLayer("expanded-layer")) {
          map.addLayer({
            id: "expanded-layer",
            type: "circle",
            source: "points",
            paint: {
              "circle-radius": 5,
              "circle-color": "grey",
              "circle-opacity": 0.5,
              "circle-stroke-color": "white",
              "circle-stroke-width": 2,
              "circle-stroke-opacity": 1,
            },
          });
        }
      } else {
        if (map.getLayer("expanded-layer")) {
          map.removeLayer("expanded-layer");
        }
        if (!map.getLayer("minimal-layer")) {
          map.addLayer({
            id: "minimal-layer",
            type: "circle",
            source: "points",
            paint: {
              "circle-radius": 2,
              "circle-color": "white",
              "circle-opacity": 0.8,
            },
          });
        }
      }

      const onClick = (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["expanded-layer"],
        });

        fossilClickRef.current = features.length > 0;

        if (!features.length) return;

        const feature = features[0];

        const { cltn_name, pbdb_occs, cltn_id } = feature.properties;

        const coordinates = feature.geometry.coordinates.slice();
        const name = cltn_name || "Unknown Fossil";
        const occurrences = (pbdb_occs || 0) + " occurrences";
        const url = pbdbDomain + "/classic/displayCollResults?collection_no=col:" + cltn_id;

        new mapboxgl.Popup()
          .setLngLat(coordinates)
          .setHTML(`
            <div style="color: black; text-align: center;">
              <strong><a href="${url}" target="_blank" style="color: black;">
                ${name}
              </a></strong>
              <div>${occurrences}</div>
            </div>
          `)
          .addTo(map);
      };

      map.on("click", onClick);

      return () => {
      map.off("click", onClick);
    };
    },
    [fossilsData, showFossils],
  );

  return null;
}


function FitBounds({ columnData, hasFitted }) {
  useMapStyleOperator((map) => {
    if (!map || !Array.isArray(columnData) || columnData.length === 0) return;

    hasFitted.current = true;

    // Flatten all polygon coordinates (assumes Polygon or MultiPolygon)
    const coordinates = columnData
      .flatMap(col => {
        const geom = col.geometry;
        if (!geom || !geom.coordinates) return [];

        // Handle Polygon or MultiPolygon
        if (geom.type === 'Polygon') {
          return geom.coordinates[0]; // outer ring
        } else if (geom.type === 'MultiPolygon') {
          return geom.coordinates.flat(1)[0]; // first outer ring
        }

        return [];
      })
      .filter(Boolean); // remove invalid entries

    if (coordinates.length === 0) return;

    // Calculate bounds
    const bounds = coordinates.reduce(
      (b, coord) => b.extend(coord),
      new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
    );

    map.fitBounds(bounds, {
      padding: 50,
      duration: 0,
    });
  }, []);

  return null;
}