import h from "@macrostrat/hyper";
import { APIProvider, useAPIResult } from "@macrostrat/ui-components";
import { GeologicPatternProvider } from "@macrostrat/column-components";
import { ColumnMapNavigator } from "packages/column-views/src/map";
import Column from "./column";
import patterns from "url:../../geologic-patterns/*.png";
import { useColumnNav } from "common/macrostrat-columns";

const ColumnView = (props) => {
  const { params } = props;
  const data = useAPIResult("/units", {
    all: true,
    ...params,
    response: "long",
  });
  if (data == null) return null;
  return h(Column, { data });
};

const ColumnTitle = (props) => {
  return h.if(props.data != null)("h1", props.data?.col_name);
};

const ColumnManager = () => {
  const defaultArgs = { col_id: 495 };
  const [currentColumn, setCurrentColumn] = useColumnNav(defaultArgs);
  const { col_id, ...projectParams } = currentColumn;

  const colParams = { ...currentColumn, format: "geojson" };
  const res = useAPIResult("/columns", colParams, [currentColumn]);
  const columnFeature = res?.features[0];

  // 495
  return h("div.column-ui", [
    h("div.column-view", [
      h(ColumnTitle, { data: columnFeature?.properties }),
      h(ColumnView, { params: currentColumn }),
    ]),
    h("div.map-column", [
      h(ColumnMapNavigator, {
        currentColumn: columnFeature,
        setCurrentColumn,
        margin: 0,
        ...projectParams,
      }),
    ]),
  ]);
};

const resolvePattern = (id) => patterns[id];

const App = () => {
  return h(
    GeologicPatternProvider,
    { resolvePattern },
    h(
      APIProvider,
      {
        baseURL: "https://dev.macrostrat.org/api/v2",
        unwrapResponse: (res) => res.success.data,
      },
      h(ColumnManager)
    )
  );
};

export default App;
