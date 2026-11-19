/** A text search shown as an always-visible control in an admin sheet's
 * filter bar. A provider matches rows with its predicate, or reads the term
 * with `searchTerm` to search on the server. */
import hyper from "@macrostrat/hyper";
import { InputGroup } from "@blueprintjs/core";
import type { FetchDataFilter, TableFilter } from "@macrostrat/data-sheet";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

const searchFilterID = "search";

interface SearchState {
  value: string;
}

export function createSearchFilter<T>(
  placeholder: string,
  searchableValues: (row: T) => (string | null | undefined)[]
): TableFilter<T, SearchState> {
  return {
    id: searchFilterID,
    name: "Search",
    icon: "search",
    presentation: "inline",
    defaultState: { value: "" },
    filterForm: ({ state, setState }) =>
      h(InputGroup, {
        type: "search",
        small: true,
        leftIcon: "search",
        placeholder,
        value: state?.value ?? "",
        // An empty value removes the filter.
        onValueChange: (value) => setState({ value }),
        className: "sheet-search",
      }),
    predicate: (row, state) =>
      matchesTerm(state?.value?.trim() ?? "", searchableValues(row)),
  };
}

/** The settled search term among a fetch's filters, or "" when none. */
export function searchTerm(filters: FetchDataFilter[]): string {
  const filter = filters.find((f) => f.id === searchFilterID);
  return filter?.state?.value?.trim() ?? "";
}

/** Case-insensitive substring match over any of `values`. */
function matchesTerm(
  term: string,
  values: (string | null | undefined)[]
): boolean {
  const q = term.toLowerCase();
  if (q === "") return true;
  return values.some((v) => v?.toLowerCase().includes(q));
}
