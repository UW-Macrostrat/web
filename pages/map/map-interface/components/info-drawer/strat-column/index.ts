import { Column, ColoredUnitComponent } from "@macrostrat/column-views";

import h from "./index.module.sass";
import { ColumnSummary } from "../../../app-state/columns/columns.ts";
import { Button, NonIdealState, Switch } from "@blueprintjs/core";
import {
  Identifier,
  ReferencesField,
  UnitDetailsFeature,
  UnitSelectionStyle,
} from "@macrostrat/column-views";
import { DataField } from "@macrostrat/data-components";
import { useProjectDefs } from "~/components/project-filter";
import { PatternProvider } from "~/_providers";
import { useMemo, useState } from "react";
import { ModalUnitPanel } from "#/columns/@column/column-inspector/modal-panel";
import {
  ageExtentOfUnits,
  TimeFilterProvider,
  useTargetUnitHeight,
  useTimeFilterWindow,
} from "~/components/time-filter";
import {
  columnInfoAtom,
  columnTimeFilterAtom,
  filterMapUnitsAtom,
  useAppActions,
} from "../../../app-state";
import { useAtom, useAtomValue } from "jotai";
import { ColumnPageButton, FootprintControl } from "../macrostrat-linked";

/** A selected unit keeps its color while the rest of the column goes plain */
const selectedUnitProps = { selectionStyle: UnitSelectionStyle.ColorSelected };

export function StratColumn() {
  const { data: columnInfo } = useAtomValue(columnInfoAtom);

  // The column's timescale sets its window, and the map's filter when linked
  return h(
    TimeFilterProvider,
    { atom: columnTimeFilterAtom },
    h(PatternProvider, h(ColumnOverlay, { columnInfo }))
  );
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

  const fullExtent = useMemo(() => ageExtentOfUnits(units), [units]);
  const timeWindow = useTimeFilterWindow({ fullExtent });
  const targetUnitHeight = useTargetUnitHeight(
    units,
    timeWindow.targetWindow,
    fullExtent,
    { base: 25, max: 120, fillHeight: 500 }
  );

  if (units == null)
    return h(NonIdealState, { title: "No column available", icon: "error" }, [
      h("p", "A stratigraphic column has not been assigned for this location."),
    ]);

  let footer = h(ColumnSettings);
  // The unit panel carries its own references; two sets read as one confusion
  let metadata = h(ColumnMetadata, { columnInfo });
  if (selectedUnit != null) {
    metadata = null;
    footer = h(ModalUnitPanel, {
      unitData: units,
      className: "unit-details-panel",
      selectedUnit,
      onSelectUnit: setSelectedUnitID,
      features: new Set([
        UnitDetailsFeature.JSONToggle,
        UnitDetailsFeature.DepthRange,
      ]),
    });
  }

  // Only the middle scrolls, so its scrollbar stops short of the footer
  return h("div.strat-column-outer", [
    h(ColumnHeader, { columnInfo }),
    h("div.strat-column-scroll", [
      h("div.strat-column-container", [
        h(Column, {
          units,
          unitComponent: ColoredUnitComponent,
          unitComponentProps: selectedUnitProps,
          showLabelColumn: false,
          targetUnitHeight,
          unconformityLabels: "minimal",
          width: 280,
          columnWidth: 240,
          allowUnitSelection: true,
          selectedUnit: selectedUnitID,
          onUnitSelected: setSelectedUnitID,
          t_age: timeWindow.window?.t_age,
          b_age: timeWindow.window?.b_age,
          windowPadding: timeWindow.windowPadding,
          isTransitioning: timeWindow.isAnimating,
          hideLabelsWhileTransitioning: true,
          onClickTimescaleInterval: timeWindow.onClickTimescaleInterval,
          timescaleIntervalStyle: timeWindow.timescaleIntervalStyle,
        }),
      ]),
      metadata,
    ]),
    footer,
  ]);
}

function ColumnHeader({ columnInfo }) {
  return h("header.strat-column-header", [
    h(BackButton),
    h("h3.column-heading", columnInfo.col_name),
    h("div.spacer"),
    h(ColumnPageButton, { col_id: columnInfo.col_id }),
  ]);
}

/** The column's project, group and references, as on the column page */
function ColumnMetadata({ columnInfo }) {
  const { project_id, col_group, col_group_id } = columnInfo;
  const projects = useProjectDefs();
  const project = projects?.find((d) => d.project_id == project_id);

  let projectField = null;
  if (project_id != null) {
    const name = project?.project ?? `Project ${project_id}`;
    projectField = h(
      DataField,
      {
        row: true,
        label: "Project",
        value: h(
          "a",
          { href: `/projects/${project?.slug ?? project_id}` },
          name
        ),
      },
      h(Identifier, { id: project_id })
    );
  }

  let groupField = null;
  if (col_group != null) {
    const href = `/projects/${project_id}/groups/${col_group_id}`;
    groupField = h(
      DataField,
      { row: true, label: "Group", value: h("a", { href }, col_group) },
      h.if(col_group_id != null)(Identifier, { id: col_group_id })
    );
  }

  return h("div.column-metadata", [
    projectField,
    groupField,
    h(ReferencesField, { refs: columnInfo.refs, inline: false }),
  ]);
}

/** Display settings, docked at the foot of the panel */
function ColumnSettings() {
  const [filterMapUnits, setFilterMapUnits] = useAtom(filterMapUnitsAtom);
  return h("div.column-settings", [
    h(Switch, {
      className: "filter-map-switch",
      label: "Filter map units",
      alignIndicator: "right",
      checked: filterMapUnits,
      onChange(evt) {
        setFilterMapUnits(evt.currentTarget.checked);
      },
    }),
    h(FootprintControl),
  ]);
}
