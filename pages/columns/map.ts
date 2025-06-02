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
  const columnData = useAPIResult(apiV2Prefix + "/columns?all&format=geojson");

  let columns = columnData?.success?.data;

  // Filter columns on the client side
  if (columnIDs != null) {
    columns = {
      type: "FeatureCollection",
      features: columns.features.filter((feature) =>
        columnIDs.includes(feature.properties.col_id)
      ),
    };
  }

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
