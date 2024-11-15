import h from "@macrostrat/hyper";
import { PageHeader } from "~/components";
import { ContentPage } from "~/layouts";

export function Page() {
  return h(ContentPage, [
    h(PageHeader, { title: "Layer inspectors", showLogo: true }),
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
    h("h2", h("a", { href: "./layers/tables" }, "Table catalog")),
  ]);
}

function LinkItem({ to, children }) {
  return h("li", h("a", { href: "./layers/" + to }, children));
}
