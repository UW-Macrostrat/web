import { InfiniteScrollPage, DevLinkButton } from "~/components";
import h from "./main.module.sass";
import {
  AnchorButton,
  ButtonGroup,
  InputGroup,
  SegmentedControl,
} from "@blueprintjs/core";
import { apiDomain } from "@macrostrat-web/settings";
import {
  createPostgRESTProvider,
  SelectionInteractionStyle,
  standardizeFilter,
  type ColumnSpec,
  type TableFilter,
} from "@macrostrat/data-sheet";
import { MapCard } from "./map-card";

const endpoint = `${apiDomain}/api/pg`;

// ---- Open text search across title (name) / slug / source_id ----
// A first-class `TableFilter` (its `filterForm` is the search input), declared
// on a synthetic "search" column so it surfaces through the standard filter UI.
// It requests `presentation: "inline"` — an always-visible toolbar control —
// which is **progressive**: a library version that understands `presentation`
// renders it inline; older versions ignore the field and simply list it in the
// Filter menu. Either way the state flows through the standard filter model
// (store `activeFilters` → the provider's `translateFilter`).
// Server translation: `or=(name.ilike.*q*, slug.ilike.*q*, source_id.eq.q)`.
const SEARCH_FILTER_ID = "text-search";

interface SearchState {
  value: string;
}

/** The filter's `filterForm`: a search box bound to the filter state. Clearing
 * it (empty value) removes the filter via the shared filter wiring. */
function SearchInput({
  state,
  setState,
}: {
  state: SearchState;
  setState: (s: SearchState) => void;
}) {
  return h(InputGroup, {
    className: "map-search",
    leftIcon: "search",
    placeholder: "Search maps by name, slug, or ID…",
    value: state?.value ?? "",
    onChange: (e: any) => setState({ value: e.target.value }),
  });
}

const searchFilter: TableFilter<any, SearchState> = {
  id: SEARCH_FILTER_ID,
  name: "Search",
  icon: "search",
  defaultState: { value: "" },
  describeState: (s) => (s?.value ? s.value : null),
  presentation: "inline",
  filterForm: SearchInput,
  // Client-side predicate (used only for an in-memory source; the live page
  // applies this server-side via `translateFilter`).
  predicate: (row, s) => {
    const q = (s?.value ?? "").trim().toLowerCase();
    if (q === "") return true;
    return [row?.name, row?.slug, String(row?.source_id ?? "")].some((v) =>
      v?.toLowerCase?.().includes(q)
    );
  },
};

// ---- Filter by scale (tiny / small / medium / large) ----
// A custom-UI filter (a segmented control) over the standard `{operator,value}`
// state, so the provider's default scalar translation turns it into
// `scale=eq.<value>`. `presentation: "menu-inline"` renders the segmented
// control directly in the Filter menu (no submenu) where supported, and
// degrades to a submenu on older library versions.
const SCALES = ["tiny", "small", "medium", "large"];

const scaleFilter: TableFilter<any, { operator: "eq"; value: string | null }> =
  {
    id: "scale-filter",
    name: "Scale",
    icon: "filter",
    columnKey: "scale",
    defaultState: { operator: "eq", value: null },
    describeState: (s) => s?.value ?? null,
    presentation: "menu-inline",
    predicate: (row, s) => s?.value == null || row.scale === s.value,
    filterForm: ({ state, setState }) =>
      h(SegmentedControl, {
        small: true,
        options: SCALES.map((v) => ({ label: v, value: v })),
        value: state?.value ?? "",
        onValueChange: (value: string) => setState({ operator: "eq", value }),
      }),
  };

// The facet columns: `source_id` sortable (ID asc/desc), `scale` carries the
// scale filter. The multi-field search is NOT here — it's a sheet-level filter
// (the `filters` prop below), since it spans several fields and maps to no
// single column (a synthetic column whose key matches no data field isn't a
// supported shape).
const columnSpec: ColumnSpec[] = [
  { key: "source_id", name: "ID", dataType: "integer", sortable: true },
  { key: "scale", name: "Scale", dataType: "string", filters: [scaleFilter] },
];

const provider = createPostgRESTProvider<any>({
  endpoint,
  table: "maps",
  identityKey: "source_id",
  // Default ordering: newest source_id first. Because this is the
  // identity key's own default direction (not an active sort), it doesn't
  // appear as a removable tag in the sort/filter bar.
  identityAscending: false,
  translateFilter: (f) => {
    // The multi-field search is the one custom translation; every other filter
    // (e.g. scale) is a standard scalar `columnKey=op.value`.
    if (f.id !== SEARCH_FILTER_ID) {
      const s = f.state;
      const key = f.columnKey ?? s?.key;
      if (
        key != null &&
        s?.operator != null &&
        s?.value != null &&
        s.value !== ""
      ) {
        return standardizeFilter({ key, operator: s.operator, value: s.value });
      }
      return null;
    }
    const q = (f.state?.value ?? "").trim();
    if (q === "") return null;
    // Quote the ilike pattern so commas/parens in the query don't break the
    // `or(...)` logic tree; drop embedded quotes to keep the literal simple.
    const like = `"*${q.replace(/"/g, "")}*"`;
    const parts = [`name.ilike.${like}`, `slug.ilike.${like}`];
    // A purely numeric query also matches an exact source_id.
    if (/^\d+$/.test(q)) parts.push(`source_id.eq.${q}`);
    return {
      type: "filter",
      apply: (req) => req.or(parts.join(",")),
    };
  },
});

export function Page() {
  return h(InfiniteScrollPage, {
    className: "maps-list-page",
    provider,
    headerElements: h(MapsNavLinks),
    itemComponent: MapCard,
    columnSpec,
    // The multi-field search is a sheet-level filter (spans several columns).
    filters: [searchFilter],
    // Debounce the search → refetch so typing doesn't fire a request per key.
    filterDebounce: 300,
    // Maps are browsed, not edited here — no selection.
    enableSelection: SelectionInteractionStyle.NEVER,
    scrollBody: ScrollBody,
  });
}

/** The navigation links the legacy `/maps` page kept in its sidebar — recreated
 * as a header nav for parity with `/maps/ingestion`. */
function MapsNavLinks() {
  return h(ButtonGroup, { minimal: true, className: "maps-nav-links" }, [
    h(
      AnchorButton,
      { icon: "flows", href: "/maps/ingestion" },
      "Ingestion system"
    ),
    h(AnchorButton, { icon: "map", href: "/map/sources" }, "Show on map"),
    h(DevLinkButton, { href: "/maps/legend" }, "Legend table"),
  ]);
}

function ScrollBody({ children }) {
  return h("div.data-scroll-body", children);
}
