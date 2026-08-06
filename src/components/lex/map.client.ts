import { ColumnNavigationMap } from "@macrostrat/column-views";
import h from "./map.module.sass";
import { mapboxAccessToken } from "@macrostrat-web/settings";
import { ErrorBoundary } from "@macrostrat/ui-components";
import { Icon } from "@blueprintjs/core";
import { useEffect, useMemo, useState, useRef } from "react";
import { useMapStyleOperator, useMapRef } from "@macrostrat/mapbox-react";
import { satelliteMapURL } from "@macrostrat-web/settings";
import { setGeoJSON } from "@macrostrat/mapbox-utils";
import mapboxgl from "mapbox-gl";
import { pbdbDomain, tileserverDomain } from "@macrostrat-web/settings";
import { buildMacrostratStyle } from "@macrostrat/map-styles";
import { getExpressionForFilters } from "./filter-helper";
import { navigate } from "vike/client/router";

const _macrostratStyle = buildMacrostratStyle({
  tileserverDomain,
  fillOpacity: 0.3,
  strokeOpacity: 0.1,
}) as mapboxgl.Style;

export function LexiconMap(props) {
  /* TODO: integrate this with shared web components */
  return h(ErrorBoundary, h(LexiconMapInner, props));
}

/**
 * The lexicon map's contents. Mounted **once** for the whole `/lex` subtree (see
 * `./persistent-map`) and re-targeted as the user navigates: every prop below can
 * change in place, and `targetKey` identifies the item so the view can be re-fit.
 * Because the instance outlives the page, anything derived from a target must be
 * cleared when it goes away — a layer left behind is a previous item's data
 * showing on the current one.
 */
function LexiconMapInner({
  className,
  targetKey = null,
  columns = null,
  fossilsData = null,
  filters = [],
  mapUrl = "",
}) {
  const [showSatellite, setShowSatellite] = useState(true);
  const [showFossils, setShowFossils] = useState(false);
  const [showOutcrop, setShowOutcrop] = useState(false);
  const fossilClickRef = useRef(false);
  const fossilsExist = fossilsData?.features?.length > 0;

  // Memoized: a fresh array identity would re-run the column layer's
  // `setGeoJSON` (and the navigation store's update) on every unrelated
  // re-render, e.g. a basemap toggle.
  const columnFeatures = useMemo(() => {
    return (columns?.features ?? []).map((col) => {
      col.id = col.properties.col_id;
      return col;
    });
  }, [columns]);

  // A toggle from a previous item shouldn't stay lit for one that can't honor it.
  useEffect(() => {
    if (!fossilsExist) setShowFossils(false);
    if (filters.length === 0) setShowOutcrop(false);
  }, [targetKey, fossilsExist, filters.length]);

  const onSelectColumn = (id) => {
    setTimeout(() => {
      if (!showFossils || !fossilClickRef.current) {
        navigate(`/columns/${id}`);
      }
    }, 0);
  };

  return h("div.map-wrapper", { className }, [
    h(
      ColumnNavigationMap,
      {
        columns: columnFeatures,
        accessToken: mapboxAccessToken,
        // `style` is the container's CSS (InsetMapProps.style: CSSProperties), NOT
        // the map style — that's `mapStyle` below. The definite height lives on
        // the page-side slot (`.lex-map-slot`); fill it.
        style: { width: "100%", height: "100%" },
        onSelectColumn,
        mapStyle: showSatellite ? satelliteMapURL : null,
        columnColor: showSatellite ? "#000" : null,
      },
      [
        h(FossilsLayer, {
          fossilsData,
          showFossils: showFossils && fossilsExist,
          fossilClickRef,
        }),
        h(LexControls, {
          mapUrl,
          fossilsExist,
          hasFilters: filters.length > 0,
          showFossils,
          setShowFossils,
          showOutcrop,
          setShowOutcrop,
          showSatellite,
          setShowSatellite,
        }),
        h(FitBounds, { columnData: columnFeatures, targetKey }),
        h(OutcropLayer, { showOutcrop, filters }),
        h(MapDisposer),
      ]
    ),
  ]);
}

function LexControls({
  mapUrl,
  fossilsExist,
  hasFilters,
  showFossils,
  setShowFossils,
  showOutcrop,
  setShowOutcrop,
  showSatellite,
  setShowSatellite,
}) {
  return h("div.lex-controls", [
    h.if(mapUrl !== "")(
      "div.btn",
      { onClick: () => navigate("/map/layers#" + mapUrl) },
      h(Icon, { icon: "map", className: "icon" })
    ),
    h.if(fossilsExist)(
      "div." + (showFossils ? "selected" : "btn"),
      { onClick: () => setShowFossils(!showFossils) },
      h(Icon, { icon: "mountain", className: "icon" })
    ),
    h.if(hasFilters)(
      "div." + (showOutcrop ? "selected" : "btn"),
      { onClick: () => setShowOutcrop(!showOutcrop) },
      h(Icon, { icon: "excavator", className: "icon" })
    ),
    h(
      "div." + (showSatellite ? "selected" : "btn"),
      { onClick: () => setShowSatellite(!showSatellite) },
      h(Icon, { icon: "satellite", className: "icon" })
    ),
  ]);
}

/** Destroy the GL context if the map tree ever does unmount (leaving `/lex`).
 * `MapView` never removes the map itself, so without this the instance would be
 * orphaned along with its canvas. */
function MapDisposer() {
  const mapRef = useMapRef();
  useEffect(() => {
    return () => {
      mapRef.current?.remove();
    };
  }, []);
  return null;
}

function OutcropLayer({ showOutcrop, filters }) {
  useMapStyleOperator(
    (map) => {
      if (map == null) return;

      const macrostratLayers = _macrostratStyle.layers;
      const macrostratSources = _macrostratStyle.sources;

      // The map persists across items, so "no filters" must actively tear the
      // overlay down — otherwise the previous item's outcrop stays on screen.
      if (!showOutcrop || filters.length === 0) {
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
            map.addSource(
              lyr.source,
              (_macrostratStyle.sources as any)[lyr.source]
            );
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
    },
    [showOutcrop, filters]
  );

  return null;
}

const EMPTY_FEATURES = { type: "FeatureCollection", features: [] };

function FossilsLayer({ fossilsData, showFossils, fossilClickRef }) {
  useMapStyleOperator(
    (map) => {
      // Write an empty collection rather than bailing out: on a persistent map,
      // returning early would leave the previous item's collections displayed.
      setGeoJSON(map, "points", fossilsData ?? EMPTY_FEATURES);

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
        const url =
          pbdbDomain +
          "/classic/displayCollResults?collection_no=col:" +
          cltn_id;

        new mapboxgl.Popup()
          .setLngLat(coordinates)
          .setHTML(
            `
            <div style="color: black; text-align: center;">
              <strong><a href="${url}" target="_blank" style="color: black;">
                ${name}
              </a></strong>
              <div>${occurrences}</div>
            </div>
          `
          )
          .addTo(map);
      };

      map.on("click", onClick);

      return () => {
        map.off("click", onClick);
      };
    },
    [fossilsData, showFossils]
  );

  return null;
}

/** Fit the view to the current item's columns — once per item. Keyed on
 * `targetKey` rather than "first run": the map persists, so each new item needs a
 * fit, but a style reload (satellite toggle) re-runs this operator and must not
 * throw away the user's pan/zoom. */
function FitBounds({ columnData, targetKey }) {
  const fittedKey = useRef<string | null>(null);

  useMapStyleOperator(
    (map) => {
      if (!map || !Array.isArray(columnData) || columnData.length === 0) return;
      if (fittedKey.current === targetKey) return;
      fittedKey.current = targetKey;
      fitToColumns(map, columnData);
    },
    [targetKey, columnData]
  );

  return null;
}

function fitToColumns(map, columnData) {
  // Flatten all polygon coordinates (assumes Polygon or MultiPolygon)
  const coordinates = columnData
    .flatMap((col) => {
      const geom = col.geometry;
      if (!geom || !geom.coordinates) return [];

      // Handle Polygon or MultiPolygon
      if (geom.type === "Polygon") {
        return geom.coordinates[0]; // outer ring
      } else if (geom.type === "MultiPolygon") {
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
}
