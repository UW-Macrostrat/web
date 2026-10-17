import h from "./components.module.sass";
import { LinkCard } from "~/components/cards";

export function AppGallery({ apps }) {
  const items: any[] = apps?.apps ?? [];
  const active = items.filter((a) => a.status !== "archived");
  const archived = items.filter((a) => a.status === "archived");
  const light = active.filter(isLight);

  let lightBlock = null;
  if (light.length > 0) {
    lightBlock = h("div.app-group", [
      h("h3.tier-label", "Also using Macrostrat"),
      h(AppCards, { apps: light, small: true }),
    ]);
  }

  let archivedBlock = null;
  if (archived.length > 0) {
    archivedBlock = h("div.app-group.archived", [
      h("h3.tier-label", "Earlier work"),
      h(AppCards, { apps: archived.filter(isCore) }),
      h(AppCards, { apps: archived.filter(isLight), small: true }),
    ]);
  }

  return h("div.app-gallery", [
    h(AppCards, { apps: active.filter(isCore) }),
    lightBlock,
    archivedBlock,
  ]);
}

// Light entries show Macrostrat's map or link to it among other sources.
function isLight(app) {
  return app.integration === "light";
}

function isCore(app) {
  return !isLight(app);
}

function AppCards({ apps, small = false }) {
  if (apps.length === 0) return null;
  let listTag = "ul.app-list";
  if (small) {
    listTag = "ul.app-list.small";
  }
  return h(
    listTag,
    apps.map((a) => h("li", { key: a.id }, h(AppCard, { app: a, small })))
  );
}

function AppCard({ app, small }) {
  const { name, url, by, logo, blurb, kind, uses } = app;
  // An empty box keeps cards without a logo aligned with the rest.
  let logoEl = h("span.app-logo");
  if (logo != null) {
    logoEl = h("img.app-logo", { src: logo, alt: "" });
  }
  // Small cards say only what the app does with Macrostrat.
  let blurbEl = null;
  if (!small) {
    blurbEl = h("p.app-blurb", blurb);
  }
  let usesEl = null;
  if (uses != null) {
    usesEl = h("p.app-uses", uses);
  }
  return h(LinkCard, { href: url, density: "list", className: "app-card" }, [
    logoEl,
    h("div.app-body", [
      h("h3.app-name", name),
      h("span.app-meta", [kind, " · by ", by]),
      blurbEl,
      usesEl,
    ]),
  ]);
}
