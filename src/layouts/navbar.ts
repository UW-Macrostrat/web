import h from "./navbar.module.sass";
import { SiteTitle, StickyHeader } from "~/components";
import { MacrostratIconStyle } from "~/components/general";
import classNames from "classnames";
import { usePageContext } from "vike-react/usePageContext";

export function NavListItem({ href, children }) {
  const ctx = usePageContext();
  const active = href === ctx.urlPathname;
  return h(
    "li.nav-list-item",
    { className: classNames({ active }) },
    h("a.nav-link", { href }, children)
  );
}

export function Navbar({ className, children, showSiteTitle = true }) {
  return h(StickyHeader, { className }, [
    h("nav.navbar", [
      h.if(showSiteTitle)(SiteTitle, {
        logoStyle: MacrostratIconStyle.SIMPLE,
        className: "navbar-title",
      }),
      children,
      h("ul.nav-list", [
        h(NavListItem, { href: "/about" }, "About"),
        h(NavListItem, { href: "/people" }, "People"),
        h(NavListItem, { href: "/publications" }, "Publications"),
        h(NavListItem, { href: "/support" }, "Support"),
        h(NavListItem, { href: "https://rockd.org/" }, "Rockd"),
      ]),
    ]),
  ]);
}
