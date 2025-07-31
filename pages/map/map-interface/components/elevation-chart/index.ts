import { Button, Spinner } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import { LocationFocusButton } from "@macrostrat/mapbox-react";
import { useAPIResult } from "@macrostrat/ui-components";
import { bisector, extent, max, min } from "d3-array";
import { axisBottom, axisLeft } from "d3-axis";
import { scaleLinear } from "d3-scale";
import { select, pointer } from "d3-selection";
import { area, line } from "d3-shape";
import React, { useEffect, useRef } from "react";
import { useAppActions, useAppState } from "#/map/map-interface/app-state";

import { apiV2Prefix } from "@macrostrat-web/settings";
import styles from "./main.module.styl";

const h = hyper.styled(styles);

function drawElevationChart(
  chartRef: React.RefObject<any>,
  props: { updateElevationMarker: Function; elevationData: any[] }
) {
  // Alias these variables because d3 returns ` in mouseover
  const updateElevationMarker = props.updateElevationMarker;
  let data = props.elevationData;

  let margin = { top: 20, right: 20, bottom: 20, left: 70 };
  let width = window.innerWidth - margin.left - margin.right;
  let height = 150 - margin.top - margin.bottom;

  let bisect = bisector((d) => {
    return d.d;
  }).left;

  let x = scaleLinear().range([0, width]);
  let y = scaleLinear().range([height, 0]);

  let yAxis = axisLeft()
    .scale(y)
    .ticks(5)
    .tickSizeInner(-width)
    .tickSizeOuter(0)
    .tickPadding(10);

  let crossSectionLine = line()
    //  .interpolate('basis')
    .x((d) => {
      return x(d.d);
    })
    .y((d) => {
      return y(d.elevation);
    });

  let elevationArea = area()
    // .interpolate('basis')
    .x((d) => {
      return x(d.d);
    })
    .y1((d) => {
      return y(d.elevation);
    });

  chartRef.current = select("#elevationChart")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const chart = chartRef.current;

  let minElevation = min(props.elevationData, (d) => {
    return d.elevation;
  });
  let maxElevation = max(props.elevationData, (d) => {
    return d.elevation;
  });

  let minElevationBuffered = minElevation - (maxElevation - minElevation) * 0.2;
  let maxElevationBuffered = maxElevation + (maxElevation - minElevation) * 0.1;

  const exaggeration =
    max(props.elevationData, (d) => {
      return d.d;
    }) /
    width /
    (((maxElevationBuffered - minElevationBuffered) * 0.001) / height);

  x.domain(
    extent(props.elevationData, (d) => {
      return d.d;
    })
  );
  y.domain([minElevationBuffered, maxElevationBuffered]);

  elevationArea.y0(y(minElevationBuffered));

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

  chart
    .append("path")
    .datum(props.elevationData)
    .attr("class", "line")
    .attr("fill", "rgba(75,192,192,1)")
    .attr("stroke", "rgba(75,192,192,1)")
    .attr("d", crossSectionLine);

  chart
    .append("path")
    .datum(props.elevationData)
    .attr("fill", "rgba(75,192,192,0.4)")
    .attr("d", elevationArea);

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
    .style("fill", "transparent")
    .on("mouseover", () => {
      focus.style("display", null);
    })
    .on("mouseout", () => {
      focus.style("display", "none");
      updateElevationMarker(null, null);
    })
    .on("mousemove", function (e) {
      let x0 = x.invert(pointer(e)[0]);
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

  useEffect(() => {
    if (elevationData.length > 0) {
      chartRef.current?.remove();
      drawElevationChart(chartRef, { elevationData, updateElevationMarker });
    }
    return () => {
      chartRef.current?.remove();
      //chartRef.current?.select("g").remove();
    };
  }, [elevationData]);

  const updateElevationMarker = (lng: number, lat: number) =>
    runAction({
      type: "update-elevation-marker",
      lng,
      lat,
    });

  if (elevationData.length == 0) return null;
  return h("svg#elevationChart");
}

function ElevationChartPanel({ startPos, endPos }) {
  const elevation: any = useAPIResult(apiV2Prefix + "/elevation", {
    start_lng: startPos[0],
    start_lat: startPos[1],
    end_lng: endPos[0],
    end_lat: endPos[1],
  });
  const elevationData = elevation?.success?.data;
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
  const crossSectionLine = useAppState((state) => state.core.crossSectionLine);
  const runAction = useAppActions();

  const nCoords = crossSectionLine?.coordinates?.length ?? 0;

  const hasElevationData = crossSectionLine?.coordinates?.length >= 2;
  const crossSectionOpen = crossSectionLine != null;

  if (!crossSectionOpen) return null;

  return h(
    "div.elevation-chart-panel",
    null,
    h("div.elevation-chart", [
      h("div.control-bar", [
        // h(LocationFocusButton, { location: crossSectionLine }),
        h("div.spacer"),
        h(Button, {
          icon: "cross",
          minimal: true,
          small: true,
          className: "close-button",
          onClick() {
            runAction({ type: "toggle-cross-section" });
          },
        }),
      ]),
      h("div", [
        h.if(nCoords < 2)("div.elevation-instructions", [
          nCoords == 0 ? "Click two points on the map" : "Click a second point",
          " to draw an elevation profile",
        ]),
        h.if(hasElevationData)(ElevationChartPanel, {
          startPos: crossSectionLine?.coordinates[0],
          endPos: crossSectionLine?.coordinates[1],
        }),
      ]),
    ])
  );
}

export default ElevationChartContainer;
