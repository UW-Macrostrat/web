import hyper from "@macrostrat/hyper";
import styles from "~/components/knowledge-graph/knowledge-graph.module.sass";
import { usePageContext } from "vike-react/usePageContext";
import {
  type FilterURLBinding,
  InfiniteScrollPage,
  initialViewStateFromURL,
  ViewStateURLSync,
} from "~/components";
import { AnchorButton, ButtonGroup, InputGroup } from "@blueprintjs/core";
import { AuthStatus } from "@macrostrat/form-components";
import { postgrestPrefix } from "@macrostrat-web/settings";
import {
  type ColumnSpec,
  createPostgRESTProvider,
  SelectionInteractionStyle,
  standardizeFilter,
  type TableFilter,
} from "@macrostrat/data-sheet";
import {
  type KGSourceText,
  SourceTextCard,
  xddRoot,
} from "~/components/knowledge-graph";

const h = hyper.styled(styles);

/** The review queue: every source text that has been run through a model,
 * newest first. Searchable by text, and filterable to one paper (`?paper=`) so
 * the paper page can link to its texts. Filters mirror into the query string
 * so a particular view is a link. */

const SEARCH_FILTER_ID = "text-search";
const PAPER_FILTER_ID = "paper-filter";

interface SearchState {
  value: string;
}

interface PaperFilterState {
  operator: "eq";
  value: string | null;
}

function SearchInput({
  state,
  setState,
}: {
  state: SearchState;
  setState: (s: SearchState) => void;
}) {
  return h(InputGroup, {
    leftIcon: "search",
    placeholder: "Search source text…",
    value: state?.value ?? "",
    onChange: (e: any) => setState({ value: e.target.value }),
  });
}

const searchFilter: TableFilter<KGSourceText, SearchState> = {
  id: SEARCH_FILTER_ID,
  name: "Search",
  icon: "search",
  defaultState: { value: "" },
  describeState: (s) => (s?.value ? s.value : null),
  presentation: "inline",
  filterForm: SearchInput,
  predicate: (row, s) => {
    const q = (s?.value ?? "").trim().toLowerCase();
    if (q === "") return true;
    return row?.paragraph_text?.toLowerCase().includes(q);
  },
};

/** Restrict to one paper's texts. Usually set from a link rather than typed. */
const paperFilter: TableFilter<KGSourceText, PaperFilterState> = {
  id: PAPER_FILTER_ID,
  name: "Paper",
  icon: "document",
  columnKey: "paper_id",
  defaultState: { operator: "eq", value: null },
  describeState: (s) => (s?.value ? `Paper ${s.value}` : null),
  presentation: "menu-inline",
  predicate: (row, s) => s?.value == null || row.paper_id === s.value,
  filterForm: ({ state, setState }) =>
    h(InputGroup, {
      small: true,
      placeholder: "xDD paper id",
      value: state?.value ?? "",
      onChange: (e: any) =>
        setState({ operator: "eq", value: e.target.value || null }),
    }),
};

const columnSpec: ColumnSpec[] = [
  { key: "id", name: "ID", dataType: "integer", sortable: true },
  { key: "n_matches", name: "Matches", dataType: "integer", sortable: true },
  { key: "n_entities", name: "Entities", dataType: "integer", sortable: true },
];

const provider = createPostgRESTProvider<KGSourceText>({
  endpoint: postgrestPrefix,
  table: "kg_source_text",
  identityKey: "id",
  // Newest source texts first.
  identityAscending: false,
  translateFilter: (f) => {
    if (f.id === SEARCH_FILTER_ID) {
      const q = (f.state?.value ?? "").trim();
      if (q === "") return null;
      const like = `"*${q.replace(/"/g, "")}*"`;
      const parts = [`paragraph_text.ilike.${like}`];
      // A purely numeric query also matches a source-text id.
      if (/^\d+$/.test(q)) parts.push(`id.eq.${q}`);
      return { type: "filter", apply: (req) => req.or(parts.join(",")) };
    }
    const s = f.state;
    const key = f.columnKey ?? s?.key;
    if (key != null && s?.operator != null && s?.value != null && s.value !== "") {
      return standardizeFilter({ key, operator: s.operator, value: s.value });
    }
    return null;
  },
});

const urlBindings: FilterURLBinding[] = [
  {
    filter: searchFilter,
    params: ["q"],
    toParams: (s: SearchState) => ({ q: s?.value?.trim() || null }),
    fromParams: ({ q }) => (q ? { value: q } : null),
  },
  {
    filter: paperFilter,
    params: ["paper"],
    toParams: (s: PaperFilterState) => ({ paper: s?.value || null }),
    fromParams: ({ paper }) => (paper ? { operator: "eq", value: paper } : null),
  },
];

export function Page() {
  const ctx = usePageContext();
  // Apply a linked view when the store is created so the first request is the
  // right one. The query string comes from the page context so server and
  // client render the same initial state.
  const { initialFilters, initialSorts } = initialViewStateFromURL(urlBindings, {
    search: ctx.urlParsed?.searchOriginal ?? "",
  });

  return h(InfiniteScrollPage, {
    className: "feedback-list-page",
    provider,
    headerElements: h(HeaderLinks),
    itemComponent: SourceTextCard,
    columnSpec,
    itemLabel: "source text",
    name: "Source texts",
    filters: [searchFilter, paperFilter],
    initialFilters,
    initialSorts,
    filterDebounce: 300,
    enableSelection: SelectionInteractionStyle.NEVER,
    scrollBody: ScrollBody,
    children: h(ViewStateURLSync, { bindings: urlBindings }),
  });
}

function HeaderLinks() {
  return h("div.kg-toolbar-group", [
    h(ButtonGroup, { minimal: true }, [
      h(
        AnchorButton,
        { icon: "document", href: `${xddRoot}/extractions` },
        "Papers"
      ),
      h(AnchorButton, { icon: "history", href: `${xddRoot}/runs` }, "Model runs"),
    ]),
    h(AuthStatus, { large: false }),
  ]);
}

function ScrollBody({ children }) {
  return h("div.data-scroll-body", children);
}
