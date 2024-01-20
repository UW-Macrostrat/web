import { Column } from "@macrostrat/column-views";
import { hyperStyled } from "@macrostrat/hyper";
//import "@macrostrat/column-components/src/main.module.scss";
//import "@macrostrat/column-components/src/main.module.scss";

import { NonIdealState } from "@blueprintjs/core";
import { InfoPanelSection } from "@macrostrat/map-interface";
import { PatternProvider } from "~/_providers";
import { ColumnSummary } from "~/pages/map/map-interface/app-state/handlers/columns";
import styles from "./strat-column.module.styl";

const h = hyperStyled(styles);

function ColumnOverlay({ columnInfo }: { columnInfo: ColumnSummary | null }) {
  console.log(columnInfo);

  const units = columnInfo?.units;
  if (units == null)
    return h(NonIdealState, { title: "No column available", icon: "error" }, [
      h("p", "A stratigraphic column has not been assigned for this location."),
    ]);

  const headerElement = h([
    h("h4", columnInfo.col_name),
    h("div.spacer"),
    h("code", columnInfo.col_id),
  ]);

  return h(
    InfoPanelSection,
    { className: "strat-column-panel", headerElement },
    h("div.strat-column-container", [
      h(Column, {
        data: units,
        showLabels: true,
        targetUnitHeight: 25,
        unconformityLabels: true,
        width: 280,
        columnWidth: 180,
      }),
    ])
  );
}

export function StratColumn(props) {
  console.log(props);
  return h(PatternProvider, h(ColumnOverlay, props));
}
