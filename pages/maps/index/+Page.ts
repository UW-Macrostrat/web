import { InfiniteScrollPage, DevLinkButton } from "~/components";
import h from "./main.module.sass";
import { AnchorButton, ButtonGroup } from "@blueprintjs/core";
import { apiDomain } from "@macrostrat-web/settings";
import {
  createPostgRESTProvider,
  SelectionInteractionStyle,
} from "@macrostrat/data-sheet";
import { MapCard } from "./map-card";

const endpoint = `${apiDomain}/api/pg`;

const provider = createPostgRESTProvider<any>({
  endpoint,
  table: "sources_metadata",
  identityKey: "source_id",
  // Default ordering: newest source_id first. Because this is the
  // identity key's own default direction (not an active sort), it doesn't
  // appear as a removable tag in the sort/filter bar.
  identityAscending: false,
});

/**
 * -    is_finalized: "eq.true",
 * -    status_code: "eq.active",
 * -    or: `(ref_year.lt.9999,and(ref_year.eq.9999,source_id.gt.0))`,
 * -    limit: 20,
 * @constructor
 */

export function Page() {
  return h(InfiniteScrollPage, {
    className: "maps-list-page",
    provider,
    headerElements: h(MapsNavLinks),
    itemComponent: MapCard,
    enableSelection: SelectionInteractionStyle.MODAL,
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
