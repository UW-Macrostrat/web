import h from "./navbar.module.sass";
import { NavListItem, SiteTitle, StickyHeader } from "~/components";
import { MacrostratIconStyle } from "~/components/general";

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
