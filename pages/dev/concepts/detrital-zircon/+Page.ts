import { useState } from "react";
import h from "@macrostrat/hyper";
import {
  APIProvider,
  getQueryString,
  setQueryString,
} from "@macrostrat/ui-components";
import Column from "./column";
import { DetritalColumn } from "./detrital";
import {
  ColumnNavigationMap,
  MeasurementsLayer,
} from "@macrostrat/column-views";
import { PatternProvider } from "~/_providers";
import { ColumnDataProvider, useColumnData } from "./column-data";
import "./main.styl";

const ColumnTitle = (props) => {
  return h.if(props.data != null)("h1", props.data?.col_name);
};

const ColumnUI = ({ setCurrentColumn }) => {
  const { footprint, params, units } = useColumnData();

  // 495
  return h("div.column-ui", [
    h("div.main-panel", [
      h(ColumnTitle, { data: footprint?.properties }),
      h("div.flex-container.columns", [
        h("div.column-view", [h(Column, { data: units })]),
        h(DetritalColumn, params),
      ]),
    ]),
    h("div.map-column", [
      h(
        ColumnNavigationMap,
        { currentColumn: footprint, setCurrentColumn, margin: 0 },
        [
          h(MeasurementsLayer, {
            measure_phase: "zircon",
            measurement: "207Pb-206Pb",
          }),
        ]
      ),
    ]),
  ]);
};

const ColumnManager = () => {
  const defaultArgs = { col_id: 495 };
  const initArgs = getQueryString() ?? defaultArgs;
  const [columnArgs, setColumnArgs] = useState(initArgs);

  const setCurrentColumn = (obj) => {
    let args = obj;
    if ("properties" in obj) {
      args = { col_id: obj.properties.col_id };
    }
    // Set query string
    setQueryString(args);
    setColumnArgs(args);
  };

  return h(
    ColumnDataProvider,
    { params: columnArgs },
    h(ColumnUI, { setCurrentColumn })
  );
};

export function Page() {
  return h(
    PatternProvider,
    h(
      APIProvider,
      {
        baseURL: "https://dev.macrostrat.org/api/v2",
        unwrapResponse: (res) => {
          return res.success.data;
        },
      },
      h(ColumnManager)
    )
  );
}
