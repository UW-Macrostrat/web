import { buildHrefForItem } from "~/_providers/navigation";

/** Strip the placeholder id so a full item href becomes a route prefix. */
function prefixFor(item: any): string {
  const href = buildHrefForItem(item);
  return href.replace(/\/0$/, "");
}

/** Lexicon route prefixes for matched entities, keyed the way
 * `@macrostrat/feedback-components` looks them up: primarily by
 * `macrostrat_kg.macrostrat_terms.entity_type` (`liths`, `strat_names`, …), with
 * the singular legacy aliases the library falls back to for older matches that
 * only carry a `*_id`.
 *
 * Prefixes for types the site's `MacrostratInteractionProvider` knows about are
 * derived from `buildHrefForItem`, so match links can never drift from the
 * routes `MacrostratLink` uses. Only the lexicon pages without an item
 * identifier (`minerals`, `structures`) are spelled out. Term types with no
 * lexicon page (`tectonics`, `structure_atts`) are omitted, which renders them
 * as plain text. */
export const MATCH_LINKS: Record<string, string> = {
  liths: prefixFor({ lith_id: 0 }),
  lithology: prefixFor({ lith_id: 0 }),
  lith_atts: prefixFor({ lith_att_id: 0 }),
  lith_att: prefixFor({ lith_att_id: 0 }),
  strat_names: prefixFor({ strat_name_id: 0 }),
  strat_name: prefixFor({ strat_name_id: 0 }),
  concept: prefixFor({ concept_id: 0 }),
  intervals: prefixFor({ int_id: 0 }),
  interval: prefixFor({ int_id: 0 }),
  environs: prefixFor({ environ_id: 0 }),
  minerals: "/lex/minerals",
  structures: "/lex/structures",
};
