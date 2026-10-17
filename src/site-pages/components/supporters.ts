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

// A grant leads with its title, the agency secondary; other support leads with
// the organization. Program or contribution, award and years share one line.
function SupporterCard({ supporter }) {
  const { name, title, program, contribution, award, pi, url, logo, blurb, period } =
    supporter;
  let heading = title;
  let funderEl = h("span.supporter-funder", name);
  if (title == null) {
    heading = name;
    funderEl = null;
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
    h("h3.supporter-title", heading),
    h("div.supporter-source", [
      logoEl,
      h("div.supporter-source-text", [detailsEl, funderEl]),
    ]),
    piEl,
    h("p.supporter-blurb", blurb),
  ]);
}
