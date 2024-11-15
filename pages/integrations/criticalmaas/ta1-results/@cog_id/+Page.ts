import { Spinner } from "@blueprintjs/core";
import { useData } from "vike-react/useData";

import { cdrPrefix, SETTINGS } from "@macrostrat-web/settings";
import {
  DetailPanelStyle,
  FeaturePanel,
  FeatureSelectionHandler,
  LocationPanel,
  MapAreaContainer,
  MapMarker,
  MapView,
  PanelCard,
  TileInfo,
} from "@macrostrat/map-interface";
import { getMapboxStyle, mergeStyles } from "@macrostrat/mapbox-utils";
import { useDarkMode } from "@macrostrat/ui-components";
import { useEffect, useMemo, useState } from "react";
import { MapNavbar } from "~/components/map-navbar";
import h from "@macrostrat/hyper";
import {
  BaseLayerSelector,
  Basemap,
  basemapStyle,
  OpacitySlider,
} from "~/components";
import { buildRasterStyle } from "../utils";

interface StyleOpts {
  style: string;
  focusedMap: number;
  layerOpacity: {
    vector: number | null;
    raster: number | null;
  };
  rasterURL?: string;
  tileURL: string;
}

const emptyStyle: any = {
  version: 8,
  sprite: "mapbox://sprites/mapbox/bright-v9",
  glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
  sources: {},
  layers: [],
};

function buildOverlayStyle({ style, layerOpacity, rasterURL }: StyleOpts): any {
  if (style == null) return emptyStyle;

  const rasterStyle = buildRasterStyle(rasterURL, {
    opacity: layerOpacity.raster,
  });

  return mergeStyles(style, rasterStyle);
}

export default function MapInterface() {
  // Get base URL for tiles (special case since we're using a proxy server)
  const origin = window.location.origin;
  const baseURL = origin;

  const data = useData();
  const [features, setFeatures] = useState(null);
  const { cog_id, rasterURL } = data;

  const [isOpen, setOpen] = useState(false);
  const dark = useDarkMode()?.isEnabled ?? false;
  const title = `${cog_id.substring(0, 10)}`;
  const hasRaster = rasterURL != null;

  const bounds = null;

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
        layerOpacity,
        rasterURL,
      })
    );
  }, [null, style, layerOpacity.raster == null, layerOpacity.vector == null]);

  if (mapStyle == null) return h(Spinner);

  const contextPanel = h(PanelCard, [
    h("div.map-meta", []),
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

  let detailElement = null;
  if (selectedLocation != null) {
    detailElement = h(
      LocationPanel,
      {
        onClose() {
          setSelectedLocation(null);
        },
        position: selectedLocation,
      },
      [
        h(TileInfo, {
          feature: features?.[0] ?? null,
        }),
        h(FeaturePanel, { features: features }),
      ]
    );
  }

  return h(
    MapAreaContainer,
    {
      className: "single-map",
      navbar: h(MapNavbar, {
        title,
        isOpen,
        setOpen,
      }),
      contextPanel,
      contextPanelOpen: isOpen,
      contextStackProps: {
        adaptiveWidth: true,
      },
      detailPanel: detailElement,
      detailPanelStyle: DetailPanelStyle.FLOATING,
    },
    [
      h(
        MapView,
        {
          style: mapStyle,
          mapboxToken: SETTINGS.mapboxAccessToken,
          bounds,
          mapPosition: null,
          fitBoundsOptions: { padding: 50 },
          infoMarkerPosition: selectedLocation,
        },
        [
          h(FeatureSelectionHandler, {
            selectedLocation: selectedLocation,
            setFeatures: setFeatures,
          }),
          h(MapMarker, {
            position: selectedLocation,
            setPosition(lnglat) {
              setSelectedLocation(lnglat);
            },
          }),
        ]
      ),
    ]
  );
}
