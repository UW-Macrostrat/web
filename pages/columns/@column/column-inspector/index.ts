import {
  ColoredUnitComponent,
  Column,
  Identifier,
  MacrostratColumnStateProvider,
  MacrostratDataProvider,
  ReferencesField,
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
import { ErrorBoundary } from "@macrostrat/ui-components";
import { DataField } from "@macrostrat/data-components";
import { ColumnAxisType } from "@macrostrat/column-components";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { Button, FormGroup, HTMLSelect } from "@blueprintjs/core";

const ColumnMap = onDemand(() => import("./map").then((mod) => mod.ColumnMap));

const h = hyperStyled(styles);

export function ColumnPage(props) {
  return h(
    MacrostratDataProvider,
    { baseURL: apiV2Prefix },
    h(PatternProvider, h(ColumnPageInner, props))
  );
}

const heightAxisTypeAtom = atom<ColumnAxisType>();

function inferHeightAxisType(axisType: ColumnAxisType, units): ColumnAxisType {
  if (axisType == ColumnAxisType.AGE) {
    return axisType;
  }
  // Infer axis type from units
  const u0 = units[0];
  if (u0?.t_pos != null && u0?.b_pos != null) {
    const t_pos = Number(u0.t_pos);
    const b_pos = Number(u0.b_pos);
    const d_pos = t_pos - b_pos;
    if (d_pos > 0) {
      return ColumnAxisType.HEIGHT;
    } else {
      return ColumnAxisType.DEPTH;
    }
  }
  return null;
}

function ColumnPageInner({ columnInfo, linkPrefix = "/", projectID }) {
  const { units } = columnInfo;

  const userSetAxisType = useAtomValue(heightAxisTypeAtom);
  const isSection = columnInfo.col_type == "section";

  console.log(userSetAxisType);

  const defaultAxisType = isSection
    ? ColumnAxisType.HEIGHT
    : ColumnAxisType.AGE;

  let axisType = userSetAxisType ?? defaultAxisType;
  axisType = inferHeightAxisType(axisType, units);

  // Set subsidiary options

  let maxInternalColumns = undefined;
  let unconformityLabels = true;
  let showTimescale = true;

  if (isSection) {
    maxInternalColumns = 1;
    if (axisType !== ColumnAxisType.AGE) {
      unconformityLabels = false;
      showTimescale = false;
    }
  }

  const [selectedUnitID, setSelectedUnitID] = useState<number>(
    getInitialSelectedUnitID
  );

  const selectedUnit = useMemo(() => {
    if (selectedUnitID == null) return null;
    return units.find((d) => d.unit_id == selectedUnitID);
  }, [selectedUnitID]);

  useEffect(() => {
    setHashString(selectedUnitID);
  }, [selectedUnitID]);

  const onSelectColumn = useCallback(
    (col_id: number) => {
      // do nothing
      // We could probably find a more elegant way to do this
      navigate(`${linkPrefix}columns/${col_id}${window.location.hash}`, {
        overwriteLastHistoryEntry: true,
      });
    },
    [setSelectedUnitID]
  );

  let assistantContent = h(ColumnGlobalModal, { data: columnInfo });

  if (selectedUnit != null) {
    assistantContent = h(ModalUnitPanel, {
      unitData: units,
      className: "unit-details-panel",
      selectedUnit,
      onSelectUnit: setSelectedUnitID,
    });
  }

  return h("div.page-container", [
    h("div.main", [
      // This is probably too high in the page hierarchy
      h(ErrorBoundary, [
        h(MacrostratColumnStateProvider, { units }, [
          h("div.left-column", [
            h("div.column-header", [
              h("nav", [
                h(PageBreadcrumbs, {
                  showLogo: true,
                  title: columnInfo.col_name,
                }),
              ]),
            ]),
            h("div.column-view", [
              h(Column, {
                units,
                unitComponent: ColoredUnitComponent,
                unconformityLabels,
                collapseSmallUnconformities: true,
                showTimescale,
                axisType,
                columnWidth: 300,
                width: 450,
                onUnitSelected: setSelectedUnitID,
                selectedUnit: selectedUnitID,
                maxInternalColumns,
              }),
            ]),
          ]),
          h("div.right-column", [
            h("div.right-column-boxes", [
              h(ColumnMap, {
                className: "column-map",
                inProcess: true,
                projectID,
                selectedColumn: columnInfo.col_id,
                onSelectColumn,
              }),
              assistantContent,
            ]),
          ]),
        ]),
      ]),
    ]),
  ]);
}

function ColumnGlobalModal({ data }) {
  return h("div.column-assistant", [
    h(ColumnBasicInfo, { data }),
    h(ColumnSettingsPanel),
  ]);
}

function ColumnBasicInfo({ data, showColumnID = true }) {
  if (data == null) return null;
  return h("div.column-info", [
    h("div.column-title-row", [
      h("h1", data.col_name),
      h.if(showColumnID)("h2", h(Identifier, { id: data.col_id })),
    ]),
    h(DataField, {
      row: true,
      label: "Project",
      value: data.project_id,
    }),
    h(DataField, { row: true, label: "Group", value: data.col_group }),
    h(ReferencesField, {
      refs: data.refs,
      inline: false,
      row: true,
      className: "column-refs",
    }),
    // Show in Map
  ]);
}

let ageAxisOptions = {
  Height: ColumnAxisType.HEIGHT,
  Age: ColumnAxisType.AGE,
};

function ColumnSettingsPanel() {
  return h("div.column-settings-panel", [h(AxisTypeControl)]);
}

function AxisTypeControl() {
  const optionsValues = Object.entries(ageAxisOptions).map(([k, v]) => {
    return { label: k, value: v };
  });
  const [axisType, setAxisType] = useAtom(heightAxisTypeAtom);
  return h(
    FormGroup,
    { label: "Axis type", inline: true },
    h([
      h(HTMLSelect, {
        options: optionsValues,
        value: axisType,
        onChange: (evt) => {
          const value = evt.target.value as ColumnAxisType;
          // set axis type
          console.log("Selected axis type:", value);
          setAxisType(value);
        },
      }),
      h(Button, {
        minimal: true,
        small: true,
        icon: "cross",
        disabled: axisType == null,
        onClick: () => setAxisType(null),
      }),
    ])
  );
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
