import h from "./components.module.sass";

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

export function SupportersGrid({ supporters }) {
  const items: any[] = (supporters?.supporters ?? []).filter((s) =>
    (s.projects ?? ["macrostrat"]).includes("macrostrat")
  );
  const tiers = ["funder", "institutional", "in-kind"].filter((tier) =>
    items.some((s) => s.tier === tier)
  );
  return h(
    "div.supporters",
    tiers.map((tier) =>
      h("div.supporter-tier", { key: tier }, [
        h("h3.tier-label", tierLabels[tier] ?? tier),
        h(
          "ul.supporter-list",
          items
            .filter((s) => s.tier === tier)
            .map((s) => h(SupporterCard, { key: s.id, supporter: s }))
        ),
      ])
    )
  );
}

function SupporterCard({ supporter }) {
  const { name, program, url, logo, blurb, period } = supporter;
  let logoEl = null;
  if (logo != null) {
    logoEl = h("img.supporter-logo", { src: logo, alt: "" });
  }
  let programEl = null;
  if (program != null) {
    programEl = h("span.supporter-program", program);
  }
  const periodText = formatPeriod(period);
  let periodEl = null;
  if (periodText != null) {
    periodEl = h("span.supporter-period", periodText);
  }
  return h("li.supporter-card", [
    logoEl,
    h("div.supporter-body", [
      h("a.supporter-name", { href: url, target: "_blank", rel: "noopener" }, name),
      programEl,
      h("p.supporter-blurb", blurb),
      periodEl,
    ]),
  ]);
}
