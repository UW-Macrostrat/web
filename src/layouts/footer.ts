import { AnchorButton, Icon } from "@blueprintjs/core";
import { Image, MacrostratIcon } from "~/components";
import { IoLogoGithub } from "react-icons/io";
import h from "./footer.module.sass";

import { ThemeButton } from "~/components/theme-button.ts";
import { isValidElement } from "react";

const rockdIcon = h(Image, {
  className: "rockd-icon",
  src: "rockd.png",
  width: "18px",
});

export function Footer() {
  const metaItems = [
    { href: "/about", text: "About", icon: "info-sign" },
    { href: "/people", text: "People", icon: "people" },
    { href: "/publications", text: "Publications", icon: "book" },
    { href: "/support", text: "Support", icon: "office" },
    { href: "/heatmap", text: "Heatmap", icon: "geosearch" },
  ];

  const navItems = [
    { href: "/map/#3/40.78/-94.13", text: "Map", icon: "globe" },
    { href: "/columns", text: "Columns", icon: "layers" },
    { href: "/maps", text: "Map sources", icon: "map" },
    { href: "/lex", text: "Lexicon", icon: "book" },
    { href: "/projects", text: "Projects", icon: "briefcase" },
    { href: "/docs", text: "Documentation", icon: "manual" },
  ];

  const repoURL = "https://github.com/UW-Macrostrat/web";
  const editHref = repoURL + "/edit";

  const externalLinks = [
    {
      href: "https://github.com/UW-Macrostrat",
      text: "GitHub",
      icon: h(IoLogoGithub),
    },
    { href: "https://rockd.org", text: "Rockd", icon: rockdIcon },
    {
      href: "https://strata.geology.wisc.edu",
      text: "Macrostrat lab",
      icon: "home",
    },
  ];

  const actions = [
    h(ThemeButton, { vertical: true }),
    {
      href: editHref,
      text: "Edit this page",
      icon: "edit",
    },
    {
      href: repoURL + "/issues",
      text: "Report an issue",
      icon: "bug",
    },
  ];

  return h("div.footer", [
    h("a.homepage-link", { href: "/" }, [
      h("h3", "Macrostrat"),
      h(MacrostratIcon, { className: "footer-logo" }),
    ]),
    h(NavLinkList, { items: navItems, title: "Data" }),
    h(NavLinkList, { items: metaItems, title: "Platform" }),
    h(NavLinkList, { items: externalLinks, title: "Links" }),
    h(NavLinkList, { items: actions, title: "Actions" }),
  ]);
}

function NavLinkList({ items, title }) {
  return h("div.link-list-container", [
    h.if(title != null)("h4.link-list-title", title),
    h(
      "ul.nav-link-list",
      items.map((item) => {
        if (isValidElement(item)) {
          return h("li.nav-link-item", { key: item.key }, [item]);
        }
        const { href, text, icon } = item;
        const linkButton = h(
          AnchorButton,
          { href, className: "nav-link-button", icon, minimal: true },
          [
            //h(Icon, { icon }),
            h("span.nav-link-text", text),
          ]
        );
        return h("li.nav-link-item", { key: href }, [linkButton]);
      })
    ),
  ]);
}
