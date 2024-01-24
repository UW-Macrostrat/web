import hyper from "@macrostrat/hyper";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
  useMemo,
  FunctionComponent,
} from "react";
import { HotkeysProvider, InputGroup, Button } from "@blueprintjs/core";
import { Spinner, ButtonGroup } from "@blueprintjs/core";
import {
  Column,
  Table2,
  EditableCell2,
  RowHeaderCell2,
  ColumnHeaderCell2,
  SelectionModes,
  RegionCardinality,
} from "@blueprintjs/table";
import update from "immutability-helper";

import {
  Filters,
  OperatorQueryParameter,
  TableUpdate,
  TableSelection,
  Selection,
  DataParameters,
} from "../table";
import {
  buildURL,
  Filter,
  isEmptyArray,
  submitChange,
  getTableUpdate,
  range,
  applyTableUpdates,
} from "../table-util";
import TableMenu from "../table-menu";
import IntervalSelection from "./cell/interval-selection";
import ProgressPopover from "./progress-popover/progress-popover";

import "./override.sass";
import "@blueprintjs/table/lib/css/table.css";
import styles from "./edit-table.module.sass";
import { EditableCell } from "./cell/editable-cell";
import EditTable from "../edit-table";

const h = hyper.styled(styles);

const FINAL_COLUMNS = [
  "source_id",
  "orig_id",
  "descrip",
  "ready",
  "name",
  "strat_name",
  "age",
  "lith",
  "comments",
  "t_interval",
  "b_interval",
];

interface EditTableProps {
  url: string;
  data: {
    [key: string]: any;
  };
}

interface TableState {
  error: string | undefined;
  filters: Filters;
  group: string | undefined;
  tableSelection: TableSelection;
}

export default function TableInterface({ url }: EditTableProps) {
  // Data State
  const [dataParameters, setDataParameters] = useState<DataParameters>({
    select: { page: "0", pageSize: "999999" },
  });
  const [data, setData] = useState<any[]>([]);
  const [dataToggle, setDataToggle] = useState<boolean>(false);

  // Error State
  const [error, setError] = useState<string | undefined>(undefined);

  // Table Update State
  const [tableUpdates, setTableUpdates] = useState<TableUpdate[]>([]);
  const [updateProgress, setUpdateProgress] = useState<number | undefined>(
    undefined
  );

  // Memoize non-id columns
  const nonIdColumnNames = useMemo(() => {
    return data.length ? Object.keys(data[0]).filter((x) => x != "_pkid") : [];
  }, [data]);

  let getData = async () => {
    const dataURL = buildURL(url, dataParameters);

    const response = await fetch(dataURL);
    const data = await response.json();

    if (data.length == 0) {
      setError("Warning: No results matched query");
    } else {
      setError(undefined);
      setData(data);
    }

    // Remove the progress bar on data reload
    setUpdateProgress(undefined);

    return data;
  };

  // On mount get data
  useEffect(() => {
    getData();
  }, [dataParameters]);

  if (data.length == 0 && error == undefined) {
    return h(Spinner);
  }

  const submitTableUpdates = async () => {
    setUpdateProgress(0);

    let index = 0;
    for (const tableUpdate of tableUpdates) {
      try {
        await tableUpdate.execute();
      } catch (e) {
        setUpdateProgress(undefined);
        return; // If there is an error, stop submitting
      }

      index += 1;
      setUpdateProgress(index / tableUpdates.length);
    }

    setTableUpdates([]);
    setDataToggle(!dataToggle);
  };

  const columnHeaderCellRenderer = (columnIndex: number) => {
    const columnName: string = nonIdColumnNames[columnIndex];

    const onFilterChange = (param: OperatorQueryParameter) => {
      const columnFilter = new Filter(columnName, param.operator, param.value);
      setDataParameters({
        ...dataParameters,
        filter: { ...dataParameters.filter, [columnName]: columnFilter },
      });
    };

    const filter = dataParameters.filter[columnName];

    const setGroup = (group: string | undefined) => {
      setDataParameters({ ...dataParameters, group: group });
    };

    return h(
      ColumnHeaderCell2,
      {
        menuRenderer: () =>
          h(TableMenu, {
            columnName: columnName,
            onFilterChange: onFilterChange,
            filter: filter,
            onGroupChange: setGroup,
            group: dataParameters?.group,
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
  };

  const defaultColumnConfig = Object.entries(nonIdColumnNames).map(
    ([columnName, value], index) => {
      return h(Column, {
        name: columnName,
        className: FINAL_COLUMNS.includes(columnName) ? "final-column" : "",
        columnHeaderCellRenderer: columnHeaderCellRenderer,
        cellRenderer: (rowIndex) =>
          h(EditableCell, {
            onConfirm: (value) => {
              const tableUpdate = getTableUpdate(
                url,
                value,
                columnName,
                rowIndex,
                data,
                dataParameters
              );
              setTableUpdates([...tableUpdates, tableUpdate]);
            },
            value: applyTableUpdates(data[rowIndex], columnName, tableUpdates),
          }),
        key: columnName,
      });
    }
  );

  const columnConfig = {
    ...defaultColumnConfig,
    t_interval: h(Column, {
      ...defaultColumnConfig["t_interval"],
      cellRenderer: (rowIndex) =>
        h(IntervalSelection, {
          onConfirm: (value) => {
            const tableUpdate = getTableUpdate(
              url,
              value,
              "t_interval",
              rowIndex,
              data,
              dataParameters
            );
            setTableUpdates([...tableUpdates, tableUpdate]);
          },
          value: data[rowIndex]["t_interval"],
        }),
    }),
  };

  const rowHeaderCellRenderer = (rowIndex: number) => {
    const headerKey = dataParameters?.group ? dataParameters?.group : "_pkid";
    let name = data[rowIndex][headerKey];

    if (name == null) {
      name = "NULL";
    } else if (name.length > 47) {
      name = name.slice(0, 47) + "...";
    }

    return h(RowHeaderCell2, { name: name }, []);
  };

  return h(HotkeysProvider, {}, [
    h("div.table-container", {}, [
      h.if(error != undefined)("div.warning", {}, [error]),
      h("div.input-form", {}, [
        h(ButtonGroup, [
          h(
            Button,
            {
              onClick: () => {
                setTableUpdates([]);
              },
              disabled: isEmptyArray(tableUpdates),
            },
            ["Clear changes"]
          ),
          h(
            Button,
            {
              type: "submit",
              onClick: submitTableUpdates,
              disabled: isEmptyArray(tableUpdates),
              intent: "success",
            },
            ["Submit"]
          ),
        ]),
      ]),
      h(
        Table2,
        {
          selectionModes: dataParameters?.group
            ? RegionCardinality.CELLS
            : SelectionModes.COLUMNS_AND_CELLS,
          rowHeaderCellRenderer: rowHeaderCellRenderer,
          onSelection: (selections: Selection[]) =>
            getSelectionValues(selections),
          numRows: data.length,
          // Dumb hacks to try to get the table to rerender on changes
          cellRendererDependencies: [data],
        },
        columnConfig
      ),
      h.if(updateProgress != undefined)(ProgressPopover, {
        text: "Submitting Changes",
        value: updateProgress,
        progressBarProps: { intent: "success" },
      }),
    ]),
  ]);
}
