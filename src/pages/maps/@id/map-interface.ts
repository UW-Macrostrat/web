import hyper from "@macrostrat/hyper";
import {
  MapAreaContainer,
  MapView,
  PanelCard,
} from "@macrostrat/map-interface";
import {
  Spinner,
  Radio,
  RadioGroup,
  NonIdealState,
  Collapse,
} from "@blueprintjs/core";
import { SETTINGS } from "~/map-interface/settings";
import { useMapRef } from "@macrostrat/mapbox-react";
import { useEffect } from "react";
import styles from "./main.module.sass";
import { MapNavbar } from "~/dev/map-layers/utils";
import { useMemo, useState } from "react";
import "~/styles/global.styl";
import boundingBox from "@turf/bbox";
import { LngLatBoundsLike } from "mapbox-gl";
import { buildMacrostratStyle } from "@macrostrat/mapbox-styles";
import { getMapboxStyle, mergeStyles } from "@macrostrat/mapbox-utils";
import { useDarkMode, useAPIResult, JSONView } from "@macrostrat/ui-components";
import { InfoDrawerContainer, ExpansionPanel } from "@macrostrat/map-interface";
import { MapMarker } from "@macrostrat/map-interface";
import { tempImageIndex, s3Address } from "../raster-images";

const h = hyper.styled(styles);

function rasterURL(source_id) {
  const image = tempImageIndex[source_id];
  if (image == null) return null;
  return `${s3Address}/${image}`;
}

async function buildStyle({ style, mapboxToken, focusedMap }) {
  let mapStyle = buildMacrostratStyle({
    tileserverDomain: SETTINGS.burwellTileDomain,
    focusedMap,
    fillOpacity: style == null ? 0.8 : 0.4,
    strokeOpacity: style == null ? 0.8 : 0.2,
  });

  console.log("Map", focusedMap);
  const raster = rasterURL(focusedMap);
  if (raster != null) {
    const rasterStyle = {
      version: 8,
      sprite: "mapbox://sprites/mapbox/bright-v9",
      glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
      sources: {
        raster: {
          type: "raster",
          tiles: ["http://127.0.0.1:8000/tiles/{z}/{x}/{y}.png?url=" + raster],
          tileSize: 256,
        },
      },
      layers: [
        {
          id: "raster",
          type: "raster",
          source: "raster",
          minzoom: 0,
          maxzoom: 22,
        },
      ],
    };

    mapStyle = mergeStyles(rasterStyle, mapStyle);
  }

  if (style == null) {
    return mapStyle;
  }
  const baseStyle = await getMapboxStyle(style, {
    access_token: mapboxToken,
  });

  console.log("Merging styles", baseStyle, mapStyle);
  return mergeStyles(baseStyle, mapStyle);
}

function ensureBoxInGeographicRange(bounds: LngLatBoundsLike) {
  if (bounds[1] < -90) bounds[1] = -90;
  if (bounds[3] > 90) bounds[3] = 90;
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

export default function MapInterface({ map }) {
  const [isOpen, setOpen] = useState(false);
  const dark = useDarkMode()?.isEnabled ?? false;
  const title = h([
    h("code", map.properties.source_id),
    " ",
    map.properties.name,
  ]);

  const bounds: LngLatBoundsLike = useMemo(() => {
    return ensureBoxInGeographicRange(boundingBox(map.geometry));
  }, [map.geometry]);

  const [layer, setLayer] = useState(Basemap.None);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const [mapStyle, setMapStyle] = useState(null);
  useEffect(() => {
    buildStyle({
      style: basemapStyle(layer, dark),
      mapboxToken: SETTINGS.mapboxAccessToken,
      focusedMap: map.properties.source_id,
    }).then((style) => {
      setMapStyle(style);
    });
  }, [map.properties.source_id, layer, dark]);

  const maxBounds: LatLngBoundsLike = useMemo(() => {
    const dx = bounds[2] - bounds[0];
    const dy = bounds[3] - bounds[1];
    const buf = 1 * Math.max(dx, dy);

    return ensureBoxInGeographicRange([
      bounds[0] - buf,
      bounds[1] - buf,
      bounds[2] + buf,
      bounds[3] + buf,
    ]);
  }, [bounds]);

  if (bounds == null || mapStyle == null) return h(Spinner);

  return h(
    MapAreaContainer,
    {
      className: "single-map",
      navbar: h(MapNavbar, { title, parentRoute: "/maps", isOpen, setOpen }),
      contextPanel: h(PanelCard, [h(BaseLayerSelector, { layer, setLayer })]),
      contextPanelOpen: isOpen,
      detailPanel: h(MapLegendPanel, { source_id: map.properties.source_id }),
    },
    [
      h(
        MapView,
        {
          style: mapStyle, //"mapbox://styles/mapbox/satellite-v9",
          mapboxToken: SETTINGS.mapboxAccessToken,
          //projection: { name: "globe" },
          bounds,
          mapPosition: null,
          maxBounds,
          fitBoundsOptions: { padding: 50 },
          infoMarkerPosition: selectedLocation,
        },
        [
          h(MapMarker, {
            position: selectedLocation,
            setPosition(lnglat) {
              setSelectedLocation(lnglat);
            },
          }),
        ]
        //[h(FitBoundsManager, { bounds })]
      ),
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

function MapLegendPanel(params) {
  return h(
    InfoDrawerContainer,
    h(
      "div.map-legend-container",
      h("div.map-legend", [h("h3", "Legend"), h(MapLegendData, params)])
    )
  );
}

function MapLegendData({ source_id }) {
  const mapLegend = useAPIResult(
    SETTINGS.apiDomain + "/api/v2/geologic_units/map/legend",
    { source_id }
  );
  if (mapLegend == null) return h(Spinner);
  const legendData = mapLegend?.success?.data;
  if (legendData == null) return h(NonIdealState, { icon: "error" });

  legendData.sort((a, b) => a.t_age - b.t_age);

  return h(
    "div.legend-data",
    legendData.map((d) => h(LegendEntry, { data: d }))
  );
  return h(JSONView, { data: mapLegend?.success?.data, showRoot: false });
}

function LegendEntry({ data }) {
  const { map_unit_name, color, ...rest } = data;
  const {
    legend_id,
    source_id,
    t_interval,
    b_interval,
    strat_name,
    strat_name_id,
    unit_id,
    area,
    tiny_area,
    small_area,
    medium_area,
    large_area,
    lith,
    // lith_classes,
    // lith_types,
    lith_id,
    scale,
    comments,
    ...r1
  } = rest;

  const [isOpen, setOpen] = useState(false);

  const title = h(
    "div.legend-title",
    {
      onClick() {
        setOpen(!isOpen);
      },
    },
    [
      h("div.legend-swatch", { style: { backgroundColor: color } }),
      h("div.legend-label", h("h4", map_unit_name)),
    ]
  );

  return h("div.legend-entry", [
    title,
    h(Collapse, { isOpen }, h(JSONView, { data: r1, hideRoot: true })),
  ]);
}
