import {
  Collapse,
  NonIdealState,
  Radio,
  RadioGroup,
  Spinner,
  Tag,
} from "@blueprintjs/core";
import { SETTINGS, apiV2Prefix } from "@macrostrat-web/settings";
import hyper from "@macrostrat/hyper";
import {
  DetailPanelStyle,
  InfoDrawerContainer,
  MapAreaContainer,
  MapMarker,
  MapView,
  PanelCard,
} from "@macrostrat/map-interface";
import { buildMacrostratStyle } from "@macrostrat/mapbox-styles";
import { getMapboxStyle, mergeStyles } from "@macrostrat/mapbox-utils";
import {
  JSONView,
  NullableSlider,
  useAPIResult,
  useDarkMode,
  ErrorBoundary,
} from "@macrostrat/ui-components";
import boundingBox from "@turf/bbox";
import { LngLatBoundsLike } from "mapbox-gl";
import { useEffect, useMemo, useState } from "react";
import { MapNavbar } from "~/components/map-navbar";
import "~/styles/global.styl";
import { MapReference, DevLink } from "~/components";
import styles from "./main.module.sass";
import { PageBreadcrumbs } from "~/renderer";
import { urlencoded } from "express";

const h = hyper.styled(styles);

interface StyleOpts {
  style: string;
  focusedMap: number;
  layerOpacity: {
    vector: number | null;
    raster: number | null;
  };
  rasterURL?: string;
  tileURL: string
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
                             focusedMap,
                             layerOpacity,
                             rasterURL = null,
                             tileURL
                           }: StyleOpts): any {
  let mapStyle = emptyStyle;
  if (layerOpacity.vector != null) {
    mapStyle = buildMacrostratStyle({
      tileserverDomain: "http://localhost:8000",
      focusedMap,
      fillOpacity: layerOpacity.vector - 0.1,
      strokeOpacity: layerOpacity.vector + 0.2,
      lineOpacity: layerOpacity.vector + 0.4,
    });
    mapStyle.sources.burwell.tiles = [tileURL]
  }

  if (rasterURL != null && layerOpacity.raster != null) {
    const rasterStyle = {
      ...emptyStyle,
      sources: {
        raster: {
          type: "raster",
          tiles: [
            SETTINGS.burwellTileDomain +
            "/cog/tiles/{z}/{x}/{y}.png?url=" +
            rasterURL,
          ],
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
          layout: {
            visibility: "visible",
          },
          paint: {
            "raster-opacity": layerOpacity.raster,
          },
        },
      ],
    };

    mapStyle = mergeStyles(rasterStyle, mapStyle);
  }

  if (style == null) {
    return mapStyle;
  }

  return mergeStyles(style, mapStyle);
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

export default function MapInterface(cog_id, model_id, envelope) {

  const map = {
    type: 'Feature',
    properties: {
      source_id: 2096,
      slug: 'criticalmaas_09_ngmdb_10243_v2',
      name: 'Bedrock geologic map of the Roseau 1 degree x 2 degrees quadrangle, Minnesota, United States, and Ontario and Manitoba, Canada',
      url: 'https://ngmdb.usgs.gov/Prodesc/proddesc_10243.htm',
      ref_title: 'Bedrock geologic map of the Roseau 1 degree x 2 degrees quadrangle, Minnesota, United States, and Ontario and Manitoba, Canada',
      authors: 'Day, W.C., Klein, T.L., and Schulz, K.J.',
      ref_year: '1994',
      ref_source: 'U.S. Geological Survey',
      isbn_doi: null,
      licence: null,
      scale: 'large',
      features: 4514,
      area: 5662,
      display_scales: [ 'large' ],
      priority: false,
      status_code: 'active',
      raster_url: null,
      is_mapped: true,
      description: "teste"
    }
  }

  const [isOpen, setOpen] = useState(false);
  const dark = useDarkMode()?.isEnabled ?? false;
  const title = map.properties.name;

  const hasRaster = map.properties.raster_url != null;

  const bounds: LngLatBoundsLike = useMemo(() => {
    return ensureBoxInGeographicRange(boundingBox(envelope));
  }, [envelope]);

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

  const [selectedLocation, setSelectedLocation] = useState(null);

  const [layerOpacity, setLayerOpacity] = useState({
    vector: 0.5,
    raster: 0.5,
  });

  // Overlay style
  const [mapStyle, setMapStyle] = useState(null);
  useEffect(() => {
    setMapStyle(
      buildOverlayStyle({
        style,
        focusedMap: null,
        layerOpacity,
        rasterURL: null,
        tileURL: `http://localhost:8333/tiles/cog/${cog_id}/model/${encodeURIComponent(model_id)}/tile/{z}/{x}/{y}`
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
      focusedMap: map.properties.source_id,
      layerOpacity,
      rasterURL: map.properties.raster_url,
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

  const contextPanel = h(PanelCard, [
    h("div.map-meta", [
      h("p", map.properties.description),
      h("p", ["Map ID: ", h("code", map.properties.source_id)]),
    ]),
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

  console.log(mapStyle, bounds, maxBounds)

  return h(
    MapAreaContainer,
    {
      className: "single-map",
      navbar: h(MapNavbar, { title, parentRoute: "/maps", isOpen, setOpen }),
      contextPanel,
      contextPanelOpen: isOpen,
      contextStackProps: {
        adaptiveWidth: true,
      },
      detailPanelStyle: DetailPanelStyle.FIXED,
      detailPanel: h(MapLegendPanel, map.properties),
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
      h("div.map-legend", [
        h(PageBreadcrumbs),
        h("div.legend-header", [
          h(ErrorBoundary, [
            h(MapReference, { reference: params, showSourceID: false }),
          ]),
        ])
      ])
    )
  );
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