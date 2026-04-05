import {
  Button,
  NonIdealState,
  PopoverNext,
  Radio,
  RadioGroup,
  Switch,
} from "@blueprintjs/core";
import { SETTINGS, tileserverDomain } from "@macrostrat-web/settings";
import {
  FeatureSelectionHandler,
  MapMarker,
  MapView,
} from "@macrostrat/map-interface";
import { buildMacrostratStyle, StyleFragment } from "@macrostrat/map-styles";
import {
  NullableSlider,
  useDarkMode,
  useStoredState,
} from "@macrostrat/ui-components";
import boundingBox from "@turf/bbox";
import { LngLatBoundsLike } from "mapbox-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import { boundingGeometryMapStyle } from "~/map-styles";
import { MapboxMapProvider } from "@macrostrat/mapbox-react";
import { baseElements, buildBasicStyle } from "../utils";
import h from "./main.module.sass";

function rasterURL(source_id) {
  // Placeholder for figuring out a better version of this.
  return null;
}

interface StyleOpts {
  style: string;
  mapSlug: string;
  layers: string[];
  sourceLayers?: any;
  layerOpacity: {
    vector: number | null;
    raster: number | null;
  };
}

const emptyStyle: any = {
  version: 8,
  sprite: "mapbox://sprites/mapbox/bright-v9",
  glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
  sources: {},
  layers: [],
};

function tableName(slug, layer) {
  return `sources.${slug}_${layer}`;
}

function ensureBoxInGeographicRange(bounds: LngLatBoundsLike) {
  if (bounds[1] < -90) bounds[1] = -90;
  if (bounds[3] > 90) bounds[3] = 90;
  if (bounds[0] < -180 || bounds[2] > 180) return "invalid";
  return bounds;
}

enum Basemap {
  Satellite = "satellite",
  Basic = "basic",
  None = "none",
}

function basemapStyle(basemap, inDarkMode) {
  switch (basemap) {
    case Basemap.Satellite:
      return SETTINGS.satelliteMapURL;
    case Basemap.Basic:
      return inDarkMode ? SETTINGS.darkMapURL : SETTINGS.baseMapURL;
    case Basemap.None:
      return null;
  }
}

export function MapInterface({
  map,
  slug,
  className,
  featureTypes = ["points", "lines", "polygons", "rgeom"],
  onClickFeatures,
  selectedFeatures,
  inspectPosition,
  setInspectPosition,
}) {
  // Catch empty map data
  if (map == null || Object.keys(map.geometry).length == 0) {
    return h(
      "div",
      { style: { display: "flex", margin: "auto" } },
      "Map data not generated"
    );
  }

  const containerRef = useRef<HTMLDivElement>();

  const dark = useDarkMode()?.isEnabled ?? false;

  const hasRaster = rasterURL(map.properties.source_id) != null;

  const [showOmittedRows, setShowOmittedRows] = useStoredState(
    "ingestion:mapShowOmittedRows",
    false
  );

  const [showColors, setShowColors] = useStoredState(
    "ingestion:mapShowColors",
    false
  );

  const bounds: LngLatBoundsLike | "invalid" = useMemo(() => {
    return ensureBoxInGeographicRange(boundingBox(map.geometry));
  }, [map.geometry]);

  const [_featureTypes, setFeatureTypes] = useState(featureTypes);

  const [layer, setLayer] = useStoredState(
    "ingestion:baseLayer",
    Basemap.Basic,
    (v) => {
      return Object.values(Basemap).includes(v);
    }
  );
  const [style, setStyle] = useState(null);
  // Basemap style
  useEffect(() => {
    if (layer == null) setStyle(null);
    const styleURL = basemapStyle(layer, dark);
    setStyle(styleURL);
  }, [layer, dark]);

  const [layerOpacity, setLayerOpacity] = useStoredState(
    "ingestion:layerOpacity",
    {
      vector: 0.5,
      raster: 0.5,
    },
    (v) => {
      if (v == null) return false;
      if (v.vector != null && typeof v.vector != "number") return false;
      if (v.raster != null && typeof v.raster != "number") return false;
      return true;
    }
  );

  // Overlay style
  const overlayStyles = useMemo(() => {
    return buildOverlayStyles({
      mapSlug: slug,
      layers: _featureTypes,
      layerOpacity,
      showOmittedRows,
      showColors,
      selectedFeatures,
    });
  }, [
    map.properties.source_id,
    style,
    layerOpacity,
    _featureTypes,
    showOmittedRows,
    showColors,
    selectedFeatures,
  ]);

  if (bounds == null || bounds == "invalid") {
    let title = "No map data";
    let description = "This map has no geometry";
    if (bounds == "invalid") {
      title = "Invalid map bounds for geographic data";
      description =
        "The map likely has not been georeferenced or converted to a geographic projection";
    }
    return h("div.map-interface.no-map", [
      h(NonIdealState, {
        icon: "map",
        title,
        description,
      }),
    ]);
  }

  const contextPanel = h("div.map-controls-container", [
    h(FeatureTypeSwitches, { featureTypes: _featureTypes, setFeatureTypes }),
    h("div.vector-controls", [
      h("h3", "Display options"),
      h(Switch, {
        label: "Show omitted rows",
        checked: showOmittedRows,
        onChange(e) {
          setShowOmittedRows(e.target.checked);
        },
      }),
      h(Switch, {
        label: "Show colors",
        checked: showColors,
        onChange(e) {
          setShowColors(e.target.checked);
        },
      }),
      h("h3", "Macrostrat"),
      h(OpacitySlider, {
        opacity: layerOpacity.vector,
        setOpacity(v) {
          setLayerOpacity({ ...layerOpacity, vector: v });
        },
      }),
    ]),
    h.if(hasRaster)("div.raster-controls", [
      h("h3", "Raster map"),
      h(OpacitySlider, {
        opacity: layerOpacity.raster,
        setOpacity(v) {
          setLayerOpacity({ ...layerOpacity, raster: v });
        },
      }),
    ]),
    h(BaseLayerSelector, { layer, setLayer }),
  ]);

  const settingsPopoverButton = h(
    "div.map-controls",
    h(
      PopoverNext,
      {
        content: contextPanel,
        placement: "bottom-start",
        boundary: containerRef.current,
      },
      h(Button, {
        icon: "cog",
      })
    )
  );

  return h("div.map-container", { className, ref: containerRef }, [
    h(MapboxMapProvider, [
      settingsPopoverButton,
      h(MapView, {
        style,
        mapboxToken: SETTINGS.mapboxAccessToken,
        overlayStyles,
        bounds,
        mapPosition: null,
        fitBoundsOptions: { padding: 50 },
      }),
      h(FeatureSelectionHandler, {
        selectedLocation: inspectPosition,
        setFeatures: onClickFeatures,
      }),
      h(MapMarker, {
        position: inspectPosition,
        setPosition: setInspectPosition,
      }),
    ]),
  ]);
}

function FeatureTypeSwitches({ featureTypes, setFeatureTypes }) {
  return h("div.feature-type-switches", [
    h("h3", "Map layers"),
    ["points", "lines", "polygons", "rgeom"].map((t) => {
      return h(Switch, {
        label: t.charAt(0).toUpperCase() + t.slice(1),
        checked: featureTypes.includes(t),
        onChange() {
          setFeatureTypes((types) => {
            if (types.includes(t)) {
              return types.filter((t2) => t2 != t);
            }
            return [...types, t];
          });
        },
      });
    }),
  ]);
}

function BaseLayerSelector({ layer, setLayer }) {
  return h("div.base-layer-selector", [
    h("h3", "Base layer"),
    h(
      RadioGroup,
      {
        selectedValue: layer,
        onChange(e) {
          setLayer(e.currentTarget.value);
        },
      },
      [
        h(Radio, { label: "Satellite", value: Basemap.Satellite }),
        h(Radio, { label: "Basic", value: Basemap.Basic }),
        h(Radio, { label: "None", value: Basemap.None }),
      ]
    ),
  ]);
}

function OpacitySlider(props) {
  return h("div.opacity-slider", [
    h(NullableSlider, {
      value: props.opacity,
      min: 0.1,
      max: 1,
      labelStepSize: 0.2,
      stepSize: 0.1,
      onChange(v) {
        props.setOpacity(v);
      },
    }),
  ]);
}

// TODO: make user tunable??
const _defaultColor = "rgb(74, 242, 161)";

function buildOverlayStyles({
  mapSlug,
  layers = ["points", "lines", "polygons", "rgeom"],
  layerOpacity,
  showOmittedRows,
  showColors,
  selectedFeatures,
}: StyleOpts): any {
  // let baseStyle = style ?? emptyStyle;
  const styles: StyleFragment[] = [];
  if (layerOpacity.vector != null) {
    const macrostratStyle = buildMacrostratStyle({
      tileserverDomain: SETTINGS.burwellTileDomain,
      fillOpacity: layerOpacity.vector - 0.1,
      strokeOpacity: layerOpacity.vector + 0.2,
      lineOpacity: layerOpacity.vector + 0.4,
    });
    styles.push(macrostratStyle);
  }
  //
  const notOmitted = ["!=", "omit", true];

  let mainColor = "#000000";
  let omitColor = "#ffffff";

  // This filtering strategy doesn't quite work because lines, points, and polygons
  // have overlapping source layers sometimes

  let tableStyle = buildBasicStyle({
    inDarkMode: false,
    sourceID: mapSlug,
    featureTypes: layers,
    color: showColors ? mainColor : _defaultColor,
    tileURL: tileserverDomain + `/ingestion/${mapSlug}/tilejson.json`,
    filter: buildFilters(notOmitted),
  });

  if (showColors) {
    for (let layer of tableStyle.layers) {
      if (layer["source-layer"] == "polygons") {
        layer.filter = buildFilters(layer.filter, ["!has", "color"]);
      }
    }

    if (layers.includes("polygons")) {
      tableStyle.layers = [
        {
          ...baseElements(
            mapSlug,
            "polygons",
            "color",
            buildFilters(["has", "color"], notOmitted)
          ),
          type: "fill",
          paint: {
            "fill-color": ["get", "color"],
            "fill-opacity": 0.5,
          },
        },
        ...tableStyle.layers,
      ];
    }
  }

  styles.push(tableStyle);

  if (showOmittedRows) {
    const omittedTableStyle = buildBasicStyle({
      inDarkMode: false,
      sourceID: mapSlug,
      featureTypes: layers,
      tileURL: tileserverDomain + `/ingestion/${mapSlug}/tilejson.json`,
      suffix: "omitted",
      filter: buildFilters(["==", "omit", true]),
      color: omitColor,
    });
    styles.push(omittedTableStyle);
  }

  if (layers.includes("rgeom")) {
    const rgeomStyle = boundingGeometryMapStyle(false, mapSlug);
    styles.push(rgeomStyle);
  }

  if (selectedFeatures != null && selectedFeatures.length > 0) {
    const selectedStyle = buildBasicStyle({
      inDarkMode: false,
      sourceID: mapSlug,
      featureTypes: layers,
      color: "red",
      tileURL: tileserverDomain + `/ingestion/${mapSlug}/tilejson.json`,
      suffix: "selected",
      adjustForDarkMode: false,
      fillOpacity: 0.3,
    });
    for (let layer of selectedStyle.layers) {
      const type = layer["source-layer"];
      const isSelected = buildSelectionFilters(selectedFeatures, type);
      layer.filter = buildFilters(layer.filter, isSelected);
    }

    styles.push(selectedStyle);
  }

  return styles;
}

function buildSelectionFilters(selectedFeatures, type = "polygons") {
  if (selectedFeatures == null || selectedFeatures.length == 0) {
    return null;
  }

  const keys = selectedFeatures
    .filter((f) => f.layer["source-layer"] == type)
    .map(getProp("_pkid"));
  return ["in", "_pkid", ...keys];
}

function getProp(key) {
  return (f) => f._vectorTileFeature.properties[key];
}

function buildFilters(...filters) {
  const _filters = filters.filter((f) => f != null);
  if (_filters.length == 0) return null;
  if (_filters.length == 1) return _filters[0];
  return ["all", ..._filters];
}

function anyFilters(...filters) {
  const _filters = filters.filter((f) => f != null);
  if (_filters.length == 0) return null;
  if (_filters.length == 1) return _filters[0];
  return ["any", ..._filters];
}
