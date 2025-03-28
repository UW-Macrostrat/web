import h from "@macrostrat/hyper";
import {
  ColumnNavigationMap,
  useUnitSelectionDispatch,
} from "@macrostrat/column-views";
import { mapboxAccessToken } from "@macrostrat-web/settings";
import { navigate } from "vike/client/router";

export function ColumnMap({
  projectID,
  inProcess,
  className,
  selectedColumn,
  linkPrefix = "/",
}) {
  const setSelectedUnit = useUnitSelectionDispatch();

  return h(ColumnNavigationMap, {
    className,
    inProcess,
    projectID,
    accessToken: mapboxAccessToken,
    selectedColumn,
    onSelectColumn(colID) {
      // We could probably find a more elegant way to do this
      setSelectedUnit(null);
      navigate(linkPrefix + `columns/${colID}`, {
        overwriteLastHistoryEntry: true,
      });
    },
  });
}
