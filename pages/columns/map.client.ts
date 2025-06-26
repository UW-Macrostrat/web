import {
  ColumnNavigationMap,
  useMacrostratColumns,
} from "@macrostrat/column-views";
import h from "@macrostrat/hyper";
import { mapboxAccessToken } from "@macrostrat-web/settings";
import { ErrorBoundary } from "@macrostrat/ui-components";

export function ColumnsMapContainer(props) {
  /* TODO: integrate this with shared web components */
  return h(ErrorBoundary, h(ColumnsMapInner, props));
}

function ColumnsMapInner({ columnIDs = null, projectID = null, className }) {
  const columnData = useMacrostratColumns(projectID, projectID != null);

  let columns = columnData;

  return h(
    "div",
    { className },
    h(ColumnNavigationMap, { 
      style: { height: "100%" },
      accessToken: mapboxAccessToken,
      columnIDs,
      onSelectColumn: (col) => {
        if (col) {
          window.open(`/columns/${col}`, "_blank");
        }
      }
    }),
  );
}