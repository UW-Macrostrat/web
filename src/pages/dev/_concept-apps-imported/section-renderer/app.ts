import { useState } from "react";
import { isEqual } from "underscore";
import h from "@macrostrat/hyper";
import { ButtonGroup, Button } from "@blueprintjs/core";
import {
  APIProvider,
  APIResultView,
  useAPIResult,
  getQueryString,
  setQueryString
} from "@macrostrat/ui-components";
import { GeologicPatternProvider } from "@macrostrat/column-components";
import Column, { IUnit } from "./column";
import MapView from "common/map";
import patterns from "url:../../geologic-patterns/*.png";

const renderResults = (data: Array<IUnit>) => {
  return h(Column, { data });
};

const ColumnView = props => {
  const { params } = props;
  // 495
  return h(
    APIResultView,
    {
      route: "/units",
      params: { all: true, ...params, response: "long" }
    },
    renderResults
  );
};

const ColumnTitle = props => {
  return h.if(props.data != null)("h1", props.data?.col_name);
};

const ColumnManager = () => {
  const defaultArgs = { col_id: 495 };
  const initArgs = getQueryString() ?? defaultArgs;
  const [columnArgs, setColumnArgs] = useState(initArgs);

  const colParams = { ...columnArgs, format: "geojson" };
  const res = useAPIResult("/columns", colParams, [columnArgs]);
  const columnFeature = res?.features[0];

  const setCurrentColumn = obj => {
    let args = obj;
    if ("properties" in obj) {
      args = { col_id: obj.properties.col_id };
    }
    // Set query string
    setQueryString(args);
    setColumnArgs(args);
  };

  const DefaultButton = ({ args, children }) => {
    const onClick = () => setCurrentColumn(args);
    return h(
      Button,
      { onClick, disabled: isEqual(columnArgs, args) },
      children
    );
  };

  // 495
  return h("div.column-ui", [
    h("div.column-view", [
      h(ColumnTitle, { data: columnFeature?.properties }),
      h(ColumnView, { params: columnArgs })
    ]),
    h("div.column-sidebar", [
      h("div.column-nav", [
        h("h3", "Column navigator"),
        h(MapView, { currentColumn: columnFeature, setCurrentColumn }),
        h("h3", "Selected examples"),
        h(
          ButtonGroup,
          {
            vertical: true,
            minimal: true,
            alignText: "left",
            className: "default-buttons"
          },
          [
            h(DefaultButton, { args: defaultArgs }, "Paradox Basin"),
            h(
              DefaultButton,
              { args: { project_id: 4, status_code: "in process" } },
              "IODP Test"
            )
          ]
        )
      ])
    ])
  ]);
};

const resolvePattern = id => patterns[id];

const App = () => {
  return h(
    GeologicPatternProvider,
    { resolvePattern },
    h(
      APIProvider,
      {
        baseURL: "https://dev.macrostrat.org/api/v2",
        unwrapResponse: res => res.success.data
      },
      h(ColumnManager)
    )
  );
};

export default App;
