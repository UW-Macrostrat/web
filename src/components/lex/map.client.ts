import {
  ColumnNavigationMap,
  useMacrostratColumns,
} from "@macrostrat/column-views";
import h from "./map.module.sass";
import { mapboxAccessToken } from "@macrostrat-web/settings";
import { ErrorBoundary } from "@macrostrat/ui-components";
import { ExpansionPanel } from "@macrostrat/map-interface";
import { Icon } from "@blueprintjs/core"
import { useState, useRef } from "react";
import { useMapStyleOperator } from "@macrostrat/mapbox-react"
import { satelliteMapURL } from "@macrostrat-web/settings";
import { setGeoJSON } from "@macrostrat/mapbox-utils";
import mapboxgl from "mapbox-gl"
import { pbdbDomain } from "@macrostrat-web/settings";

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
  fossilsData = []
}) {
  const [showSatellite, setShowSatellite] = useState(true);
  const [showFossils, setShowFossils] = useState(false);
  const [showOutcrop, setShowOutcrop] = useState(true);
  const fossilClickRef = useRef(false);

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
      h('div.btn', { onClick: handleFossils }, h(Icon, { icon: "mountain", className: 'icon' })),
      // h('div.btn', { onClick: handleOutcrop }, h(Icon, { icon: "excavator", className: 'icon' })),
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
          style: {height: "100%"},
          onSelectColumn: (id) => {
              setTimeout(() => {
                if(!showFossils || !fossilClickRef.current) {
                  fossilClickRef.current = false;

                  window.open(
                    `/columns/${id}`,
                    "_self"
                  );
                }
              }, 0);
          },
          mapStyle: showSatellite ? satelliteMapURL : null
        }, 
        [
          h(FossilsLayer, { fossilsData, showFossils, fossilClickRef }),
          h(LexControls)
        ]
      ),
    ]
  );
}

function FossilsLayer({ fossilsData, showFossils, fossilClickRef }) {
  useMapStyleOperator(
    (map) => {
      if (fossilsData == null) return;

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

        console.log(features.length > 0)

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
    },
    [fossilsData, showFossils],
  );

  return null;
}