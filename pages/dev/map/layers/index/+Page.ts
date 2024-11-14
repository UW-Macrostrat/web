import hyper from "@macrostrat/hyper";
import { Routes, Route, Link } from "react-router-dom";
import styles from "./main.module.styl";
import { BrowserRouter as Router } from "react-router-dom";
import { PageHeaderV2 } from "~/components";

const h = hyper.styled(styles);

export function Page() {
  return h("div.page.map-inspector-index", [
    h(PageHeaderV2, { title: "Layer inspectors", showLogo: true }),
    h("h2", "Core layers"),
    h("ul.layers", [
      h(LinkItem, { to: "carto" }, "Carto"),
      h(LinkItem, { to: "carto-slim" }, "Carto (slim)"),
      h(LinkItem, { to: "carto-v1" }, "Carto (v1)"),
      h(LinkItem, { to: "carto-slim-v1" }, "Carto (slim, v1)"),
      h(LinkItem, { to: "carto-raster" }, "Carto (image)"),
      h(LinkItem, { to: "emphasized" }, "Carto (image, emphasized)"),
      h(LinkItem, { to: "all-maps" }, "All maps"),
    ]),
    h("h2", h("a", { href: "./layers/catalog" }, "Map layer catalog")),
  ]);
}

function LinkItem({ to, children }) {
  return h("li", h("a", { href: "./layers/" + to }, children));
}
