import hyper from "@macrostrat/hyper";
import { MapAreaContainer, MapView } from "@macrostrat/map-interface";
import { SETTINGS } from "~/map-interface/settings";
import styles from "./main.module.sass";
import { MapNavbar } from "~/dev/map-layers/utils";
import "../../../styles/global.styl";

const h = hyper.styled(styles);

export default function MapInterface({ map }) {
  const title = h([
    h("code", map.properties.source_id),
    " ",
    map.properties.name,
  ]);
  return h(
    MapAreaContainer,
    {
      className: "single-map",
      navbar: h(MapNavbar, { title, parentRoute: "/maps" }),
    },
    [
      h(MapView, {
        style: "mapbox://styles/mapbox/satellite-v9",
        mapboxToken: SETTINGS.mapboxAccessToken,
        //bounds: map.geometry,
      }),
    ]
  );
}
