/**
 * The cards linking a stratigraphic name to its concept, and a concept to its
 * names. One component pair, rendered in the same position on both pages, so
 * the two sides of the relationship read the same way from either end.
 *
 * Both carry a `kind` hint on the card ("Concept", "Name") rather than a
 * section heading above them. On a page that is itself about a name, a heading
 * reading "Names" said nothing about what the cards linked to; the hint says it
 * on each card, and works when there is only one.
 *
 * Names are ordered by relevance — those carried by at least one Macrostrat
 * unit first, in bold — matching the hierarchy tree, so the most navigable
 * names are in the same position in both.
 */
import hyper from "@macrostrat/hyper";
import styles from "./relation-cards.module.sass";
import { useMemo } from "react";
import { LinkCard } from "~/components/cards";
import { StratAncestryPath } from "./strat-hierarchy";

const h = hyper.styled(styles);

/** The concept a stratigraphic name belongs to. */
export function ConceptRelationCard({ concept }: { concept: any }) {
  if (concept == null) return null;
  const conceptId = concept.concept_id ?? concept.strat_name_concept_id;
  if (conceptId == null) return null;

  return h("div.relation-cards", [
    h(LinkCard, {
      className: "relation-card",
      href: `/lex/strat-concepts/${conceptId}`,
      kind: "Concept",
      title: concept.name,
    }),
  ]);
}

/** The stratigraphic names a concept groups. */
export function StratNameCards({ usages }: { usages: any[] }) {
  const ordered = useMemo(() => byUnits(usages ?? []), [usages]);
  if (ordered.length === 0) return null;

  return h(
    "div.relation-cards",
    ordered.map((usage) => h(UsageCard, { key: usage.strat_name_id, usage }))
  );
}

/** Carried by at least one unit first, most-used first; the rest alphabetically. */
function byUnits(usages: any[]): any[] {
  return [...usages].sort((a, b) => {
    const ua = a?.t_units ?? 0;
    const ub = b?.t_units ?? 0;
    if (ua !== ub) return ub - ua;
    return String(a?.strat_name_long ?? "").localeCompare(
      String(b?.strat_name_long ?? "")
    );
  });
}

function UsageCard({ usage }) {
  const units = usage?.t_units ?? 0;

  let unitCount = null;
  if (units > 0) {
    unitCount = h(
      "div.usage-units",
      { key: "units" },
      `${units.toLocaleString()} ${units === 1 ? "unit" : "units"}`
    );
  }

  // A name no unit carries is still worth linking — it exists in the lexicon —
  // but it isn't what someone navigating the hierarchy is looking for.
  let className = "relation-card has-units";
  if (units === 0) className = "relation-card no-units";

  return h(
    LinkCard,
    {
      className,
      href: `/lex/strat-names/${usage.strat_name_id}`,
      kind: "Name",
      title: usage.strat_name_long ?? usage.strat_name,
      // The ancestry inside carries links of its own.
      nestedLinks: true,
    },
    [h(StratAncestryPath, { key: "path", record: usage }), unitCount]
  );
}
