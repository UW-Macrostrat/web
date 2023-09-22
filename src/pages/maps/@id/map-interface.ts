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
import buffer from "@turf/buffer";
import { LngLatBoundsLike } from "mapbox-gl";

const h = hyper.styled(styles);

export default function MapInterface({ map }) {
  const [isOpen, setOpen] = useState(false);
  const title = h([
    h("code", map.properties.source_id),
    " ",
    map.properties.name,
  ]);

  const bounds: LngLatBoundsLike = useMemo(() => {
    return boundingBox(map.geometry);
  }, [map.geometry]);

  const maxBounds: LatLngBoundsLike = useMemo(() => {
    const dx = bounds[2] - bounds[0];
    const dy = bounds[3] - bounds[1];
    const buf = 0.1 * Math.max(dx, dy);
    return boundingBox(buffer(map.geometry, buf));
  }, [bounds]);

  if (bounds == null) return h(Spinner);

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
          style: "mapbox://styles/mapbox/satellite-v9",
          mapboxToken: SETTINGS.mapboxAccessToken,
          bounds,
          maxBounds,
          fitBoundsOptions: { padding: 50 },
        }
        //[h(FitBoundsManager, { bounds })]
      ),
    ]
  );
}

function FitBoundsManager({ bounds, padding = 20 }) {
  const mapRef = useMapRef();
  useEffect(() => {
    if (mapRef.current == null) return;
    const map = mapRef.current;
    if (bounds == null) return;
    console.log("Fitting bounds", bounds);
    map.fitBounds(bounds, { padding });
  }, [mapRef.current, bounds]);
  return null;
}
