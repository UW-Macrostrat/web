import hyper from "@macrostrat/hyper";
import {
  MapAreaContainer,
  MapView,
  PanelCard,
} from "@macrostrat/map-interface";
import { Spinner, Radio, RadioGroup } from "@blueprintjs/core";
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
import { useDarkMode } from "@macrostrat/ui-components";

const h = hyper.styled(styles);

async function buildStyle({ style, mapboxToken, focusedMap }) {
  const mapStyle = buildMacrostratStyle({
    tileserverDomain: SETTINGS.burwellTileDomain,
    focusedMap,
    fillOpacity: style == null ? 0.8 : 0.4,
    strokeOpacity: style == null ? 0.8 : 0.2,
  });
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
    const buf = 0.5 * Math.max(dx, dy);

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
        }
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
