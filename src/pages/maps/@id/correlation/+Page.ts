import { Popover, Spinner } from "@blueprintjs/core";
import { FullscreenPage } from "~/layouts";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { PageBreadcrumbs } from "~/renderer";
import { useLegendData, MapInfo } from "../utils";
import { useElementSize, useInDarkMode } from "@macrostrat/ui-components";
import { useMemo, useRef } from "react";
import { Group } from "@visx/group";
import { scaleBand, scaleLinear } from "@visx/scale";
import { AxisLeft } from "@visx/axis";
import { Timescale, TimescaleOrientation } from "@macrostrat/timescale";
import { ForeignObject } from "@macrostrat/column-components";
import { useState, useEffect } from "react";
import { Bar } from "@visx/shape";
import { CorrelationItem, AgeRange } from "./types";
import { buildCorrelationChartData, mergeAgeRanges } from "./prepare-data";
import { LegendItemInformation } from "./legend-item";

const h = hyper.styled(styles);

export function Page({ map }) {
  const ref = useRef(null);
  const size = useElementSize(ref);
  const legendData = useLegendData(map);

  const correlationChartData = useMemo(() => {
    console.log(legendData);
    return buildCorrelationChartData(legendData);
  }, [legendData]);

  return h(FullscreenPage, [
    h("div.page-inner", [
      h(PageBreadcrumbs),
      h("div.vis-container", { ref }, [
        h.if(legendData != null)(CorrelationChart, {
          map,
          ...size,
          data: correlationChartData,
        }),
      ]),
    ]),
  ]);
}

const verticalMargin = 60;

export type BarsProps = {
  width: number;
  height: number;
  events?: boolean;
  map: MapInfo;
  data: CorrelationItem[];
};

function CorrelationChart({ width, height, events = false, data }: BarsProps) {
  // bounds
  const xMax = width;
  const yMax = height - verticalMargin;

  const [selectedItem, setSelectedLegendID] = useSelectedLegendID(data);

  const domain = useMemo(
    () => mergeAgeRanges(data.map((d) => d.ageRange)),
    [data]
  );

  const xMin = 100;

  // scales, memoize for performance
  const xScale = useMemo(
    () =>
      scaleBand<string>({
        range: [xMin, xMax],
        round: false,
        domain: data.map((d, i) => `${d.id}`),
        padding: 0.2,
      }),
    [xMax]
  );
  const yScale = useMemo(() => {
    return scaleLinear<number>({
      range: [yMax, 0],
      round: false,
      domain,
    });
  }, [domain, yMax]);

  if (data == null) {
    return h(Spinner);
  }

  if (width < 10) return null;

  const ageRange = [...domain] as AgeRange;

  return h("div.vis-frame", [
    h(
      "svg.vis-area",
      {
        width,
        height,
        onClick() {
          setSelectedLegendID(null);
        },
      },
      [
        h(Group, { top: verticalMargin / 2, key: "main-plot" }, [
          h(AgeAxis, {
            scale: yScale,
            width: 40,
          }),
          h(ForeignObject, { width: 60, height, x: 40 }, [
            h(Timescale, {
              orientation: TimescaleOrientation.VERTICAL,
              length: yMax,
              // Bug in timescale component, the age range appears to be changed
              // if we pass it in statically.
              ageRange,
              absoluteAgeScale: true,
              levels: [2, 3],
            }),
          ]),
          h(
            Group,
            data.map((d, i) => {
              const { ageRange } = d;

              const yMin = yScale(ageRange[1]);
              const yMax = yScale(ageRange[0]);

              const barWidth = xScale.bandwidth();
              const barHeight = yMax - yMin;
              const barX = xScale(`${d.id}`);
              const barY = yMin;
              return h(Bar, {
                key: d.id,
                x: barX,
                y: barY,
                width: barWidth,
                height: barHeight,
                fill: d.color,
                onClick(event) {
                  setSelectedLegendID(d.id);
                  event.stopPropagation();
                },
              });
            })
          ),
          h(
            ForeignObject,
            {
              width,
              height: height - verticalMargin,
              className: "popover-container",
            },
            [
              h(SelectedLegendItemPopover, {
                item: selectedItem,
                xScale,
                yScale,
              }),
            ]
          ),
        ]),
      ]
    ),
  ]);
}

function SelectedLegendItemPopover({
  item,
  xScale,
  yScale,
}: {
  item: CorrelationItem | null;
  xScale: any;
  yScale: any;
}) {
  if (item == null) {
    return null;
  }

  const { details, id, ageRange } = item;

  const content = h(LegendItemInformation, { legendItem: details });

  const xv = xScale(`${id}`);
  const top = yScale(ageRange[1]);
  const bottom = yScale(ageRange[0]);

  return h(
    "div.popover-main",
    {
      style: {
        top: top,
        left: xv,
        width: xScale.bandwidth(),
        height: bottom - top,
      },
    },
    h(
      Popover,
      { content, isOpen: true, usePortal: true },
      h("span.popover-target")
    )
  );
}

function AgeAxis({ scale, width }) {
  const darkMode = useInDarkMode();

  const axisColor = darkMode ? "#ccc" : "#222";

  return h(AxisLeft, {
    scale,
    left: width,
    stroke: axisColor,
    tickStroke: axisColor,
    labelProps: {
      fill: axisColor,
    },
    tickLabelProps: () => {
      return {
        fill: axisColor,
        textAnchor: "end",
        verticalAnchor: "middle",
        dx: "-0.25em",
        fontSize: 12,
      };
    },
  });
}

function useSelectedLegendID(
  legendItems: CorrelationItem[]
): [CorrelationItem | null, (a: number) => void] {
  /** Hook to manage the selected legend item, including handling of arrow-key navigation */

  const [selectedLegendID, setSelectedLegendID] = useState<number | null>(null);

  // Add arrow key navigation and escape key to close popover
  const handleKeyDown = (e) => {
    if (selectedLegendID == null) {
      return;
    }
    const idx = legendItems.findIndex((d) => d.id === selectedLegendID);
    if (idx == null) {
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      setSelectedLegendID(legendItems[idx + 1].id);
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      setSelectedLegendID(legendItems[idx - 1].id);
    } else if (e.key === "Escape") {
      setSelectedLegendID(null);
    }
  };

  useEffect(() => {
    // Get the focused legend_id from the query string if set
    const urlParams = new URLSearchParams(window.location.search);
    const legendID = urlParams.get("legend_id");
    if (legendID != null) {
      setSelectedLegendID(parseInt(legendID));
    }
  }, []);

  // Add event listener
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (selectedLegendID == null) {
      urlParams.delete("legend_id");
    } else {
      urlParams.set("legend_id", `${selectedLegendID}`);
    }
    let qString = urlParams.toString();
    if (qString.length > 0) {
      qString = "?" + qString;
    }

    const newUrl = `${window.location.pathname}${qString}`;
    window.history.replaceState(null, "", newUrl);

    // Set query string to selected legend item
    if (selectedLegendID == null) {
      return;
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedLegendID]);

  const selectedItem = useMemo(
    () => legendItems.find((d) => d.id === selectedLegendID),
    [legendItems, selectedLegendID]
  );

  return [selectedItem, setSelectedLegendID];
}
