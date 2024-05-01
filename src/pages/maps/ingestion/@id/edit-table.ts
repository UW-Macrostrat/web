import hyper from "@macrostrat/hyper";

import {
  Button,
  ButtonGroup,
  Hotkey,
  Icon,
  Menu,
  MenuItem,
  useHotkeys,
} from "@blueprintjs/core";
import { Popover2 } from "@blueprintjs/popover2";
import {
  Column,
  ColumnHeaderCell2,
  FocusedCellCoordinates,
  RowHeaderCell2,
  SelectionModes,
  Table2,
} from "@blueprintjs/table";
import { useCallback, useReducer, useEffect, useMemo, useState, useRef, MutableRefObject } from "react";
import {
  Filter,
  getPatchedData,
  createTableUpdateCopyColumn,
  isColumnActive, createTableUpdate, submitTableUpdates
} from "./utils/";
import { tableDataReducer, initialState } from "./reducer/";
import {
  EditableCell,
  ProgressPopover,
  ProgressPopoverProps,
  TableMenu,
  download_file,
  range,
  submitColumnCopy, getSelectedColumns, selectionToText, textToTableUpdates, getData, getCellSelected
} from "./components/index";
import {
  ColumnConfig,
  ColumnConfigGenerator,
  OperatorQueryParameter,
  Selection,
} from "./table";

import "@blueprintjs/table/lib/css/table.css";
import { ingestPrefix } from "@macrostrat-web/settings";
import styles from "./edit-table.module.sass";
import "./override.sass";

const h = hyper.styled(styles);

const INTERNAL_COLUMNS = ["_pkid", "source_id"];

export interface EditTableProps {
  url: string;
  ingestProcessId: number;
  finalColumns: string[];
  columnGenerator: (props: ColumnConfigGenerator) => ColumnConfig;
}

export function TableInterface({
  url,
  ingestProcessId,
  finalColumns,
  columnGenerator,
}: EditTableProps) {

  const [tableData, dispatch] = useReducer(
    tableDataReducer,
    {...initialState, allColumns: finalColumns}
  )

  // Selection State
  const [selection, setSelection] = useState<Selection[]>([]);
  const [copiedSelection, setCopiedSelection] = useState<Selection[] | undefined>(
    undefined
  );

  // Cell refs
  const ref = useRef<MutableRefObject<any>[][]>(null);

  // Error State
  const [error, setError] = useState<string | undefined>(undefined);

  // Table Update State
  const [updateProgress, setUpdateProgress] =
    useState<ProgressPopoverProps>(undefined);

  // Focused Cell
  const [focusedCell, setFocusedCell] = useState<
    FocusedCellCoordinates | undefined
  >(undefined);

  useEffect(() => {
    (async () => {
      const newData = await getData(url, tableData.parameters)

      ref.current = Array.from(
        { length: newData.data.length == 0 ? 1 : newData.data.length },
        () =>
          Array.from(
            { length: newData.data.length == 0 ? 1 : Object.keys(newData.data[0]).length },
            () => null
          )
      );

      dispatch({
        type: "updateData",
        ...newData
      })
    })()
  }, [tableData.parameters]);

  const transformedData = useMemo(() => {
    return getPatchedData(tableData.remoteData, tableData.localPatches);
  }, [tableData.remoteData, tableData.localPatches]);

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
      copiedColumns != undefined && copiedColumns.length == 1 &&
      selectedColumns != undefined && selectedColumns.length == 1
    ) {
      const selectedColumn = selectedColumns[0];
      const copiedColumn = copiedColumns[0];

      const tableUpdate = createTableUpdateCopyColumn(
        url,
        selectedColumn,
        copiedColumn,
        tableData.parameters
      )

      dispatch({ type: "addTableUpdates", tableUpdates: [tableUpdate] });
    }
  }, [selection]);

  const handleCopy = useCallback((e) => {
    setCopiedSelection(selection);

    // Only copy the first selection
    const firstSelection = selection[0];
    const selectedText = selectionToText(firstSelection, visibleColumns, transformedData);
    navigator.clipboard.writeText(selectedText);
  }, [selection, transformedData, visibleColumns]);

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
        onKeyDown: () => dispatch({
          type: "hideColumn",
          column: getSelectedColumns(visibleColumns, selection)
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
                    h.if(finalColumns.includes(columnName))(
                      Icon, {
                        icon: "star-empty",
                        size: 12,
                        color: "#333333",
                        style: { marginLeft: "5px", marginBottom: "2px" },
                      }
                    ),
                  ]),
                  h.if(isColumnActive(tableData.parameters, columnName))(
                    Icon, {
                      icon: "filter-list",
                      size: 15,
                      color: "#333333",
                    }
                  ),
                  h.if(!isColumnActive(tableData.parameters, columnName))(
                    Icon, { icon: "filter", size: 15, color: "#d0d0d0" }
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
                  filter: new Filter(columnName, param.operator, param.value)
                })
              },
              filter: filter,
              onGroupChange: (column: string | undefined) => {
                dispatch({ type: "setGroupBy", groupBy: column })
              },
              group: tableData.parameters?.group,
              onHide: () => dispatch({ type: "hideColumn", column: columnName }),
              hidden: !tableData.hiddenColumns.includes(columnName)
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
      let name = transformedData[rowIndex][headerKey]

      if (name == null) {
        name = "NULL";
      } else if (typeof name == "string" && name.length > 47) {
        name = name.slice(0, 47) + "...";
      }

      return h(RowHeaderCell2, { name: name.toString() }, []);
    },
    [tableData.parameters, transformedData]);

  const defaultColumnConfig = useMemo(() => {
    if (visibleColumns.length == 0) {
      return {};
    }

    return visibleColumns.reduce((prev, columnName, index) => {
      return {
        ...prev,
        [columnName]: h(Column, {
          name: columnName,
          className: finalColumns.includes(columnName) ? "final-column" : "",
          columnHeaderCellRenderer: columnHeaderCellRenderer,
          cellRenderer: (rowIndex: number, columnIndex: number) =>
            h(EditableCell, {
              ref: (el) => {
                try {
                  ref.current[rowIndex][columnIndex] = el;
                } catch {}
              },
              columnName: columnName,
              onConfirm: (value) => {
                if(value != transformedData[rowIndex][columnName]) {
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
                  })
                }
              },
              onCopy: (e) => handleCopy(e),
              onPaste: handlePaste,
              intent: tableData.localPatches[rowIndex]?.[columnName] ? "success" : undefined,
              value:
                transformedData.length == 0
                  ? ""
                  : transformedData[rowIndex][columnName],
            }),
          key: columnName,
        }),
      };
    }, {});
  }, [
    visibleColumns,
    tableData.localPatches,
    tableData.parameters,
    transformedData,
    handleCopy,
    handlePaste
  ]);

  const columnConfig = useMemo(() => {
    if (visibleColumns.length == 0) {
      return defaultColumnConfig;
    }

    const generatedColumns = columnGenerator({
      url,
      defaultColumnConfig,
      dataParameters : tableData.parameters,
      addTableUpdate: (t) =>
        dispatch({type: "addTableUpdates", tableUpdates: t}),
      transformedData,
      data: tableData.remoteData,
      ref
    });

    return generatedColumns;
  }, [
    defaultColumnConfig,
    tableData.parameters,
    transformedData,
    tableData.remoteData,
  ]);

  return h(
    HotkeysManager,
    {
      hotkeys,
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
        h("div.input-form", {}, [
          h(ButtonGroup, [
            h(Popover2, {
              interactionKind: "click",
              minimal: true,
              placement: "bottom-start",
              content: h(Menu, {}, [
                h(
                  MenuItem,
                  {
                    disabled: tableData.hiddenColumns.length == 0,
                    icon: "eye-open",
                    text: "Show All",
                    onClick: () => dispatch({ type: "showAllColumns" })
                  },
                  []
                ),
                h(
                  MenuItem,
                  {
                    icon: "cross",
                    text: "Show Omitted",
                    onClick: () => dispatch({ type: "toggleShowOmittedRows" })
                  },
                  []
                ),
              ]),
              renderTarget: ({ isOpen, ref, ...targetProps }) =>
                h(
                  Button,
                  { ...targetProps, elementRef: ref, icon: "menu" },
                  []
                ),
            }),
            h(
              Button,
              {
                onClick: () => dispatch({ type: "clearTableUpdates" }),
                disabled: tableData.tableUpdates.length == 0,
              },
              ["Clear changes"]
            ),
            h(
              Button,
              {
                type: "submit",
                onClick: () => {
                  (async () => {
                    // Submit the table updates
                    await submitTableUpdates(
                      tableData.tableUpdates,
                      setUpdateProgress
                    )
                    // Update the table data
                    dispatch({ type: "updateData", ...(await getData(url, tableData.parameters))})
                    dispatch({ type: "clearTableUpdates" })
                  })();
                },
                disabled: tableData.tableUpdates.length == 0,
                intent: "success",
              },
              ["Submit"]
            ),
            h(
              Button,
              {
                onClick: async () => {
                  const objects_response = await fetch(
                    `${ingestPrefix}/ingest-process/${ingestProcessId}/objects`
                  );
                  const objects: any[] = await objects_response.json();
                  objects.forEach((object) =>
                    download_file(object.pre_signed_url)
                  );
                },
              },
              ["Download Source"]
            ),
            h.if(tableData.totalNumberOfRows != undefined)(
              Button,
              {
                disabled: true,
              },
              [`${tableData.totalNumberOfRows} Rows`]
            ),
          ]),
        ]),
        h(
          Table2,
          {
            enableFocusedCell: true,
            selectionModes: SelectionModes.COLUMNS_AND_CELLS,
            rowHeaderCellRenderer: rowHeaderCellRenderer,
            onFocusedCell: (focusedCellCoordinates) => {
              setFocusedCell(focusedCellCoordinates);
            },
            loadingOptions: tableData.loading ? ["cells", "column-header"] : [],
            focusedCell: focusedCell,
            onSelection: (s) => {
              setSelection(s)
              const cell = getCellSelected(visibleColumns, s)
              ref.current[cell.rowIndex][cell.columnIndex]?.focus()
            },
            onVisibleCellsChange: (visibleCells) => {
              if (
                visibleCells["rowIndexEnd"] >
                parseInt(tableData.parameters.select.pageSize) - 5
              ) {
                dispatch({ type: "incrementPageSize", increment: 50 });
              }
            },
            numRows: tableData.remoteData.length,
            cellRendererDependencies: [transformedData, selection]
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
