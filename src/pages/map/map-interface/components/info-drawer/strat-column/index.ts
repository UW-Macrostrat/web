import { hyperStyled } from "@macrostrat/hyper";
import { preprocessUnits, Column } from "@macrostrat/column-views";
//import "@macrostrat/column-components/src/main.module.scss";
import { UnitLong } from "@macrostrat/api-types";
//import "@macrostrat/column-components/src/main.module.scss";

import styles from "./strat-column.module.styl";
import { ColumnSummary } from "~/pages/map/map-interface/app-state/handlers/columns";
import { NonIdealState } from "@blueprintjs/core";
import useBreadcrumbs from "use-react-router-breadcrumbs";
import { LinkButton } from "../../buttons";
import { InfoPanelSection } from "@macrostrat/map-interface";
import { PatternProvider } from "~/_providers.client";
import { useMemo } from "react";

const h = hyperStyled(styles);

function BackButton() {
  const breadcrumbs = useBreadcrumbs();
  const prevRoute = breadcrumbs[breadcrumbs.length - 2];
  let to = prevRoute?.match.pathname;
  return h(LinkButton, { to, icon: "arrow-left", minimal: true, small: true });
}

function ColumnOverlay({ columnInfo }: { columnInfo: ColumnSummary | null }) {
  const units = columnInfo?.units;
  if (units == null)
    return h(NonIdealState, { title: "No column available", icon: "error" }, [
      h("p", "A stratigraphic column has not been assigned for this location."),
    ]);

  const unitsA = useMemo(() => preprocessUnits(units), []);

  const headerElement = h([
    h("div.controls", [h(BackButton)]),
    h("h4", columnInfo.col_name),
    h("div.spacer"),
    h(
      "a",
      { href: `/columns/${columnInfo.col_id}` },
      h("code", columnInfo.col_id)
    ),
  ]);

  return h(
    InfoPanelSection,
    { className: "strat-column-panel", headerElement },
    h("div.strat-column-container", [
      h(Column, {
        data: unitsA,
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
  return h(PatternProvider, h(ColumnOverlay, props));
}
