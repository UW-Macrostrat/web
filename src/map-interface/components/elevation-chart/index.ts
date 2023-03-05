import React, { useRef, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { useAppActions } from "~/map-interface/app-state";
import hyper from "@macrostrat/hyper";
import { Button, Spinner } from "@blueprintjs/core";
import { select, mouse } from "d3-selection";
import { scaleLinear } from "d3-scale";
import { axisBottom, axisLeft } from "d3-axis";
import { line, area } from "d3-shape";
import { min, max, extent, bisector } from "d3-array";
import { useAPIResult } from "@macrostrat/ui-components";

import styles from "./main.module.styl";
const h = hyper.styled(styles);

function drawElevationChart(
  chartRef: React.RefObject<any>,
  props: { updateElevationMarker: Function; elevationData: any[] }
) {
  // Alias these variables because d3 returns ` in mouseover
  const {
    width,
    height,
    x,
    y,
    elevationData: data,
    updateElevationMarker,
  } = props;

  let bisect = bisector((d) => {
    return d.d;
  }).left;

  let yAxis = axisLeft()
    .scale(y)
    .ticks(5)
    .tickSizeInner(-width)
    .tickSizeOuter(0)
    .tickPadding(10);

  const chart = chartRef.current;
  if (chart == null) return;

  const scaleRightPadding = 30;
  const xScaleWithRightPadding = x
    .copy()
    .domain([0, x.invert(width - scaleRightPadding)])
    .range([0, width - scaleRightPadding]);

  let xAxis = axisBottom().scale(xScaleWithRightPadding);

  chart
    .append("g")
    .attr("class", "x axis")
    .attr("transform", `translate(0, ${height})`)
    .call(xAxis)
    .append("text")
    .attr("transform", `translate(${width}, 16)`)
    .attr("class", styles["elevation-x-axis-unit"])
    .style("text-anchor", "end")
    .text("km");

  chart
    .append("g")
    .attr("class", "y axis")
    .call(yAxis)
    .append("text")
    .attr("transform", `translate(-50,${height / 2})rotate(-90)`)
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Elevation (m)");

  let focus = chart.append("g").attr("class", "focus").style("display", "none");

  focus
    .append("circle")
    .attr("class", styles["elevation-focus-circle"])
    .attr("fill", "rgba(75,192,192,1)")
    .attr("fill-opacity", 1)
    .attr("stroke-width", 2)
    .attr("r", 7);

  focus
    .append("text")
    .attr("x", 0)
    .attr("class", styles["elevation-focus-text"])
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .attr("dy", "-1.2em");

  chart
    .append("rect")
    .attr("class", "overlay")
    .attr("width", width)
    .attr("height", height)
    .on("mouseover", () => {
      focus.style("display", null);
    })
    .on("mouseout", () => {
      focus.style("display", "none");
      updateElevationMarker(null, null);
    })
    .on("mousemove", function (e) {
      let x0 = x.invert(mouse(this)[0]);
      let i = bisect(data, x0, 1);
      let d0 = data[i - 1];
      let d1 = data[i];
      let d = x0 - d0.d > d1.d - x0 ? d1 : d0;
      focus.attr("transform", `translate(${x(d.d)},${y(d.elevation)})`);
      focus
        .select("text")
        .text(
          `${d.elevation} m / ${(parseInt(d.elevation) * 3.28084).toFixed(
            0
          )} ft`
        );

      updateElevationMarker(d.lng, d.lat);
    });
}

function ElevationChart({ elevationData = [] }) {
  const chartRef = useRef(null);
  const runAction = useAppActions();
  const ref = useRef(null);

  let margin = { top: 20, right: 20, bottom: 20, left: 70 };
  let width = window.innerWidth - margin.left - margin.right;
  let height = 150 - margin.top - margin.bottom;

  console.log("Rendering ElevationChart");

  let x = useCallback(scaleLinear().range([0, width]), [width]);
  let y = useCallback(scaleLinear().range([height, 0]), [height]);

  let minElevation = min(elevationData, (d) => {
    return d.elevation;
  });
  let maxElevation = max(elevationData, (d) => {
    return d.elevation;
  });

  let minElevationBuffered = minElevation - (maxElevation - minElevation) * 0.2;
  let maxElevationBuffered = maxElevation + (maxElevation - minElevation) * 0.1;

  const exaggeration =
    max(elevationData, (d) => {
      return d.d;
    }) /
    width /
    (((maxElevationBuffered - minElevationBuffered) * 0.001) / height);

  x.domain(
    extent(elevationData, (d) => {
      return d.d;
    })
  );
  y.domain([minElevationBuffered, maxElevationBuffered]);

  let crossSectionLine = useCallback(
    line()
      //  .interpolate('basis')
      .x((d) => {
        return x(d.d);
      })
      .y((d) => {
        return y(d.elevation);
      }),
    [x, y]
  );

  let elevationArea = useCallback(
    area()
      // .interpolate('basis')
      .x((d) => {
        return x(d.d);
      })
      .y1((d) => {
        return y(d.elevation);
      })
      .y0(y(minElevationBuffered)),
    [x, y, minElevationBuffered]
  );

  useEffect(() => {
    if (elevationData.length > 0 && ref.current != null) {
      chartRef.current?.remove();
      chartRef.current = select(ref.current);
      drawElevationChart(chartRef, {
        elevationData,
        updateElevationMarker,
        x,
        y,
        width,
        height,
        margin,
        minElevationBuffered,
        maxElevationBuffered,
      });
    }
    return () => {
      chartRef.current?.remove();
    };
  }, [elevationData]);

  const updateElevationMarker = (lng: number, lat: number) =>
    runAction({
      type: "update-elevation-marker",
      lng,
      lat,
    });

  if (elevationData.length == 0) return null;
  return h(
    "svg#elevationChart",
    {
      width: width + margin.left + margin.right,
      height: height + margin.top + margin.bottom,
    },
    [
      h("g", { transform: `translate(${margin.left},${margin.top})`, ref }, [
        h("path.line", {
          fill: "rgba(75,192,192,1)",
          stroke: "rgba(75,192,192,1)",
          d: crossSectionLine(elevationData),
        }),
        h("path", {
          fill: "rgba(75,192,192,0.4)",
          d: elevationArea(elevationData),
        }),
      ]),
    ]
  );
}

function ElevationChartPanel({ startPos, endPos }) {
  const elevation: any = useAPIResult("http://localhost:8000/cross-section", {
    start_lng: startPos[0],
    start_lat: startPos[1],
    end_lng: endPos[0],
    end_lat: endPos[1],
  });
  const crossSectionData = elevation?.data;
  const elevationData = crossSectionData?.elevation;

  // let CancelTokenElevation = axios.CancelToken;
  // let sourceElevation = CancelTokenElevation.source();
  // dispatch({
  //   type: "start-elevation-query",
  //   cancelToken: sourceElevation.token,
  // });
  // const elevationData = await getElevation(action.line, sourceElevation);
  // return {
  //   type: "received-elevation-query",
  //   data: elevationData,
  // };

  if (elevationData == null) return h(Spinner);

  return h(
    "div.elevation-chart-wrapper",
    null,
    h(ElevationChart, {
      elevationData,
    })
  );
}

function ElevationChartContainer() {
  const { crossSectionOpen, crossSectionLine } = useSelector(
    (state) => state.core
  );
  const runAction = useAppActions();

  const hasElevationData = crossSectionLine?.coordinates?.length >= 2;

  if (!crossSectionOpen) return null;

  return h(
    "div.elevation-chart-panel",
    null,
    h("div.elevation-chart", [
      h(Button, {
        icon: "cross",
        minimal: true,
        className: "close-button",
        onClick() {
          runAction({ type: "toggle-cross-section" });
        },
      }),
      h("div", [
        h.if(!hasElevationData)(
          "div.elevation-instructions",
          "Click two points on the map to draw an elevation profile"
        ),
        h.if(hasElevationData)(ElevationChartPanel, {
          startPos: crossSectionLine?.coordinates[0],
          endPos: crossSectionLine?.coordinates[1],
        }),
      ]),
    ])
  );
}

export default ElevationChartContainer;
