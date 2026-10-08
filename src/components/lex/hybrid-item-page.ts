/** A lexicon item on the hybrid frame: the item's body as the content, its
 * map and sources in the sidebar. Needs `pageStyle: "hybrid"`.
 *
 * Where the map goes in the details-only view depends on what the item's page
 * leads with, so each page places `HybridMapPlacement` among its children. */
import h from "@macrostrat/hyper";
import {
  HybridPage,
  type HybridLink,
  type LayoutCapabilities,
} from "~/layouts/hybrid";
import { LexItemPage } from "./index";
import { lexOnHybridFrameAtom, LexSidebarSlot } from "./item-slots";

const lexItemCapabilities: Partial<LayoutCapabilities> = {
  modes: ["content-only", "content-primary"],
  defaultMode: "content-primary",
  // The sidebar holds the map and the page's links; references end the content
  hasAssistant: false,
  itemName: "Details",
  contentScroll: "page",
  // Prose and cards read well narrower than a column, and the map is a
  // primary view of the item rather than an inset
  contentWidth: "48rem",
  sidebarWidth: "clamp(320px, 36vw, 540px)",
};

/** An item with nothing to map: its details alone */
const unmappedItemCapabilities: Partial<LayoutCapabilities> = {
  ...lexItemCapabilities,
  modes: ["content-only"],
  defaultMode: "content-only",
};

const frameAtoms: [any, any][] = [[lexOnHybridFrameAtom, true]];

interface LexHybridItemPageProps {
  id: number | string;
  resData: any;
  siftLink?: string | null;
  /** `#`-fragment for the item on the main map; omit for items not mapped */
  mapUrl?: string;
  /** False for items with no map or columns, which get a details view only */
  hasMap?: boolean;
  refs?: any[];
  children?: any;
}

export function LexHybridItemPage(props: LexHybridItemPageProps) {
  const { siftLink, id, mapUrl, hasMap = true, children, ...rest } = props;

  let capabilities = lexItemCapabilities;
  let map = null;
  if (hasMap) {
    map = h(LexSidebarSlot, { name: "map" });
  } else {
    capabilities = unmappedItemCapabilities;
  }

  return h(HybridPage, {
    className: "lex-item-page",
    capabilities,
    initialAtoms: frameAtoms,
    links: itemLinks({ siftLink, id, mapUrl }),
    content: h(LexItemPage, { ...rest, id, siftLink: null }, children),
    map,
  });
}

/** The item on the main map and in Sift, among the page's actions */
function itemLinks({ siftLink, id, mapUrl }): HybridLink[] {
  const links: HybridLink[] = [];
  if (mapUrl != null && mapUrl !== "") {
    links.push({
      label: "View on map",
      href: "/map/layers#" + mapUrl,
      icon: "map",
    });
  }
  if (siftLink != null) {
    links.push({
      label: "View in Sift",
      href: "https://macrostrat.org/sift/#/" + siftLink + "/" + id,
    });
  }
  return links;
}
