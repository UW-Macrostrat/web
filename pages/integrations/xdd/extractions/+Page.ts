import hyper from "@macrostrat/hyper";
import styles from "~/components/knowledge-graph/knowledge-graph.module.sass";
import { InfiniteScrollPage } from "~/components";
import { AnchorButton, ButtonGroup, InputGroup } from "@blueprintjs/core";
import { AuthStatus } from "@macrostrat/form-components";
import { postgrestPrefix } from "@macrostrat-web/settings";
import {
  createPostgRESTProvider,
  SelectionInteractionStyle,
  type TableFilter,
} from "@macrostrat/data-sheet";
import {
  type KGPublication,
  PaperCard,
  PUBLICATION_COLUMNS,
  xddRoot,
} from "~/components/knowledge-graph";

const h = hyper.styled(styles);

/** Papers with extracted entities, most stratigraphic-name matches first.
 * Same list machinery as `/maps`: a PostgREST `DataPanel` provider with a
 * server-side search filter. */

const SEARCH_FILTER_ID = "text-search";

interface SearchState {
  value: string;
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
    placeholder: "Search papers by title or xDD id…",
    value: state?.value ?? "",
    onChange: (e: any) => setState({ value: e.target.value }),
  });
}

const searchFilter: TableFilter<KGPublication, SearchState> = {
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
    return [row?.citation?.title, row?.paper_id].some((v) =>
      v?.toLowerCase?.().includes(q)
    );
  },
};

const provider = createPostgRESTProvider<KGPublication>({
  endpoint: postgrestPrefix,
  table: "kg_publication_entities",
  identityKey: "paper_id",
  // The view's `entities` column aggregates every entity tree for the paper;
  // the list never needs it.
  columns: PUBLICATION_COLUMNS,
  // Papers with the most stratigraphic-name matches first. Papers with no
  // matches (null) sort last.
  baseOrder: [{ key: "n_matches", ascending: false, nullsFirst: false }],
  translateFilter: (f) => {
    if (f.id !== SEARCH_FILTER_ID) return null;
    const q = (f.state?.value ?? "").trim();
    if (q === "") return null;
    const like = `"*${q.replace(/"/g, "")}*"`;
    return {
      type: "filter",
      apply: (req) =>
        req.or(`citation->>title.ilike.${like},paper_id.ilike.${like}`),
    };
  },
});

export function Page() {
  return h(InfiniteScrollPage, {
    className: "extractions-list-page",
    provider,
    headerElements: h(HeaderLinks),
    itemComponent: PaperCard,
    itemLabel: "paper",
    name: "Papers",
    filters: [searchFilter],
    filterDebounce: 300,
    enableSelection: SelectionInteractionStyle.NEVER,
    scrollBody: ScrollBody,
  });
}

function HeaderLinks() {
  return h("div.kg-toolbar-group", [
    h(ButtonGroup, { minimal: true }, [
      h(
        AnchorButton,
        { icon: "annotation", href: `${xddRoot}/feedback` },
        "Review source texts"
      ),
      h(AnchorButton, { icon: "history", href: `${xddRoot}/runs` }, "Model runs"),
    ]),
    h(AuthStatus, { large: false }),
  ]);
}

function ScrollBody({ children }) {
  return h("div.data-scroll-body", children);
}
