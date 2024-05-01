
import { buildURL } from "../components/table-util";
import {
  applyTableUpdates,
  TableUpdate,
  DataParameters,
  squashTableUpdates,
  cloneDataParameters,
  Filter
} from "../utils/index";

interface TableData {
  loading: boolean;
  remoteData: Record<string, boolean | string | number | null>[];
  totalNumberOfRows?: number;
  allColumns: string[];
  hiddenColumns: string[];
  showOmittedRows: boolean;
  localPatches: Record<string, boolean | string | number | null>[];
  tableUpdates: TableUpdate[];
  parameters: DataParameters;
}

export const initialState: TableData = {
  loading: true,
  remoteData: [],
  totalNumberOfRows: undefined,
  allColumns: [],
  hiddenColumns: [],
  showOmittedRows: false,
  localPatches: [],
  tableUpdates: [],
  parameters: {
    select: {
      page: "0",
      pageSize: "50"
    },
    filter: {}
  }
};

export const addTableUpdates = (state: TableData, tableUpdates: TableUpdate[]) => {
  // Squash new and existing updates
  const newTableUpdates = squashTableUpdates([...state.tableUpdates, ...tableUpdates]);

  // Apply the updates to the local data
  let newLocalPatches = structuredClone(state.localPatches);
  newLocalPatches = applyTableUpdates(state.remoteData, newLocalPatches, newTableUpdates);

  return {
    ...state,
    localPatches: newLocalPatches,
    tableUpdates: newTableUpdates
  }
}

export const clearTableUpdates = (state: TableData) => {
  return {
    ...state,
    localPatches: [],
    tableUpdates: []
  };
}

export const revertTableUpdate = (state: TableData) => {
  const newTableUpdates = [...state.tableUpdates];
  newTableUpdates.pop();

  // Apply the updates to the local data
  let newLocalPatches = structuredClone(state.localPatches);
  newLocalPatches = applyTableUpdates(state.remoteData, newLocalPatches, newTableUpdates);

  return {
    ...state,
    localPatches: newLocalPatches,
    tableUpdates: newTableUpdates
  };
}

export const hideColumn = (state: TableData, column: string) => {
  return {
    ...state,
    hiddenColumns: [...state.hiddenColumns, column]
  };
}

export const showColumn = (state: TableData, column: string) => {
  return {
    ...state,
    hiddenColumns: state.hiddenColumns.filter(c => c !== column)
  };
}

export const showAllColumns = (state: TableData) => {
  return {
    ...state,
    hiddenColumns: []
  };
}

export const toggleShowOmittedRows = (state: TableData) => {
  return {
    ...state,
    showOmittedRows: !state.showOmittedRows
  };
}

export const updateData = (
  state: TableData,
  action : {
    data: Record<string, boolean | string | number | null>[],
    totalNumberOfRows: number
  }
) => {

  // Check if there are new columns to record
  const dataColumns = Object.keys(action.data[0]);
  const allColumns = [...new Set([...state.allColumns, ...dataColumns])];

  // Add a filter for all the new columns
  allColumns.forEach((c) => {
    if (!(c in state.parameters.filter)) {
      state.parameters.filter[c] = new Filter(c, "eq", "");
    }
  })

  // Apply the updates to the local data
  const localPatches = applyTableUpdates(action.data, [], state.tableUpdates);

  return {
    ...state,
    remoteData: action.data,
    totalNumberOfRows: action.totalNumberOfRows,
    allColumns,
    localPatches,
    loading: false
  }
}

export const appendData = (
  state: TableData,
  data: Record<string, boolean | string | number | null>[]
) => {

  const remoteData = [...state.remoteData, ...data];
  const localPatches = applyTableUpdates(remoteData, [], state.tableUpdates);

  return {
    ...state,
    remoteData,
    localPatches
  };
}

export const setPage = (state: TableData, page: string) => {
  const newDataParameters = cloneDataParameters(state.parameters);
  newDataParameters.select.page = page;

  return {
    ...state,
    parameters: newDataParameters
  };
}

export const incrementPage = (state: TableData, increment: number | string ) => {
  const page = parseInt(state.parameters.select.page) +
    parseInt(increment.toString());
  return setPage(state, page.toString());
}

export const setPageSize = (state: TableData, pageSize: string) => {
  const newDataParameters = cloneDataParameters(state.parameters);
  newDataParameters.select.pageSize = pageSize;

  return {
    ...state,
    parameters: newDataParameters
  };
}

export const incrementPageSize = (state: TableData, increment: number | string) => {
  const pageSize = parseInt(state.parameters.select.pageSize) +
    parseInt(increment.toString());
  return setPageSize(state, pageSize.toString());
}

export const setGroupBy = (state: TableData, groupBy: string | undefined) => {
  const newDataParameters = cloneDataParameters(state.parameters);
  newDataParameters.group = groupBy;

  return {
    ...state,
    parameters: newDataParameters
  };
}

export const setFilter = (state: TableData, filter: Filter) => {
  const newDataParameters = cloneDataParameters(state.parameters);
  newDataParameters.filter[filter.column_name] = filter;

  return {
    ...state,
    parameters: newDataParameters
  };
}

export const tableDataReducer = (state: TableData, action: any): TableData => {
  switch (action.type) {
    case "updateData":
      return updateData(state, action);
    case "appendData":
      return appendData(state, action.data);
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

