/** The homepage's site search, at the right of the site pages' sticky header.
 * The pages it used to list are on the homepage and in the footer. */
import {
  LexSearchHost,
  SiteSearchPrompt,
} from "~/components/lex/search-omnibar";
import h from "./site-search.module.sass";

export function SiteHeaderSearch() {
  return h("div.site-header-search", [h(SiteSearchPrompt), h(LexSearchHost)]);
}
