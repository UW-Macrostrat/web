import h from "@macrostrat/hyper";
import { ColumnNavigationMap } from "@macrostrat/column-views";
import { mapboxAccessToken } from "@macrostrat-web/settings";
import { ErrorBoundary } from "@macrostrat/ui-components";

export function ColumnMap({
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
