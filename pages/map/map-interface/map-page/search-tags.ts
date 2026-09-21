/**
 * Standardized tags for the map's search results and active filters.
 *
 * These share the `@macrostrat/data-components` tag presentation — and the
 * definition-table join behind it (`describeLexMatch`) — with the lexicon
 * omnibar and the column list, so a lithology, environment or interval looks
 * the same on the map as it does everywhere else on the site.
 */
import hyper from "@macrostrat/hyper";
import { useMemo } from "react";
import { useMacrostratDefs } from "@macrostrat/data-provider";
import {
  Identifier,
  IntervalTag,
  LithologyTag,
  Tag,
  TagSize,
} from "@macrostrat/data-components";
import { describeLexMatch, type LexDefs } from "~/components/lex/search";
import type { FilterData } from "../app-state/handlers/filters";
import styles from "./search-tags.module.sass";

const h = hyper.styled(styles);

/** The definition tables that search matches and filters are joined against.
 * `MacrostratDataProvider` (mounted around the map page) fetches each once and
 * caches it, so this is one request per table for the page's lifetime. */
export function useLexDefs(): LexDefs {
  const lithologies = useMacrostratDefs("lithologies", null);
  const environments = useMacrostratDefs("environments", null);
  const intervals = useMacrostratDefs("intervals", null, null);
  return useMemo(
    () => ({ lithologies, environments, intervals }),
    [lithologies, environments, intervals]
  );
}

/** Filter types that name a hierarchy level (a class or type) rather than a
 * specific entity. They carry no ID and no color of their own. */
const LEVEL_LABELS: Record<string, string> = {
  lithology_classes: "class",
  lithology_types: "type",
  all_lithology_classes: "class",
  all_lithology_types: "type",
  environment_classes: "class",
  environment_types: "type",
};

const COLUMNS_ONLY = "columns only";

interface SearchResultLabelProps {
  /** A row from the API v2 `mobile/autocomplete` route. */
  result: { type: string; id?: number; name: string; category: string };
  defs: LexDefs;
}

/** One search result: the standardized tag (colored when the match joins to a
 * definition record), with its ID right-aligned as in the lexicon omnibar. */
export function SearchResultLabel({ result, defs }: SearchResultLabelProps) {
  const { type, id, name } = result;

  if (type === "place") {
    return h("div.search-result-label", h("span.place-name", name));
  }

  const { color, details } = describeLexMatch(type, id, name, defs);
  const levelLabel = LEVEL_LABELS[type];
  // Hierarchy levels come back from the autocomplete table with `id = 0`
  const hasID = id != null && id !== 0 && levelLabel == null;

  return h("div.search-result-label", [
    h(Tag, {
      name,
      color,
      details: details ?? levelLabel,
      size: TagSize.Small,
    }),
    h.if(hasID)("span.result-id", h(Identifier, { id })),
  ]);
}

/** The tag for an active filter, by category: `IntervalTag` with its age range,
 * `LithologyTag` for a lithology or environment (the site-wide convention for
 * both), a plain `Tag` for stratigraphic names and for classes and types. */
export function FilterItemTag({ filter }: { filter: FilterData }) {
  const size = TagSize.Small;
  switch (filter.category) {
    case "interval": {
      const { int_id, id, name, b_age, t_age, color } = filter;
      const interval: any = { id: int_id ?? id, name, b_age, t_age, color };
      return h(IntervalTag, { interval, showAgeRange: true, size });
    }
    case "lithology": {
      const { lith_id, name, color, type } = filter;
      if (lith_id == null) {
        return h(Tag, { name, details: LEVEL_LABELS[type], size });
      }
      return h(LithologyTag, {
        data: { lith_id, name, color },
        interactive: false,
        size,
      });
    }
    case "environment": {
      const { environ_id, name, color, type } = filter;
      if (environ_id == null) {
        const details = `${LEVEL_LABELS[type]} · ${COLUMNS_ONLY}`;
        return h(Tag, { name, details, size });
      }
      return h(LithologyTag, {
        data: { environ_id, name, color },
        interactive: false,
        details: COLUMNS_ONLY,
        size,
      });
    }
    case "strat_name":
      return h(Tag, { name: filter.name, size });
    default:
      return h(Tag, { name: (filter as any).name, size });
  }
}
