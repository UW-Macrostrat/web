import { ColumnOperators } from "#/maps/ingestion/@id/table";

export class Filter {
  readonly column_name: string;
  readonly operator: ColumnOperators | undefined;
  readonly value: string | boolean | number | null;

  constructor(
    column_name: string,
    operator: ColumnOperators | undefined,
    value: string | boolean | number | null
  ) {
    this.column_name = column_name;
    this.operator = operator;
    this.value = value;
  }

  get formattedValue() {
    switch (this.operator) {
      case "in":
        return `(${this.value})`;
      default:
        return this.value;
    }
  }

  get urlValue() {
    return `${this.operator}.${this.formattedValue}`;
  }

  clone = () => {
    return new Filter(this.column_name, this.operator, this.value);
  };

  passes = (data: Record<string, string | boolean | number | null>) => {
    const filterValue = data[this.column_name];
    switch (this.operator) {
      case "eq":
        return filterValue == this.value;
      case "lt":
        return filterValue < this.value;
      case "le":
        return filterValue <= this.value;
      case "gt":
        return filterValue > this.value;
      case "ge":
        return filterValue >= this.value;
      case "ne":
        return filterValue != this.value;
      case "is_distinct_from":
        return filterValue != this.value;
      case "is_not_distinct_from":
        return filterValue == this.value;
      case "like":
        if (typeof filterValue != "string" || typeof this.value != "string") {
          return false;
        }
        return filterValue.includes(this.value);
      case "in":
        if (typeof filterValue != "string" || typeof this.value != "string") {
          return false;
        }
        return this.value.includes(filterValue);
      case "is":
        return filterValue == this.value;
      default:
        return false;
    }
  };

  is_valid = () => {
    if (this.operator == undefined || this.value == null) {
      return false;
    }
    return true;
  };

  to_array = () => {
    return [this.column_name, this.operator + "." + this.formattedValue];
  };
}

/*
 * Convert url and filter to a parameterized URL
 */
export const addFilterToURL = (url: URL, filter: Filter) => {
  if (filter.is_valid()) {
    const [columnName, filterValue] = filter.to_array();
    url.searchParams.append(columnName, filterValue);
  }
  return url;
};

/*
 * Sort the filters by column name and stringify
 */
export const createFiltersKey = (filters: Filter[]) => {
  const sortFilterEntries = (a: Filter, b: Filter) => {
    return a.column_name.localeCompare(b.column_name);
  };

  return filters
    .filter((filter) => filter.is_valid())
    .sort(sortFilterEntries)
    .map((filter) => filter.urlValue)
    .join("&");
};

export const rowPassesFilters = (
  row: Record<string, string | boolean | number | null>,
  filters: Filter[] | undefined
) => {
  for (const filter of filters) {
    // If the filter is invalid skip it
    if (!filter.is_valid()) {
      continue;
    }

    if (!filter.passes(row)) {
      return false;
    }
  }
  return true;
};
