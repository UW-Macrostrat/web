import { Icon } from "@blueprintjs/core";
import { DarkModeButton } from "@macrostrat/ui-components";
import { Image, MacrostratIcon } from "~/components";
import h from "./footer.module.sass";

export function Footer() {
  const navItems = [
    { href: "/about", text: "About", icon: "info-sign" },
    { href: "/publications", text: "Publications", icon: "book" },
    { href: "/people", text: "People", icon: "people" },
    { href: "/donate", text: "Donate", icon: "dollar" },
    { href: "/map/#3/40.78/-94.13", text: "Map", icon: "map" },
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
        h(DarkModeButton, { className: "dark-mode-button", showText: true }),
      ]),
    ]),
  ]);
}
