import { Column, ColoredUnitComponent } from "@macrostrat/column-views";

import h from "./index.module.sass";
import { ColumnSummary } from "../../../app-state/columns/columns.ts";
import { NonIdealState, Button } from "@blueprintjs/core";
import { UnitDetailsFeature, Identifier } from "@macrostrat/column-views";
import { PatternProvider } from "~/_providers";
import { useMemo, useState } from "react";
import { ModalUnitPanel } from "#/columns/@column/column-inspector/modal-panel";
import { columnInfoAtom, useAppActions } from "../../../app-state";
import { useAtomValue } from "jotai";

export function StratColumn() {
  const { data: columnInfo } = useAtomValue(columnInfoAtom);
  console.log("columnInfo (column)", columnInfo);

  return h(PatternProvider, h(ColumnOverlay, { columnInfo }));
}

function BackButton() {
  const runAction = useAppActions();
  return h(Button, {
    onClick() {
      runAction({ type: "close-column-page" });
    },
    icon: "arrow-left",
    minimal: true,
    small: true,
  });
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

  return h("div.strat-column-outer", [
    h("div.strat-column-header", [
      h(BackButton),
      h("h4", columnInfo.col_name),
      h("div.spacer"),
      h(
        "h4",
        h(Identifier, {
          id: columnInfo.col_id,
          href: `/columns/${columnInfo.col_id}`,
        })
      ),
    ]),
    h("div.strat-column-container", [
      h(Column, {
        units,
        unitComponent: ColoredUnitComponent,
        showLabelColumn: false,
        targetUnitHeight: 25,
        unconformityLabels: "minimal",
        width: 280,
        columnWidth: 240,
        allowUnitSelection: true,
        selectedUnit: selectedUnitID,
        onUnitSelected: setSelectedUnitID,
      }),
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
