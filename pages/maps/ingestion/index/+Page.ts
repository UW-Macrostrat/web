import { useAuth } from "@macrostrat/form-components";
import { InfiniteScrollPage, initialViewStateFromURL } from "~/components";
import { LoginButton } from "../components/navbar.ts";
import h from "./+Page.module.sass";
import { apiV3Prefix } from "@macrostrat-web/settings";
import {
  createPostgRESTProvider,
  SelectionInteractionStyle,
} from "@macrostrat/data-sheet";
import {
  type IngestMap,
  columnSpec,
  IngestListEffects,
  MapCard,
  tableFilters,
  tagEditAction,
  translateIngestFilter,
  urlBindings,
} from "./ingestion-list.ts";

const endpoint = `${apiV3Prefix}/map-ingestion/pg`;

const provider = createPostgRESTProvider<IngestMap>({
  endpoint,
  table: "maps",
  identityKey: "source_id",
  // Default ordering: newest source_id first. Because this is the
  // identity key's own default direction (not an active sort), it doesn't
  // appear as a removable tag in the sort/filter bar.
  identityAscending: false,
  // The open search (text + tags) and the multi-value status picker don't fit
  // the scalar `columnKey=op.value` shape; everything else falls through to the
  // standard translation.
  translateFilter: translateIngestFilter,
});

export function Page() {
  const { user } = useAuth();
  // A linked view (`?q=…&status=…&sort=…`) is applied when the store is created,
  // so the first request is the right one — rather than fetching the unfiltered
  // queue and immediately superseding it. `IngestListEffects` keeps the two in
  // sync from there.
  const { initialFilters, initialSorts } = initialViewStateFromURL(urlBindings);
  return h(InfiniteScrollPage, {
    className: "ingestion-page",
    provider,
    headerElements: h(LoginButton, { user, minimal: true }),
    itemComponent: MapCard,
    columnSpec,
    // Rows are maps — names the selection ("3 maps"), counters, and labels.
    itemLabel: "map",
    name: "Maps",
    // The open search spans several columns, so it's a table-level filter; the
    // per-column facets are declared on `columnSpec`. The panel builds the
    // toolbar from both, and stands them down while selecting.
    filters: tableFilters,
    initialFilters,
    initialSorts,
    // Selection-scoped bulk tag add/remove (appears once maps are selected).
    actions: [tagEditAction],
    enableSelection: SelectionInteractionStyle.MODAL,
    scrollBody: ScrollBody,
    // Renders inside the data view's provider: mirrors filters + sorts into the
    // query string, so a particular set of maps is a link.
    children: h(IngestListEffects),
  });
}

function ScrollBody({ children }) {
  return h("div.data-scroll-body", children);
}
