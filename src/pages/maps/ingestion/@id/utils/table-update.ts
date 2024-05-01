import { Filter, createFiltersKey, addFilterToURL, rowPassesFilters } from "./filter";
import { DataParameters, cloneDataParameters } from "./data-parameter";
import { secureFetch } from "@macrostrat-web/security";
import { ProgressPopoverProps, submitColumnCopy } from "~/pages/maps/ingestion/@id/components";

export interface TableUpdate {
  // Used to merge updates
  key?: string;
  // Column
  column: string;
  // Helpful for debugging
  description?: string;
  // Function to execute this update
  execute: () => Promise<void>;
  // Function to lyTablely this update to a cell
  applyToCell: (
    currentValue: boolean | string | number | null,
    row: Record<string, boolean | string | number | null>,
    cellColumnName: string
  ) => string;
}

export const applyTableUpdate = (
  data: Record<string, boolean | string | number | null>[],
  patchData: Record<string, boolean | string | number | null>[],
  tableUpdate: TableUpdate
) => {
  for (const [rowIndex, row] of data.entries()) {

    // Make sure the patch data has an object to populate
    if(patchData[rowIndex] == undefined) {
      patchData[rowIndex] = {};
    }

    // If the data is different, apply the patch
    const appliedValue = tableUpdate.applyToCell(
      data[rowIndex][tableUpdate.column],
      row,
      tableUpdate.column
    );

    if(data[rowIndex][tableUpdate.column] != appliedValue){
      patchData[rowIndex][tableUpdate.column] = appliedValue
    }
  }

  return patchData;
};

export const applyTableUpdates = (
  data: Record<string, boolean | string | number | null>[],
  patchData: Record<string, boolean | string | number | null>[],
  tableUpdates: TableUpdate[]
) => {
  data = structuredClone(data)
  for (const tableUpdate of tableUpdates) {
    patchData = applyTableUpdate(data, patchData, tableUpdate);
    data = getPatchedData(data, patchData);
  }

  return patchData;
};

export const createTableUpdateCopyColumn = (
  url: string,
  selectedColumn: string,
  copiedColumn: string,
  dataParameters: DataParameters
): TableUpdate => {

  dataParameters = cloneDataParameters(dataParameters);

  return {
    column: selectedColumn,
    description: `Copy column ${copiedColumn} to ${selectedColumn}`,
    applyToCell: (value, row, cellColumnName) => {

      if(!rowPassesFilters(row, Object.values(dataParameters.filter))){
        return value;
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
    }
  }
}

export const createTableUpdate = (
  url: string,
  value: string,
  columnName: string,
  row: Record<string, boolean | string | number | null>,
  dataParameters: DataParameters
): TableUpdate => {

  let newDataParameters = cloneDataParameters(dataParameters);
  if (newDataParameters?.group != undefined) {
    newDataParameters.filter[newDataParameters?.group] =
      new Filter(
        newDataParameters?.group,
        "eq",
        row[newDataParameters?.group]
      );
  } else {
    newDataParameters.filter["_pkid"] = new Filter(
      "_pkid",
      "eq",
      row["_pkid"]
    );
  }

  const execute = async () =>
    submitChange(url, value, [columnName], newDataParameters.filter);

  const apply = (
    currentValue: string,
    row: { [key: string]: string },
    cellColumnName: string
  ) => {

    // If this row doesn't pass all the filters skip it
    if(!rowPassesFilters(row, Object.values(newDataParameters.filter))){
      return currentValue;
    }

    // Return the new value
    return value;
  };

  const filterKey = createFiltersKey(Object.values(newDataParameters.filter));

  return {
    column: columnName,
    key: filterKey,
    description: `Update ${columnName} to ${value} for ${filterKey}`,
    execute: execute,
    applyToCell: apply
  } as TableUpdate;
};

export const submitChange = async (
  url: string,
  value: string,
  columns: string[],
  filters: { [key: string]: Filter }
) => {

  for (const column of columns) {
    let updateURL = new URL(url);

    // Add the filters to the query parameters
    Object.values(filters).forEach((filter) => {
      addFilterToURL(updateURL, filter);
    });

    // Create the request body
    let patch = { [column]: value };

    // Send the request
    let response = await secureFetch(updateURL, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patch),
    });

    if (response.status != 204) {
      // Stop execution if the request failed
      throw Error("Failed to update");
    }
  }
};

/*
 * Squash adjacent updates with the same key
 *
 * If one update is followed by another update to the same set of cells
 * remove the first update
 */
export const squashTableUpdates = (tableUpdates: TableUpdate[]) : TableUpdate[] => {
  let squashedTableUpdates = [];
  let lastTableUpdate = null;
  for (const tableUpdate of tableUpdates) {
    if (tableUpdate.key == lastTableUpdate?.key && tableUpdate.column == lastTableUpdate?.column) {
      squashedTableUpdates.pop();
    }
    squashedTableUpdates.push(tableUpdate);
    lastTableUpdate = tableUpdate;
  }

  return squashedTableUpdates;
}

/*
 * Get patched data
 */
export const getPatchedData = (
  data: Record<string, boolean | string | number | null>[],
  patchData: Record<string, boolean | string | number | null>[]
) : Record<string, boolean | string | number | null>[] => {
  const patchedData = structuredClone(data)
  patchData.forEach((patch, i) => {
    patchedData[i] = { ...patchedData[i], ...patch }
  })
  return patchedData
}

/*
 * Submit table updates, returning any updates that were not submitted
 */
export const submitTableUpdates = async (
  tableUpdates: TableUpdate[],
  setProgress: (p: ProgressPopoverProps) => void
) : Promise<TableUpdate[]> => {

  let index = 0;
  for (const tableUpdate of tableUpdates) {
    setProgress({
      text: tableUpdate?.description ?? "Submitting changes",
    });

    try {
      await tableUpdate.execute();
    } catch (e) {

      // If there is an error, set the progress to an error state and stop submitting
      setProgress({
        progressBarProps: { intent: "danger" },
        value: 1,
        text: "Error submitting changes",
      });

      setTimeout(() => {
        setProgress(undefined);
      }, 5000);

      // Return remaining table updates
      return tableUpdates.slice(index);
    }

    index += 1;
    setProgress({
      value: index / tableUpdates.length,
    });
  }

  setProgress(undefined);

  return [];
}