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

export interface NavLinkItem {
  href: string;
  text: string;
  icon?: any;
  /** One line saying what is behind the link, for the places that show these
   * as cards rather than as a list of buttons (the homepage). Ignored by the
   * footer and the navbar, which have room for the label alone. */
  description?: string;
}

/** The site's canonical link sets, exported so that compact chrome (e.g. the
 * hybrid map/content page frame) can present the same links without forking
 * the list. Anything that shows navigation should draw from these. */
export const dataNavItems: NavLinkItem[] = [
  { href: "/map/#3/40.78/-94.13", text: "Map", icon: "globe" },
  { href: "/columns", text: "Columns", icon: "layers" },
  { href: "/maps", text: "Map sources", icon: "map" },
  { href: "/lex", text: "Lexicon", icon: "book" },
  { href: "/projects", text: "Projects", icon: "briefcase" },
  { href: "/docs", text: "Documentation", icon: "manual" },
];

export const platformNavItems: NavLinkItem[] = [
  {
    href: "/about",
    text: "About",
    icon: "info-sign",
    description: "What Macrostrat is, who builds it, and how it is funded.",
  },
  {
    href: "/community",
    text: "Community",
    icon: "people",
    description: "Contributors, discussion, and how to get in touch.",
  },
  {
    href: "/publications",
    text: "Publications",
    icon: "book",
    description: "Papers built on Macrostrat, and how to cite it.",
  },
  {
    href: "/about/support",
    text: "Support us",
    icon: "heart",
    description: "Funders, and what keeps the system running.",
  },
  {
    href: "/heatmap",
    text: "Heatmap",
    icon: "geosearch",
    description: "Where Macrostrat is being used, right now.",
  },
];

const repoURL = "https://github.com/UW-Macrostrat/web";

export function Footer({ className }) {
  const metaItems = platformNavItems;
  const navItems = dataNavItems;

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

  return h("div.footer", { className }, [
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
