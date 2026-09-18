import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { useMemo } from "react";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";
import {
  Button,
  InputGroup,
  PopoverNext,
  SegmentedControl,
  Tag,
} from "@blueprintjs/core";
import {
  createPostgRESTProvider,
  SelectionInteractionStyle,
  useSelector,
  type ColumnSpec,
  type TableFilter,
} from "@macrostrat/data-sheet";
import { postgrestPrefix } from "@macrostrat-web/settings";
import {
  type FilterURLBinding,
  InfiniteScrollPage,
  initialViewStateFromURL,
  MacrostratLink,
  ViewStateURLSync,
} from "~/components";
import { searchOriginal } from "~/components/knowledge-graph/route";
import {
  conceptUsages,
  parseStratEntryType,
  STRAT_LIST_PAGE_SIZE,
  STRAT_SEARCH_COLUMN,
  type StratCombinedRow,
  type StratEntryType,
  type StratUsage,
} from "./query";

const h = hyper.styled(styles);

/** The stratigraphic name/concept list.
 *
 * `InfiniteScrollPage` over `macrostrat_api.strat_combined` — the same
 * full-height scrolling frame as the map-ingestion list, so the list *is* the
 * page rather than a boxed panel inside one. The provider is PostgREST, so
 * search, the concept/name scope and paging are all the server's rather than a
 * filter over whatever happens to be loaded. `query.ts` describes the view.
 *
 * Concepts and names are distinguished by a tag at the right of each entry, not
 * by section headers: a concept's member names hang beneath it, so the
 * distinction is already visible in the shape of the entry. Ids are left to the
 * item pages.
 *
 * Entries are variable height — a concept carries its member names as a nested
 * list — which rules out a windowed body but not infinite scroll: a page is a
 * fixed row count, not a fixed height.
 */

const SEARCH_FILTER_ID = "strat-search";
const TYPE_FILTER_ID = "strat-type";

interface SearchState {
  value: string;
}

interface TypeState {
  value: StratEntryType | null;
}

const searchFilter: TableFilter<StratCombinedRow, SearchState> = {
  id: SEARCH_FILTER_ID,
  name: "Search",
  icon: "search",
  defaultState: { value: "" },
  describeState: (s) => s?.value || null,
  presentation: "inline",
  filterForm: SearchInput,
  predicate: (row, s) => {
    const q = (s?.value ?? "").trim().toLowerCase();
    if (q === "") return true;
    return row?.all_names?.toLowerCase().includes(q) ?? false;
  },
};

function SearchInput({ state, setState }) {
  return h(InputGroup, {
    leftIcon: "search",
    placeholder: "Search names and concepts…",
    value: state?.value ?? "",
    onChange: (e: any) => setState({ value: e.target.value }),
  });
}

/** The concept/name scope. A row is a concept when it has no `id`. */
const typeFilter: TableFilter<StratCombinedRow, TypeState> = {
  id: TYPE_FILTER_ID,
  name: "Type",
  icon: "layers",
  defaultState: { value: null },
  describeState: (s) => TYPE_LABELS[s?.value ?? ""] ?? null,
  presentation: "inline",
  filterForm: TypeInput,
  predicate: (row, s) => {
    if (s?.value == null) return true;
    if (s.value === "concepts") return row.id == null;
    return row.id != null;
  },
};

const TYPE_LABELS: Record<string, string> = {
  concepts: "Concepts",
  names: "Names",
};

function TypeInput({ state, setState }) {
  return h(SegmentedControl, {
    small: true,
    options: [
      { label: "All", value: "" },
      { label: "Concepts", value: "concepts" },
      { label: "Names", value: "names" },
    ],
    value: state?.value ?? "",
    onValueChange: (value: string) =>
      setState({ value: parseStratEntryType(value) }),
  });
}

const urlBindings: FilterURLBinding[] = [
  {
    filter: searchFilter,
    params: ["q"],
    toParams: (s: SearchState) => ({ q: s?.value?.trim() || null }),
    fromParams: ({ q }) => (q ? { value: q } : null),
  },
  {
    filter: typeFilter,
    params: ["type"],
    toParams: (s: TypeState) => ({ type: s?.value ?? null }),
    fromParams: ({ type }) => {
      const value = parseStratEntryType(type);
      if (value == null) return null;
      return { value };
    },
  },
];

const columnSpec: ColumnSpec[] = [
  { key: "combined_id", name: "ID", dataType: "integer" },
  { key: "name", name: "Name" },
];

const provider = createPostgRESTProvider<StratCombinedRow>({
  endpoint: postgrestPrefix,
  table: "strat_combined",
  identityKey: "combined_id",
  translateFilter: (f) => {
    if (f.id === SEARCH_FILTER_ID) {
      const q = (f.state?.value ?? "").trim().replace(/[*"]/g, "");
      if (q === "") return null;
      return {
        type: "filter",
        apply: (req) => req.ilike(STRAT_SEARCH_COLUMN, `*${q}*`),
      };
    }
    if (f.id === TYPE_FILTER_ID) {
      const value = f.state?.value;
      if (value === "concepts") {
        return { type: "filter", apply: (req) => req.is("id", null) };
      }
      if (value === "names") {
        return { type: "filter", apply: (req) => req.not("id", "is", null) };
      }
    }
    return null;
  },
});

export function Page() {
  const ctx = usePageContext();
  const { initialRows, totalCount } = useData<any>();

  // The linked view is applied when the store is created, so the first request
  // matches the rows the server already sent. The query string comes from the
  // page context so server and client agree on the initial state.
  const initialView = useMemo(
    () => initialViewStateFromURL(urlBindings, { search: searchOriginal(ctx) }),
    // Read once, at load: later navigations remount the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  let initialData = undefined;
  if (initialRows != null) {
    initialData = { rows: initialRows, totalCount };
  }

  return h(InfiniteScrollPage, {
    className: "strat-list-page",
    provider,
    headerElements: h(AboutControl),
    itemComponent: StratEntry,
    itemLabel: "entry",
    name: "Stratigraphic names",
    columnSpec,
    filters: [searchFilter, typeFilter],
    initialData,
    initialFilters: initialView.initialFilters,
    initialSorts: initialView.initialSorts,
    pageSize: STRAT_LIST_PAGE_SIZE,
    enableSelection: SelectionInteractionStyle.NEVER,
    scrollBody: ScrollBody,
    children: h(ViewStateURLSync, { bindings: urlBindings }),
  });
}

function ScrollBody({ children }) {
  return h("div.strat-list", children);
}

/** What the two kinds of entry are. A definition apiece is worth keeping, but
 * not worth a block above a list that is otherwise the whole page. */
function AboutControl() {
  return h(
    PopoverNext,
    {
      placement: "bottom-end",
      content: h("dl.strat-key", [
        h("dt", "Names"),
        h(
          "dd",
          "Names of rock units, organized hierarchically. A name is listed on its own only when it belongs to no concept; otherwise it appears under that concept."
        ),
        h("dt", "Concepts"),
        h(
          "dd",
          "Groupings and associated metadata for strat names and/or hierarchies that are applied to the same set of rocks."
        ),
      ]),
    },
    h(Button, { minimal: true, small: true, icon: "help" }, "About")
  );
}

/** One row of the view: either a concept (with its member names beneath) or a
 * stratigraphic name that belongs to no concept. */
function StratEntry({ data }: { data: StratCombinedRow }) {
  const query = useSearchText();

  if (data.id != null) {
    return h(
      "div.strat-entry",
      h(StratLine, {
        item: { strat_name_id: data.id },
        name: data.name,
        rank: data.rank,
        kind: "Name",
      })
    );
  }

  return h(ConceptEntry, { data, query });
}

function ConceptEntry({
  data,
  query,
}: {
  data: StratCombinedRow;
  query: string;
}) {
  const usages = useMatchingUsages(data, query);

  let usageList = null;
  if (usages.length > 0) {
    usageList = h(
      "ul.concept-usages",
      usages.map((usage) =>
        h(
          "li",
          { key: usage.id },
          h(StratLine, {
            item: { strat_name_id: usage.id },
            name: usage.name,
            rank: usage.rank,
          })
        )
      )
    );
  }

  return h("div.strat-entry.concept-entry", [
    h(StratLine, {
      item: { concept_id: data.concept_id },
      name: data.name,
      kind: "Concept",
    }),
    usageList,
  ]);
}

/** Name on the left, rank beside it, and — for a top-level entry — the kind
 * right-aligned. A name nested under its concept needs no kind tag. */
function StratLine({ item, name, rank = null, kind = null }) {
  let rankTag = null;
  if (rank != null && rank !== "") {
    rankTag = h("span.strat-rank", rank);
  }

  let kindTag = null;
  if (kind != null) {
    kindTag = h(Tag, { minimal: true, size: "small", className: "strat-kind" }, kind);
  }

  return h("div.strat-line", [
    h(MacrostratLink, { item, className: "strat-name" }, name),
    rankTag,
    kindTag,
  ]);
}

/** A concept's member names, narrowed to those matching the active search —
 * the point being that a concept surfaced by a search should show *why*. When
 * nothing matches (the concept's own name did), all of them are shown. */
function useMatchingUsages(data: StratCombinedRow, query: string): StratUsage[] {
  return useMemo(() => {
    const usages = conceptUsages(data);
    const q = query.trim().toLowerCase();
    if (q === "") return usages;
    const matching = usages.filter((u) => u.name.toLowerCase().includes(q));
    if (matching.length === 0) return usages;
    return matching;
  }, [data, query]);
}

/** The active search text, read from the panel store (cards render inside the
 * provider). */
function useSearchText(): string {
  const activeFilters = useSelector((state: any) => state.activeFilters);
  return activeFilters?.get(SEARCH_FILTER_ID)?.state?.value ?? "";
}
