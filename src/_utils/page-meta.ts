import { PageContext } from "~/renderer/types";

export function buildPageMeta(pageContext: PageContext): {
  title: string;
  description: string;
} {
  let title = pageContext.exports.title ?? "Macrostrat";
  let description =
    pageContext.exports.description ??
    "A platform for geological data exploration, integration, and analysis.";
  if (title != "Macrostrat") {
    title = `${title} - Macrostrat`;
  }
  return { title, description };
}
