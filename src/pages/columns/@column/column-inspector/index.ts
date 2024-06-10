import { MacrostratAPIProvider } from "@macrostrat/api-views";
import {
  ColumnNavigatorMap,
  UnitSelectionProvider,
  useSelectedUnit,
  useUnitSelectionDispatch,
  Column,
} from "@macrostrat/column-views";
import { hyperStyled } from "@macrostrat/hyper";
import { getHashString, setHashString } from "@macrostrat/ui-components";
import { useEffect, useRef } from "react";
import { apiV2Prefix } from "@macrostrat-web/settings";
import { PatternProvider } from "~/_providers";
import styles from "./column-inspector.module.styl";
import ModalUnitPanel from "./modal-panel";
import { BasePage } from "~/layouts";
import { PageHeader } from "~/components";

import { navigate } from "vike/client/router";
import { PageBreadcrumbs } from "~/renderer";

const h = hyperStyled(styles);

function ColumnPage({ columnInfo, linkPrefix = "/", project }) {
  const { units, geometry } = columnInfo;

  const selectedUnit = useUnitSelection(units);

  console.log(project, columnInfo);

  const lon = new Number(columnInfo.lng);
  const lat = new Number(columnInfo.lat);
  const zoom = 7;

  return h(BasePage, [
    h("div.main", [
      h("div.column-header", [
        h("nav", [h(PageBreadcrumbs)]),
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
              columnWidth: 250,
              width: 500,
              unitComponentProps: {
                nColumns: 3,
              },
            }),
          ]),
        ]),
        h("div.right-column", [
          h(ColumnNavigatorMap, {
            className: "column-map",
            format: "geojson_bare",
            currentColumn: {
              geometry,
              type: "Feature",
              properties: {
                col_id: columnInfo.col_id,
                col_name: columnInfo.col_name,
                project_id: columnInfo.project_id,
              },
            },
            style: {
              display: selectedUnit == null ? "block" : "none",
            },
            setCurrentColumn(newColumn) {
              const { col_id } = newColumn.properties;
              navigate(linkPrefix + `columns/${col_id}`, {
                overwriteLastHistoryEntry: true,
              });
            },
            margin: 10,
            project_id: columnInfo.project_id,
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
