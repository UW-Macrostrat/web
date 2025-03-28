import {
  ColoredUnitComponent,
  UnitSelectionProvider,
  useSelectedUnit,
  useUnitSelectionDispatch,
  Column,
} from "@macrostrat/column-views";
import { MacrostratDataProvider } from "#/../../web-components/packages/column-views/src/data-provider/base";
import { hyperStyled } from "@macrostrat/hyper";
import { getHashString, setHashString } from "@macrostrat/ui-components";
import { useEffect, useRef } from "react";
import { apiV2Prefix } from "@macrostrat-web/settings";
import { PatternProvider } from "~/_providers";
import styles from "./index.module.sass";

import { PageBreadcrumbs } from "~/components";
import { onDemand } from "~/_utils";

const ModalUnitPanel = onDemand(() => import("./modal-panel"));

const h = hyperStyled(styles);

const ColumnMap = onDemand(() => import("./map").then((mod) => mod.ColumnMap));

export function ColumnPage(props) {
  console.log(MacrostratDataProvider);

  return h(
    MacrostratDataProvider,
    { baseURL: apiV2Prefix },
    h(UnitSelectionProvider, h(PatternProvider, h(ColumnPageInner, props)))
  );
}

function ColumnPageInner({ columnInfo, linkPrefix = "/", projectID }) {
  const { units, geometry } = columnInfo;

  const selectedUnit = useUnitSelection(units);
  const setSelectedUnit = useUnitSelectionDispatch();

  const lon = new Number(columnInfo.lng);
  const lat = new Number(columnInfo.lat);
  const zoom = 7;

  return h("div.page-container", [
    h("div.main", [
      h("div.left-column", [
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
        h(ColumnMap, {
          className: "column-map",
          inProcess: true,
          projectID,
          linkPrefix,
          selectedColumn: columnInfo.col_id,
        }),
        h(ModalUnitPanel, { unitData: units, className: "unit-details-panel" }),
      ]),
    ]),
  ]);
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
