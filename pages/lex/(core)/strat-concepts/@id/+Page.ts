import { useData } from "vike-react/useData";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { LexItemPage, ConceptInfo, LexItemBodyClient } from "~/components/lex";
import { LinkCard } from "~/components/cards";
import { StratAncestryPath } from "~/components/lex/strat-hierarchy";
import { LexItemData } from "~/components/lex/data-loaders.ts";

const h = hyper.styled(styles);

interface ConceptPageData extends LexItemData {
  usages: any[];
}

export function Page() {
  const { resData, id, type, config, usages } = useData<ConceptPageData>();

  const relatedHref =
    config.idParam +
    "=" +
    id +
    "&color=" +
    resData?.color +
    "&name=" +
    resData?.name;

  // Title + Concept badge come from `+pageInfo.ts` via the layout header.
  return h(LexItemPage, { id, resData, siftLink: config.siftLink }, [
    h(ConceptInfo, { concept_id: resData?.concept_id, showHeader: false }),
    h(ConceptUsages, { usages }),
    h(LexItemBodyClient, {
      type,
      id,
      resData,
      mapUrl: type + "=" + id,
      relatedHref,
      showUnits: true,
      showMaps: true,
      showFossils: true,
      showColumnList: true,
    }),
  ]);
}

/**
 * The names this concept groups.
 *
 * Cards rather than a bare list of links: each one is a route into a filterable
 * view of that name, so it carries what you would filter on — the rank-qualified
 * name, how many units use it, and its position in the stratigraphic hierarchy
 * as links of their own.
 *
 * **This is where the concept page's hierarchy navigation lives.** The
 * neighborhood strip on a name page (`StratNameHierarchy`) has one subject and
 * shows its siblings and children around it; a concept has a *set* of names,
 * often in unrelated parts of the tree, so there is no single neighborhood to
 * draw. Each usage's own ancestry is the honest version of the same thing, and
 * the name pages one click away carry the full strip.
 */
function ConceptUsages({ usages }: { usages: any[] }) {
  if (usages == null || usages.length === 0) return null;

  return h("div.concept-usages", [
    h("h3.usages-header", { key: "header" }, [
      "Names",
      h("span.usage-count", { key: "count" }, usages.length.toLocaleString()),
    ]),
    h(
      "div.usage-cards",
      { key: "cards" },
      usages.map((usage) => h(UsageCard, { key: usage.strat_name_id, usage }))
    ),
  ]);
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

  return h(
    LinkCard,
    {
      className: "usage-card",
      href: `/lex/strat-names/${usage.strat_name_id}`,
      title: usage.strat_name_long ?? usage.strat_name,
      // The ancestry inside carries links of its own.
      nestedLinks: true,
    },
    [h(StratAncestryPath, { key: "path", record: usage }), unitCount]
  );
}
