import h from "./components.module.sass";
import { LinkCard } from "~/components/cards";

export function AppGallery({ apps }) {
  const items: any[] = apps?.apps ?? [];
  const ordered = [...items].sort((a, b) => appRank(a) - appRank(b));
  return h(
    "ul.app-list",
    ordered.map((a) => h("li", { key: a.id }, h(AppCard, { app: a })))
  );
}

// Core entries, then light ones, then archived; file order within each.
function appRank(app) {
  let rank = 0;
  if (isLight(app)) rank += 1;
  if (app.status === "archived") rank += 2;
  return rank;
}

// Light entries show Macrostrat's map or link to it among other sources.
function isLight(app) {
  return app.integration === "light";
}

function AppCard({ app }) {
  const { name, url, by, logo, blurb, kind, uses, status } = app;
  const small = isLight(app);
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
  let cardClass = "app-card";
  if (small) cardClass += " small";
  if (status === "archived") cardClass += " archived";
  return h(LinkCard, { href: url, density: "list", className: cardClass }, [
    logoEl,
    h("div.app-body", [
      h("h3.app-name", name),
      h("span.app-meta", [kind, " · by ", by]),
      blurbEl,
      usesEl,
    ]),
  ]);
}
