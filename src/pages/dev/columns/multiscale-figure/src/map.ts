import { useRef } from "react";
import h from "@macrostrat/hyper";
import { Globe, LandLayer } from "@macrostrat/map-components";
import { geoCentroid } from "d3-geo";
import { MeasurementsLayer, Columns } from "@macrostrat/column-views";
import { useAPIResult } from "@macrostrat/ui-components";
import useSize from "@react-hook/size";
import { FeatureLayer } from "@macrostrat/map-components";
import chroma from "chroma-js";
const useColumnData = (params) => {
  const colParams = { ...params, format: "geojson" };
  return useAPIResult("/columns", colParams)?.features[0];
};

const CurrentColumn = (props) => {
  const { params, style = {} } = props;
  const feature = useColumnData(params);
  if (feature == null) return null;
  return h(FeatureLayer, {
    features: [feature],
    style: {
      fill: "rgba(255,0,0,0.4)",
      stroke: "rgba(255,0,0,0.6)",
      strokeWidth: 2,
      ...style,
    },
  });
};

const ColumnMap = (props) => {
  const { children, style, col_id, currentColumn, ...rest } = props;

  const ref = useRef(null);
  const [width, height] = useSize(ref);

  const { margin } = props;

  let scale = width;

  const c1 = chroma("#aaa");
  const c3 = chroma("#6279a3");
  const c2 = chroma("#d8177f");

  return h("div.map-area", { ref, style }, [
    h(
      Globe,
      {
        width,
        height,
        margin,
        scale: 700,
        center: [-132, 64.2],
        allowDrag: true,
        allowZoom: true,
        keepNorthUp: true,
        //translate: [width / 2 - scale, height - scale],
        //rotation: [-columnCenter[0], -columnCenter[1]],
      },
      [
        h(LandLayer),
        children,
        h(Columns, {
          col_id: 2163,
          project_id: 10,
          status_code: "in process",
          color: c2,
        }),
        h(
          Columns,
          {
            col_id: 1666,
            color: c1,
          },
          [
            h(MeasurementsLayer, {
              project_id: 10,
              status_code: "in process",
              style: {
                fill: "#d773a2",
                stroke: "transparent",
              },
            }),
          ]
        ),
        h(CurrentColumn, {
          params: { col_id: 1666 },
          style: { fill: c1.alpha(0.4).css(), stroke: c1.alpha(0.6).css() },
        }),
        h(CurrentColumn, {
          params: {
            col_id: 2163,
            project_id: 10,
            status_code: "in process",
          },
          style: { fill: c2.alpha(0.4).css(), stroke: c2.alpha(0.6).css() },
        }),
        h("circle", { cx: width / 2, cy: height / 2, r: 5, fill: c3 }),
      ]
    ),
  ]);
};

export { ColumnMap };
