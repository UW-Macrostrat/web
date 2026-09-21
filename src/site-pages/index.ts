/** A site page: vault prose split at H2 headings, with website components
 * inserted at the slots declared in `./slots`. Shared by every route under
 * `pages/(site)/`. */
import { usePageContext } from "vike-react/usePageContext";
import { siteSlots, type SlotSpec } from "./slots";
import { siteComponents } from "./components";
import type { SiteSection } from "./server";
import h from "./site-pages.module.sass";
import "../../pages/docs/index/docs-content.sass";

export function SitePage() {
  const ctx = usePageContext() as any;
  const route: string = ctx.siteRoute;
  const sections: SiteSection[] = ctx.siteSections ?? [];
  const data: Record<string, unknown> = ctx.siteData ?? {};
  const slots = siteSlots[route] ?? [];

  const ids = new Set(sections.map((s) => s.id).filter((id) => id != null));
  const orphanSlots = slots.filter((slot) => !ids.has(slot.at));

  return h("article.site-page.docs-content", [
    sections.map((section, i) =>
      h(Section, { key: section.id ?? `lead-${i}`, section, slots, data })
    ),
    orphanSlots.map((slot) => h(SlotComponent, { key: slot.component, slot, data })),
  ]);
}

function Section({ section, slots, data }) {
  const own = slots.filter((slot) => slot.at === section.id);
  const replacing = own.find((slot) => slot.mode === "replace");
  const after = own.filter((slot) => slot.mode === "after");

  let heading = null;
  if (section.heading != null) {
    heading = h("h2", {
      id: section.id,
      dangerouslySetInnerHTML: { __html: section.heading },
    });
  }

  let body;
  if (replacing != null) {
    body = h(SlotComponent, { slot: replacing, data });
  } else {
    body = h("div.section-prose", {
      dangerouslySetInnerHTML: { __html: section.html },
    });
  }

  return h("section.site-section", [
    heading,
    body,
    after.map((slot) => h(SlotComponent, { key: slot.component, slot, data })),
  ]);
}

function SlotComponent({ slot, data }: { slot: SlotSpec; data: Record<string, unknown> }) {
  const Component = siteComponents[slot.component];
  if (Component == null) {
    console.warn(`[site-pages] unknown slot component ${slot.component}`);
    return null;
  }
  const props: Record<string, unknown> = {};
  for (const name of slot.data ?? []) props[name] = data[name];
  return h("div.site-slot", { "data-slot": slot.component }, h(Component, props));
}
