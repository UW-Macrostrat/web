import { useAuth } from "@macrostrat/form-components";
import { InfiniteScrollPage } from "~/components";
import { LoginButton } from "../components/navbar.ts";
import h from "./+Page.module.sass";
import { apiV3Prefix } from "@macrostrat-web/settings";
import {
  createPostgRESTProvider,
  SelectionInteractionStyle,
} from "@macrostrat/data-sheet";
import { type IngestMap, columnSpec, MapCard } from "./ingestion-list.ts";

const endpoint = `${apiV3Prefix}/map-ingestion/pg`;

const provider = createPostgRESTProvider<IngestMap>({
  endpoint,
  table: "maps",
  identityKey: "source_id",
  // Default ordering: newest source_id first. Because this is the
  // identity key's own default direction (not an active sort), it doesn't
  // appear as a removable tag in the sort/filter bar.
  identityAscending: false,
});

export function Page() {
  const { user } = useAuth();
  return h(InfiniteScrollPage, {
    className: "ingestion-page",
    provider,
    headerElements: h(LoginButton, { user, minimal: true }),
    itemComponent: MapCard,
    columnSpec,
    enableSelection: SelectionInteractionStyle.MODAL,
    scrollBody: ScrollBody,
  });
}

function ScrollBody({ children }) {
  return h("div.data-scroll-body", children);
}
