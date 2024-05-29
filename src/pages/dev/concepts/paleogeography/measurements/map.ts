import { geoStereographic } from "d3-geo";
import { useRef } from "react";
import { PlateFeatureLayer, PlatePolygons } from "@macrostrat/corelle";
import { hyperStyled } from "@macrostrat/hyper";
import {
  PBDBCollectionLayer,
  SGPSamplesLayer,
  MacrostratMeasurementsLayer
} from "./point-overlay";
import { Globe } from "@macrostrat/map-components";
import styles from "./main.module.styl";
import chroma from "chroma-js";

const h = hyperStyled(styles);

const baseProjection = geoStereographic().precision(0.5);

const Map = props => {
  /** Map that implements callback to reset internal map state */
  const { width, height } = props;
  const projection = baseProjection;
  const mapRef = useRef<Globe>();

  const resetMap = () => {
    // We have to totally recreate the projection for it to be immutable
    mapRef.current?.resetProjection(baseProjection);
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
        scale: Math.min(width / 1.5, height / 1.5) - 10
      },
      [
        h(PlatePolygons),
        h(PlateFeatureLayer, {
          name: "ne_110m_land",
          useCanvas: false,
          style: {
            fill: "#ffffff",
            stroke: "#9dc99f"
          }
        }),
        h(PlateFeatureLayer, {
          name: "macrostrat_columns",
          style: {
            fill: "transparent",
            stroke: chroma("dodgerblue")
              .darken(1.5)
              .alpha(0.5)
              .css()
          }
        }),
        h(PBDBCollectionLayer),
        h(MacrostratMeasurementsLayer),
        h(SGPSamplesLayer)
      ]
    ),
    h("a.reset-map", { onClick: resetMap }, "Reset projection")
  ]);
};

export { Map };
