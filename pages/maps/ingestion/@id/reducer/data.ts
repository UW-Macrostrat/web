import { buildURL } from "../components/table-util";
import {
  applyTableUpdates,
  TableUpdate,
  DataParameters,
  squashTableUpdates,
  cloneDataParameters,
  Filter,
} from "../utils/index";

export interface TableStoredState {
  hiddenColumns: string[];
}

export interface TableData extends TableStoredState {
  loading: boolean;
  remoteData: Record<string, boolean | string | number | null>[];
  totalNumberOfRows?: number;
  allColumns: string[];
  tableUpdates: TableUpdate[];
  parameters: DataParameters;
}

export const initialState: TableData = {
  loading: true,
  remoteData: [],
  totalNumberOfRows: undefined,
  allColumns: [],
  hiddenColumns: [],
  tableUpdates: [],
  parameters: {
    select: {
      page: "0",
      pageSize: "50",
    },
    filter: {
      omit: new Filter("omit", "is_distinct_from", "true"),
    },
  },
};

export const addTableUpdates = (
  state: TableData,
  tableUpdates: TableUpdate[]
) => {
  // Squash new and existing updates
  const newTableUpdates = squashTableUpdates([
    ...state.tableUpdates,
    ...tableUpdates,
  ]);

  return {
    ...state,
    tableUpdates: newTableUpdates,
  };
};

export const clearTableUpdates = (state: TableData) => {
  return {
    ...state,
    tableUpdates: [],
  };
};

export const revertTableUpdate = (state: TableData) => {
  const newTableUpdates = [...state.tableUpdates];
  newTableUpdates.pop();

  return {
    ...state,
    tableUpdates: newTableUpdates,
  };
};

export const updateColumns = (state: TableData, columns: string[]) => {
  return {
    ...state,
    allColumns: columns,
  };
};

export const hideColumn = (state: TableData, column: string) => {
  return {
    ...state,
    hiddenColumns: [...state.hiddenColumns, column],
  };
};

export const showColumn = (state: TableData, column: string) => {
  return {
    ...state,
    hiddenColumns: state.hiddenColumns.filter((c) => c !== column),
  };
};

export const showAllColumns = (state: TableData) => {
  return {
    ...state,
    hiddenColumns: [],
  };
};

export const toggleShowOmittedRows = (state: TableData) => {
  const newDataParameters = cloneDataParameters(state.parameters);
  const currentlyHidden = newDataParameters.filter["omit"].is_valid();

  if (currentlyHidden) {
    newDataParameters.filter["omit"] = new Filter("omit", "eq", null);
  } else {
    newDataParameters.filter["omit"] = new Filter(
      "omit",
      "is_distinct_from",
      "true"
    );
  }

  return {
    ...state,
    parameters: newDataParameters,
  };
};

export const updateData = (
  state: TableData,
  action: {
    data: Record<string, boolean | string | number | null>[];
    totalNumberOfRows: number;
  }
) => {
  console.log("updateData", action.data);
  // Check if there are new columns to record
  const dataColumns =
    action.data.length == 0 ? [] : Object.keys(action.data[0]);
  const allColumns = [...new Set([...state.allColumns, ...dataColumns])];

  // Add a filter for all the new columns
  allColumns.forEach((c) => {
    if (!(c in state.parameters.filter)) {
      state.parameters.filter[c] = new Filter(c, "eq", null);
    }
  });

  return {
    ...state,
    remoteData: action.data,
    totalNumberOfRows: action.totalNumberOfRows,
    allColumns,
    loading: false,
  };
};

export const appendData = (
  state: TableData,
  data: Record<string, boolean | string | number | null>[]
) => {
  const remoteData = [...state.remoteData, ...data];

  return {
    ...state,
    remoteData,
  };
};

export const setPage = (state: TableData, page: string) => {
  const newDataParameters = cloneDataParameters(state.parameters);
  newDataParameters.select.page = page;

  return {
    ...state,
    parameters: newDataParameters,
  };
};

export const incrementPage = (state: TableData, increment: number | string) => {
  const page =
    parseInt(state.parameters.select.page) + parseInt(increment.toString());
  return setPage(state, page.toString());
};

export const setPageSize = (state: TableData, pageSize: string) => {
  const newDataParameters = cloneDataParameters(state.parameters);
  newDataParameters.select.pageSize = pageSize;

  return {
    ...state,
    parameters: newDataParameters,
  };
};

export const incrementPageSize = (
  state: TableData,
  increment: number | string
) => {
  const pageSize =
    parseInt(state.parameters.select.pageSize) + parseInt(increment.toString());
  return setPageSize(state, pageSize.toString());
};

export const setGroupBy = (state: TableData, groupBy: string | undefined) => {
  const newDataParameters = cloneDataParameters(state.parameters);
  newDataParameters.group = groupBy;

  return {
    ...state,
    parameters: newDataParameters,
  };
};

export const setFilter = (state: TableData, filter: Filter) => {
  const newDataParameters = cloneDataParameters(state.parameters);
  newDataParameters.filter[filter.column_name] = filter;

  return {
    ...state,
    parameters: newDataParameters,
  };
};

export const clearDataParameters = (state: TableData) => {
  const newDataParameters = cloneDataParameters(state.parameters);
  newDataParameters.filter = {};
  newDataParameters.group = undefined;

  return {
    ...state,
    parameters: newDataParameters,
  };
};

type Action =
  | {
      type: "updateData";
      data: Record<string, boolean | string | number | null>[];
      totalNumberOfRows: number;
    }
  | {
      type: "appendData";
      data: Record<string, boolean | string | number | null>[];
    }
  | { type: "updateColumns"; columns: string[] }
  | { type: "updateHiddenColumns"; data: string[] }
  | { type: "hideColumn"; column: string }
  | { type: "showColumn"; column: string }
  | { type: "showAllColumns" }
  | { type: "toggleShowOmittedRows" }
  | { type: "addTableUpdates"; tableUpdates: TableUpdate[] }
  | { type: "clearTableUpdates" }
  | { type: "revertTableUpdate" }
  | { type: "setGroupBy"; groupBy: string | undefined }
  | { type: "setFilter"; filter: Filter }
  | { type: "clearDataParameters" }
  | { type: "setPage"; page: string }
  | { type: "incrementPage"; increment: number | string }
  | { type: "setPageSize"; pageSize: string }
  | { type: "incrementPageSize"; increment: number | string };

export const tableDataReducer = (
  state: TableData,
  action: Action
): TableData => {
  switch (action.type) {
    case "updateData":
      return updateData(state, action);
    case "appendData":
      return appendData(state, action.data);
    case "updateColumns":
      return updateColumns(state, action.columns);
    case "updateHiddenColumns":
      return { ...state, hiddenColumns: action.data };
    case "hideColumn":
      return hideColumn(state, action.column);
    case "showColumn":
      return showColumn(state, action.column);
    case "showAllColumns":
      return showAllColumns(state);
    case "toggleShowOmittedRows":
      return toggleShowOmittedRows(state);
    case "addTableUpdates":
      return addTableUpdates(state, action.tableUpdates);
    case "clearTableUpdates":
      return clearTableUpdates(state);
    case "revertTableUpdate":
      return revertTableUpdate(state);
    case "setGroupBy":
      return setGroupBy(state, action.groupBy);
    case "setFilter":
      return setFilter(state, action.filter);
    case "clearDataParameters":
      return clearDataParameters(state);
    case "setPage":
      return setPage(state, action.page);
    case "incrementPage":
      return incrementPage(state, action.increment);
    case "setPageSize":
      return setPageSize(state, action.pageSize);
    case "incrementPageSize":
      return incrementPageSize(state, action.increment);
  }
};
