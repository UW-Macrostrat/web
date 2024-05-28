import h from "@macrostrat/hyper";
import { APIProvider, useAPIResult } from "@macrostrat/ui-components";
import { ColumnNavigatorMap, useColumnNav } from "@macrostrat/column-views";
import "./main.styl";
import { PatternProvider } from "~/_providers";

const ColumnManager = () => {
  const defaultArgs = { col_id: 4371, project_id: 3 };
  const [currentColumn, setCurrentColumn] = useColumnNav(defaultArgs);
  const { col_id, ...projectParams } = currentColumn;

  const colParams = { ...currentColumn, format: "geojson" };
  const res = useAPIResult("/defs/columns", colParams, [currentColumn]);
  const columnFeature = res?.features[0];

  // 495
  return h("div.column-ui", [
    h("h1", "Ocean-drilling sites"),
    h(ColumnNavigatorMap, {
      currentColumn: columnFeature,
      setCurrentColumn,
      margin: 0,
      apiRoute: "/defs/columns",
      ...projectParams,
    }),
  ]);
};

export function Page() {
  return h(
    PatternProvider,
    h(
      APIProvider,
      {
        baseURL: "https://dev2.macrostrat.org/api/v2",
        unwrapResponse: (res) => res.success.data,
      },
      h(ColumnManager)
    )
  );
}
