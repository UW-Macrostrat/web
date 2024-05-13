import { Radio, RadioGroup } from "@blueprintjs/core";
import { SETTINGS, tileserverDomain } from "@macrostrat-web/settings";
import hyper from "@macrostrat/hyper";
import {
  MapAreaContainer,
  MapView,
  PanelCard,
} from "@macrostrat/map-interface";
import { NonIdealState } from "@blueprintjs/core";
import { buildMacrostratStyle } from "@macrostrat/mapbox-styles";
import { getMapboxStyle, mergeStyles } from "@macrostrat/mapbox-utils";
import {
  NullableSlider,
  useDarkMode,
  useStoredState,
} from "@macrostrat/ui-components";
import boundingBox from "@turf/bbox";
import { LngLatBoundsLike } from "mapbox-gl";
import { useEffect, useMemo, useState } from "react";
import { MapNavbar } from "~/components/map-navbar";
import "~/styles/global.styl";
import styles from "./main.module.sass";
import chroma from "chroma-js";

const h = hyper.styled(styles);

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

function buildOverlayStyle({
  style,
  mapSlug,
  layers = ["points", "lines", "polygons"],
  layerOpacity,
}: StyleOpts): any {
  let baseStyle = style ?? emptyStyle;
  let mapStyle = emptyStyle;
  if (layerOpacity.vector != null) {
    mapStyle = buildMacrostratStyle({
      tileserverDomain: SETTINGS.burwellTileDomain,
      fillOpacity: layerOpacity.vector - 0.1,
      strokeOpacity: layerOpacity.vector + 0.2,
      lineOpacity: layerOpacity.vector + 0.4,
    });
  }

  let tableStyles = layers.map((layer) => {
    const table = `sources.${mapSlug}_${layer}`;
    return buildStyle({
      inDarkMode: false,
      sourceID: table,
      featureTypes: [layer],
      tileURL: tileserverDomain + `/${table}/tilejson.json`,
    });
  });

  return mergeStyles(mapStyle ?? {}, ...tableStyles);
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

export function MapInterface({ id, map, slug }) {
  const [isOpen, setOpen] = useState(false);

  // Catch empty map data
  // if (map == null || Object.keys(map.geometry).length == 0)
  //   return h(
  //     "div",
  //     { style: { display: "flex", margin: "auto" } },
  //     "No map data"
  //   );

  const dark = useDarkMode()?.isEnabled ?? false;
  const table = `sources.${slug}_polygons`;

  const hasRaster = rasterURL(map.properties.source_id) != null;

  const bounds: LngLatBoundsLike | "invalid" = useMemo(() => {
    return ensureBoxInGeographicRange(boundingBox(map.geometry));
  }, [map.geometry]);

  const [layer, setLayer] = useState(Basemap.None);
  const [style, setStyle] = useState(null);
  // Basemap style
  useEffect(() => {
    if (layer == null) setStyle(null);
    const styleURL = basemapStyle(layer, dark);
    getMapboxStyle(styleURL, {
      access_token: SETTINGS.mapboxAccessToken,
    }).then(setStyle);
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
  const [mapStyle, setMapStyle] = useState(null);
  useEffect(() => {
    setMapStyle(
      buildOverlayStyle({
        style,
        mapSlug: slug,
        layers: ["points", "lines", "polygons"],
        //focusedMap: map.properties.source_id,
        layerOpacity,
      })
    );
  }, [
    map.properties.source_id,
    style,
    layerOpacity.raster == null,
    layerOpacity.vector == null,
  ]);

  // Layer opacity
  useEffect(() => {
    if (mapStyle == null) return;
    const mergeLayers = buildOverlayStyle({
      style,
      layers: ["points", "lines", "polygons"],
      mapSlug: slug,
      layerOpacity,
    }).layers;

    for (const layer of mapStyle.layers) {
      let mergeLayer = mergeLayers.find((l) => l.id == layer.id);
      layer.layout ??= {};
      layer.paint ??= {};
      if (mergeLayer == null) {
        layer.layout.visibility = "none";
        continue;
      } else {
        layer.layout.visibility = "visible";
      }
      for (const prop in ["fill-opacity", "line-opacity", "raster-opacity"]) {
        if (mergeLayer.paint[prop] != null) {
          layer.paint[prop] = mergeLayer.paint[prop];
        }
      }
      setMapStyle({ ...mapStyle, layers: mergeLayers });
    }
  }, [layerOpacity]);

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

  const contextPanel = h(PanelCard, [
    h("div.vector-controls", [
      h("h3", "Vector map"),
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

  return h(
    MapAreaContainer,
    {
      className: "single-map",
      navbar: h(MapNavbar, { isOpen, setOpen, minimal: true }),
      contextPanel,
      contextPanelOpen: isOpen,
      detailPanelOpen: false,
      fitViewport: false,
    },
    [
      h(MapView, {
        style: mapStyle, ///"mapbox://styles/mapbox/satellite-v9",
        mapboxToken: SETTINGS.mapboxAccessToken,
        bounds,
        mapPosition: null,
        fitBoundsOptions: { padding: 50 },
      }),
    ]
  );
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

export function buildStyle({
  color = "rgb(74, 242, 161)",
  inDarkMode,
  sourceLayers,
  sourceID = "tileLayer",
  featureTypes = ["points", "lines", "polygons"],
  tileURL,
}): mapboxgl.Style {
  const xRayColor = (opacity = 1, darken = 0) => {
    if (!inDarkMode) {
      return chroma(color)
        .darken(2 - darken)
        .alpha(opacity)
        .css();
    }
    return chroma(color).alpha(opacity).darken(darken).css();
  };

  let layers = [];
  if (featureTypes.includes("points")) {
    layers.push({
      id: sourceID + "_points",
      type: "circle",
      source: sourceID,
      "source-layer": sourceLayers?.points ?? "default",
      paint: {
        "circle-color": xRayColor(1, 1),
        "circle-radius": 5,
      },
    });
  }

  if (featureTypes.includes("lines")) {
    layers.push({
      id: sourceID + "_lines",
      type: "line",
      source: sourceID,
      "source-layer": sourceLayers?.lines ?? "default",
      paint: {
        "line-color": xRayColor(1, -1),
        "line-width": 1.5,
      },
    });
  }

  if (featureTypes.includes("polygons")) {
    layers.push({
      id: sourceID + "_polygons",
      type: "fill",
      source: sourceID,
      "source-layer": sourceLayers?.polygons ?? "default",
      paint: {
        "fill-color": xRayColor(0.1),
        "fill-outline-color": xRayColor(0.5),
      },
    });
  }

  return {
    version: 8,
    name: "basic",
    sources: {
      [sourceID]: {
        type: "vector",
        url: tileURL,
      },
    },
    layers,
  };
}
