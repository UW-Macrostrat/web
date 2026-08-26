/** The real column navigation map, wired for *selection* rather than
 * navigation — the demo keeps you on the page so list↔map sync is visible.
 *
 * It sources its own footprint geometry (the v2 columns GeoJSON), independent
 * of the list's row data. Selection crosses between them by `col_id`, which is
 * all the two views need to agree on.
 */

import h from "@macrostrat/hyper";
import { ColumnNavigationMap } from "@macrostrat/column-views";
import {
  MacrostratDataProvider,
  useMacrostratColumns,
} from "@macrostrat/data-provider";
import { apiV2Prefix, mapboxAccessToken } from "@macrostrat-web/settings";
import { ErrorBoundary } from "@macrostrat/ui-components";

export function DemoColumnMap(props) {
  return h(
    ErrorBoundary,
    h(
      MacrostratDataProvider,
      { baseURL: apiV2Prefix },
      h(DemoColumnMapInner, props)
    )
  );
}

function DemoColumnMapInner({ projectID = 14, selectedColumn, onSelectColumn }) {
  const columns = useMacrostratColumns(projectID, false) ?? [];

  return h(ColumnNavigationMap, {
    style: { height: "100%" },
    accessToken: mapboxAccessToken,
    columns,
    projectID,
    selectedColumn,
    onSelectColumn,
  });
}
