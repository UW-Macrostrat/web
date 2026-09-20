import h from "./components.module.sass";

export function AppGallery({ apps }) {
  const items: any[] = apps?.apps ?? [];
  const active = items.filter((a) => a.status !== "archived");
  const archived = items.filter((a) => a.status === "archived");

  let archivedBlock = null;
  if (archived.length > 0) {
    archivedBlock = h("div.app-group.archived", [
      h("h3.tier-label", "Earlier work"),
      h("ul.app-list", archived.map((a) => h(AppCard, { key: a.id, app: a }))),
    ]);
  }

  return h("div.app-gallery", [
    h("ul.app-list", active.map((a) => h(AppCard, { key: a.id, app: a }))),
    archivedBlock,
  ]);
}

function AppCard({ app }) {
  const { name, url, by, logo, blurb, kind } = app;
  let logoEl = null;
  if (logo != null) {
    logoEl = h("img.app-logo", { src: logo, alt: "" });
  }
  return h("li.app-card", [
    logoEl,
    h("div.app-body", [
      h("a.app-name", { href: url }, name),
      h("span.app-meta", [kind, " · by ", by]),
      h("p.app-blurb", blurb),
    ]),
  ]);
}
