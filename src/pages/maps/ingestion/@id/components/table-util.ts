import { addFilterToURL, Filter } from "../utils/filter";
import { DataParameters } from "../utils/data-parameter";
import { secureFetch } from "@macrostrat-web/security";
import { Selection } from "../table"
import { createTableUpdate } from "../utils";

export function buildURL(baseURL: string, dataParameters: DataParameters) {
  let url = new URL(baseURL);

  // Order by ID if no group is specified
  if (dataParameters?.group == undefined) {
    url.searchParams.append("_pkid", "order_by");

    // Otherwise order by group and group by group
  } else {
    url.searchParams.append(dataParameters.group, "order_by");
    url.searchParams.append(dataParameters.group, "group_by");
  }

  // Add the page and page size
  url.searchParams.append("page", dataParameters.select.page);
  url.searchParams.append("page_size", dataParameters.select.pageSize);

  // Add the rest of the filters
  if (dataParameters?.filter != undefined) {
    Object.values(dataParameters.filter).forEach((filter) => {
      url = addFilterToURL(url, filter);
    })
  }

  return url;
}

export const submitColumnCopy = async (
  url: string,
  sourceColumn: string,
  targetColumn: string,
  dataParameters: DataParameters
) => {
  let updateURL = new URL(url + "/" + targetColumn);

  // Add the filters to the query parameters
  for (const filter of Object.values(dataParameters.filter)) {
    // Check that the filter is valid
    if (!filter.is_valid()) {
      continue;
    }

    const [columnName, filterValue] = filter.to_array();
    updateURL.searchParams.append(columnName, filterValue);
  }

  // Create the request body
  let patch = { source_column: sourceColumn };

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
};

export function isEmptyArray(arr) {
  return arr.length == 0 || arr.every((x) => x == null);
}

export const range = (start, stop, step = 1) : number[] =>
  Array(Math.ceil((stop - start) / step))
    .fill(start)
    .map((x, y) => x + y * step);

export const download_file = (url) => {
  // Create an anchor element
  const link = document.createElement("a");
  link.href = url;
  link.download = url.substring(url.lastIndexOf("/") + 1);

  // Simulate click to trigger download
  document.body.appendChild(link);
  link.click();

  // Remove the element from the DOM
  document.body.removeChild(link);
};

export const updateInput = async (input, value) => {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  ).set;
  nativeInputValueSetter.call(input, value);
  const event = new Event("input", { bubbles: true });
  input.dispatchEvent(event);
};

export const getSelectedColumns = (columns: string[], selection: Selection[] | undefined) => {
  if (selection == undefined || selection.length == 0) {
    return undefined;
  }

  const selectedColumnRange = selection[0]?.cols;
  if (selection[0]?.rows == undefined) {
    const selectedColumnIndices = range(
      selectedColumnRange[0],
      selectedColumnRange[1] + 1
    );
    return selectedColumnIndices?.map((index) => columns[index]);
  } else {
    return undefined;
  }
}

export const selectionToText = (
  selection: Selection,
  columns: string[],
  data: Record<string, string | number | boolean | null>[]
) => {

  // If no text is selected return empty string
  if (selection?.cols == undefined || selection?.rows == undefined) {
    return "";
  }

  let clipboardValue = range(
    selection.rows[0],
    selection.rows[1] + 1
  ).map((rowIndex) => {
    return range(selection.cols[0], selection.cols[1] + 1).map(
      (colIndex) => {
        return data[rowIndex][columns[colIndex]];
      }
    );
  });

  return clipboardValue
    .map((row) => row.join("\t"))
    .join("\n");
}

export const textToTableUpdates = (
  text: string,
  selection: Selection,
  url: string,
  columns: string[],
  data: Record<string, string | number | boolean | null>[],
  dataParameters: DataParameters
) => {
  let clipboardValue = text
    .split("\n")
    .map((row) => row.split("\t"));

  let rowRange = range(selection.rows[0], selection.rows[1] + 1);
  let colRange = range(selection.cols[0], selection.cols[1] + 1);

  // Check if one cell or equal space is selected
  if (rowRange.length == 1 && colRange.length == 1) {
    let rowStart = selection.rows[0];
    let colStart = selection.cols[0];

    const newTableUpdates = clipboardValue.flatMap((row, rowIndex) => {
      return row.flatMap((value, columnIndex) => {
        // Ignore copying null values
        if (value == "") {
          return [];
        }

        const tableUpdate = createTableUpdate(
          url,
          value,
          columns[columnIndex + colStart],
          data[rowIndex + rowStart],
          dataParameters
        );
        return [tableUpdate];
      });
    });

    return newTableUpdates;
  }

  return []
}

export const getData = async (
  url: string,
  parameters: DataParameters
)  => {

  const parameterizedURL = buildURL(url, parameters)
  const response = await fetch(parameterizedURL, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  });

  const data = await response.json();
  const totalNumberOfRows = parseInt(response.headers.get("X-Total-Count"));

  return { data, totalNumberOfRows };
}

export const getCellSelected = (
  columns: string[],
  selection: Selection[]
) : {rowIndex: number, columnIndex: number} | undefined => {
  const firstSelection = selection[0];
  if (firstSelection?.cols == undefined || firstSelection?.rows == undefined) {
    return undefined;
  }

  if(
    firstSelection.cols[0] == firstSelection.cols[1] &&
    firstSelection.rows[0] == firstSelection.rows[1]
  ) {
    return {
      rowIndex: firstSelection.rows[0],
      columnIndex: firstSelection.cols[0],
    }
  }
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const reorderColumns = (columns: string[], visibleColumns: string[], oldIndex: number, newIndex: number, length: number) => {

  let newColumns = [...columns];

  // Get the columns that are being moved and then remove them
  let movedColumns = [...visibleColumns.slice(oldIndex, oldIndex + length)];

  // Remove the moved columns from columns
  newColumns = newColumns.filter((c) => !movedColumns.includes(c));

  // Place the columns at the new index
  if(newIndex == visibleColumns.length - 1) {
    newColumns = [...newColumns, ...movedColumns];
  } else {
    let columnAfter;
    if(newIndex > oldIndex) {
      columnAfter = visibleColumns[newIndex + length]
    } else {
      columnAfter = visibleColumns[newIndex];
    }

    let indexAfter = newColumns.indexOf(columnAfter);
    newColumns.splice(indexAfter, 0, ...movedColumns);
  }

  return newColumns
}
