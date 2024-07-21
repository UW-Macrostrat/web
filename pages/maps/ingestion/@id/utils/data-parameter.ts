import { Filter } from "./filter";

interface DataParameters {
  group?: string;
  select: {
    page?: string;
    pageSize?: string;
  };
  filter: {
    [key: string]: Filter; // Used for filters
  };
}

const cloneDataParameters = (dataParameters: DataParameters) : DataParameters => {
  return {
    group: dataParameters?.group,
    select: { ...dataParameters?.select },
    filter: Object.entries(dataParameters?.filter).reduce(
      (acc, [key, value]) => {
        acc[key] = value.clone();
        return acc;
      },
      {}
    ),
  };
};

/*
 * Check if a column is active in the data parameters
 */
export const isColumnActive = (dataParameters: DataParameters, column: string) => {
  return (
    column in dataParameters.filter &&
    dataParameters.filter[column].is_valid()
  ) || column == dataParameters?.group
}

export { cloneDataParameters, DataParameters };
