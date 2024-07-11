import h from "@macrostrat/hyper";
import { APIProvider, useAPIResult } from "@macrostrat/ui-components";
import Column from "./column";
import {
  ColumnNavigatorMap,
  MeasurementsLayer,
} from "@macrostrat/column-views/src/map";
import { MeasurementDataProvider } from "@macrostrat/concept-app-helpers";
import { PatternProvider } from "~/_providers.client";
import { useColumnNav } from "@macrostrat/column-views";

const ColumnTitle = (props) => {
  return h.if(props.data != null)("h1", props.data?.col_name);
};

const defaultArgs = {
  col_id: 2192,
  //unit_id: null,
  project_id: 10,
  status_code: "in process",
};

function ColumnManager() {
  const [columnArgs, setCurrentColumn] = useColumnNav(defaultArgs);
  const { col_id, ...projectParams } = columnArgs;

  console.log(columnArgs);

  const colParams = { ...columnArgs, format: "geojson" };
  const res = useAPIResult("/columns", colParams, [columnArgs]);
  const columnFeature = res?.features[0];

  //return h("div.column-manager", "Hello, world");

  return h(MeasurementDataProvider, columnArgs, [
    h("div.column-ui", [
      h("div.column-view", [
        h(ColumnTitle, { data: columnFeature?.properties }),
        h(Column, { params: columnArgs }),
      ]),
      h("div.map-column", [
        h(
          ColumnNavigatorMap,
          {
            currentColumn: columnFeature,
            setCurrentColumn,
            margin: 0,
            ...projectParams,
          },
          h(MeasurementsLayer, {
            ...projectParams,
            style: {
              fill: "dodgerblue",
              stroke: "blue",
            },
          })
        ),
      ]),
    ]),
  ]);
}

export function Page() {
  return h(
    PatternProvider,
    h(
      APIProvider,
      {
        baseURL: "https://dev.macrostrat.org/api/v2",
        unwrapResponse: (res) => res.success.data,
      },
      h(ColumnManager)
    )
  );
}
