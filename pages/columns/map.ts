import { ColumnNavigationMap } from "@macrostrat/column-views";
import { mapboxAccessToken } from "@macrostrat-web/settings";
import { ErrorBoundary } from "@macrostrat/ui-components";
import h from "./main.module.scss";
import { apiV2Prefix } from "@macrostrat-web/settings";
import { useAPIResult } from "@macrostrat/ui-components";
import { ColumnsMap } from "~/columns-map/index.client";

export function ColumnsMapContainer({ columnIDs }) {
  /* TODO: integrate this with shared web components */
  return h(ErrorBoundary, h(ColumnsMapInner, { columnIDs }));
}

function ColumnsMapInner({ columnIDs = null }) {
  console.log("ColumnsMapInner", columnIDs);
  const cols = columnIDs != null ? "col_id=" + columnIDs?.join(",") : "all=1";

  const columnData = useAPIResult(
    apiV2Prefix + "/columns?" + cols + "&response=long&format=geojson"
  );

  const columns = columnData?.success?.data;

  console.log("Column data", columnData);

  return h(
    "div.column-container",
    {
      style: {
        width: 350,
        height: 350,
        position: "relative",
      },
    },
    h(ColumnsMap, { columns })
  );
}

export function ColumnsMapOld({
  projectID,
  inProcess,
  className,
  selectedColumn,
  onSelectColumn,
}) {
  return h(
    ErrorBoundary,
    h(ColumnNavigationMap, {
      className,
      inProcess,
      projectID,
      accessToken: mapboxAccessToken,
      selectedColumn,
      onSelectColumn,
    })
  );
}
