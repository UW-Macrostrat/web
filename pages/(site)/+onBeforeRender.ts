import type { PageContext } from "vike/types";
import { render } from "vike/abort";
import { renderSitePage } from "~/site-pages/server";

export async function onBeforeRender(pageContext: PageContext) {
  const route = pageContext.urlPathname.replace(/\/+$/, "") || "/";
  const page = await renderSitePage(route);
  if (page == null) {
    throw render(404, "No site page at this address");
  }
  return { pageContext: page };
}
