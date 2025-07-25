import {
  Popover,
  Spinner,
  SegmentedControl,
  FormGroup,
  Button,
} from "@blueprintjs/core";
import { FullscreenPage } from "~/layouts";
import h from "./main.module.sass";
import { PageBreadcrumbs } from "~/components";
import { usePageProps } from "~/renderer/usePageProps";
import { useLegendData, MapInfo } from "../utils";
import { useElementSize, useInDarkMode } from "@macrostrat/ui-components";
import { useMemo, useRef } from "react";
import { Group } from "@visx/group";
import { scaleBand, scaleLinear, scaleLog } from "@visx/scale";
import { AxisLeft } from "@visx/axis";
import { Timescale, TimescaleOrientation } from "@macrostrat/timescale";
import { ForeignObject } from "@macrostrat/column-components";
import { useState, useEffect } from "react";
import { Bar } from "@visx/shape";
import { CorrelationItem, AgeRange, AgeDisplayMode } from "./types";
import {
  buildCorrelationChartData,
  mergeAgeRanges,
  getBoundingAgeRange,
  getBestAgeRange,
} from "./prepare-data";
import { LegendItemInformation } from "./legend-item";
import { UnitDetailsPopover } from "~/components/unit-details";

export function Page() {
  const { map } = usePageProps();
  const ref = useRef(null);
  const size = useElementSize(ref);
  const legendData = useLegendData(map);

  const [ageMode, setAgeMode] = useState(AgeDisplayMode.MapLegend);
  const [ageScale, setAgeScale] = useState<AgeScale>("linear");

  const correlationChartData = useMemo(() => {
    return buildCorrelationChartData(legendData, ageMode);
  }, [legendData, ageMode]);

  const [selectedItem, setSelectedLegendID] =
    useSelectedLegendID(correlationChartData);

  const settings = h("div.settings", [
    h("h3", "Settings"),
    //h(AgeScaleSelector, { scale: ageScale, setScale: setAgeScale }),
    h(AgeDisplayModeSelector, {
      displayMode: ageMode,
      setDisplayMode: setAgeMode,
    }),
  ]);

  return h(FullscreenPage, [
    h("div.page-inner", [
      h("div.flex.row", [
        h(PageBreadcrumbs),
        h("div.spacer"),
        h(
          Popover,
          {
            content: settings,
            usePortal: true,
            rootBoundary: ref.current,
            onOpening() {
              setSelectedLegendID(null);
            },
          },
          h(Button, { icon: "cog", minimal: true })
        ),
      ]),
      h("div.vis-container", { ref }, [
        h.if(legendData != null)(CorrelationChart, {
          map,
          ...size,
          data: correlationChartData,
          selectedItem,
          setSelectedLegendID,
          ageMode,
          ageScale,
        }),
      ]),
    ]),
  ]);
}

const verticalMargin = 60;

export type BarsProps = {
  width: number;
  height: number;
  map: MapInfo;
  data: CorrelationItem[];
  ageMode: AgeDisplayMode;
  ageScale: AgeScale;
  selectedItem: CorrelationItem | null;
  setSelectedLegendID: (a: number) => void;
};

type AgeScale = "linear" | "log";

function CorrelationChart({
  width,
  height,
  data,
  ageMode = AgeDisplayMode.MapLegend,
  ageScale = "linear",
  selectedItem,
  setSelectedLegendID,
}: BarsProps) {
  // bounds
  const xMax = width;
  const yMax = height - verticalMargin;

  const domain = useMemo(
    () => mergeAgeRanges(data.map((d) => getBoundingAgeRange(d, ageMode))),
    [data, ageMode]
  );

  const xMin = 100;

  // scales, memoize for performance
  const xScale = useMemo(
    () =>
      scaleBand<string>({
        range: [xMin, xMax],
        round: false,
        domain: data.map((d) => `${d.id}`),
        padding: 0.2,
      }),
    [xMax, data]
  );
  const yScale = useMemo(() => {
    if (ageScale === "log") {
      return scaleLog<number>({
        range: [yMax, 0],
        round: true,
        domain: domain,
        nice: true,
        base: 10,
      });
    }

    return scaleLinear<number>({
      range: [yMax, 0],
      round: false,
      domain,
    });
  }, [domain, yMax, ageScale]);

  if (data == null) {
    return h(Spinner);
  }

  if (width < 10) return null;

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
              ageRange: domain,
              absoluteAgeScale: true,
              levels: [2, 3],
              onClick: (e, d) => window.open(`/lex/interval/${d.int_id}`, "_self"),
            }),
          ]),
          h(
            Group,
            data.map((d, i) => {
              const ageRange = getBestAgeRange(d, ageMode);

              const yMin = yScale(ageRange[1]);
              const yMax = yScale(ageRange[0]);

              const barWidth = xScale.bandwidth();
              const barHeight = yMax - yMin;
              const barX = xScale(`${d.id}`);
              const barY = yMin;
              const main = h(Bar, {
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
              if (
                ageMode !== AgeDisplayMode.Both ||
                d.macrostratAgeRange == null
              ) {
                return main;
              }

              // We need to render the un-corrected age range as well
              const yMin1 = yScale(d.ageRange[1]);
              const yMax1 = yScale(d.ageRange[0]);
              return h(Group, { key: d.id }, [
                h(Bar, {
                  x: barX,
                  y: yMin1,
                  width: barWidth,
                  height: yMax1 - yMin1,
                  fill: d.color,
                  opacity: 0.3,
                }),
                main,
              ]);
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
                ageMode,
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
  ageMode,
  yScale,
}: {
  item: CorrelationItem | null;
  xScale: any;
  yScale: any;
  ageMode: AgeDisplayMode;
}) {
  if (item == null) {
    return null;
  }

  const range = getBoundingAgeRange(item, ageMode);

  const { details, id } = item;

  const content = h(LegendItemInformation, { legendItem: details });

  const xv = xScale(`${id}`);
  const top = yScale(range[1]);
  const bottom = yScale(range[0]);

  return h(
    UnitDetailsPopover,
    {
      style: { top, left: xv, width: xScale.bandwidth(), height: bottom - top },
    },
    content
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

function AgeDisplayModeSelector({
  displayMode,
  setDisplayMode,
}: {
  displayMode: AgeDisplayMode;
  setDisplayMode: (a: AgeDisplayMode) => void;
}) {
  return h(FormGroup, { label: "Age source" }, [
    h(SegmentedControl, {
      options: [
        { label: "Map legend", value: AgeDisplayMode.MapLegend },
        { label: "Macrostrat", value: AgeDisplayMode.Macrostrat },
        { label: "Both", value: AgeDisplayMode.Both },
      ],
      small: true,
      value: displayMode,
      onValueChange: setDisplayMode,
    }),
  ]);
}

function AgeScaleSelector({
  scale,
  setScale,
}: {
  scale: AgeScale;
  setScale: (a: AgeScale) => void;
}) {
  return h(FormGroup, { label: "Age scale" }, [
    h(SegmentedControl, {
      options: [
        { label: "Linear", value: "linear" },
        { label: "Log", value: "log" },
      ],
      small: true,
      value: scale,
      onValueChange: setScale,
    }),
  ]);
}
