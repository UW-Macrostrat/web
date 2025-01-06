import { Button, Checkbox, Icon, useHotkeys } from "@blueprintjs/core";
import {
  Cell,
  Column,
  ColumnHeaderCell2,
  FocusedCellCoordinates,
  RegionCardinality,
  RowHeaderCell2,
  Table2,
} from "@blueprintjs/table";
import {
  Dispatch,
  MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  applyTableUpdates,
  createTableUpdate,
  createTableUpdateCopyColumn,
  Filter,
  isColumnActive,
  submitTableUpdates,
} from "../utils";
import { initialState, TableData, tableDataReducer } from "../reducer";
import { ingestPrefix } from "@macrostrat-web/settings";
import {
  downloadSourceFiles,
  EditableCell,
  getCellSelected,
  getData,
  getSelectedColumns,
  ProgressPopover,
  ProgressPopoverProps,
  reorderColumns,
  selectionToText,
  TableMenu,
  textToTableUpdates,
  toBoolean,
} from "../components";
import {
  ColumnConfig,
  ColumnConfigGenerator,
  OperatorQueryParameter,
  Selection,
} from "./defs";
import h from "../hyper";
import classNames from "classnames";

import TableHeader from "../components/table-header";
import { postgrest } from "~/_providers";
import { createAppToaster, useAsyncEffect } from "@macrostrat/ui-components";

const INTERNAL_COLUMNS = ["_pkid", "source_id", "omit"];

export interface EditTableProps {
  url: string;
  ingestProcessId: number;
  finalColumns: string[];
  columnGenerator: (props: ColumnConfigGenerator) => ColumnConfig;
}

const Toaster = createAppToaster();

enum ColumnShowMode {
  ALL = "all",
  FINAL = "final",
  ORIGINAL = "original",
}

function useTableData({
  ref,
  allColumns,
  url,
  ingestProcessId,
}): [TableData, Dispatch<any>] {
  const [tableData, dispatch] = useReducer(tableDataReducer, {
    ...initialState,
    allColumns,
  });

  const client = useRef(postgrest.from("map_ingest_metadata"));

  // Handle column changes
  useAsyncEffect(async () => {
    const res = await client.current
      .select("polygon_omit")
      .eq("id", ingestProcessId)
      .single();
    const omit = res.data.polygon_omit ?? [];

    const hiddenColumns = computeHiddenColumns(omit, tableData);

    dispatch({ type: "updateHiddenColumns", data: hiddenColumns });
  }, []);

  useAsyncEffect(async () => {
    try {
      await client.current
        .update({ polygon_omit: tableData.hiddenColumns })
        .eq("id", ingestProcessId);
    } catch (err) {
      console.error(err);
      Toaster.show({
        message: "Error updating hidden columns",
        intent: "danger",
      });
    }
  }, [tableData.hiddenColumns]);

  useEffect(() => {
    (async () => {
      const newData = await getData(url, tableData.parameters);

      ref.current = Array.from(
        { length: newData.data.length == 0 ? 1 : newData.data.length },
        () =>
          Array.from(
            {
              length:
                newData.data.length == 0
                  ? 1
                  : Object.keys(newData.data[0]).length,
            },
            () => null
          )
      );

      dispatch({
        type: "updateData",
        ...newData,
      });
    })();
  }, [tableData.parameters]);

  return [tableData, dispatch];
}

export function TableInterface({
  url,
  ingestProcessId,
  finalColumns,
  columnGenerator,
}: EditTableProps) {
  // Cell refs
  const ref = useRef<MutableRefObject<any>[][]>(null);

  const [tableData, dispatch] = useTableData({
    ref,
    allColumns: finalColumns,
    ingestProcessId,
    url,
  });

  // Selection State
  const [selection, setSelection] = useState<Selection[]>([]);
  const [copiedSelection, setCopiedSelection] = useState<
    Selection[] | undefined
  >(undefined);

  // Error State
  const [error, setError] = useState<string | undefined>(undefined);

  // Table Update State
  const [updateProgress, setUpdateProgress] =
    useState<ProgressPopoverProps>(undefined);

  // Focused Cell
  const [focusedCell, setFocusedCell] = useState<
    FocusedCellCoordinates | undefined
  >(undefined);

  const transformedData = useMemo(() => {
    let data = structuredClone(tableData.remoteData);
    data = applyTableUpdates(data, tableData.tableUpdates);
    return data;
  }, [tableData.remoteData, tableData.tableUpdates]);

  const visibleColumns = useMemo(() => {
    const hiddenColumns = [...INTERNAL_COLUMNS, ...tableData.hiddenColumns];
    return tableData.allColumns.filter((col) => !hiddenColumns.includes(col));
  }, [tableData.hiddenColumns, tableData.allColumns]);

  const handlePaste = useCallback(async () => {
    const firstSelection = selection[0];
    if (
      firstSelection?.cols != undefined &&
      firstSelection?.rows != undefined
    ) {
      // Get value from clipboard
      const clipboardText = await navigator.clipboard.readText();
      const tableUpdates = textToTableUpdates(
        clipboardText,
        firstSelection,
        url,
        visibleColumns,
        transformedData,
        tableData.parameters
      );
      dispatch({ type: "addTableUpdates", tableUpdates });
    }

    const selectedColumns = getSelectedColumns(visibleColumns, selection);
    const copiedColumns = getSelectedColumns(visibleColumns, copiedSelection);
    if (
      copiedColumns != undefined &&
      copiedColumns.length == 1 &&
      selectedColumns != undefined &&
      selectedColumns.length == 1
    ) {
      const selectedColumn = selectedColumns[0];
      const copiedColumn = copiedColumns[0];

      const tableUpdate = createTableUpdateCopyColumn(
        url,
        selectedColumn,
        copiedColumn,
        tableData.parameters
      );

      dispatch({ type: "addTableUpdates", tableUpdates: [tableUpdate] });
    }
  }, [selection]);

  const handleCopy = useCallback(
    (e) => {
      setCopiedSelection(selection);

      // Only copy the first selection
      const firstSelection = selection[0];
      const selectedText = selectionToText(
        firstSelection,
        visibleColumns,
        transformedData
      );
      navigator.clipboard.writeText(selectedText);
    },
    [selection, transformedData, visibleColumns]
  );

  const hotkeys = useMemo(
    () => [
      {
        combo: "cmd+c",
        label: "Copy data",
        onKeyDown: handleCopy,
        group: "Table",
      },
      {
        combo: "shift+h",
        label: "Hide Column",
        onKeyDown: () =>
          dispatch({
            type: "hideColumn",
            column: getSelectedColumns(visibleColumns, selection),
          }),
        group: "Table",
      },
      {
        combo: "cmd+v",
        label: "Paste Data",
        onKeyDown: handlePaste,
        group: "Table",
      },
    ],
    [handlePaste, handleCopy, visibleColumns, selection]
  );

  const columnHeaderCellRenderer = useCallback(
    (columnIndex: number) => {
      const columnName: string = visibleColumns[columnIndex];
      let filter = tableData.parameters.filter[columnName];

      return h(
        ColumnHeaderCell2,
        {
          enableColumnReordering: columnName != "source_layer",
          nameRenderer: () =>
            h(
              "div.column-name",
              h(
                "div",
                {
                  style: {
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  },
                },
                [
                  h("span.selected-column", {}, [
                    columnName,
                    h.if(finalColumns.includes(columnName))(Icon, {
                      icon: "star-empty",
                      size: 12,
                      color: "#333333",
                      style: { marginLeft: "5px", marginBottom: "2px" },
                    }),
                  ]),
                  h.if(isColumnActive(tableData.parameters, columnName))(Icon, {
                    icon: "filter-list",
                    size: 15,
                    color: "#333333",
                  }),
                  h.if(!isColumnActive(tableData.parameters, columnName))(
                    Icon,
                    { icon: "filter", size: 15, color: "#d0d0d0" }
                  ),
                ]
              )
            ),
          menuRenderer: () =>
            h(TableMenu, {
              columnName: columnName,
              onFilterChange: (param: OperatorQueryParameter) => {
                dispatch({
                  type: "setFilter",
                  filter: new Filter(
                    columnName,
                    param.operator,
                    param.value || null
                  ),
                });
              },
              filter: filter,
              onGroupChange: (column: string | undefined) => {
                dispatch({ type: "setGroupBy", groupBy: column });
              },
              group: tableData.parameters?.group,
              onHide: () =>
                dispatch({ type: "hideColumn", column: columnName }),
              hidden: !tableData.hiddenColumns.includes(columnName),
            }),
          name: columnName,
          style: {
            backgroundColor:
              filter?.is_valid() || tableData.parameters?.group == columnName
                ? "rgba(27,187,255,0.12)"
                : "#ffffff00",
          },
        },
        []
      );
    },
    [tableData.parameters, tableData.hiddenColumns, visibleColumns]
  );

  const rowHeaderCellRenderer = useCallback(
    (rowIndex: number) => {
      if (transformedData.length == 0) {
        return h(RowHeaderCell2, { name: "NULL" }, []);
      }

      const headerKey = tableData.parameters?.group || "_pkid";
      let name = transformedData[rowIndex][headerKey];

      if (name == null) {
        name = "NULL";
      } else if (typeof name == "string" && name.length > 47) {
        name = name.slice(0, 47) + "...";
      }

      const omit = transformedData[rowIndex]["omit"] ?? false;
      return h(RowHeaderCell2, {
        name: h(
          "span.row-header-text",
          { className: classNames({ omit }) },
          name.toString()
        ),
      });
    },
    [tableData.parameters, transformedData]
  );

  const sharedColumnConfig = useSharedColumns({
    visibleColumns,
    finalColumns,
    columnHeaderCellRenderer,
    transformedData,
    tableData,
    ref,
    url,
    handleCopy,
    handlePaste,
    dispatch,
  });

  const columnConfig = useMemo(() => {
    if (visibleColumns.length == 0) {
      return sharedColumnConfig;
    }

    /** Here, we generate the column configuration */
    return columnGenerator({
      url,
      sharedColumnConfig,
      dataParameters: tableData.parameters,
      addTableUpdate: (t) =>
        dispatch({ type: "addTableUpdates", tableUpdates: t }),
      transformedData,
      data: tableData.remoteData,
      ref,
    });
  }, [
    sharedColumnConfig,
    tableData.parameters,
    transformedData,
    tableData.remoteData,
  ]);

  return h(
    HotkeysManager,
    {
      hotkeys: hotkeys,
      style: {
        minHeight: "0",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      },
    },
    [
      h("div.table-container", {}, [
        h.if(error != undefined)("div.warning", {}, [error]),
        h(
          TableHeader,
          {
            hiddenColumns: tableData.hiddenColumns,
            tableUpdates: tableData.tableUpdates,
            dataParameters: tableData.parameters,
            totalNumberOfRows: tableData.totalNumberOfRows,
            showAllColumns: () => dispatch({ type: "showAllColumns" }),
            toggleShowOmittedRows: () =>
              dispatch({ type: "toggleShowOmittedRows" }),
            clearTableUpdates: () => dispatch({ type: "clearTableUpdates" }),
            submitTableUpdates: async () => {
              await submitTableUpdates(
                tableData.tableUpdates,
                setUpdateProgress
              );
              // Update the table data
              dispatch({
                type: "updateData",
                ...(await getData(url, tableData.parameters)),
              });
              dispatch({ type: "clearTableUpdates" });
            },
            downloadSourceFiles: async () =>
              downloadSourceFiles(ingestProcessId),
            clearDataParameters: () =>
              dispatch({ type: "clearDataParameters" }),
            markAsHarmonized: async () => {
              const response = await fetch(
                `${ingestPrefix}/ingest-process/${ingestProcessId}`,
                {
                  method: "PATCH",
                  headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ state: "post_harmonization" }),
                }
              );
              if (response.ok) {
                dispatch({ type: "clearTableUpdates" });
                dispatch({
                  type: "updateData",
                  ...(await getData(url, tableData.parameters)),
                });
              } else {
                console.error("uh oh", response);
              }
            },
          },
          h(TableActions, {
            dispatch,
            selection,
            data: transformedData,
            setSelection,
            updateProps: {
              url,
              dataParameters: tableData.parameters,
            },
          })
        ),
        h(
          Table2,
          {
            enableFocusedCell: true,
            enableColumnReordering: true,
            selectedRegions: selection,
            selectionModes: [
              RegionCardinality.FULL_COLUMNS,
              RegionCardinality.FULL_ROWS,
              RegionCardinality.CELLS,
            ],
            rowHeaderCellRenderer,
            onFocusedCell: (focusedCellCoordinates) => {
              setFocusedCell(focusedCellCoordinates);
            },
            loadingOptions: tableData.loading ? ["cells", "column-header"] : [],
            focusedCell: focusedCell,
            onSelection: (s) => {
              setSelection(s);
              const cell = getCellSelected(visibleColumns, s);
              if (cell != undefined) {
                ref.current[cell.rowIndex][cell.columnIndex]?.focus();
              }
            },
            onVisibleCellsChange: (visibleCells) => {
              if (
                visibleCells["rowIndexEnd"] >
                parseInt(tableData.parameters.select.pageSize) - 5
              ) {
                dispatch({ type: "incrementPageSize", increment: 50 });
              }
            },
            onColumnsReordered: (oldIndex, newIndex, length) => {
              console.log(
                oldIndex,
                newIndex,
                length,
                visibleColumns[oldIndex],
                visibleColumns[newIndex]
              );
              let newColumns = reorderColumns(
                tableData.allColumns,
                visibleColumns,
                oldIndex,
                newIndex,
                length
              );
              dispatch({ type: "updateColumns", columns: newColumns });
            },
            numRows: transformedData.length,
            cellRendererDependencies: [transformedData, selection],
          },
          Object.values(columnConfig)
        ),
        h.if(updateProgress != undefined)(ProgressPopover, {
          progressBarProps: { intent: "success" },
          ...updateProgress,
        }),
      ]),
    ]
  );
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

function HotkeysManager({ hotkeys, style, children }) {
  const { handleKeyDown, handleKeyUp } = useHotkeys(hotkeys);

  return h("div", {
    onKeyDown: handleKeyDown,
    onKeyUp: handleKeyUp,
    tabIndex: 0,
    style,
    children,
  });
}

function useSharedColumns({
  visibleColumns,
  finalColumns,
  columnHeaderCellRenderer,
  transformedData,
  tableData,
  ref,
  url,
  handleCopy,
  handlePaste,
  dispatch,
}) {
  return useMemo(() => {
    if (visibleColumns.length == 0) {
      return {};
    }

    return visibleColumns.reduce((prev, columnName, index) => {
      return {
        ...prev,
        [columnName]: h(Column, {
          name: columnName,
          className: finalColumns.includes(columnName) ? "final-column" : "",
          columnHeaderCellRenderer,
          cellRenderer: (rowIndex: number, columnIndex: number) => {
            if (columnName == "source_layer") {
              return h(
                Cell,
                {
                  key: columnName,
                  columnName: columnName,
                  onCopy: (e) => handleCopy(e),
                  className: "read-only-cell",
                },
                h(
                  "span.read-only-value",
                  null,
                  transformedData[rowIndex][columnName]
                )
              );
            }

            const omit = toBoolean(transformedData[rowIndex]["omit"]);

            return h(EditableCell, {
              ref: (el) => {
                try {
                  ref.current[rowIndex][columnIndex] = el;
                } catch {}
              },
              disabled: omit,
              className: classNames({ disabled: omit }),
              columnName: columnName,
              onConfirm: (value) => {
                if (value != transformedData[rowIndex][columnName]) {
                  dispatch({
                    type: "addTableUpdates",
                    tableUpdates: [
                      createTableUpdate(
                        url,
                        value,
                        columnName,
                        transformedData[rowIndex],
                        tableData.parameters
                      ),
                    ],
                  });
                }
              },
              onCopy: (e) => handleCopy(e),
              onPaste: handlePaste,
              intent:
                tableData.remoteData[rowIndex][columnName] !=
                transformedData[rowIndex][columnName]
                  ? "success"
                  : undefined,
              value:
                transformedData.length == 0
                  ? ""
                  : transformedData[rowIndex][columnName],
            });
          },
          key: columnName,
        }),
      };
    }, {});
  }, [
    visibleColumns,
    tableData.remoteData,
    tableData.parameters,
    transformedData,
    handleCopy,
    handlePaste,
  ]);
}
