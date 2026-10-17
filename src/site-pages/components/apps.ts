import h from "./components.module.sass";

export function AppGallery({ apps }) {
  const items: any[] = apps?.apps ?? [];
  const active = items.filter((a) => a.status !== "archived");
  const archived = items.filter((a) => a.status === "archived");
  const light = active.filter(isLight);

  let lightBlock = null;
  if (light.length > 0) {
    lightBlock = h("div.app-group", [
      h("h3.tier-label", "Also using Macrostrat"),
      h(AppRows, { apps: light }),
    ]);
  }

  let archivedBlock = null;
  if (archived.length > 0) {
    archivedBlock = h("div.app-group.archived", [
      h("h3.tier-label", "Earlier work"),
      h(AppCards, { apps: archived.filter(isCore) }),
      h(AppRows, { apps: archived.filter(isLight) }),
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

function AppCards({ apps }) {
  if (apps.length === 0) return null;
  return h("ul.app-list", apps.map((a) => h(AppCard, { key: a.id, app: a })));
}

function AppRows({ apps }) {
  if (apps.length === 0) return null;
  return h("ul.app-rows", apps.map((a) => h(AppRow, { key: a.id, app: a })));
}

function AppCard({ app }) {
  const { name, url, by, logo, blurb, kind, uses } = app;
  let logoEl = null;
  if (logo != null) {
    logoEl = h("img.app-logo", { src: logo, alt: "" });
  }
  let usesEl = null;
  if (uses != null) {
    usesEl = h("p.app-uses", uses);
  }
  return h("li.app-card", [
    logoEl,
    h("div.app-body", [
      h("a.app-name", { href: url }, name),
      h("span.app-meta", [kind, " · by ", by]),
      h("p.app-blurb", blurb),
      usesEl,
    ]),
  ]);
}

function AppRow({ app }) {
  const { name, url, by, logo, kind, uses } = app;
  // An empty box keeps rows without a logo aligned with the rest.
  let logoEl = h("span.app-row-logo");
  if (logo != null) {
    logoEl = h("img.app-row-logo", { src: logo, alt: "" });
  }
  return h("li.app-row", [
    logoEl,
    h("div.app-row-body", [
      h("div.app-row-head", [
        h("a.app-name", { href: url }, name),
        h("span.app-meta", [kind, " · by ", by]),
      ]),
      h("p.app-uses", uses),
    ]),
  ]);
}
