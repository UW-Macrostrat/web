/** Proving ground for the hybrid content/map page frame (`~/layouts/hybrid`),
 * and a dry run for the real column list page.
 *
 * The content pane is a `DataPanel` (`@macrostrat/data-sheet`) over the *whole*
 * grouped-columns dataset held in memory, with a windowed scroll body. That
 * combination is deliberate: an in-memory `data` array makes `DataPanel` load
 * everything in a single page, so there's no infinite-scroll pausing and every
 * row stays addressable — which is what keeps list↔map selection exact. Only
 * the DOM is windowed.
 */

import { HTMLSelect, Spinner, Tag } from "@blueprintjs/core";
import {
  DataPanel,
  DataPanelToolbarStyle,
  ctx,
  getSelectedRowIndices,
  rowIndicesToRegions,
  selectionAtom,
} from "@macrostrat/data-sheet";
import { DataField } from "@macrostrat/data-components";
import { useCallback, useEffect, useMemo, useState } from "react";
import classNames from "classnames";

import { Link } from "~/components";
import { createWindowedScrollBody } from "~/components/data-view";
import { HybridPage, type LayoutCapabilities } from "~/layouts/hybrid";
import { onDemand } from "~/_utils";
import {
  getGroupedColumns,
  type ColumnGroup,
} from "../../columns/index/grouped-cols";

import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

const DemoColumnMap = onDemand(() =>
  import("./map.client").then((mod) => mod.DemoColumnMap)
);

/** Row height must match `.column-row` in `main.module.sass` — the windowed
 * body positions cards absolutely, so it can't measure them. */
const ROW_HEIGHT = 28;
const GROUP_HEIGHT = 32;

const ColumnScrollBody = createWindowedScrollBody<ColumnRow>({
  rowHeight: ROW_HEIGHT,
  groupHeight: GROUP_HEIGHT,
  groupOf: (row) => {
    if (row == null) return null;
    return { key: row.col_group_id ?? -1, label: row.col_group ?? "Ungrouped" };
  },
});

const columnSpec = [
  { key: "col_id", name: "ID", sortable: true },
  { key: "col_name", name: "Name", sortable: true, filterable: true },
  { key: "col_group", name: "Group", filterable: true },
  { key: "t_units", name: "Units", dataType: "integer", sortable: true },
];

/** Capability presets standing in for the real pages this frame targets. */
const presets: Record<string, Partial<LayoutCapabilities>> = {
  "Column list (all modes)": {},
  "Column page (no full-bleed map)": {
    modes: ["content-only", "content-primary"],
    defaultMode: "content-primary",
  },
  "Fullscreen only": {
    presentations: ["fullscreen"],
  },
  "No assistant content": {
    hasAssistant: false,
  },
};

const presetNames = Object.keys(presets);

interface ColumnRow {
  col_id: number;
  col_name: string;
  col_group?: string;
  col_group_id?: number | null;
  project_id: number;
  status_code: string;
  t_units: number;
  t_sections: number;
  col_area: number;
}

export function Page() {
  const [presetName, setPresetName] = useState(presetNames[0]);
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  const { rows, loading } = useGroupedColumnRows();

  const selected = useMemo(() => {
    if (selectedColumn == null) return null;
    return rows.find((row) => row.col_id === selectedColumn) ?? null;
  }, [rows, selectedColumn]);

  let content = h("div.list-loading", h(Spinner));
  if (!loading) {
    content = h(ColumnListPanel, {
      rows,
      selectedColumn,
      onSelectColumn: setSelectedColumn,
    });
  }

  return h(HybridPage, {
    // Capabilities are hydrated once per frame instance, so remount when the
    // demo switches presets.
    key: presetName,
    capabilities: presets[presetName],
    actions: h(PresetSelector, { presetName, setPresetName }),
    content,
    map: h(DemoColumnMap, {
      selectedColumn,
      onSelectColumn: setSelectedColumn,
    }),
    assistant: h(ColumnDetails, { selected, count: rows.length }),
  });
}

/** The full grouped-columns dataset, flattened to rows in group order. One
 * request, everything in memory — the same shape the real page fetches. */
function useGroupedColumnRows() {
  const [groups, setGroups] = useState<ColumnGroup[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getGroupedColumns({ project_id: 14, status_code: "active" } as any).then(
      (result) => {
        if (!cancelled) setGroups(result);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    if (groups == null) return [];
    return groups.flatMap((group) =>
      group.columns.map((col) => ({
        ...col,
        col_group: group.name,
        col_group_id: group.id,
      }))
    ) as ColumnRow[];
  }, [groups]);

  return { rows, loading: groups == null };
}

function ColumnListPanel({ rows, selectedColumn, onSelectColumn }) {
  return h(
    DataPanel<ColumnRow>,
    {
      className: "column-panel",
      name: "Columns",
      itemLabel: "column",
      data: rows,
      identity: (row) => row?.col_id,
      columnSpec: columnSpec as any,
      itemComponent: ColumnRowCard,
      scrollBody: ColumnScrollBody,
      toolbarStyle: DataPanelToolbarStyle.MINIMAL,
      viewControls: "popover",
    },
    h(SelectionBridge, { rows, selectedColumn, onSelectColumn })
  );
}

/** Bridges the panel's selection store to the page's selected column, so the
 * map and the list read from one value in both directions. The panel store
 * stays the selection's home; this only mirrors the leading row out and writes
 * a map-originated pick back in. */
function SelectionBridge({ rows, selectedColumn, onSelectColumn }) {
  const selection = ctx.useValue(selectionAtom) ?? [];
  const setSelection = ctx.useSet(selectionAtom);

  const panelColumn = useMemo(() => {
    const indices = getSelectedRowIndices(selection);
    if (indices.length === 0) return null;
    return rows[indices[0]]?.col_id ?? null;
  }, [selection, rows]);

  useEffect(() => {
    if (panelColumn === selectedColumn) return;
    onSelectColumn(panelColumn);
  }, [panelColumn]);

  useEffect(() => {
    if (panelColumn === selectedColumn) return;
    if (selectedColumn == null) {
      setSelection([]);
      return;
    }
    const index = rows.findIndex((row) => row.col_id === selectedColumn);
    if (index < 0) return;
    setSelection(rowIndicesToRegions(new Set([index])));
  }, [selectedColumn, rows]);

  return null;
}

function ColumnRowCard({ data, selected, onSelect }) {
  const { col_id, col_name, t_units, t_sections, status_code } = data;

  let unitsTag = null;
  if (t_units > 0) {
    unitsTag = h(Tag, { minimal: true, size: "small" }, `${t_units} units`);
  }

  let packagesTag = null;
  if (t_sections > 0) {
    packagesTag = h(
      Tag,
      { minimal: true, size: "small", color: "goldenrod" },
      `${t_sections} pkg`
    );
  }

  let statusTag = null;
  if (status_code === "in process") {
    statusTag = h(
      Tag,
      { minimal: true, size: "small", color: "lightgreen" },
      "in process"
    );
  }

  return h(
    "div.column-row",
    { className: classNames({ selected }), onClick: onSelect },
    [
      h("code.col-id", col_id),
      h("span.col-name", col_name),
      statusTag,
      packagesTag,
      unitsTag,
    ]
  );
}

function PresetSelector({ presetName, setPresetName }) {
  return h(HTMLSelect, {
    minimal: true,
    small: true,
    value: presetName,
    options: presetNames,
    onChange: (evt) => setPresetName(evt.currentTarget.value),
  });
}

function ColumnDetails({ selected, count }) {
  if (selected == null) {
    return h("div.assistant", [
      h("h2", "Details"),
      h(
        "p.assistant-empty",
        `${count} columns loaded. Select one in the list or on the map — this panel moves between a column, an inset under the map, and a floating overlay as the layout changes.`
      ),
    ]);
  }

  const { col_id, col_name, col_group, col_area, project_id, t_units } =
    selected;

  return h("div.assistant", [
    h("h2", col_name),
    h(DataField, { row: true, label: "Column", value: col_id }),
    h(DataField, { row: true, label: "Group", value: col_group }),
    h(DataField, { row: true, label: "Units", value: t_units }),
    h(DataField, { row: true, label: "Area", value: col_area, unit: "km²" }),
    h(DataField, { row: true, label: "Project", value: project_id }),
    h(
      "p.assistant-link",
      h(Link, { href: `/columns/${col_id}` }, "Open column page")
    ),
  ]);
}
