import h from "./components.module.sass";
import { LinkCard } from "~/components/cards";

const tierLabels: Record<string, string> = {
  funder: "Funding",
  institutional: "Institutional support",
  "in-kind": "In-kind contributions",
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
  const tiers = ["funder", "institutional", "in-kind"].filter((tier) =>
    items.some((s) => s.tier === tier)
  );
  return h(
    "div.supporters",
    tiers.map((tier) =>
      h("div.supporter-tier", { key: tier }, [
        h("h3.tier-label", tierLabels[tier] ?? tier),
        h(SupporterList, { tier, supporters: items.filter((s) => s.tier === tier) }),
      ])
    )
  );
}

function SupporterList({ tier, supporters }) {
  if (tier === "funder") {
    return h(
      "ul.supporter-list.grants",
      supporters.map((s) => h("li", { key: s.id }, h(GrantCard, { grant: s })))
    );
  }
  return h(
    "ul.supporter-list",
    supporters.map((s) => h("li", { key: s.id }, h(SupporterCard, { supporter: s })))
  );
}

// The grant leads; the agency that made it is secondary.
function GrantCard({ grant }) {
  const { name, title, program, award, pi, url, logo, blurb, period } = grant;
  // Grants without a recorded title lead with their program instead.
  let heading = title;
  let programText = program;
  if (title == null) {
    heading = program ?? name;
    programText = null;
  }
  const details = [programText, award, formatPeriod(period)].filter(Boolean).join(" · ");
  let piEl = null;
  if (pi != null) {
    piEl = h("span.grant-pi", ["Lead PI: ", pi]);
  }
  let logoEl = null;
  if (logo != null) {
    logoEl = h("img.grant-agency-logo", { src: logo, alt: "" });
  }
  return h(LinkCard, { href: url, density: "list", className: "supporter-card grant-card" }, [
    h("h3.grant-title", heading),
    h("span.grant-details", details),
    piEl,
    h("p.supporter-blurb", blurb),
    h("div.grant-agency", [logoEl, h("span", name)]),
  ]);
}

function SupporterCard({ supporter }) {
  const { name, url, logo, blurb, period } = supporter;
  let logoEl = null;
  if (logo != null) {
    logoEl = h("img.supporter-logo", { src: logo, alt: "" });
  }
  const periodText = formatPeriod(period);
  let periodEl = null;
  if (periodText != null) {
    periodEl = h("span.supporter-period", periodText);
  }
  return h(LinkCard, { href: url, density: "list", className: "supporter-card" }, [
    logoEl,
    h("div.supporter-body", [
      h("h3.supporter-name", name),
      h("p.supporter-blurb", blurb),
      periodEl,
    ]),
  ]);
}
