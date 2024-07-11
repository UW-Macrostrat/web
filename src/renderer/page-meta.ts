import { PageContext, PageContextClient } from "vike/types";

export function updatePageMeta<T extends PageContext | PageContextClient>(
  pageContext: T
): T {
  let titleCfg = pageContext.configEntries.title?.[0];

  let title = titleCfg?.configValue ?? "Macrostrat";

  if (typeof title === "function") {
    title = title(pageContext);
  }

  if (typeof title !== "string") {
    // Something went wrong, leave it to vike-react to deal with
    return pageContext;
  }

  if (title != "Macrostrat") {
    title = `${title} - Macrostrat`;
  }

  titleCfg.configValue = title;

  pageContext.configEntries.title ??= [];
  pageContext.configEntries.title[0] = titleCfg;

  return pageContext;
}
