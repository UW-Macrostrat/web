import h from "@macrostrat/hyper";
import { MacrostratIcon } from "~/components";

export function Image({ src, className, width, height }) {
    const srcWithAddedPrefix = "https://storage.macrostrat.org/assets/web/main-page/" + src;
    return h("img", {src: srcWithAddedPrefix, className, width, height})
}

export function Navbar() {
    return h("div", {className: "nav"}, [
        h("ul", [
            h("li", h("a", {href: "/dev/test-site/main-page"}, h(MacrostratIcon))),
            h("li", h("a", {href: "/dev/test-site/about"}, "About")),
            h("li", h("a", {href: "/dev/test-site/publications"}, "Publications")),
            h("li", h("a", {href: "/dev/test-site/people"}, "People")),
            h("li", h("a", {href: "/dev/test-site/donate"}, "Donate"))
        ])
    ]);
}

export function Footer() {
    return null;
}