import h from "./components.module.sass";
import { LinkCard } from "~/components/cards";

// Names the kind of support where a card has no grant to lead with.
const tierLabels: Record<string, string> = {
  funder: "Funding",
  institutional: "Institutional support",
  "in-kind": "In-kind contribution",
};

function formatPeriod(period) {
  if (period == null) return null;
  const { from, to } = period;
  if (from != null && to != null) return `${from}–${to}`;
  if (from != null) return `${from}–`;
  return null;
}

function byNewest(a, b) {
  return (b.period?.from ?? 0) - (a.period?.from ?? 0);
}

export function SupportersGrid({ supporters }) {
  const items: any[] = (supporters?.supporters ?? [])
    .filter((s) => (s.projects ?? ["macrostrat"]).includes("macrostrat"))
    .sort(byNewest);
  return h(
    "ul.supporter-list",
    items.map((s) => h("li", { key: s.id }, h(SupporterCard, { supporter: s })))
  );
}

// A grant leads with its title and program; the funder follows, secondary.
function SupporterCard({ supporter }) {
  const { name, title, program, award, pi, url, logo, blurb, period, tier } = supporter;
  let heading = title;
  let programText = program;
  let source = name;
  if (title == null && program != null) {
    heading = program;
    programText = null;
  } else if (title == null) {
    heading = name;
    source = tierLabels[tier] ?? tier;
  }
  const details = [programText, award, formatPeriod(period)].filter(Boolean).join(" · ");
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
      h("div.supporter-source-text", [detailsEl, h("span.supporter-funder", source)]),
    ]),
    piEl,
    h("p.supporter-blurb", blurb),
  ]);
}
