import hyper from "@macrostrat/hyper";
import { StickyHeader } from "~/components";
import { Spinner, Icon, Card, Popover, Tag } from "@blueprintjs/core";
import { useAPIResult } from "@macrostrat/ui-components";
import classNames from "classnames";
import { postgrestPrefix, webAssetsPrefix } from "@macrostrat-web/settings";
import styles from "./layout.module.sass";
import type { ReactNode } from "react";

const h = hyper.styled(styles);

export function Image({ src, className, width, height }: any) {
  const srcWithAddedPrefix = webAssetsPrefix + "/main-page/" + src;
  return h("img", { src: srcWithAddedPrefix, className, width, height });
}

export function NavListItem({ href, children }) {
  return h(
    "li.nav-list-item",
    h("a", { className: "nav-link", href }, children)
  );
}

export function MacrostratLogoLink({
  href = "/",
  className,
  logoStyle,
  children,
}: {
  href?: string;
  className?: string;
  logoStyle?: MacrostratIconStyle;
  children?: React.ReactNode;
}) {
  return h("a.macrostrat-logo-link", { href, className }, [
    h(MacrostratIcon, { iconStyle: logoStyle }),
    children,
  ]);
}

enum MacrostratIconStyle {
  FULL = "full",
  MINIMAL = "minimal",
  SIMPLE = "simple",
}

export function MacrostratIcon({
  iconStyle,
  className,
  small = false,
}: {
  iconStyle?: MacrostratIconStyle;
  small?: boolean;
  className?: string;
}) {
  const iconFile =
    iconStyle != null
      ? `macrostrat-icon-${iconStyle}.svg`
      : "macrostrat-icon.svg";
  return h("img.macrostrat-logo" + (small ? ".small" : ""), {
    className,
    src: `${webAssetsPrefix}/macrostrat-icons/${iconFile}`,
  });
}

export function SiteTitle({
  logoStyle,
  className,
  children,
}: {
  logoStyle?: MacrostratIconStyle;
  className?: string;
  children?: ReactNode;
}) {
  return h(
    MacrostratLogoLink,
    { logoStyle, className: classNames("site-title", className) },
    h("div.site-title-content", [h("h1", "Macrostrat"), children])
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
        h(NavListItem, { href: "/donate" }, "Donate"),
        h(NavListItem, { href: "https://rockd.org/" }, "Rockd"),
      ]),
    ]),
  ]);
}

export function Footer() {
  const navItems = [
    { href: "/about", text: "About", icon: "info-sign" },
    { href: "/publications", text: "Publications", icon: "book" },
    { href: "/people", text: "People", icon: "people" },
    { href: "/donate", text: "Donate", icon: "dollar" },
    { href: "/map/#3/40.78/-94.13", text: "Geologic Map", icon: "map" },
    { href: "/maps", text: "Maps", icon: "globe" },
    { href: "/columns", text: "Columns", icon: "layers" },
    { href: "/lex", text: "Lexicon", icon: "book" },
    { href: "/projects", text: "Projects", icon: "briefcase" },
    { href: "/docs", text: "Documentation", icon: "manual" },
    { href: "https://rockd.org", text: "Rockd", icon: "phone-search" },
    { href: "/heatmap", text: "Heatmap", icon: "geosearch" },
  ];

  return h("div", { className: "footer" }, [
    h("div", { className: "footer-container" }, [
      h("div", { className: "footer-text-container" }, [
        h(Image, {
          className: "logo_white",
          src: "logo_white.png",
          width: "100px",
        }),
        h("p", { className: "footer-text" }, [
          "Produced by the ",
          h(
            "a",
            { href: "http://strata.geology.wisc.edu", target: "_blank" },
            "UW Macrostrat Lab"
          ),
          h(
            "a",
            { href: "https://github.com/UW-Macrostrat", target: "_blank" },
            h(Image, {
              className: "git_logo",
              src: "git-logo.png",
              width: "18px",
            })
          ),
        ]),
      ]),
      h("div", { className: "footer-nav" }, [
        h("a", { className: "nav-link", href: "/" }, [
          h(MacrostratIcon, { iconStyle: "simple", small: true }),
          h("span", { className: "nav-text" }, "Home"),
        ]),
        navItems.map(({ href, text, icon }) =>
          h("a", { className: "nav-link", href, key: href }, [
            h(Icon, { icon }),
            h("span", { className: "nav-text" }, text),
          ])
        ),
      ]),
      h("div", { className: "footer-text-container" }, [
        h(Image, {
          className: "funding-logo",
          src: "nsf.png",
          width: "100px",
        }),
        h("div", { className: "funding-line" }, "Current support:"),
        h("div", { className: "funding-line" }, "EAR-1948843"),
        h("div", { className: "funding-line" }, "ICER-1928323"),
        h("div", { className: "funding-line" }, "UW-Madison Dept. Geoscience"),
      ]),
    ]),
  ]);
}

export function BlankImage({ src, className, width, height }) {
  return h("img", { src, className, width, height });
}

export function Loading() {
  return h("div.loading", h(Spinner));
}

export function SearchBar({
  onChange,
  placeholder = "Search...",
  className,
  value,
}) {
  return h(Card, { className: "search-bar " + className }, [
    h(Icon, { icon: "search" }),
    h("input", {
      type: "text",
      placeholder,
      onChange: (e) => onChange(e.target.value),
    }),
  ]);
}

export function StratTag({ isConcept, fontSize = ".75em" }) {
  return h(
    "div.strat-tag",
    { style: { fontSize } },
    isConcept ? "Concept" : "Name"
  );
}

export function IDTag({ id }) {
  return h("div.id-tag", "ID: #" + id);
}

export function BetaTag({
  content = "This page is in beta and may be incomplete.",
}) {
  let _content = content;
  if (typeof content === "string") {
    _content = h("div.tag-content", content);
  }

  return h(
    Popover,
    {
      content: _content,
      interactionKind: "hover",
      inline: true,
    },
    h(Tag, { intent: "warning" }, "Beta")
  );
}

export function AlphaTag({
  content = "This page is in alpha and highly experimental.",
}: {
  content?: React.ReactNode;
}) {
  let _content = content;
  if (typeof content === "string") {
    _content = h("div.tag-content", content);
  }

  return h(
    Popover,
    {
      content: _content,
      interactionKind: "hover",
      minimal: true,
    },
    h(Tag, { intent: "danger" }, "Alpha")
  );
}

export function getPGData(url, filters) {
  return useAPIResult(postgrestPrefix + url, filters);
}
