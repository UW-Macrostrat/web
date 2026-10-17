/** Where the website inserts components into each site page.
 *
 * A site page is prose from the documentation vault (`Site/` in Macrostrat/docs),
 * split at its H2 headings. An `after` or `replace` slot renders where the prose
 * has a `<!-- slot: Name -->` comment naming its component (or its `marker`).
 * Without one, the slot falls back to its heading: it names a heading by id and
 * renders `after` that section's prose, `replace`s it, or sits as an `aside` at
 * the end of the heading's line. A slot whose heading is missing too is appended
 * at the end of the page, so a renamed heading reorders the page rather than
 * breaking it.
 *
 * `component` is a name in `./components` (the page context is serialized, so
 * slots cannot carry the component itself); `data` names files in
 * `Site/data/` (`.yml` or `.json`) whose parsed contents the component
 * receives, or a record set web derives from one (`derivedData` in `./server`). */

export type SlotMode = "after" | "replace" | "aside";

export interface SlotSpec {
  at: string;
  mode: SlotMode;
  component: string;
  /** The name a slot comment uses, where it differs from `component`. */
  marker?: string;
  data?: string[];
}

export const siteSlots: Record<string, SlotSpec[]> = {
  "/about": [
    { at: "get-involved", mode: "after", component: "ContactBlock", marker: "Contact", data: ["contact"] },
  ],
  "/about/support": [
    { at: "supporters", mode: "after", component: "SupportersGrid", data: ["supporters"] },
    { at: "donate", mode: "after", component: "ContactBlock", marker: "Contact", data: ["contact"] },
  ],
  "/about/brand": [],
  "/about/version-2": [],
  "/about/scientific-approach": [],
  "/about/people": [
    { at: "directory", mode: "after", component: "ContributorDirectory", data: ["people"] },
  ],
  "/community": [],
  "/community/apps": [
    { at: "apps", mode: "after", component: "AppGallery", data: ["apps"] },
  ],
  "/community/integrations": [
    { at: "systems-and-organizations", mode: "after", component: "IntegrationList", data: ["integrations"] },
  ],
  "/community/providers": [
    { at: "systems-and-organizations", mode: "after", component: "ProviderList", data: ["integrations"] },
  ],
  "/contact": [
    { at: "contact", mode: "after", component: "ContactBlock", marker: "Contact", data: ["contact"] },
  ],
  "/publications": [
    { at: "publications-using-macrostrat", mode: "aside", component: "BibliographySummary", data: ["publications"] },
    { at: "publications-using-macrostrat", mode: "after", component: "Bibliography", data: ["publications"] },
  ],
};

/** The data files a route's slots need. */
export function slotDataFiles(route: string): string[] {
  const files = new Set<string>();
  for (const slot of siteSlots[route] ?? []) {
    for (const f of slot.data ?? []) files.add(f);
  }
  return [...files];
}
