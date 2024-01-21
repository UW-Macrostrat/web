import h from "@macrostrat/hyper";
import { Link } from "~/renderer/Link";

export function Page() {
  return h([
    h("h1", "Macrostrat dev"),
    h("ul", [
      h("li", h(Link, { href: "map" }, "Map")),
      h("li", h(Link, { href: "maps" }, "Map index")),
      h("li", h(Link, { href: "dev" }, "Dev layers")),
    ]),
  ]);
}
