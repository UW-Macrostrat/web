import { hyperStyled } from "@macrostrat/hyper";
import {
  Column,
  ColoredUnitComponent,
  UnitDetailsFeature,
} from "@macrostrat/column-views";

import styles from "./strat-column.module.styl";
import { ColumnSummary } from "#/map/map-interface/app-state/handlers/columns";
import { NonIdealState } from "@blueprintjs/core";
import useBreadcrumbs from "use-react-router-breadcrumbs";
import { LinkButton } from "../../buttons";
import { ExpansionPanel, InfoPanelSection } from "@macrostrat/map-interface";
import { PatternProvider } from "~/_providers";
import { useMemo, useState } from "react";
import { ModalUnitPanel } from "#/columns/@column/column-inspector/modal-panel";

const h = hyperStyled(styles);

function BackButton() {
  const breadcrumbs = useBreadcrumbs();
  const prevRoute = breadcrumbs[breadcrumbs.length - 2];
  let to = prevRoute?.match.pathname;
  return h(LinkButton, { to, icon: "arrow-left", minimal: true, small: true });
}

function ColumnOverlay({ columnInfo }: { columnInfo: ColumnSummary | null }) {
  const units = columnInfo?.units;

  const [selectedUnitID, setSelectedUnitID] = useState<number>(null);

  const selectedUnit = useMemo(() => {
    if (selectedUnitID == null || units == null) return null;
    return units.find((d) => d.unit_id == selectedUnitID);
  }, [selectedUnitID]);

  if (units == null)
    return h(NonIdealState, { title: "No column available", icon: "error" }, [
      h("p", "A stratigraphic column has not been assigned for this location."),
    ]);

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

  return h([
    h(InfoPanelSection, { className: "strat-column-panel", headerElement }, [
      h("div.strat-column-container", [
        h(Column, {
          units,
          unitComponent: ColoredUnitComponent,
          showLabelColumn: false,
          targetUnitHeight: 25,
          unconformityLabels: true,
          width: 280,
          columnWidth: 240,
          selectedUnit: selectedUnitID,
          onUnitSelected: setSelectedUnitID,
        }),
      ]),
    ]),
    h(ModalUnitPanel, {
      unitData: units,
      className: "unit-details-panel",
      selectedUnit,
      onSelectUnit: setSelectedUnitID,
      features: new Set([
        UnitDetailsFeature.JSONToggle,
        UnitDetailsFeature.DepthRange,
      ]),
    }),
  ]);
}

export function StratColumn(props) {
  return h(PatternProvider, h(ColumnOverlay, props));
}
