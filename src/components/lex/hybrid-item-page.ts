/** A lexicon item on the hybrid frame: the item's body as the content, its
 * map and sources in the sidebar. Needs `pageStyle: "hybrid"`. */
import h from "@macrostrat/hyper";
import {
  HybridMapPlacement,
  HybridPage,
  type HybridLink,
  type LayoutCapabilities,
} from "~/layouts/hybrid";
import { LexItemPage } from "./index";
import { lexOnHybridFrameAtom, LexSidebarSlot } from "./item-slots";

const lexItemCapabilities: Partial<LayoutCapabilities> = {
  modes: ["content-only", "content-primary"],
  defaultMode: "content-primary",
  hasAssistant: true,
  itemName: "Details",
  contentScroll: "page",
  // Prose and cards read well narrower than a column, and the map is a
  // primary view of the item rather than an inset
  contentWidth: "48rem",
  sidebarWidth: "clamp(320px, 36vw, 540px)",
};

export function LexHybridItemPage(props) {
  const { siftLink, id, mapUrl, ...rest } = props;
  return h(HybridPage, {
    className: "lex-item-page",
    capabilities: lexItemCapabilities,
    initialAtoms: [[lexOnHybridFrameAtom, true]],
    links: itemLinks({ siftLink, id, mapUrl }),
    // The map beside the item's description, above its full-width cards
    content: h(LexItemPage, { ...rest, id, siftLink: null }, [
      h(HybridMapPlacement, { key: "map" }),
      rest.children,
    ]),
    map: h(LexSidebarSlot, { name: "map" }),
    assistant: h(LexSidebarSlot, { name: "assistant" }),
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
