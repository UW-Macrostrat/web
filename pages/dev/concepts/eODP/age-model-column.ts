import { format } from "d3-format";
import h from "@macrostrat/hyper";
import classNames from "classnames";
import { AxisBottom } from "@vx/axis";
import { useMemo } from "react";
import { useColumnNav } from "@macrostrat/column-views";

import {
  CrossAxisLayoutProvider,
  ColumnLayoutContext,
  ColumnContext,
  useColumnDivisions,
  useColumnLayout,
} from "@macrostrat/column-components";
import T from "prop-types";

const fmt = format(".1f");

import { line } from "d3-shape";
import { createContext, useContext } from "react";
import { UnitLong } from "@macrostrat/api-types";
import { useAPIResult } from "@macrostrat/ui-components";

const inDomain = (scale, num) => {
  const domain = scale.domain();
  return domain[0] < num < domain[1];
};

const createPointLocator = function (opts) {
  const { xScale, scale, getHeight, ...rest } = opts;
  return function (d, s = 0) {
    const height = getHeight(d);
    if (!inDomain(scale, height)) return null;
    return [xScale(d.value), scale(height)];
  };
};

const IsotopesDataContext = createContext();

interface DataAreaProps {
  clipY: boolean;
  parameter: string;
}

function useLineLocator({
  xAccessor = (d) => d.x,
  yAccessor = (d) => d.y,
} = {}) {
  const { xScale, scale } = useContext(ColumnLayoutContext) ?? {};
  return useMemo(
    () =>
      line()
        .x((d) => xScale(xAccessor(d)))
        .y((d) => scale(yAccessor(d))),
    [xScale, scale, xAccessor, yAccessor]
  );
}

const IsotopesDataArea = function (props: DataAreaProps) {
  const { xScale, scale } = useContext(ColumnLayoutContext) ?? {};

  let { corrected, system, children, getHeight, clipY } = props;
  if (getHeight == null) {
    getHeight = function (d) {
      if (d.height == null) {
        console.log(d);
      }
      return d.height;
    };
  }

  // Handlers for creating points and lines
  const pointLocator = createPointLocator({
    xScale,
    scale,
    corrected,
    system,
    getHeight,
  });

  let column = "avg_" + system;
  if (corrected) {
    column += "_corr";
  }
  const lineLocator = line()
    .x((d) => xScale(d[column]))
    .y((d) => scale(d.height));

  const value = { pointLocator, lineLocator, corrected, system, clipY };
  return h(
    IsotopesDataContext.Provider,
    { value },
    h("g.data", null, children)
  );
};

IsotopesDataArea.defaultProps = { clipY: false };

const useDataLocator = () => useContext(IsotopesDataContext);

const IsotopeText = function ({ datum, text, ...rest }) {
  const { pointLocator } = useDataLocator();
  const [x, y] = pointLocator(datum);
  return h(
    "text",
    {
      x,
      y,
      ...rest,
    },
    text
  );
};

IsotopeText.propTypes = {
  datum: T.object.isRequired,
};

function ColumnScale(props) {
  const {
    label,
    showAxis = true,
    nTicks = 6,
    tickValues: _tickVals,
    ...rest
  } = props;
  const { xScale, pixelHeight, width } = useContext(ColumnLayoutContext);

  const tickValues = _tickVals ?? xScale.ticks(nTicks);

  return h("g.scale.isotope-scale-axis", [
    h(
      "g.scale-lines",
      tickValues.map((value) => {
        const strokeDasharray = value == 0 ? null : "2 6";
        return h(ScaleLine, { value, stroke: "#ddd", strokeDasharray });
      })
    ),
    h.if(showAxis)([
      h("rect.underlay", {
        x: 0,
        y: pixelHeight,
        width,
        height: 30,
      }),
      h(AxisBottom, {
        scale: xScale,
        tickLength: 3,
        tickValues,
        ...rest,
        top: pixelHeight,
        tickLabelProps(tickValue, i) {
          // Compensate for negative sign
          let dx;
          if (tickValue < 0) {
            dx = -2;
          }
          return {
            dy: "-1px",
            dx,
            fontSize: 10,
            textAnchor: "middle",
            fill: "#aaa",
          };
        },
        labelOffset: 0,
        label,
      }),
    ]),
  ]);
}

const ScaleLine = function (props) {
  let { value, className, labelBottom, labelOffset, ...rest } = props;
  if (labelBottom == null) {
    labelBottom = false;
  }
  if (labelOffset == null) {
    labelOffset = 12;
  }
  const { xScale, pixelHeight } = useContext(ColumnLayoutContext);
  const x = xScale(value);
  const transform = `translate(${x})`;
  className = classNames(className, { zero: value === 0 });
  return h("g.tick", { transform, className, key: value }, [
    h("line", { x0: 0, x1: 0, y0: 0, y1: pixelHeight, ...rest }),
    h.if(labelBottom)("text", { y: pixelHeight + labelOffset }, `${value}`),
  ]);
};

ScaleLine.propTypes = {
  value: T.number.isRequired,
  labelBottom: T.bool,
};

interface IsotopesDatasetProps {
  color: string;
  parameter: string;
}

interface IsotopeColumnProps extends IsotopesDatasetProps {
  width: number;
  tickValues?: number[];
  label: string;
  domain: [number, number];
  transform?: string;
}

function ReconstructedColumnAgeDataset(rest) {
  const divisions: UnitLong[] = useColumnDivisions();
  const lineLocator = useLineLocator();
  const xy = [];
  for (const d of divisions) {
    xy.push({ x: d.t_age, y: d.t_pos });
    xy.push({ x: d.b_age, y: d.b_pos });
  }
  const d = lineLocator(xy);

  return h("path.age-dataset", {
    d,
    fill: "transparent",
    ...rest,
  });
}

function useColumnAgeModel() {
  const [currentColumn, _] = useColumnNav();
  return useAPIResult("/age_model", currentColumn);
}

function AgeModelDataset({ data, showPoints = true, ...props }) {
  const columnAgeData: any[] = data ?? useColumnAgeModel();

  const lineLocator = useLineLocator();

  if (columnAgeData == null) return null;
  const xy = columnAgeData.map((d) => {
    return { x: d.model_age, y: d.boundary_position };
  });
  const d = lineLocator(xy);

  return h("g.age-dataset", [
    h("path.age-dataset", {
      d,
      fill: "transparent",
      ...props,
    }),
    h.if(showPoints)(AgeModelPoints, {
      positions: xy,
      fill: props.stroke,
      r: props.strokeWidth * 1,
    }),
  ]);
}

function AgeModelPoints({ positions, ...rest }) {
  const { xScale, scale } = useColumnLayout();
  return h(
    "g.age-model-points",
    positions.map((d, i) => {
      return h("circle", {
        key: i,
        cx: xScale(d.x),
        cy: scale(d.y),
        ...rest,
      });
    })
  );
}

function AgeModelColumn(
  props: IsotopeColumnProps & { children?: React.ReactNode }
) {
  const {
    width = 120,
    parameter,
    label,
    color = "dodgerblue",
    children,
    transform,
    getHeight,
    domain: baseDomain,
    ...rest
  } = props;

  const divisions: UnitLong[] = useColumnDivisions();
  const domain = baseDomain ?? [
    divisions[divisions.length - 1].b_age,
    divisions[0].t_age,
  ];

  return h(
    CrossAxisLayoutProvider,
    { width, domain },
    h("g.isotopes-column", { className: parameter, transform }, [
      h(ColumnScale, { showAxis: false, label: label ?? parameter, ...rest }),
      children,
    ])
  );
}

export {
  AgeModelColumn,
  AgeModelDataset,
  ReconstructedColumnAgeDataset,
  useColumnAgeModel,
};
