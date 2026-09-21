/** Where the website inserts components into each site page.
 *
 * A site page is prose from the documentation vault (`Site/` in Macrostrat/docs),
 * split at its H2 headings. A slot names a heading by its id and a component to
 * render `after` that section's prose or to `replace` it. A slot whose heading
 * is missing is appended at the end of the page, so a renamed heading in the
 * vault reorders the page rather than breaking it.
 *
 * `component` is a name in `./components` (the page context is serialized, so
 * slots cannot carry the component itself); `data` names files in
 * `Site/data/` whose parsed contents the component receives. */

export type SlotMode = "after" | "replace";

export interface SlotSpec {
  at: string;
  mode: SlotMode;
  component: string;
  data?: string[];
}

export const siteSlots: Record<string, SlotSpec[]> = {
  "/about": [
    { at: "how-to-cite", mode: "after", component: "CiteMacrostrat" },
    { at: "collaborate-with-us", mode: "after", component: "ContactBlock", data: ["contact"] },
  ],
  "/about/support": [
    { at: "supporters", mode: "after", component: "SupportersGrid", data: ["supporters"] },
    { at: "how-to-give", mode: "after", component: "ContactBlock", data: ["contact"] },
  ],
  "/about/brand": [],
  "/community": [
    { at: "contact", mode: "after", component: "ContactBlock", data: ["contact"] },
  ],
  "/community/contributors": [
    { at: "team", mode: "after", component: "ContributorDirectory", data: ["people"] },
  ],
  "/community/apps": [
    { at: "apps", mode: "after", component: "AppGallery", data: ["apps"] },
  ],
  "/community/integrations": [
    { at: "systems-and-organizations", mode: "after", component: "IntegrationList", data: ["integrations"] },
  ],
  "/community/open-source": [
    { at: "repositories", mode: "after", component: "RepositoryList" },
  ],
  "/publications": [
    { at: "citing-macrostrat", mode: "after", component: "CiteMacrostrat" },
    { at: "bibliography", mode: "after", component: "Bibliography" },
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
