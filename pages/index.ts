import h from "./layout.module.sass";
import { MacrostratIcon } from "~/components";
import { SETTINGS } from "@macrostrat-web/settings";
import { DarkModeButton, useAPIResult } from "@macrostrat/ui-components";
import { Spinner, Icon, Card } from "@blueprintjs/core";
import { useDarkMode } from "@macrostrat/ui-components";

export function Image({ src, className, width, height }) {
  const srcWithAddedPrefix =
    "https://storage.macrostrat.org/assets/web/main-page/" + src;
  return h("img", { src: srcWithAddedPrefix, className, width, height });
}

export function Navbar({ className }) {
  return h("nav", { className: "nav " + className }, [
    h("a", { className: "nav-link", href: "/" }, h(MacrostratIcon)),
    h("a", { href: "/about" }, "About"),
    h("a", { href: "/publications" }, "Publications"),
    h("a", { href: "/people" }, "People"),
    h("a", { href: "/donate" }, "Donate"),
  ]);
}

export function Footer() {
  const isDarkMode = useDarkMode()?.isEnabled;

  return h("div", { className: "footer" }, [
    h("div", { className: "footer-container" }, [
      h("div", { className: "footer-text-container" }, [
        h(Image, {
          className: "logo_white " + (isDarkMode ? "img-dark" : "img-light"),
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
              className: "git_logo "+ (isDarkMode ? "img-light" : "img-dark"),
              src: "git-logo.png",
              width: "18px",
            })
          ),
        ]),
      ]),
      h("div", { className: "footer-nav" }, [
        h(DarkModeButton, { showText: true }),
        h("a", { href: "/about" }, "About"),
        h("a", { href: "/publications" }, "Publications"),
        h("a", { href: "/people" }, "People"),
        h("a", { href: "/donate" }, "Donate"),
      ]),
      h("div", { className: "footer-text-container" }, [
        h(Image, { className: "funding-logo " + (isDarkMode ? "img-dark" : "img-light"), src: "nsf.png", width: "100px" }),
        h("div", { className: "funding-line" }, "Current support:"),
        h("div", { className: "funding-line" }, "EAR-1948843"),
        h("div", { className: "funding-line" }, "ICER-1928323"),
        h("div", { className: "funding-line" }, "UW-Madison Dept. Geoscience"),
      ]),
    ]),
  ]);
}

export function useMacrostratAPI(str) {
  return useAPIResult(SETTINGS.apiV2Prefix + str);
}

export function BlankImage({ src, className, width, height }) {
  return h("img", { src, className, width, height });
}

export function Loading() {
  return h("div.loading", h(Spinner));
}

export function SearchBar({ onChange, placeholder = "Search..." }) {
  return h(Card, { className: "search-bar" }, [
    h(Icon, { icon: "search" }),
    h("input", {
      type: "text",
      placeholder,
      onChange: (e) => onChange(e.target.value),
    }),
  ])
}