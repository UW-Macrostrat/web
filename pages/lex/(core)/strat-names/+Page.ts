import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { useEffect, useMemo, useRef, useState } from "react";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";
import { atom, useAtomValue, useSetAtom } from "jotai";
import {
  Button,
  InputGroup,
  PopoverNext,
  SegmentedControl,
} from "@blueprintjs/core";
import {
  createMasonryScrollBody,
  createPostgRESTProvider,
  DataPanel,
  DataPanelToolbarStyle,
  SelectionInteractionStyle,
  useSelector,
  type ColumnSpec,
  type FetchDataFilter,
  type TableFilter,
} from "@macrostrat/data-sheet";
import { postgrestPrefix } from "@macrostrat-web/settings";
import {
  type FilterURLBinding,
  initialViewStateFromURL,
  MacrostratLink,
} from "~/components";
import { buildHrefForItem } from "~/_providers/navigation";
import { searchOriginal } from "~/components/knowledge-graph/route";
import { HybridContentFooter, HybridPage } from "~/layouts/hybrid";
import { LinkCard } from "~/components/cards";
import { autoLoadPagesForItems } from "~/components/data-view";
import { atomWithSearchParam } from "~/_utils/url-atoms";
import {
  parseStratEntryType,
  stratEntry,
  STRAT_COMBINED_TABLE,
  STRAT_LIST_PAGE_SIZE,
  STRAT_NAME_SEARCH_COLUMN,
  STRAT_NAMES_TABLE,
  STRAT_SEARCH_COLUMN,
  type StratEntry,
  type StratEntryType,
  type StratListRow,
  type StratUsage,
} from "./query";

const h = hyper.styled(styles);

/** The stratigraphic name/concept list.
 *
 * On the **hybrid content/map frame** (`~/layouts/hybrid`) in its list-only
 * mode. Only `content-only` is enabled — there is no map view of stratigraphic
 * names yet — but the frame is what gives the page the standard header, the
 * panel-as-scroller layout with its lazy paging, the content footer, and the
 * `NavigationLinkProvider` the previous `fullscreen` layout did not supply
 * (without which every `MacrostratLink` on the page degraded to plain text and
 * nothing in the list was actually a link). Adding the map later is a matter of
 * widening `modes` and filling the `map` slot.
 *
 * Entries render as **cards in a masonry body** — two balanced columns rather
 * than one narrow list — which is what makes a concept and its member names
 * readable at a useful density.
 *
 * ## The two sources
 *
 * The scope control picks the *table*, not just a filter: `strat_combined` for
 * concepts (and the unscoped list), `strat_names` for every stratigraphic name
 * including the ~48k nested under a concept. `query.ts` describes both; the
 * provider below routes between them.
 */

const SEARCH_FILTER_ID = "strat-search";
const TYPE_FILTER_ID = "strat-type";

interface SearchState {
  value: string;
}

interface TypeState {
  value: StratEntryType | null;
}

const searchFilter: TableFilter<StratListRow, SearchState> = {
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
    return searchableText(row).toLowerCase().includes(q);
  },
};

/** What a row is matched against locally, per source: the concept source
 * carries its own name plus every member name, the name source just the name. */
function searchableText(row: any): string {
  return row?.all_names ?? row?.strat_name ?? row?.name ?? "";
}

/** The search box.
 *
 * The input is *locally* controlled and commits to the panel store on a short
 * delay. The store is the source of truth for the view, but it is not a good
 * home for a half-typed word: every commit resets the loader and — before this
 * — raced the URL sync, which would reapply the URL's older value and swallow
 * the characters typed since. Keeping the keystrokes local means the field
 * always shows exactly what was typed, whatever the view is doing behind it.
 */
function SearchInput({ state, setState }) {
  const committed = state?.value ?? "";
  const [text, setText] = useState(committed);

  // The store can change without the field (a cleared filter, the back button).
  // Follow it, except while the user is mid-word — `pending` is the text we
  // have yet to commit, so it wins until it lands.
  const pending = useRef<string | null>(null);
  useEffect(() => {
    if (pending.current != null && pending.current !== committed) return;
    pending.current = null;
    setText(committed);
  }, [committed]);

  useEffect(() => {
    if (text === committed) return;
    pending.current = text;
    const handle = setTimeout(() => setState({ value: text }), SEARCH_COMMIT_MS);
    return () => clearTimeout(handle);
  }, [text, committed, setState]);

  return h(InputGroup, {
    className: "strat-search-input",
    leftIcon: "search",
    placeholder: "Search names and concepts…",
    value: text,
    onChange: (e: any) => setText(e.target.value),
  });
}

/** Long enough that a word is typed as one view change, short enough that the
 * list still feels live. */
const SEARCH_COMMIT_MS = 250;

/** The scope. `concepts` narrows `strat_combined` to its concept half; `names`
 * switches source entirely, to every stratigraphic name. */
const typeFilter: TableFilter<StratListRow, TypeState> = {
  id: TYPE_FILTER_ID,
  name: "Scope",
  icon: "layers",
  defaultState: { value: null },
  describeState: (s) => TYPE_LABELS[s?.value ?? ""] ?? null,
  presentation: "inline",
  filterForm: TypeInput,
  predicate: (row, s) => {
    if (s?.value == null) return true;
    if (s.value === "concepts") return (row as any).id == null;
    return true;
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

const columnSpec: ColumnSpec[] = [{ key: "name", name: "Name" }];

/* ------------------------------------------------------------- the source */

/** Concepts, and the names that belong to none — ordered alphabetically, since
 * `combined_id` puts all 43k concepts ahead of every name. */
const conceptProvider = createPostgRESTProvider<StratListRow>({
  endpoint: postgrestPrefix,
  table: STRAT_COMBINED_TABLE,
  identityKey: "combined_id",
  baseOrder: [{ key: "name", ascending: true }],
  translateFilter: (f) => {
    if (f.id === SEARCH_FILTER_ID) {
      return ilikeFilter(STRAT_SEARCH_COLUMN, f);
    }
    if (f.id === TYPE_FILTER_ID && f.state?.value === "concepts") {
      // A concept row has no `id`.
      return { type: "filter", apply: (req) => req.is("id", null) };
    }
    return null;
  },
});

/** Every stratigraphic name, whether or not it belongs to a concept. The scope
 * filter needs no translation here — the table *is* the scope. */
const nameProvider = createPostgRESTProvider<StratListRow>({
  endpoint: postgrestPrefix,
  table: STRAT_NAMES_TABLE,
  identityKey: "id",
  baseOrder: [{ key: STRAT_NAME_SEARCH_COLUMN, ascending: true }],
  translateFilter: (f) => {
    if (f.id === SEARCH_FILTER_ID) {
      return ilikeFilter(STRAT_NAME_SEARCH_COLUMN, f);
    }
    return null;
  },
});

function ilikeFilter(column: string, f: FetchDataFilter) {
  const q = (f.state?.value ?? "").trim().replace(/[*"]/g, "");
  if (q === "") return null;
  return {
    type: "filter" as const,
    apply: (req: any) => req.ilike(column, `*${q}*`),
  };
}

/** One provider that routes to whichever table the scope names.
 *
 * Its identity is stable, so switching scope doesn't swap the provider out from
 * under the panel — the scope is part of the view key, so the loader resets and
 * re-fetches from the other table exactly as it would for any filter change.
 */
const provider = {
  identity: (row: StratListRow) => stratEntry(row).key,
  fetchData(params: any) {
    if (scopeOf(params.filters) === "names") {
      return nameProvider.fetchData(params);
    }
    return conceptProvider.fetchData(params);
  },
};

function scopeOf(filters: FetchDataFilter[] = []): StratEntryType | null {
  return filters.find((f) => f.id === TYPE_FILTER_ID)?.state?.value ?? null;
}

const StratScrollBody = createMasonryScrollBody({
  columns: 2,
  minColumnWidth: 340,
});

/** Stable identities: the frame memoizes on its capabilities object, and the
 * panel's control set on its filters array. */
const listFilters = [searchFilter, typeFilter];

const capabilities = {
  // List only for now: there is no map view of stratigraphic names yet.
  // Widening this is all the frame needs to offer one.
  modes: ["content-only" as const],
  defaultMode: "content-only" as const,
  hasAssistant: false,
  itemName: "Names",
  contentScroll: "panel" as const,
};

/* --------------------------------------------------------------- the page */

export function Page() {
  const ctx = usePageContext();
  const { initialRows, totalCount, initialType } = useData<any>();

  // The linked view is applied when the store is created, so the first request
  // matches the rows the server already sent. The query string comes from the
  // page context so server and client agree on the initial state. Read once, at
  // load: the URL is written from here on, never read back (see `StratURLWriter`).
  const initialView = useMemo(
    () => initialViewStateFromURL(urlBindings, { search: searchOriginal(ctx) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // The seed is only usable when the panel starts in the scope it was fetched
  // for — the scope picks the table, so a mismatched seed would be rows of a
  // different shape entirely.
  let initialData = undefined;
  const seededScope = scopeOf(activeFilterList(initialView.initialFilters));
  if (initialRows != null && seededScope === (initialType ?? null)) {
    initialData = { rows: initialRows, totalCount };
  }

  return h(HybridPage, {
    className: "strat-list-page",
    capabilities,
    actions: h(AboutControl),
    content: h(StratNameList, { initialData, initialView }),
  });
}

/** `initialFilters` in the shape `scopeOf` reads. */
function activeFilterList(entries: any[] = []): FetchDataFilter[] {
  return entries.map(({ filter, state }) => ({ id: filter.id, state } as any));
}

function StratNameList({ initialData, initialView }) {
  return h(
    DataPanel<StratListRow>,
    {
      className: "strat-panel",
      name: "Stratigraphic names",
      itemLabel: "entry",
      provider,
      columnSpec,
      filters: listFilters,
      initialData,
      initialFilters: initialView.initialFilters,
      initialSorts: initialView.initialSorts,
      pageSize: STRAT_LIST_PAGE_SIZE,
      // Scroll a few hundred entries, then pause so the footer is reachable —
      // the shared row budget, not a page count (`data-view/auto-load`).
      autoLoadPages: autoLoadPagesForItems(STRAT_LIST_PAGE_SIZE),
      // The search field already holds keystrokes back (`SEARCH_COMMIT_MS`),
      // so this only has to keep a burst of view changes from each firing a
      // request — stacking a second long wait on top would just feel slow.
      filterDebounce: 150,
      itemComponent: StratCard,
      scrollBody: StratScrollBody,
      toolbarStyle: DataPanelToolbarStyle.FLOATING,
      statusBar: false,
      enableSelection: SelectionInteractionStyle.NEVER,
      contentFooter: h(HybridContentFooter),
    },
    [
      h(ConceptNameLoader, { key: "concept-names" }),
      h(StratURLWriter, { key: "url" }),
    ]
  );
}

/* ------------------------------------------------------------ URL writing */

const searchParamAtom = atomWithSearchParam("q");
const typeParamAtom = atomWithSearchParam("type");

/** Publishes the view to the URL — **one way**.
 *
 * The URL is read once, at load (`initialViewStateFromURL`), and written from
 * then on. A two-way sync was the actual search bug here: its URL write is
 * delayed, so a keystroke arriving inside that window looked like an external
 * navigation, and the stale URL value was applied back over what had been
 * typed — type `shale` quickly and the field ended up holding `s`.
 */
function StratURLWriter() {
  const activeFilters = useSelector((state: any) => state.activeFilters);
  const setSearch = useSetAtom(searchParamAtom);
  const setType = useSetAtom(typeParamAtom);

  const text: string = (
    activeFilters?.get(SEARCH_FILTER_ID)?.state?.value ?? ""
  ).trim();
  const type: StratEntryType | null =
    activeFilters?.get(TYPE_FILTER_ID)?.state?.value ?? null;

  useEffect(() => {
    const handle = setTimeout(() => setSearch(text === "" ? null : text), 300);
    return () => clearTimeout(handle);
  }, [text, setSearch]);

  // The scope is a click, not a burst of keystrokes — no reason to delay it.
  useEffect(() => {
    setType(type);
  }, [type, setType]);

  return null;
}

/* ------------------------------------------------------------ concept names */

/** Concept id → name, for the `names` scope: `strat_names` carries only the id.
 * Module-level, but read inside the frame's own jotai provider, so it is scoped
 * to this page instance. */
const conceptNamesAtom = atom<Map<number, string>>(new Map());

/** Resolves the concept names for whatever is loaded, one request per page of
 * rows rather than one per card. */
function ConceptNameLoader() {
  const rows = useSelector((state: any) => state.data);
  const setNames = useSetAtom(conceptNamesAtom);
  const requested = useRef<Set<number>>(new Set());

  useEffect(() => {
    const missing = missingConceptIDs(rows, requested.current);
    if (missing.length === 0) return;
    for (const id of missing) requested.current.add(id);

    let cancelled = false;
    fetchConceptNames(missing).then((resolved) => {
      if (cancelled || resolved.size === 0) return;
      setNames((prev) => new Map([...prev, ...resolved]));
    });
    return () => {
      cancelled = true;
    };
  }, [rows, setNames]);

  return null;
}

function missingConceptIDs(rows: any[] = [], seen: Set<number>): number[] {
  const out = new Set<number>();
  for (const row of rows) {
    // Only the name source carries a concept id needing a label; a
    // `strat_combined` concept row already has its own name.
    if (row?.strat_name == null) continue;
    const id = row.concept_id;
    if (id == null || id === 0 || seen.has(id)) continue;
    out.add(id);
  }
  return [...out];
}

/** `strat_names_meta` is the concepts table, and — unlike `strat_combined` — is
 * deployed everywhere, so a name's concept label survives in production even
 * while the concept scope itself does not. */
async function fetchConceptNames(ids: number[]): Promise<Map<number, string>> {
  const params = new URLSearchParams({
    select: "concept_id,name",
    concept_id: `in.(${ids.join(",")})`,
  });
  const resolved = new Map<number, string>();
  try {
    const res = await fetch(`${postgrestPrefix}/strat_names_meta?${params}`);
    if (!res.ok) return resolved;
    for (const row of await res.json()) {
      resolved.set(row.concept_id, row.name);
    }
  } catch (_err) {
    // A missing label is not worth surfacing — the name still links.
  }
  return resolved;
}

/* --------------------------------------------------------------- the cards */

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
          "Names of rock units, organized hierarchically. The Names scope lists every name, including those that belong to a concept."
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

function StratCard({ data }: { data: StratListRow }) {
  const entry = useMemo(() => stratEntry(data), [data]);
  const query = useSearchText();

  if (entry.kind === "concept") {
    return h(ConceptCard, { entry, query });
  }
  return h(NameCard, { entry });
}

/** A stratigraphic name. The whole card leads to the name; nothing inside it
 * competes, so it is a plain `LinkCard`. */
function NameCard({ entry }: { entry: StratEntry }) {
  return h(
    LinkCard,
    {
      className: "strat-card name-card",
      href: buildHrefForItem({ strat_name_id: entry.id }),
      title: h("span.card-title", [
        entry.name,
        h(RankTag, { key: "rank", rank: entry.rank }),
      ]),
      label: entry.name,
    },
    h(ConceptLine, { conceptId: entry.conceptId })
  );
}

/** The concept a name belongs to, once its label resolves. Renders nothing for
 * an unaffiliated name — which is most of what `strat_combined` lists. */
function ConceptLine({ conceptId }: { conceptId: number | null }) {
  const names = useAtomValue(conceptNamesAtom);
  if (conceptId == null || conceptId === 0) return null;

  const name = names.get(conceptId);
  if (name == null) return null;

  return h("div.card-concept", [
    h("span.concept-label", { key: "label" }, "in "),
    h(
      MacrostratLink,
      { key: "name", item: { concept_id: conceptId }, className: "concept-name" },
      name
    ),
  ]);
}

/** A concept, with its member names beneath.
 *
 * The card leads to the concept and the member names lead to their own pages,
 * so it is the overlay variant of `LinkCard` — anchors can't nest. No "Concept"
 * badge: the names beneath say what it is, and the badge repeated down a column
 * of cards said nothing the shape didn't.
 */
function ConceptCard({ entry, query }: { entry: StratEntry; query: string }) {
  const usages = useMatchingUsages(entry, query);

  return h(
    LinkCard,
    {
      className: "strat-card concept-card",
      href: buildHrefForItem({ concept_id: entry.id }),
      title: entry.name,
      nestedLinks: true,
    },
    h(UsageRun, { usages })
  );
}

/** Member names, wrapped inline rather than stacked — a concept with thirty
 * usages is a navigation aid, not a table. Long runs are capped until asked
 * for. */
function UsageRun({ usages }: { usages: StratUsage[] }) {
  const [expanded, setExpanded] = useState(false);

  if (usages.length === 0) return null;

  let shown = usages;
  let more: any = null;
  if (!expanded && usages.length > USAGE_CAP) {
    shown = usages.slice(0, USAGE_CAP);
    more = h(
      "button.text-control",
      {
        key: "more",
        // The card's overlay link would otherwise take the click.
        onClick: (e: any) => {
          e.preventDefault();
          e.stopPropagation();
          setExpanded(true);
        },
      },
      `and ${usages.length - USAGE_CAP} more…`
    );
  }

  return h("div.concept-usages", [
    shown.map((usage) =>
      h(
        MacrostratLink,
        {
          key: usage.id,
          item: { strat_name_id: usage.id },
          className: "usage-name",
        },
        [usage.name, h(RankTag, { key: "rank", rank: usage.rank })]
      )
    ),
    more,
  ]);
}

/** Over this many member names, the rest wait behind a control. */
const USAGE_CAP = 8;

function RankTag({ rank }) {
  if (rank == null || rank === "") return null;
  return h("span.strat-rank", rank);
}

/** A concept's member names, narrowed to those matching the active search —
 * the point being that a concept surfaced by a search should show *why*. When
 * nothing matches (the concept's own name did), all of them are shown. */
function useMatchingUsages(entry: StratEntry, query: string): StratUsage[] {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === "") return entry.usages;
    const matching = entry.usages.filter((u) =>
      u.name.toLowerCase().includes(q)
    );
    if (matching.length === 0) return entry.usages;
    return matching;
  }, [entry, query]);
}

/** The committed search text, read from the panel store (cards render inside
 * the provider). */
function useSearchText(): string {
  const activeFilters = useSelector((state: any) => state.activeFilters);
  return activeFilters?.get(SEARCH_FILTER_ID)?.state?.value ?? "";
}
