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
import { buildMacrostratStyle } from "@macrostrat/mapbox-styles";
import { getMapboxStyle, mergeStyles } from "@macrostrat/mapbox-utils";
import { useDarkMode } from "@macrostrat/ui-components";
import boundingBox from "@turf/bbox";
import { LngLatBoundsLike } from "mapbox-gl";
import { useEffect, useMemo, useState } from "react";
import { MapNavbar } from "~/components/map-navbar";
import h from "./main.module.sass";
import {
  BaseLayerSelector,
  Basemap,
  basemapStyle,
  ensureBoxInGeographicRange,
  OpacitySlider,
} from "~/components";
import { buildRasterStyle } from "~/_utils/map-layers.client";

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

function buildOverlayStyle({
  style,
  focusedMap,
  layerOpacity,
  rasterURL = null,
  tileURL,
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
    mapStyle.sources.burwell.tiles = [tileURL];
  }

  if (rasterURL != null && layerOpacity.raster != null) {
    const rasterStyle = buildRasterStyle(rasterURL, {
      opacity: layerOpacity.raster,
    });

    mapStyle = mergeStyles(rasterStyle, mapStyle);
  }

  if (style == null) {
    return mapStyle;
  }

  return mergeStyles(style, mapStyle);
}

export default function MapInterface() {
  // Get base URL for tiles (special case since we're using a proxy server)
  const origin = window.location.origin;
  const baseURL = origin;

  const data = useData();
  const [features, setFeatures] = useState(null);
  const { cog_id, system, system_version, envelope, rasterURL } = data;
  console.log(data);

  const [isOpen, setOpen] = useState(false);
  const dark = useDarkMode()?.isEnabled ?? false;
  const title = `${cog_id.substring(0, 10)} ${system} ${system_version}`;
  const hasRaster = rasterURL != null;

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

  const tileURL = `${cdrPrefix}/tiles/polygon/cog/${cog_id}/system/${encodeURIComponent(
    system
  )}/system_version/${encodeURIComponent(system_version)}/tile/{z}/{x}/{y}`;

  // Overlay style
  const [mapStyle, setMapStyle] = useState(null);
  useEffect(() => {
    setMapStyle(
      buildOverlayStyle({
        style,
        layerOpacity,
        tileURL,
        rasterURL,
      })
    );
  }, [null, style, layerOpacity.raster == null, layerOpacity.vector == null]);

  // Layer opacity
  useEffect(() => {
    if (mapStyle == null) return;
    const mergeLayers = buildOverlayStyle({
      style,
      layerOpacity,
      tileURL,
      rasterURL,
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
        parentRoute: "../..",
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
          maxBounds,
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
