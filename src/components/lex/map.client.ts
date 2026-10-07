import { ColumnNavigationMap } from "@macrostrat/map-views";
import { MapResizer } from "~/components/map-resizer";
import h from "./map.module.sass";
import { mapboxAccessToken } from "@macrostrat-web/settings";
import { ErrorBoundary } from "@macrostrat/ui-components";
import { useEffect, useMemo, useRef } from "react";
import {
  useMapStyleOperator,
  useMapRef,
  useOverlayStyle,
} from "@macrostrat/mapbox-react";
import mapboxgl from "mapbox-gl";
import { pbdbDomain, tileserverDomain } from "@macrostrat-web/settings";
import { buildMacrostratStyle } from "@macrostrat/map-styles";
import { useAtomValue } from "jotai";
import { getExpressionForFilters } from "./filter-helper";
import { lexMapLayersAtom } from "./map-target";
import {
  mapSettingsStore,
  useInsetMapStyleProps,
} from "~/components/map-settings";
import { navigate } from "vike/client/router";

const _macrostratStyle = buildMacrostratStyle({
  tileserverDomain,
  fillOpacity: 0.3,
  strokeOpacity: 0.1,
}) as mapboxgl.Style;

export function LexiconMap(props) {
  return h(ErrorBoundary, h(LexiconMapInner, props));
}

/**
 * The lexicon map's contents. Mounted **once** for the whole `/lex` subtree (see
 * `./persistent-map`) and re-targeted as the user navigates: every prop below can
 * change in place, and `targetKey` identifies the item so the view can be re-fit.
 * Because the instance outlives the page, anything derived from a target must be
 * cleared when it goes away — a layer left behind is a previous item's data
 * showing on the current one. Overlays are declarative style fragments
 * (`useOverlayStyle`), so they are rebuilt from the current target rather than
 * added and removed by hand.
 *
 * Basemap, labels and the layer toggles come from the shared map settings, set
 * from the bar the page renders beneath the map (`LexMapSettingsBar`).
 */
function LexiconMapInner({
  className,
  targetKey = null,
  columns = null,
  fossilsData = null,
  filters = [],
}) {
  const styleProps = useInsetMapStyleProps();
  const layers = useAtomValue(lexMapLayersAtom, { store: mapSettingsStore });
  const fossilClickRef = useRef(false);
  const fossilsExist = fossilsData?.features?.length > 0;
  // A toggle left on from a previous item does nothing for one that can't honor it.
  const showFossils = layers.fossils && fossilsExist;
  const showOutcrop = layers.outcrop && filters.length > 0;

  // Memoized: a fresh array identity would re-run the column layer's
  // `setGeoJSON` (and the navigation store's update) on every unrelated
  // re-render, e.g. a basemap change.
  const columnFeatures = useMemo(() => {
    return (columns?.features ?? []).map((col) => {
      col.id = col.properties.col_id;
      return col;
    });
  }, [columns]);

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
        ...styleProps,
        columns: columnFeatures,
        accessToken: mapboxAccessToken,
        // `style` is the container's CSS (InsetMapProps.style: CSSProperties), NOT
        // the map style — that's `mapStyle`, from the shared settings. The
        // definite height lives on the page-side slot (`.lex-map-slot`); fill it.
        style: { width: "100%", height: "100%" },
        onSelectColumn,
      },
      [
        h(OutcropLayer, { showOutcrop, filters }),
        h(FossilsLayer, { fossilsData, showFossils, fossilClickRef }),
        h(FitBounds, { columnData: columnFeatures, targetKey }),
        h(MapDisposer),
        h(MapResizer),
      ]
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

/** Geologic map units matching the item, from the carto tiles. */
function OutcropLayer({ showOutcrop, filters }) {
  const filterKey = filters.map((f) => `${f.type}:${f.id}`).join(",");

  useOverlayStyle(() => {
    if (!showOutcrop) return null;
    const filter = getExpressionForFilters(filters);
    const layers = _macrostratStyle.layers.map((lyr) => {
      if (lyr.id !== "burwell_fill") return lyr;
      return { ...lyr, filter };
    });
    return { sources: _macrostratStyle.sources, layers, order: 5 };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on contents
  }, [showOutcrop, filterKey]);

  return null;
}

const fossilsLayerID = "lex-fossils";

/** Fossil collections: faint dots by default, emphasized (and clickable) when
 * the layer is turned on. */
function FossilsLayer({ fossilsData, showFossils, fossilClickRef }) {
  useOverlayStyle(() => {
    if (!(fossilsData?.features?.length > 0)) return null;
    return buildFossilsStyle(fossilsData, showFossils);
  }, [fossilsData, showFossils]);

  useMapStyleOperator(
    (map) => {
      const onClick = (e) => {
        fossilClickRef.current = false;
        if (!showFossils || map.getLayer(fossilsLayerID) == null) return;
        const features = map.queryRenderedFeatures(e.point, {
          layers: [fossilsLayerID],
        });
        fossilClickRef.current = features.length > 0;
        if (!features.length) return;
        showFossilPopup(map, features[0]);
      };

      map.on("click", onClick);
      return () => {
        map.off("click", onClick);
      };
    },
    [showFossils]
  );

  return null;
}

function buildFossilsStyle(fossilsData, emphasized: boolean) {
  let paint: any = {
    "circle-radius": 2,
    "circle-color": "white",
    "circle-opacity": 0.8,
  };
  if (emphasized) {
    paint = {
      "circle-radius": 5,
      "circle-color": "grey",
      "circle-opacity": 0.5,
      "circle-stroke-color": "white",
      "circle-stroke-width": 2,
      "circle-stroke-opacity": 1,
    };
  }
  return {
    sources: {
      [fossilsLayerID]: { type: "geojson", data: fossilsData },
    },
    layers: [
      { id: fossilsLayerID, type: "circle", source: fossilsLayerID, paint },
    ],
    // Above the outcrop overlay
    order: 10,
  };
}

function showFossilPopup(map, feature) {
  const { cltn_name, pbdb_occs, cltn_id } = feature.properties;

  const coordinates = feature.geometry.coordinates.slice();
  const name = cltn_name || "Unknown Fossil";
  const occurrences = (pbdb_occs || 0) + " occurrences";
  const url =
    pbdbDomain + "/classic/displayCollResults?collection_no=col:" + cltn_id;

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
}

/** Fit the view to the current item's columns — once per item. Keyed on
 * `targetKey` rather than "first run": the map persists, so each new item needs a
 * fit, but a style reload (basemap change) re-runs this operator and must not
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
