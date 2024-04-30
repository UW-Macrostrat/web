import hyper from "@macrostrat/hyper";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
  useMemo,
  FunctionComponent,
  MutableRefObject,
} from "react";
import {
  HotkeysProvider,
  InputGroup,
  Menu,
  MenuItem,
  Button,
  useHotkeys,
  Icon,
  IconSize,
  Popover,
} from "@blueprintjs/core";
import { Spinner, ButtonGroup } from "@blueprintjs/core";
import {
  Column,
  Table2,
  RowHeaderCell2,
  ColumnHeaderCell2,
  SelectionModes,
  RegionCardinality,
  FocusedCellCoordinates,
} from "@blueprintjs/table";
import update from "immutability-helper";

import {
  Filters,
  OperatorQueryParameter,
  TableUpdate,
  TableSelection,
  Selection,
  DataParameters,
  ColumnConfigGenerator,
  ColumnConfig,
} from "./table";
import {
  buildURL,
  Filter,
  isEmptyArray,
  submitChange,
  getTableUpdate,
  range,
  applyTableUpdate,
  applyTableUpdates,
  submitColumnCopy,
  cloneDataParameters,
  download_file,
  updateInput,
} from "./table-util";
import TableMenu from "./table-menu";
import IntervalSelection, {
  Interval,
} from "./components/cell/interval-selection";
import ProgressPopover, {
  ProgressPopoverProps,
} from "./components/progress-popover/progress-popover";

import "./override.sass";
import "@blueprintjs/table/lib/css/table.css";
import styles from "./edit-table.module.sass";
import EditableCell from "./components/cell/editable-cell";
import { ingestPrefix } from "@macrostrat-web/settings";
import CheckboxCell from "~/pages/maps/ingestion/@id/components/cell/checkbox-cell";

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
  const [showOmitted, setShowOmitted] = useState<boolean>(false);

  // Hidden Columns
  const [hiddenColumns, _setHiddenColumns] = useState<string[]>([]);

  // Cell refs
  const ref = useRef<MutableRefObject<any>[][]>(null);

  // Selection State
  const [selection, setSelection] = useState<Selection[]>([]);
  const [copiedColumn, setCopiedColumn] = useState<string | undefined>(
    undefined
  );

  // Data Loading
  const [loading, setLoading] = useState<boolean>(true);

  // Data State
  const [dataParameters, setDataParameters] = useState<DataParameters>({
    select: { page: "0", pageSize: "50" },
    filter: {},
  });
  const [data, setData] = useState<any[]>([]);
  const [numberOfRows, setNumberOfRows] = useState<number | undefined>(
    undefined
  );

  // Error State
  const [error, setError] = useState<string | undefined>(undefined);

  // Table Update State
  const [tableUpdates, setTableUpdates] = useState<TableUpdate[]>([]);
  const [updateProgress, _setUpdateProgress] =
    useState<ProgressPopoverProps>(undefined);

  // Focused Cell
  const [focusedCell, setFocusedCell] = useState<
    FocusedCellCoordinates | undefined
  >(undefined);

  const transformedData = useMemo(() => {
    return applyTableUpdates(data, tableUpdates);
  }, [data, tableUpdates]);

  const tableColumns = useMemo(() => {
    // Catch when there is no data
    if (data == undefined || data.length == 0) {
      return finalColumns;
    }

    // If the data has its own columns defined
    if (Object.keys(data[0]).length > 0) {
      // Get the keys that are not in the final columns
      const additionalColumns = Object.keys(data[0]).filter(
        (x) => !finalColumns.includes(x)
      );

      return [...finalColumns, ...additionalColumns];
    }

    return finalColumns;
  }, [data]);

  const setHiddenColumns = useCallback((column: string | string[]) => {
    _setHiddenColumns((prev) => {
      if (Array.isArray(column)) {
        // Check if they are emptying the list
        if (column.length == 0) {
          return [];
        }

        return [...prev, ...column];
      }

      return [...prev, column];
    });
  }, []);

  const setUpdateProgress = useCallback(
    (progress: Partial<ProgressPopoverProps> | undefined) => {
      _setUpdateProgress((prev) => {
        // Check if the progress is undefined
        if (progress == undefined) {
          return undefined;
        }

        return {
          ...prev,
          ...progress,
        };
      });
    },
    []
  );

  const getData = useCallback(
    async (dataParameters: DataParameters) => {
      const dataURL = buildURL(url, dataParameters);

      const response = await fetch(dataURL);
      let data = await response.json();

      data = data.filter((x) => (showOmitted ? true : x.omit != true));

      // Update the number of rows
      setNumberOfRows(parseInt(response.headers.get("X-Total-Count")));

      // Set the table ref
      ref.current = Array.from(
        { length: data.length == 0 ? 1 : data.length },
        () =>
          Array.from(
            { length: data.length == 0 ? 1 : Object.keys(data[0]).length },
            () => null
          )
      );

      return data;
    },
    [showOmitted]
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      setData(await getData(dataParameters));
      setLoading(false);
    })();
  }, [dataParameters, showOmitted]);

  // Get the visible columns
  const visibleColumnNames = useMemo(() => {
    if (tableColumns.length == 0) {
      return [];
    }

    const allHiddenColumns = [...hiddenColumns, ...INTERNAL_COLUMNS];

    return tableColumns.filter((x) => !allHiddenColumns.includes(x));
  }, [tableColumns, hiddenColumns]);

  const selectedColumns = useMemo(() => {
    if (selection.length == 0) {
      return undefined;
    }

    const selectedColumnRange = selection[0]?.cols;
    if (selection[0]?.rows == undefined) {
      const selectedColumnIndices = range(
        selectedColumnRange[0],
        selectedColumnRange[1] + 1
      );
      return selectedColumnIndices?.map((index) => visibleColumnNames[index]);
    } else {
      return undefined;
    }
  }, [selection, visibleColumnNames]);

  const handleHide = useCallback(() => {
    if (selectedColumns != undefined) {
      setHiddenColumns(selectedColumns);
    }
  }, [selectedColumns]);

  const handlePaste = useCallback(async () => {
    const firstSelection = selection[0];
    if (
      firstSelection?.cols != undefined &&
      firstSelection?.rows != undefined
    ) {
      // Get value from clipboard
      const clipboardText = await navigator.clipboard.readText();

      let clipboardValue = clipboardText
        .split("\n")
        .map((row) => row.split("\t"));

      let rowRange = range(firstSelection.rows[0], firstSelection.rows[1] + 1);
      let colRange = range(firstSelection.cols[0], firstSelection.cols[1] + 1);

      // If one cell is selected go through and paste
      if (rowRange.length == 1 && colRange.length == 1) {
        let rowStart = rowRange[0];
        let colStart = colRange[0];

        const newTableUpdates = clipboardValue.flatMap((row, rowIndex) => {
          return row.flatMap((value, columnIndex) => {
            // Ignore copying null values
            if (value == "") {
              return [];
            }

            const tableUpdate = getTableUpdate(
              url,
              value,
              visibleColumnNames[columnIndex + colStart],
              rowIndex + rowStart,
              transformedData,
              dataParameters
            );
            return [tableUpdate];
          });
        });

        setTableUpdates([...tableUpdates, ...newTableUpdates]);
      }

      const clipboardValueText = clipboardValue
        .map((row) => row.join("\t"))
        .join("\n");

      // Copy clipboard value to clipboard
      navigator.clipboard.writeText(clipboardValueText);
    }

    if (copiedColumn != undefined && selectedColumns.length == 1) {
      const selectedColumn = selectedColumns[0];

      const tableUpdate = {
        description:
          "Copy column " +
          copiedColumn +
          " to column " +
          selectedColumn +
          " for all rows",
        applyToCell: (value: string, row, cellColumnName) => {
          if (cellColumnName != selectedColumn) {
            return value;
          }

          // If this row doesn't pass all the filters skip it
          if (dataParameters?.filter != undefined) {
            for (const filter of Object.values(dataParameters.filter)) {
              if (!filter.passes(row)) {
                return value;
              }
            }
          }

          if (cellColumnName == selectedColumn) {
            return row[copiedColumn];
          }

          return value;
        },
        execute: async () => {
          await submitColumnCopy(
            url,
            copiedColumn,
            selectedColumn,
            dataParameters
          );
        },
      };

      setTableUpdates([...tableUpdates, tableUpdate]);
    }
  }, [selectedColumns, copiedColumn, dataParameters, selection]);

  const handleCopy = useCallback(() => {
    const firstSelection = selection[0];
    if (
      firstSelection?.cols != undefined &&
      firstSelection?.rows != undefined
    ) {
      let clipboardValue = range(
        firstSelection.rows[0],
        firstSelection.rows[1] + 1
      ).map((rowIndex) => {
        return range(firstSelection.cols[0], firstSelection.cols[1] + 1).map(
          (colIndex) => {
            return transformedData[rowIndex][visibleColumnNames[colIndex]];
          }
        );
      });

      const clipboardValueText = clipboardValue
        .map((row) => row.join("\t"))
        .join("\n");

      // Copy clipboard value to clipboard
      navigator.clipboard.writeText(clipboardValueText);
    }

    if (selectedColumns?.length == 1) {
      setCopiedColumn(selectedColumns[0]);
    }
  }, [selection, selectedColumns, transformedData]);

  const handleEnter = useCallback(
    (e) => {
      ref.current[focusedCell?.row][focusedCell?.col]?.click();
      e.preventDefault();
      e.stopPropagation();
    },
    [focusedCell]
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
        onKeyDown: handleHide,
        group: "Table",
      },
      {
        combo: "cmd+v",
        label: "Paste Data",
        onKeyDown: handlePaste,
        group: "Table",
      },
      {
        combo: "enter",
        label: "Edit Cell",
        onKeyDown: handleEnter,
        group: "Table",
      },
    ],
    [handlePaste, handleCopy, handleEnter, handleHide]
  );
  const { handleKeyDown, handleKeyUp } = useHotkeys(hotkeys);

  const submitTableUpdates = useCallback(async () => {
    setUpdateProgress({ value: 0, text: "Submitting changes" });

    let index = 0;
    for (const tableUpdate of tableUpdates) {
      setUpdateProgress({
        text: tableUpdate?.description ?? "Submitting changes",
      });

      try {
        await tableUpdate.execute();
      } catch (e) {
        setUpdateProgress({
          progressBarProps: { intent: "danger" },
          value: 1,
          text: "Error submitting changes",
        });

        setTimeout(() => {
          setUpdateProgress(undefined);
        }, 5000);

        return; // If there is an error, stop submitting
      }

      index += 1;
      setUpdateProgress({
        value: index / tableUpdates.length,
      });
    }

    setDataParameters(structuredClone(dataParameters));
    setUpdateProgress(undefined);
    setTableUpdates([]);
  }, [tableUpdates]);

  const onFilterChange = useCallback(
    (columnName: string, param: OperatorQueryParameter) => {
      const columnFilter = new Filter(columnName, param.operator, param.value);
      setDataParameters((p) => {
        let newDataParameters = cloneDataParameters(p);
        newDataParameters.filter[columnName] = columnFilter;
        return newDataParameters;
      });
    },
    []
  );

  const onGroupChange = useCallback((group: string | undefined) => {
    setDataParameters((p) => {
      let newDataParameters = cloneDataParameters(p);
      newDataParameters.group = group;
      return newDataParameters;
    });
  }, []);

  const columnHeaderCellRenderer = useCallback(
    (columnIndex: number) => {
      const columnName: string = visibleColumnNames[columnIndex];

      let filter = undefined;
      if (
        dataParameters.filter != undefined &&
        dataParameters.filter[columnName] != undefined
      ) {
        filter = dataParameters.filter[columnName];
      } else {
        filter = new Filter(columnName, undefined, "");
      }

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
                    h.if(finalColumns.includes(columnName))(Icon, {
                      icon: "star-empty",
                      size: "12",
                      color: "#333333",
                      style: { marginLeft: "5px", marginBottom: "2px" },
                    }),
                  ]),
                  h.if(
                    (columnName in dataParameters.filter &&
                      dataParameters.filter[columnName].is_valid()) ||
                      columnName == dataParameters?.group
                  )(Icon, {
                    icon: "filter-list",
                    size: "15",
                    color: "#333333",
                  }),
                  h.if(
                    !(
                      (columnName in dataParameters.filter &&
                        dataParameters.filter[columnName].is_valid()) ||
                      columnName == dataParameters?.group
                    )
                  )(Icon, { icon: "filter", size: "15", color: "#d0d0d0" }),
                ]
              )
            ),
          menuRenderer: () =>
            h(TableMenu, {
              columnName: columnName,
              onFilterChange: (x: OperatorQueryParameter) =>
                onFilterChange(columnName, x),
              filter: filter,
              onGroupChange: onGroupChange,
              group: dataParameters?.group,
              onHide: () => setHiddenColumns(columnName),
              hidden: !visibleColumnNames.includes(columnName),
            }),
          name: columnName,
          style: {
            backgroundColor:
              filter.is_valid() || dataParameters?.group == columnName
                ? "rgba(27,187,255,0.12)"
                : "#ffffff00",
          },
        },
        []
      );
    },
    [dataParameters, visibleColumnNames]
  );

  const rowHeaderCellRenderer = useCallback(
    (rowIndex: number) => {
      if (transformedData.length == 0) {
        return h(RowHeaderCell2, { name: "NULL" }, []);
      }

      const headerKey = dataParameters?.group ? dataParameters?.group : "_pkid";
      let name = transformedData[rowIndex][headerKey];

      if (name == null) {
        name = "NULL";
      } else if (name.length > 47) {
        name = name.slice(0, 47) + "...";
      }

      return h(RowHeaderCell2, { name: name }, []);
    },
    [dataParameters, transformedData]
  );

  const defaultColumnConfig = useMemo(() => {
    if (tableColumns.length == 0) {
      return {};
    }

    return visibleColumnNames.reduce((prev, columnName, index) => {
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
              onConfirm: (value) => {
                const tableUpdate = getTableUpdate(
                  url,
                  value,
                  columnName,
                  rowIndex,
                  transformedData,
                  dataParameters
                );
                setTableUpdates([...tableUpdates, tableUpdate]);
              },
              onCopy: (e) => {
                handleCopy(e);
              },
              onPaste: (e) => {
                handlePaste(e);
              },
              editableTextProps: {
                disabled: !finalColumns.includes(columnName),
              },
              intent:
                data[rowIndex][columnName] !=
                transformedData[rowIndex][columnName]
                  ? "success"
                  : undefined,
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
    visibleColumnNames,
    tableColumns,
    dataParameters,
    transformedData,
    data,
    selection,
  ]);

  const columnConfig = useMemo(() => {
    if (tableColumns.length == 0) {
      return defaultColumnConfig;
    }

    const generatedColumns = columnGenerator({
      url,
      defaultColumnConfig,
      tableColumns,
      dataParameters,
      setTableUpdates,
      transformedData,
      data,
      ref,
    });

    return generatedColumns;
  }, [
    defaultColumnConfig,
    visibleColumnNames,
    dataParameters,
    transformedData,
    data,
    selection,
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
        h(InputForm, {
          hiddenColumns,
          setHiddenColumns,
          setShowOmitted,
          showOmitted,
          tableUpdates,
          setTableUpdates,
          numberOfRows,
          ingestProcessId,
          submitTableUpdates,
        }),
        h(
          Table2,
          {
            enableFocusedCell: true,
            selectionModes: SelectionModes.COLUMNS_AND_CELLS,
            rowHeaderCellRenderer: rowHeaderCellRenderer,
            onFocusedCell: (focusedCellCoordinates) => {
              try {
                ref.current[focusedCellCoordinates?.row][
                  focusedCellCoordinates?.col
                ]?.focus();
              } catch (e) {}

              setFocusedCell(focusedCellCoordinates);
            },
            loadingOptions: loading ? ["cells", "column-header"] : [],
            focusedCell: focusedCell,
            onSelection: (selections: Selection[]) => {
              console.log(
                "Columns:",
                selections[0].cols,
                "Rows:",
                selections[0].rows
              );
              setSelection(selections);
            },
            onVisibleCellsChange: (visibleCells) => {
              if (
                visibleCells["rowIndexEnd"] >
                parseInt(dataParameters.select.pageSize) - 2
              ) {
                const newPageSize = (
                  parseInt(dataParameters.select.pageSize) + 50
                ).toString();

                setDataParameters((p) => {
                  let newDataParameters = cloneDataParameters(p);
                  newDataParameters.select.pageSize = newPageSize;
                  return newDataParameters;
                });
              }
            },
            numRows: data.length,
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

function InputForm({
  hiddenColumns,
  setHiddenColumns,
  setShowOmitted,
  showOmitted,
  tableUpdates,
  setTableUpdates,
  numberOfRows,
  ingestProcessId,
  submitTableUpdates,
}) {
  return h("div.input-form", {}, [
    h(ButtonGroup, [
      h(Popover, {
        interactionKind: "click",
        minimal: true,
        placement: "bottom-start",
        content: h(Menu, {}, [
          h(
            MenuItem,
            {
              disabled: hiddenColumns.length == 0,
              icon: "eye-open",
              text: "Show All",
              onClick: () => setHiddenColumns([]),
            },
            []
          ),
          h(
            MenuItem,
            {
              icon: "cross",
              text: "Show Omitted",
              onClick: () => setShowOmitted(!showOmitted),
            },
            []
          ),
        ]),
        renderTarget: ({ isOpen, ref, ...targetProps }) =>
          h(Button, { ...targetProps, elementRef: ref, icon: "menu" }, []),
      }),
      h(
        Button,
        {
          onClick: () => {
            setTableUpdates([]);
          },
          disabled: tableUpdates.length == 0,
        },
        ["Clear changes"]
      ),
      h(
        Button,
        {
          type: "submit",
          onClick: submitTableUpdates,
          disabled: tableUpdates.length == 0,
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
            objects.forEach((object) => download_file(object.pre_signed_url));
          },
        },
        ["Download Source"]
      ),
      h.if(numberOfRows != undefined)(
        Button,
        {
          disabled: true,
        },
        [`${numberOfRows} Total Rows`]
      ),
    ]),
  ]);
}
