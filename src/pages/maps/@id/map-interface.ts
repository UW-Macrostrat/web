import hyper from "@macrostrat/hyper";
import {
  MapAreaContainer,
  MapView,
  PanelCard,
} from "@macrostrat/map-interface";
import { Spinner } from "@blueprintjs/core";
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

const h = hyper.styled(styles);

async function buildStyle({ style, mapboxToken, focusedMap }) {
  const mapStyle = buildMacrostratStyle({
    tileserverDomain: SETTINGS.burwellTileDomain,
    focusedMap,
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

export default function MapInterface({ map }) {
  const [isOpen, setOpen] = useState(false);
  const title = h([
    h("code", map.properties.source_id),
    " ",
    map.properties.name,
  ]);

  const bounds: LngLatBoundsLike = useMemo(() => {
    return ensureBoxInGeographicRange(boundingBox(map.geometry));
  }, [map.geometry]);

  const [mapStyle, setMapStyle] = useState(null);
  useEffect(() => {
    buildStyle({
      style: "mapbox://styles/mapbox/satellite-v9",
      mapboxToken: SETTINGS.mapboxAccessToken,
      focusedMap: map.properties.source_id,
    }).then((style) => {
      setMapStyle(style);
    });
  }, [map.properties.source_id]);

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
      contextPanel: h(PanelCard, []),
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
