import h from "@macrostrat/hyper";
import { MacrostratIcon } from "~/components";

export function Image({ src, className, width, height }) {
    const srcWithAddedPrefix = "https://storage.macrostrat.org/assets/web/main-page/" + src;
    return h("img", {src: srcWithAddedPrefix, className, width, height})
}

export function Navbar() {
    return h("div", {className: "nav"}, [
            h("a", {href: "/dev/test-site/main-page"}, h(MacrostratIcon)),
            h("a", {href: "/dev/test-site/about"}, "About"),
            h("a", {href: "/dev/test-site/publications"}, "Publications"),
            h("a", {href: "/dev/test-site/people"}, "People"),
            h("a", {href: "/dev/test-site/donate"}, "Donate"),
    ]);
}

export function Footer() {
    return h("div", {className: "footer"}, [
        h("div", {className: "footer-container"}, [
            h("div", {className: "col-sm-4"}, [
                h(Image, {className: "logo_white", src: "logo_white.png", width: "100px"}),
                h("p", {className: "f1-text"}, [
                    "Produced by the ",
                    h("a", {href: "http://strata.geology.wisc.edu", target: "_blank"}, "UW Macrostrat Lab"),
                    h("a", {href: "https://github.com/UW-Macrostrat", target: "_blank"}, h(Image, {className: "git_logo", src: "git-logo.png", width: "18px"})),
                ])
            ]),
            h("div", {className: "col-sm-4"}, [
                h("ul", {className: "footer-nav"}, [
                    h("li", h("a", {href: "/dev/test-site/about"}, "About")),
                    h("li", h("a", {href: "/dev/test-site/publications"}, "Publications")),
                    h("li", h("a", {href: "/dev/test-site/people"}, "People")),
                    h("li", h("a", {href: "/dev/test-site/donate"}, "Donate"))
                ])
            ]),
            h("div", {className: "col-sm-4"}, [
                h(Image, {className: "funding-logo", src: "nsf.png", width: "100px"}),
                h("div", {className: "funding-line"}, "Current support:"),
                h("div", {className: "funding-line"}, "EAR-1948843"),
                h("div", {className: "funding-line"}, "ICER-1928323"),
                h("div", {className: "funding-line"}, "UW-Madison Dept. Geoscience")
            ])
        ])
    ]);
}