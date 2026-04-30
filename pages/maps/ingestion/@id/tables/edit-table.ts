import { Button, Checkbox } from "@blueprintjs/core";
import { RegionCardinality } from "@blueprintjs/table";
import { useCallback, useReducer } from "react";
import { createTableUpdate, DataParameters } from "../utils";
import { DataSheet } from "@macrostrat/data-sheet";
import { toBoolean } from "../components";
import {
  ColumnConfig,
  ColumnConfigGenerator,
  Selection,
  FeatureType,
} from "./defs";
import h from "../hyper";

import { createAppToaster } from "@macrostrat/ui-components";

const INTERNAL_COLUMNS = ["_pkid", "source_id", "omit"];

export interface EditTableProps {
  url: string;
  ingestProcessId: number;
  columns: string[];
  columnGenerator: (props: ColumnConfigGenerator) => ColumnConfig;
  featureType: FeatureType;
}

const Toaster = createAppToaster();

enum ColumnShowMode {
  ALL = "all",
  FINAL = "final",
  ORIGINAL = "original",
}

function editColumnForFeatureType(featureType: FeatureType) {
  return featureType + "_state";
}

/** Switch to Jotai based state */

import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { initialState, tableDataReducer } from "./reducer.ts";

const tableDataAtom = atom<any[]>([]);
const isLoadingAtom = atom(false);
const nextPageAtom = atom(0);
const isDoneLoadingAtom = atom(false);

async function getData(url: string, parameters: DataParameters) {
  const params = new URLSearchParams(parameters);
  const parameterizedURL = url + "?" + params.toString();
  console.log(parameterizedURL);
  const response = await fetch(parameterizedURL, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  return await response.json();
}

const loadMoreDataAtom = atom(null, (get, set, { url, parameters }) => {
  // First, get current data length
  if (get(isLoadingAtom) || get(isDoneLoadingAtom)) return;

  console.log("Loading more data");
  const currentData = get(tableDataAtom);
  const pageSize = 100;
  const nextPage = get(nextPageAtom);

  let params = {
    ...(parameters ?? {}),
    page_size: pageSize,
    page: nextPage,
  };

  set(isLoadingAtom, true);
  // Add speculative rows immediately if this is a subsequent page load
  if (currentData.length > 0) {
    const speculativeRows = Array.from({ length: pageSize }, () => null);
    set(tableDataAtom, [...currentData, ...speculativeRows]);
  }

  getData(url, params).then((newData) => {
    const nextTableData = [...currentData, ...newData];
    set(tableDataAtom, nextTableData);
    set(isLoadingAtom, false);
    const expectedDataLength = (nextPage + 1) * pageSize;
    if (newData.length < pageSize) {
      set(isDoneLoadingAtom, true);
    } else {
      set(nextPageAtom, nextPage + 1);
    }
  });
});

function useLoadData(url: string, params = {}) {
  const loadData = useSetAtom(loadMoreDataAtom);
  return useCallback(
    () => loadData({ url, parameters: params }),
    [url, params]
  );
}

export function TableInterface({
  ref,
  columns,
  url,
  ingestProcessId,
  featureType,
}: EditTableProps) {
  const [tableData1, dispatch] = useReducer(tableDataReducer, {
    ...initialState,
    allColumns: columns,
  });

  const data = useAtomValue(tableDataAtom);
  const loadMoreData = useLoadData(url, {});

  return h(DataSheet, {
    data,
    editable: true,
    columnSpecOptions: {
      overrides: {
        orig_id: {
          name: "Original ID",
        },
        descrip: {
          name: "Description",
        },
        name: {
          name: "Name",
        },
      },
      omitColumns: INTERNAL_COLUMNS,
    },
    enableColumnReordering: false,
    onVisibleCellsChange: (visibleCells) => {
      if (visibleCells["rowIndexEnd"] > data.length - 5) {
        loadMoreData();
      }
    },
    selectionModes: [RegionCardinality.FULL_COLUMNS],
  });
}

function getSelectedRows(selection: Selection[], data: any[]): number[] {
  return selection
    .map((s) => {
      if (s.rows == null) return [];
      const start = Math.min(s.rows[0], s.rows[1]);
      const end = Math.max(s.rows[0], s.rows[1]);
      return Array.from({ length: end - start + 1 }, (_, i) => {
        return start + i;
      });
    })
    .flat();
}

const hasSelection = (selection: Selection[]) => {
  return selection != null && selection.length > 0;
};

function selectionCardinality(selection: Selection[]): RegionCardinality {
  if (selection.length == 0) {
    return RegionCardinality.NONE;
  }

  const firstSelection = selection[0];
  if (firstSelection.rows == null && firstSelection.cols == null) {
    return RegionCardinality.FULL_TABLE;
  }

  if (firstSelection.cols == null) {
    return RegionCardinality.FULL_ROWS;
  }

  if (firstSelection.rows == null) {
    return RegionCardinality.FULL_COLUMNS;
  }

  return RegionCardinality.CELLS;
}

function TableActions({
  dispatch,
  selection,
  data,
  setSelection,
  updateProps,
}) {
  const cardinality = selectionCardinality(selection);

  const name = nameForCardinality(cardinality);

  let actions = h("p", "No selection");

  if (cardinality == RegionCardinality.FULL_ROWS) {
    actions = h([
      h("h4", name + " actions"),
      h(RowActions, {
        rows: getSelectedRows(selection, data),
        dispatch,
        data,
        updateProps,
      }),
    ]);
  } else if (cardinality == RegionCardinality.CELLS) {
    actions = h("p", "No cell actions defined");
  } else if (cardinality == RegionCardinality.FULL_COLUMNS) {
    actions = h("p", "No column actions defined");
  }

  return h("div.table-actions", [
    h("h4", "Selection"),
    h(
      Button,
      {
        disabled: !hasSelection(selection),
        small: true,
        minimal: true,
        intent: "warning",
        onClick() {
          setSelection([]);
        },
      },
      "Clear"
    ),
    actions,
    h("div.spacer"),
  ]);
}

function nameForCardinality(cardinality: RegionCardinality) {
  switch (cardinality) {
    case RegionCardinality.FULL_TABLE:
      return "Table";
    case RegionCardinality.FULL_COLUMNS:
      return "Column";
    case RegionCardinality.FULL_ROWS:
      return "Row";
    case RegionCardinality.CELLS:
      return "Cell";
    default:
      return null;
  }
}

function RowActions({ rows, dispatch, data, updateProps }) {
  if (rows == null || rows.length == 0) {
    return null;
  }

  console.log(data);
  const allRowsChecked = rows.every((i) => toBoolean(data[i]["omit"]));
  const allRowsUnchecked = rows.every((i) => !toBoolean(data[i]["omit"]));

  let checked = null;
  const indeterminate = !(allRowsChecked || allRowsUnchecked);
  if (!indeterminate) {
    checked = allRowsChecked;
  }

  const { url, dataParameters } = updateProps;

  return h("div.table-actions", {}, [
    // Omit rows
    h(Checkbox, {
      checked,
      indeterminate,
      label: "Omit Rows",
      onChange: (e) => {
        // Get boolean value
        const value = e.target.checked;
        // If state is indeterminate, do nothing
        if (value == null) return;

        // Synthesize updates (we don't support multi-row or ranged updates currently)
        const updates = rows.map((i) => {
          return createTableUpdate(url, value, "omit", data[i], dataParameters);
        });

        // Dispatch updates
        dispatch({ type: "addTableUpdates", tableUpdates: updates });
      },
    }),
  ]);
}
