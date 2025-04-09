import {
  ColoredUnitComponent,
  MacrostratDataProvider,
  Column,
} from "@macrostrat/column-views";
import { hyperStyled } from "@macrostrat/hyper";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiV2Prefix } from "@macrostrat-web/settings";
import { PatternProvider } from "~/_providers";
import styles from "./index.module.sass";
import { navigate } from "vike/client/router";

import { ModalUnitPanel } from "./modal-panel";

import { PageBreadcrumbs } from "~/components";
import { onDemand } from "~/_utils";

const ColumnMap = onDemand(() => import("./map").then((mod) => mod.ColumnMap));

const h = hyperStyled(styles);

export function ColumnPage(props) {
  return h(
    MacrostratDataProvider,
    { baseURL: apiV2Prefix },
    h(PatternProvider, h(ColumnPageInner, props))
  );
}

function ColumnPageInner({ columnInfo, linkPrefix = "/", projectID }) {
  const { units } = columnInfo;

  const [selectedUnitID, setSelectedUnitID] = useState<number>(
    getInitialSelectedUnitID
  );

  const selectedUnit = useMemo(() => {
    return units.find((d) => d.unit_id == selectedUnitID);
  }, [selectedUnitID]);

  useEffect(() => {
    setHashString(selectedUnitID);
  }, [selectedUnitID]);

  console.log(columnInfo);

  const lon = new Number(columnInfo.lng);
  const lat = new Number(columnInfo.lat);
  const zoom = 7;

  const onSelectColumn = useCallback(
    (col_id: number) => {
      // do nothing
      // We could probably find a more elegant way to do this
      setSelectedUnitID(null);
      navigate(linkPrefix + `columns/${col_id}`, {
        overwriteLastHistoryEntry: true,
      });
    },
    [setSelectedUnitID]
  );

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
            units,
            unitComponent: ColoredUnitComponent,
            unconformityLabels: true,
            collapseSmallUnconformities: true,
            columnWidth: 300,
            width: 450,
            onUnitSelected: setSelectedUnitID,
            selectedUnit: selectedUnitID,
          }),
        ]),
      ]),
      h("div.right-column", [
        h(ColumnMap, {
          className: "column-map",
          inProcess: true,
          projectID,
          selectedColumn: columnInfo.col_id,
          onSelectColumn,
        }),
        h(ModalUnitPanel, {
          unitData: units,
          className: "unit-details-panel",
          selectedUnit,
          onSelectUnit: setSelectedUnitID,
        }),
      ]),
    ]),
  ]);
}

function getHashParams() {
  // Harvest selected unit ID from hash string
  const currentHash = document.location.hash.substring(1);
  return new URLSearchParams(currentHash);
}

function getInitialSelectedUnitID() {
  // Harvest selected unit ID from hash string
  const params = getHashParams();
  const unit_id = params.get("unit");
  // If no unit_id, return null
  if (unit_id == null) return null;
  const id = parseInt(unit_id);
  if (isNaN(id)) return null;
  return id;
}

function setHashString(selectedUnitID: number) {
  const params = getHashParams();
  params.delete("unit");
  if (selectedUnitID != null) {
    params.set("unit", selectedUnitID.toString());
  }
  console.log(selectedUnitID, params);
  const newHash = params.toString();
  if (newHash !== document.location.hash) {
    document.location.hash = newHash;
  }
}
