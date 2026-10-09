/** Where the website inserts components into each site page.
 *
 * A site page is prose from the documentation vault (`Site/` in Macrostrat/docs),
 * split at its H2 headings. A slot names a heading by its id and a component to
 * render `after` that section's prose, to `replace` it, or as an `aside` at the
 * end of the heading's line. A slot whose heading
 * is missing is appended at the end of the page, so a renamed heading in the
 * vault reorders the page rather than breaking it.
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
  data?: string[];
}

export const siteSlots: Record<string, SlotSpec[]> = {
  "/about": [
    { at: "get-involved", mode: "after", component: "ContactBlock", data: ["contact"] },
  ],
  "/about/support": [
    { at: "supporters", mode: "after", component: "SupportersGrid", data: ["supporters"] },
    { at: "how-to-give", mode: "after", component: "ContactBlock", data: ["contact"] },
  ],
  "/about/brand": [],
  "/about/version-2": [],
  "/about/scientific-approach": [],
  "/about/apps": [
    { at: "apps", mode: "after", component: "AppGallery", data: ["apps"] },
  ],
  "/about/people": [
    { at: "directory", mode: "after", component: "ContributorDirectory", data: ["people"] },
  ],
  "/community": [
    { at: "contact", mode: "after", component: "ContactBlock", data: ["contact"] },
  ],
  "/community/contributing": [],
  "/community/collaborators": [
    { at: "systems-and-organizations", mode: "after", component: "IntegrationList", data: ["integrations"] },
  ],
  "/community/open-source": [
    { at: "repositories", mode: "after", component: "RepositoryList" },
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
