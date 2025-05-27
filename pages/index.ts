import { onDemand } from "~/_utils";
import h from "./layout.module.sass";
import { MacrostratIcon } from "~/components";
import { SETTINGS } from "@macrostrat-web/settings";
import { useAPIResult } from "@macrostrat/ui-components";
import { DarkModeButton } from "@macrostrat/ui-components";

export function Image({ src, className, width, height }) {
    const srcWithAddedPrefix = "https://storage.macrostrat.org/assets/web/main-page/" + src;
    return h("img", {src: srcWithAddedPrefix, className, width, height})
}

export function Navbar() {
    return h("div", {className: "nav"}, [
            h("a", {className: "nav-link", href: "/"}, h(MacrostratIcon)),
            h("a", {href: "/about"}, "About"),
            h("a", {href: "/publications"}, "Publications"),
            h("a", {href: "/people"}, "People"),
            h("a", {href: "/donate"}, "Donate"),
    ]);
}

export function Footer() {
    return h("div", {className: "footer"}, [
        h("div", {className: "footer-container"}, [
            h("div", {className: "footer-text-container"}, [
                h(Image, {className: "logo_white", src: "logo_white.png", width: "100px"}),
                h("p", {className: "footer-text"}, [
                    "Produced by the ",
                    h("a", {href: "http://strata.geology.wisc.edu", target: "_blank"}, "UW Macrostrat Lab"),
                    h("a", {href: "https://github.com/UW-Macrostrat", target: "_blank"}, h(Image, {className: "git_logo", src: "git-logo.png", width: "18px"})),
                ])
            ]),
            h("div", {className: "footer-nav"}, [
                h(DarkModeButton, { showText: true}),
                h("a", {href: "/dev/test-site/about"}, "About"),
                h("a", {href: "/dev/test-site/publications"}, "Publications"),
                h("a", {href: "/dev/test-site/people"}, "People"),
                h("a", {href: "/dev/test-site/donate"}, "Donate"),
            ]),
            h("div", {className: "footer-text-container"}, [
                h(Image, {className: "funding-logo", src: "nsf.png", width: "100px"}),
                h("div", {className: "funding-line"}, "Current support:"),
                h("div", {className: "funding-line"}, "EAR-1948843"),
                h("div", {className: "funding-line"}, "ICER-1928323"),
                h("div", {className: "funding-line"}, "UW-Madison Dept. Geoscience")
            ])
        ])
    ]);
}

export function useMacrostratAPI(str) {
    return useAPIResult(SETTINGS.apiV2Prefix + str)
}

export const ColumnMap = onDemand(() => import("./map").then((mod) => mod.ColumnMap));

export function BlankImage({ src, className, width, height }) {
    return h("img", {src, className, width, height})
}