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
  fossilsData = []
}) {
  const [showSatellite, setShowSatellite] = useState(true);
  const [showFossils, setShowFossils] = useState(false);
  const [showOutcrop, setShowOutcrop] = useState(true);
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
      h('div.btn', { onClick: handleOutcrop }, h(Icon, { icon: "excavator", className: 'icon' })),
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
          h(OutcropLayer, {showOutcrop})
        ]
      ),
    ]
  );
}

function OutcropLayer({showOutcrop}) {
  useMapStyleOperator((map) => {
    if (map == null) return;

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

    // temporary
    const filters = [
      {
        category: "lithology",
        type: "lithologies",
        id: 12,
        name: "zanclean",
        legend_ids: [
14534,
85892,
13410,
71785,
41301,
41302,
41303,
41304,
69719,
23625,
23613,
23633,
23634,
23635,
23640,
23641,
23666,
23679,
81621,
23764,
69123,
69127,
69164,
69165,
69166,
69518,
69519,
69582,
69583,
49059,
61523,
53655,
61829,
74961,
41772,
75030,
84398,
99515,
99525,
99544,
99530,
99531,
99547,
99510,
99511,
99512,
99522,
99538,
99539,
84517,
84518,
84520,
84536,
84492,
84397,
62301,
62315,
82587,
99869,
99855,
99856,
99686,
100129,
100130,
100315,
100316,
100317,
100379,
100380,
100304,
100361,
100362,
100341,
100219,
100220,
100143,
100144,
100240,
100241,
100242,
100112,
100113,
100263,
100264,
100265,
100232,
100229,
100230,
100231,
100266,
100285,
100297,
100298,
100175,
100176,
100416,
100417,
100418,
100206,
100207,
100208,
100364,
100414,
100278,
100279,
100367,
100119,
100120,
100121,
100376,
100373,
100374,
100114,
100115,
100116,
100371,
100372,
100307,
100308,
100150,
100146,
100147,
100255,
100256,
100282,
100295,
100296,
100169,
100170,
100353,
100354,
100355,
100356,
100292,
100086,
100181,
100211,
100212,
100213,
100079,
100080,
100081,
100082,
100073,
100189,
100190,
100224,
100214,
100215,
100324,
100325,
100185,
30396,
75306,
100492,
75367,
42432,
42433,
75390,
75445,
83294,
85904,
25307,
25308,
25362,
16874,
83391,
63976,
55184,
25451,
25464,
25469,
25486,
83588,
86214,
86215,
49071,
87570,
87586,
53751,
53755,
53877,
53707,
53724,
53819,
52203,
52160,
52205,
101131,
74233,
41672,
76826,
76767,
82099,
82104,
69506,
62293,
82565,
68685,
100421,
99551,
99516,
99543,
99532,
99513,
99541,
62299,
99886,
99887,
100131,
100136,
100138,
100319,
100322,
100305,
100342,
100246,
100196,
100200,
100299,
100179,
100365,
100378,
100122,
100156,
100390,
100392,
100388,
100393,
100396,
100094,
100096,
23933,
100107,
100076,
100226,
100228,
100326,
100333,
100336,
54790,
28891,
28896,
28906,
100413,
100168,
25195,
100142,
100218,
100141,
99517
]
      }
    ]
    
    
    const expr = getExpressionForFilters(filters);
    map.setFilter("burwell_fill", expr);
    map.setFilter("burwell_stroke", expr);
    

  }, [showOutcrop]);

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