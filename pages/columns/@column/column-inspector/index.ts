/** The column page, on the hybrid content/map frame (`~/layouts/hybrid`).
 *
 * The column is the content; the navigation map and the column's details (or
 * the selected unit's) ride in the sidebar as the map and assistant slots. The
 * time filter tag and the display settings live in the frame's header actions,
 * so the assistant reads as the column's description and nothing else.
 */
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
import { useCallback, useEffect, useMemo, useRef } from "react";
import { AnchorButton } from "@blueprintjs/core";
import { apiV2Prefix } from "@macrostrat-web/settings";
import { NavigationLinkProvider, PatternProvider } from "~/_providers";
import { navigate } from "vike/client/router";
import { MacrostratDataProvider } from "@macrostrat/data-provider";
import { StableIsotopesColumn } from "./facets";
import { ModalUnitPanel } from "./modal-panel";
import { onDemand } from "~/_utils";
import { ErrorBoundary } from "@macrostrat/ui-components";
import { DataField } from "@macrostrat/data-components";
import { SGPMeasurementsColumn } from "./sgp-facet";
import { ColumnExtData } from "./column-info";
import { HybridPage, type LayoutCapabilities } from "~/layouts/hybrid";
import { Footer } from "~/layouts/footer";
import {
  columnInfoAtom,
  ColumnSettingsButton,
  columnTimeFilterAtom,
  useColumnSelection,
  useColumnState,
  useSetFacet,
} from "./state";
import {
  ageExtentOfUnits,
  TIME_FILTER_KEYS,
  TimeFilterProvider,
  TimeFilterTag,
  useTargetUnitHeight,
  useTimeFilterWindow,
} from "~/components/time-filter";

import h from "./index.module.sass";

const ColumnMap = onDemand(() => import("./map").then((mod) => mod.ColumnMap));

/** The column is the content here, so a map-dominant view has no reading; the
 * page scrolls as a whole, the way a single tall document should. */
const columnPageCapabilities: Partial<LayoutCapabilities> = {
  modes: ["content-only", "content-primary"],
  defaultMode: "content-primary",
  hasAssistant: true,
  itemName: "Column",
  contentScroll: "page",
};

export function ColumnPage(props) {
  return h(
    NavigationLinkProvider,
    h(
      MacrostratDataProvider,
      { baseURL: apiV2Prefix },
      h(
        TimeFilterProvider,
        { atom: columnTimeFilterAtom },
        h(PatternProvider, h(ColumnPageFrame, props))
      )
    )
  );
}

function ColumnPageFrame({
  columnInfo,
  linkPrefix = "/",
  projectID,
  project,
  columnProjects,
}) {
  // The frame isolates every atom read inside it, so the column is seeded
  // through `initialAtoms`; `useColumnState` keeps it current afterwards.
  const initialAtoms = useMemo(
    () => [[columnInfoAtom, columnInfo]] as [any, any][],
    [columnInfo]
  );

  return h(HybridPage, {
    className: "column-page",
    capabilities: columnPageCapabilities,
    initialAtoms,
    actions: h(ColumnSettingsButton),
    // Active filters sit in a second header row above the column
    filterBar: h(TimeFilterTag),
    content: h(ColumnContentPane, { columnInfo }),
    map: h(ColumnMapPane, { columnInfo, linkPrefix, projectID }),
    assistant: h(ColumnAssistantPane, { columnInfo, project, columnProjects }),
  });
}

/* -------------------------------------------------------------- the column */

function ColumnContentPane({ columnInfo }) {
  const { units } = columnInfo;

  const {
    axisType,
    facetType,
    hybridScale,
    maxInternalColumns,
    showTimescale,
    selectedUnitID,
    setSelectedUnitID,
    t_pos,
    b_pos,
    pixelScale,
  } = useColumnState(columnInfo);

  // The rendered age window follows the shared time filter, animating between
  // targets; with no filter it is the column's full extent.
  const fullExtent = useMemo(() => ageExtentOfUnits(units), [units]);
  const timeWindow = useTimeFilterWindow({ fullExtent });

  // Narrowing the window expands the vertical scale slightly (a quarter-power
  // of the zoom ratio), and the few units visible in a tight window share the
  // column height rather than huddling at the library's default 20px. Keyed on
  // the window the animation is heading to, so density settles once per filter
  // change. A fixed pixel scale (set in the settings) makes this moot — the
  // library ignores the target then.
  const targetUnitHeight = useTargetUnitHeight(
    units,
    timeWindow.targetWindow,
    fullExtent,
    { base: 20, max: 120, fillHeight: 600 }
  );

  const facetElement = useMemo(() => {
    return facetElements(facetType, columnInfo.col_id);
  }, [facetType, columnInfo.col_id]);

  const onUnitSelected = useCallback(
    (unitID: number | null) => {
      setSelectedUnitID(unitID);
    },
    [setSelectedUnitID]
  );

  let children = null;
  let showLabelColumn = true;
  if (facetElement != null) {
    showLabelColumn = false;
    children = h("div.facet-container", [facetElement]);
  }

  return h("div.column-content", [
    h(
      ErrorBoundary,
      h(
        MacrostratColumnStateProvider,
        {
          units,
          onUnitSelected,
          selectedUnit: selectedUnitID,
        },
        h(
          "div.column-view",
          h(
            Column,
            {
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
              targetUnitHeight,
              t_age: timeWindow.window?.t_age,
              b_age: timeWindow.window?.b_age,
              // A margin past an interval selection; none for explicit ages
              windowPadding: timeWindow.windowPadding,
              isTransitioning: timeWindow.isAnimating,
              // Labels re-lay-out every frame otherwise, which is the jank.
              hideLabelsWhileTransitioning: true,
              onClickTimescaleInterval: timeWindow.onClickTimescaleInterval,
              timescaleIntervalStyle: timeWindow.timescaleIntervalStyle,
              t_pos,
              b_pos,
            },
            children
          )
        )
      )
    ),
    h(Footer, { className: "page-footer" }),
  ]);
}

/* ----------------------------------------------------------------- the map */

function ColumnMapPane({ columnInfo, linkPrefix, projectID }) {
  const modifierHeld = useModifierKeyRef();

  const onSelectColumn = useCallback(
    (col_id: number | null) => {
      if (col_id == null || col_id === columnInfo.col_id) return;
      const withModifier = modifierHeld.current;
      modifierHeld.current = false;
      if (withModifier) {
        // Start a correlation between this column and the clicked one
        navigate(correlationHref([columnInfo.col_id, col_id]));
        return;
      }
      // Column-to-column navigation carries the hash, so the time filter and
      // display settings follow you.
      navigate(`${linkPrefix}columns/${col_id}${window.location.hash}`, {
        overwriteLastHistoryEntry: true,
      });
    },
    [columnInfo.col_id, linkPrefix]
  );

  return h("div.column-map-pane", [
    h(ColumnMap, {
      className: "column-map",
      inProcess: true,
      projectID,
      selectedColumn: columnInfo.col_id,
      onSelectColumn,
    }),
    h("div.map-hint", "Click a column to open it · ⌘/Ctrl-click to correlate"),
  ]);
}

/** Whether the pointer press behind the current click carried a modifier key.
 * The map's selection callback doesn't expose the event, so the modifier is
 * captured on the way down and read when the selection fires. */
function useModifierKeyRef() {
  const ref = useRef(false);
  useEffect(() => {
    const onPointerDown = (evt: PointerEvent) => {
      ref.current = evt.ctrlKey || evt.metaKey;
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, []);
  return ref;
}

/** Link to the correlation page with a manual column selection, carrying the
 * current time filter across (both pages share the hash vocabulary). */
function correlationHref(colIDs: number[]): string {
  const ids = Array.from(new Set(colIDs));
  const parts = [`columns=${ids.join(",")}`];
  const current = new URLSearchParams(window.location.hash.slice(1));
  for (const key of TIME_FILTER_KEYS) {
    const value = current.get(key);
    if (value != null) parts.push(`${key}=${encodeURIComponent(value)}`);
  }
  return `/columns/correlation#${parts.join("&")}`;
}

/* ----------------------------------------------------------- the assistant */

function ColumnAssistantPane({ columnInfo, project, columnProjects }) {
  const { units } = columnInfo;
  const { selectedUnit, setSelectedUnitID } = useColumnSelection();

  if (selectedUnit != null) {
    // The one piece of assistant content that reads as a card
    return h(ModalUnitPanel, {
      unitData: units,
      className: "unit-details-panel",
      selectedUnit,
      onSelectUnit: setSelectedUnitID,
    });
  }
  return h(ColumnInfoPanel, { data: columnInfo, project, columnProjects });
}

function ColumnInfoPanel({ data, project, columnProjects }) {
  const setFacet = useSetFacet();
  return h("div.column-assistant", [
    h(ColumnBasicInfo, { data, project, columnProjects }),
    h(ColumnExtData, { columnInfo: data, onSelectFacet: setFacet }),
    h("div.column-actions", [
      h(AnchorButton, {
        minimal: true,
        small: true,
        icon: "comparison",
        text: "Correlate with other columns",
        href: correlationHref([data.col_id]),
      }),
    ]),
  ]);
}

function ColumnBasicInfo({
  data,
  project,
  columnProjects,
  showTitleRow = false,
  showColumnID = true,
}) {
  if (data == null) return null;
  const groupHref = `/projects/${data.project_id}/groups/${data.col_group_id}`;

  // The column's own project, plus composites that include it (e.g. a North
  // America column is also in "Core columns"). Falls back to the one project
  // the page loaded when the full list isn't available.
  let projects: Array<{ project_id: number; project: string }> =
    columnProjects ?? [];
  if (projects.length === 0) {
    projects = [
      {
        project_id: data.project_id,
        project: project?.project ?? `Project ${data.project_id}`,
      },
    ];
  }
  let projectLabel = "Project";
  if (projects.length > 1) {
    projectLabel = "Projects";
  }

  return h("div.column-info", [
    h.if(showTitleRow)("div.column-title-row", [
      h("h1", data.col_name),
      h.if(showColumnID)("h2", h(Identifier, { id: data.col_id })),
    ]),
    h(DataField, {
      row: true,
      label: projectLabel,
      value: h(
        "div.project-list",
        projects.map((p) =>
          h("div.project-item", { key: p.project_id }, [
            h("a.field-link", { href: `/projects/${p.project_id}` }, p.project),
            h(Identifier, { id: p.project_id }),
          ])
        )
      ),
    }),
    h(
      DataField,
      {
        row: true,
        label: "Group",
        value: h("a.field-link", { href: groupHref }, data.col_group),
      },
      [h(Identifier, { id: data.col_group_id })]
    ),
    h(ReferencesField, {
      refs: data.refs,
      inline: false,
      row: true,
      className: "column-refs",
    }),
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
