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

  // Slots the prose places with a comment; the rest fall back to their heading.
  const marked = new Set(
    sections.flatMap((s) => markerNames(s.html)).map((name) => slotForMarker(slots, name))
  );
  const headingSlots = slots.filter((slot) => !marked.has(slot));
  const ids = new Set(sections.map((s) => s.id).filter((id) => id != null));
  const orphanSlots = headingSlots.filter((slot) => !ids.has(slot.at));

  return h("article.site-page.docs-content", [
    sections.map((section, i) =>
      h(Section, {
        key: section.id ?? `lead-${i}`,
        section,
        slots: headingSlots,
        markerSlots: slots,
        data,
      })
    ),
    orphanSlots.map((slot) => h(SlotComponent, { key: slot.component, slot, data })),
  ]);
}

// Left where the vault page had a `<!-- slot: Name -->` comment (see the text toolchain).
const MARKER = /<div data-slot-marker="([^"]+)"><\/div>/g;

function markerNames(html: string): string[] {
  return [...html.matchAll(MARKER)].map((m) => m[1]);
}

/** Asides belong to a heading's line, so a comment never places them. */
function slotForMarker(slots: SlotSpec[], name: string): SlotSpec | undefined {
  return slots.find(
    (slot) => slot.mode !== "aside" && (slot.component === name || slot.marker === name)
  );
}

/** A section's prose, with the slots its comments name rendered in place. */
function ProseWithSlots({ html, slots, data }) {
  // Split with a capture group: prose, marker name, prose, marker name, …
  const parts = html.split(MARKER);
  const children = [];
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) {
      const slot = slotForMarker(slots, parts[i]);
      if (slot != null) {
        children.push(h(SlotComponent, { key: `slot-${i}`, slot, data }));
      }
      continue;
    }
    if (parts[i].trim() !== "") {
      children.push(
        h("div.section-prose", { key: `prose-${i}`, dangerouslySetInnerHTML: { __html: parts[i] } })
      );
    }
  }
  return h(children);
}

function Section({ section, slots, markerSlots, data }) {
  const own = slots.filter((slot) => slot.at === section.id);
  const replacing = own.find((slot) => slot.mode === "replace");
  const after = own.filter((slot) => slot.mode === "after");
  const asides = own.filter((slot) => slot.mode === "aside");

  let heading = null;
  if (section.heading != null) {
    heading = h("h2", {
      id: section.id,
      dangerouslySetInnerHTML: { __html: section.heading },
    });
  }
  if (heading != null && asides.length > 0) {
    heading = h("div.section-heading-row", [
      heading,
      asides.map((slot) => h(SlotComponent, { key: slot.component, slot, data })),
    ]);
  }

  let body;
  if (replacing != null) {
    body = h(SlotComponent, { slot: replacing, data });
  } else {
    body = h(ProseWithSlots, { html: section.html, slots: markerSlots, data });
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
