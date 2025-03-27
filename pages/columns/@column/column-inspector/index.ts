import {
  ColoredUnitComponent,
  MacrostratAPIProvider,
  ColumnNavigationMap,
  UnitSelectionProvider,
  useSelectedUnit,
  useUnitSelectionDispatch,
  Column,
} from "@macrostrat/column-views";
import { hyperStyled } from "@macrostrat/hyper";
import { getHashString, setHashString } from "@macrostrat/ui-components";
import { useEffect, useRef } from "react";
import { apiV2Prefix, mapboxAccessToken } from "@macrostrat-web/settings";
import { PatternProvider } from "~/_providers";
import styles from "./column-inspector.module.styl";
import { BasePage } from "~/layouts";

import { navigate } from "vike/client/router";
import { PageBreadcrumbs } from "~/components";
import { onDemand } from "~/_utils";

const ModalUnitPanel = onDemand(() => import("./modal-panel"));

const h = hyperStyled(styles);

function ColumnPage({ columnInfo, linkPrefix = "/", project }) {
  const { units, geometry } = columnInfo;

  const selectedUnit = useUnitSelection(units);

  const lon = new Number(columnInfo.lng);
  const lat = new Number(columnInfo.lat);
  const zoom = 7;

  return h(BasePage, [
    h("div.main", [
      h("div.column-header", [
        h("nav", [h(PageBreadcrumbs, { showLogo: true })]),
        h("h1.page-title", [
          h("span.col-name", columnInfo.col_name),
          h.if(columnInfo.col_group != null)("span.subtitle", [
            h("span.separator", " – "),
            h("span.col-group", `${columnInfo.col_group}`),
          ]),
        ]),
      ]),
      //h(PageHeader, { title: columnInfo.col_name, className: "column-header" }),
      h("div.column-ui", [
        h("div.left-column", [
          h("div.column-view", [
            h("p.column-details", [
              h("span.column-id", ["#", columnInfo.col_id]),
              ", ",
              h("span.project", ["project ", columnInfo.project_id]),
              ", ",
              h(
                "a",
                {
                  href: `/map/loc/${lon}/${lat}/column#z=${zoom}&show=columns,geology`,
                },
                "show in map"
              ),
              ".",
            ]),
            h(Column, {
              data: units,
              unconformityLabels: true,
              columnWidth: 350,
              width: 600,
              unitComponent: ColoredUnitComponent,
              unitComponentProps: {
                nColumns: 5,
              },
            }),
          ]),
        ]),
        h("div.right-column", [
          h(ColumnNavigationMap, {
            style: {
              height: "400px",
              width: "400px",
            },
            inProcess: true,
            projectId: columnInfo.project_id,
            accessToken: mapboxAccessToken,
            selectedColumn: columnInfo.col_id,
            onSelectColumn(colID) {
              navigate(linkPrefix + `columns/${colID}`, {
                overwriteLastHistoryEntry: true,
              });
            },
          }),
          h(ModalUnitPanel, { unitData: units }),
        ]),
      ]),
    ]),
  ]);
}

export default function ColumnInspector({ columnInfo, linkPrefix }) {
  return h(
    MacrostratAPIProvider,
    { baseURL: apiV2Prefix },
    h(
      UnitSelectionProvider,
      h(PatternProvider, h(ColumnPage, { columnInfo, linkPrefix }))
    )
  );
}

function useUnitSelection(units): number {
  /* Harmonize selected unit and column data providers
    TODO: we could link the providers for selecting units and columns,
    but for now we have just nested together current separate state elements
  */

  const initializedRef = useRef(false);
  const initialized = initializedRef.current;

  // TODO: this API should probably be moved into the column itself. We shouldn't need
  // to use a context for this.
  const selectedUnit = useSelectedUnit();
  const setSelectedUnit = useUnitSelectionDispatch();

  useEffect(() => {
    // Set initial unit selection
    if (units.length == 0) return;
    if (!initialized) {
      // Harvest selected unit ID from hash string
      const unit_id =
        getHashString(document.location.hash)?.unit ?? selectedUnit?.unit_id;

      const unit = units.find((d) => d.unit_id == unit_id);
      setSelectedUnit(unit);
      initializedRef.current = true;
    } else {
      setHashString({ unit: selectedUnit?.unit_id });
      setSelectedUnit(selectedUnit);
    }
  }, [units, selectedUnit]);

  return selectedUnit?.unit_id;
}
