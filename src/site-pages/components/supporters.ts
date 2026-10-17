import h from "./components.module.sass";
import { LinkCard } from "~/components/cards";

const tierOrder = ["funder", "institutional", "in-kind"];

function formatPeriod(period) {
  if (period == null) return null;
  const { from, to } = period;
  if (from != null && to != null) return `${from}–${to}`;
  if (from != null) return `${from}–`;
  return null;
}

// Grants first, then institutional and in-kind support; newest first within each.
function byTierThenNewest(a, b) {
  const tier = tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier);
  if (tier !== 0) return tier;
  return (b.period?.from ?? 0) - (a.period?.from ?? 0);
}

export function SupportersGrid({ supporters }) {
  const items: any[] = (supporters?.supporters ?? [])
    .filter((s) => (s.projects ?? ["macrostrat"]).includes("macrostrat"))
    .sort(byTierThenNewest);
  return h(
    "ul.supporter-list",
    items.map((s) => h("li", { key: s.id }, h(SupporterCard, { supporter: s })))
  );
}

// A grant leads with its title; other support has none. Beside the logo, the
// program (or contribution), award and years, then the organization giving it.
function SupporterCard({ supporter }) {
  const { name, title, program, contribution, award, pi, url, logo, blurb, period } =
    supporter;
  let titleEl = null;
  if (title != null) {
    titleEl = h("h3.supporter-title", title);
  }
  const details = [program ?? contribution, award, formatPeriod(period)]
    .filter(Boolean)
    .join(" · ");
  let detailsEl = null;
  if (details !== "") {
    detailsEl = h("span.supporter-details", details);
  }
  let logoEl = null;
  if (logo != null) {
    logoEl = h("img.supporter-logo", { src: logo, alt: "" });
  }
  let piEl = null;
  if (pi != null) {
    piEl = h("span.supporter-pi", ["Lead PI: ", pi]);
  }
  return h(LinkCard, { href: url, density: "list", className: "supporter-card" }, [
    titleEl,
    h("div.supporter-source", [
      logoEl,
      h("div.supporter-source-text", [detailsEl, h("span.supporter-funder", name)]),
    ]),
    piEl,
    h("p.supporter-blurb", blurb),
  ]);
}
