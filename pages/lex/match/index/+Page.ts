/** `/lex/match`: the lexicon's matching tools, as a short list. The lexicon
 * index links each tool directly; this page is where the breadcrumb lands. */
import { LinkCard } from "~/components";
import { h } from "../console";
import { matchingTools } from "../tools";

export function Page() {
  return h("div.match-page", [
    h(
      "p.lead",
      "Tools that show how Macrostrat's importers read free text against the lexicon. Each answers the same way the import pipeline would, so a result here is a result there."
    ),
    h(
      "div.tools-grid",
      matchingTools.map((tool) =>
        h(
          LinkCard,
          {
            key: tool.href,
            href: tool.href,
            title: tool.title,
            className: "tool-card",
          },
          tool.text
        )
      )
    ),
  ]);
}
