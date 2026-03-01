import {
  ColoredUnitComponent,
  Column,
  DetritalColumn,
  FossilDataType,
  Identifier,
  MacrostratColumnStateProvider,
  PBDBFossilsColumn,
  ReferencesField,
} from "@macrostrat/column-views";
import { hyperStyled } from "@macrostrat/hyper";
import { useCallback, useMemo } from "react";
import { apiV2Prefix } from "@macrostrat-web/settings";
import { NavigationLinkProvider, PatternProvider } from "~/_providers";
import styles from "./index.module.sass";
import { navigate } from "vike/client/router";
import { MacrostratDataProvider } from "@macrostrat/data-provider";
import { StableIsotopesColumn } from "./facets";
import { ModalUnitPanel } from "./modal-panel";
import { PageBreadcrumbs } from "~/components";
import { onDemand } from "~/_utils";
import { ErrorBoundary } from "@macrostrat/ui-components";
import { DataField } from "@macrostrat/data-components";
import { SGPMeasurementsColumn } from "./sgp-facet";
import { ColumnExtData } from "./column-info";
import { useColumnState, ColumnSettingsPanel } from "./state";

const ColumnMap = onDemand(() => import("./map").then((mod) => mod.ColumnMap));

const h = hyperStyled(styles);

export function ColumnPage(props) {
  return h(
    NavigationLinkProvider,
    h(
      MacrostratDataProvider,
      { baseURL: apiV2Prefix },
      h(PatternProvider, h(ColumnPageInner, props))
    )
  );
}

function ColumnPageInner({ columnInfo, linkPrefix = "/", projectID }) {
  const { units } = columnInfo;

  const {
    axisType,
    facetType,
    hybridScale,
    maxInternalColumns,
    showTimescale,
    selectedUnitID,
    setSelectedUnitID,
    selectedUnit,
    t_age,
    b_age,
    t_pos,
    b_pos,
    pixelScale,
  } = useColumnState(columnInfo);

  const facetElement = useMemo(() => {
    return facetElements(facetType, columnInfo.col_id);
  }, [facetType, columnInfo.col_id]);

  const onSelectColumn = useCallback((col_id: number) => {
    // do nothing
    // We could probably find a more elegant way to do this
    navigate(`${linkPrefix}columns/${col_id}${window.location.hash}`, {
      overwriteLastHistoryEntry: true,
    });
  }, []);

  let assistantContent = h(ColumnGlobalModal, { data: columnInfo });

  if (selectedUnit != null) {
    assistantContent = h(ModalUnitPanel, {
      unitData: units,
      className: "unit-details-panel",
      selectedUnit,
      onSelectUnit: setSelectedUnitID,
    });
  }

  let children = null;
  let showLabelColumn = true;
  if (facetElement != null) {
    showLabelColumn = false;
    children = h("div.facet-container", [facetElement]);
  }

  return h("div.page-container", [
    h("div.main", [
      // This is probably too high in the page hierarchy
      h(ErrorBoundary, [
        h(
          MacrostratColumnStateProvider,
          {
            units,
            onUnitSelected: setSelectedUnitID,
            selectedUnit: selectedUnitID,
          },
          [
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
                h(
                  Column,
                  {
                    /**  TODO: we ideally would not have to force a re-render like this.
                     * It is very expensive given the complexity of the column view.
                     * However, not doing this results in artifacts (particularly with
                     * label rendering) when columns are switched.
                     */
                    units,
                    unitComponent: ColoredUnitComponent,
                    unconformityLabels: "minimal",
                    collapseSmallUnconformities: true,
                    showTimescale,
                    axisType,
                    columnWidth: 300,
                    width: 450,
                    maxInternalColumns,
                    showLabelColumn,
                    hybridScale,
                    pixelScale,
                    t_age: t_age ?? 0,
                    b_age: b_age ?? 4500,
                    t_pos,
                    b_pos,
                  },
                  children
                ),
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
          ]
        ),
      ]),
    ]),
  ]);
}

function ColumnGlobalModal({ data }) {
  return h("div.column-assistant", [
    h(ColumnBasicInfo, { data }),
    h(ColumnExtData, { columnInfo: data }),
    h(ColumnSettingsPanel),
  ]);
}

function ColumnBasicInfo({ data, showTitleRow = false, showColumnID = true }) {
  if (data == null) return null;
  console.log(data);
  return h("div.column-info", [
    h.if(showTitleRow)("div.column-title-row", [
      h("h1", data.col_name),
      h.if(showColumnID)("h2", h(Identifier, { id: data.col_id })),
    ]),
    h(DataField, {
      row: true,
      label: "Project",
      value: data.project_id,
    }),
    h(DataField, { row: true, label: "Group", value: data.col_group }, [
      h(Identifier, { id: data.col_group_id }),
    ]),
    h(ReferencesField, {
      refs: data.refs,
      inline: false,
      row: true,
      className: "column-refs",
    }),
    // Show in Map
  ]);
}

function facetElements(facet: string | null, columnID: number) {
  switch (facet) {
    case "stable-isotopes":
      return h(StableIsotopesColumn, { columnID });
    case "sgp-samples":
      return h(SGPMeasurementsColumn, { columnID });
    case "fossil-taxa":
      return h(PBDBFossilsColumn, {
        columnID,
        type: FossilDataType.Occurrences,
      });
    case "fossil-collections":
      return h(PBDBFossilsColumn, {
        columnID,
        type: FossilDataType.Collections,
      });
    case "detrital-zircons":
      return h(DetritalColumn, { columnID, color: "magenta" });
    default:
      return null;
  }
}
