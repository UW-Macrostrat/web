import { useAuth } from "@macrostrat/form-components";
import { InfiniteScrollPage } from "~/components";
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
  suppressBuiltinSortAction,
  tagEditAction,
  translateIngestFilter,
  viewControlsAction,
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
  return h(InfiniteScrollPage, {
    className: "ingestion-page",
    provider,
    headerElements: h(LoginButton, { user, minimal: true }),
    itemComponent: MapCard,
    columnSpec,
    // Rows are maps — names the selection ("3 maps"), counters, and labels.
    itemLabel: "map",
    name: "Maps",
    actions: [
      // Selection-scoped bulk tag add/remove (appears once maps are selected).
      tagEditAction,
      // This page renders its own filter/sort surface (modal on selection), so
      // it also suppresses the built-in Sort menu that would duplicate it.
      viewControlsAction,
      suppressBuiltinSortAction,
    ],
    enableSelection: SelectionInteractionStyle.MODAL,
    scrollBody: ScrollBody,
    // Renders inside the data view's provider: mirrors filters + sorts into the
    // query string (so a particular set of maps is a link), and keeps a
    // selection from outliving the view it was made against.
    children: h(IngestListEffects),
  });
}

function ScrollBody({ children }) {
  return h("div.data-scroll-body", children);
}
