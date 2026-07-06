/**
 * "Column controls" strip, shown at the top of the table. Always rendered (so
 * the table doesn't jump as the selection changes); its content depends on the
 * column selection:
 *  - none: a hint
 *  - one whole column: that column's sort / filter / group-by / hide controls
 *  - multiple whole columns: a bulk "hide columns" control
 * Wired to the jotai view-state atoms. Rendered inside the DataSheet provider so
 * it can read the current selection via data-sheet's `useSelector`.
 */
import { useSelector } from "@macrostrat/data-sheet";
import { Button, ButtonGroup, HTMLSelect, InputGroup } from "@blueprintjs/core";
import { useAtom, useSetAtom } from "jotai";
import { useRef, useState } from "react";
import type { ColumnOperators } from "./defs";
import { Filter } from "../utils";
import { SYSTEM_COLUMN } from "./column-header";
import { filtersAtom, groupAtom, hiddenColumnsAtom, sortAtom } from "./state";
import h from "../hyper";

interface OperatorOption {
  value: ColumnOperators;
  label: string;
  placeholder?: string;
}

const OPERATOR_OPTIONS: OperatorOption[] = [
  { value: "eq", label: "=" },
  { value: "ne", label: "≠" },
  { value: "lt", label: "<" },
  { value: "le", label: "≤" },
  { value: "gt", label: ">" },
  { value: "ge", label: "≥" },
  { value: "like", label: "contains" },
  { value: "in", label: "in", placeholder: "1,2,3" },
  { value: "is", label: "is", placeholder: "true | false | null" },
];

/** Keys of the whole columns in the current selection. */
function selectedColumnKeys(selection: any[], columnSpec: any[]): string[] {
  const keys: string[] = [];
  for (const r of selection ?? []) {
    // Whole-column selection: columns set, rows unset.
    if (r.cols == null || r.rows != null) continue;
    for (let i = r.cols[0]; i <= r.cols[1]; i++) {
      const col = columnSpec[i];
      if (col && !keys.includes(col.key)) keys.push(col.key);
    }
  }
  return keys;
}

export function ColumnControls() {
  const selection = useSelector((s: any) => s.selection);
  const columnSpec = useSelector((s: any) => s.columnSpec);
  const keys = selectedColumnKeys(selection, columnSpec);

  if (keys.length === 0) return null;
  if (keys.length === 1) {
    return h(ColumnControlsStrip, { key: keys[0], columnKey: keys[0] });
  }
  return h(MultiColumnControls, { columnKeys: keys });
}

function MultiColumnControls({ columnKeys }: { columnKeys: string[] }) {
  const setHidden = useSetAtom(hiddenColumnsAtom);
  // Never hide the fixed system column.
  const hideable = columnKeys.filter((k) => k !== SYSTEM_COLUMN);
  return h("div.control-group", [
    h(
      Button,
      {
        small: true,
        icon: "eye-off",
        disabled: hideable.length === 0,
        onClick: () =>
          setHidden((prev) => Array.from(new Set([...prev, ...hideable]))),
      },
      `Hide ${hideable.length} column${hideable.length === 1 ? "" : "s"}`,
    ),
  ]);
}

function ColumnControlsStrip({ columnKey }: { columnKey: string }) {
  const [sort, setSort] = useAtom(sortAtom);
  const [filters, setFilters] = useAtom(filtersAtom);
  const [group, setGroup] = useAtom(groupAtom);
  const setHidden = useSetAtom(hiddenColumnsAtom);

  const activeFilter = filters[columnKey];
  const [operator, setOperator] = useState<ColumnOperators>(
    (activeFilter?.operator as ColumnOperators) ?? "eq",
  );
  const valueRef = useRef<HTMLInputElement>(null);

  const isSortedAsc = sort?.key === columnKey && sort.ascending;
  const isSortedDesc = sort?.key === columnKey && !sort.ascending;
  const isGrouped = group === columnKey;
  const hasFilter = activeFilter?.is_valid() === true;
  const isSystem = columnKey === SYSTEM_COLUMN;

  const applyFilter = () => {
    const value = valueRef.current?.value ?? "";
    setFilters((prev) => {
      const next = { ...prev };
      if (value.trim() === "") delete next[columnKey];
      else next[columnKey] = new Filter(columnKey, operator, value);
      return next;
    });
  };

  const removeFilter = () => {
    setFilters((prev) => {
      const next = { ...prev };
      delete next[columnKey];
      return next;
    });
    if (valueRef.current) valueRef.current.value = "";
  };

  const placeholder = OPERATOR_OPTIONS.find(
    (o) => o.value === operator,
  )?.placeholder;

  return h([
    h("div.control-group", [
      h(ButtonGroup, { minimal: true }, [
        h(Button, {
          icon: "sort-asc",
          active: isSortedAsc,
          intent: isSortedAsc ? "primary" : "none",
          onClick: () =>
            setSort(isSortedAsc ? null : { key: columnKey, ascending: true }),
        }),
        h(Button, {
          icon: "sort-desc",
          active: isSortedDesc,
          intent: isSortedDesc ? "primary" : "none",
          onClick: () =>
            setSort(isSortedDesc ? null : { key: columnKey, ascending: false }),
        }),
      ]),
    ]),
    h("div.control-group", [
      h(HTMLSelect, {
        value: operator,
        options: OPERATOR_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
        onChange: (e) => setOperator(e.target.value as ColumnOperators),
      }),
      h(InputGroup, {
        small: true,
        placeholder: placeholder ?? "Value…",
        defaultValue: activeFilter?.value?.toString() ?? "",
        inputRef: valueRef,
        onKeyDown: (e) => {
          if (e.key === "Enter") applyFilter();
        },
        rightElement: h(Button, {
          icon: "arrow-right",
          minimal: true,
          small: true,
          onClick: applyFilter,
        }),
      }),
      h.if(hasFilter)(Button, {
        small: true,
        minimal: true,
        intent: "danger",
        icon: "filter-remove",
        onClick: removeFilter,
      }),
    ]),
    h("div.control-group", [
      h(
        Button,
        {
          small: true,
          icon: "group-objects",
          intent: isGrouped ? "success" : "none",
          onClick: () => setGroup(isGrouped ? undefined : columnKey),
        },
        isGrouped ? "Grouped" : "Group by",
      ),
      h.if(!isSystem)(
        Button,
        {
          small: true,
          icon: "eye-off",
          onClick: () =>
            setHidden((prev) =>
              prev.includes(columnKey) ? prev : [...prev, columnKey],
            ),
        },
        "Hide",
      ),
    ]),
  ]);
}
