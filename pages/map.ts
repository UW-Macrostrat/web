import { hyperStyled } from "@macrostrat/hyper";
import { ColumnNavigationMap } from "@macrostrat/column-views";
import { mapboxAccessToken } from "@macrostrat-web/settings";
import { ErrorBoundary } from "@macrostrat/ui-components";
import styles from "./layout.module.sass";

const h = hyperStyled(styles)

export function ColumnMap({
  projectID,
  inProcess,
  className,
  selectedColumn,
  onSelectColumn,
  columns,
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
      columns,
    })
  );
}
