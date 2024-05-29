import { geoNaturalEarth1 } from "d3-geo";
import { useRef } from "react";
import { PlateFeatureLayer } from "@macrostrat/corelle";
import { hyperStyled } from "@macrostrat/hyper";
import { PBDBCollectionLayer } from "./point-overlay";
import { Globe } from "@macrostrat/map-components";
import styles from "./main.module.styl";

const h = hyperStyled(styles);

const Map = props => {
  /** Map that implements callback to reset internal map state */
  const { width, height } = props;
  const projection = geoNaturalEarth1().precision(0.5);
  const mapRef = useRef<Globe>();

  const resetMap = () => {
    // We have to totally recreate the projection for it to be immutable
    mapRef.current?.resetProjection(geoNaturalEarth1().precision(0.5));
  };

  return h("div.world-map", null, [
    h(
      Globe,
      {
        ref: mapRef,
        keepNorthUp: true,
        projection,
        width,
        height,
        keepNorthUp: false,
        scale: Math.min(width / 5.5, height / 3) - 10
      },
      [
        h(PlateFeatureLayer, {
          name: "ne_110m_land",
          useCanvas: false,
          style: {
            fill: "#E9FCEA",
            stroke: "#9dc99f"
          }
        }),
        h(PBDBCollectionLayer)
      ]
    ),
    h("a.reset-map", { onClick: resetMap }, "Reset projection")
  ]);
};

export { Map };
