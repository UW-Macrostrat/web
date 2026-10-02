/** Navigation among the site pages, at the right of their sticky header. The
 * footer's list, so the two never disagree. */
import { usePageContext } from "vike-react/usePageContext";
import classNames from "classnames";
import { platformNavItems } from "~/layouts/footer";
import h from "./site-nav.module.sass";

const items = platformNavItems.filter((item) => item.href !== "/heatmap");

export function SiteNav() {
  const { urlPathname } = usePageContext();
  const current = currentItem(urlPathname);
  return h(
    "nav.site-nav",
    { "aria-label": "About Macrostrat" },
    items.map((item) => h(SiteNavLink, { key: item.href, item, active: item.href === current }))
  );
}

function SiteNavLink({ item, active }) {
  let ariaCurrent: "page" | undefined = undefined;
  if (active) ariaCurrent = "page";
  return h(
    "a.site-nav-link",
    { href: item.href, className: classNames({ active }), "aria-current": ariaCurrent },
    item.text
  );
}

/** The longest matching href, so /about/support is Support rather than About. */
function currentItem(pathname: string): string | null {
  let best: string | null = null;
  for (const { href } of items) {
    const matches = pathname === href || pathname.startsWith(href + "/");
    if (matches && (best == null || href.length > best.length)) best = href;
  }
  return best;
}
