import hyper from "@macrostrat/hyper";
// Page for a list of maps
import styles from "./main.module.scss";
import { AnchorButton } from "@blueprintjs/core";
import { ContentPage } from "~/layouts";
import { PageHeader } from "~/components/page-header";

const h = hyper.styled(styles);

export function Page({ sources }) {
  return h(ContentPage, [
    h("div.float-right.padding.stick-to-top", [
      h(
        AnchorButton,
        { icon: "flows", href: "/maps/ingestion", large: true },
        "Ingestion system"
      ),
    ]),
    h(PageHeader, { title: "Maps" }),
    h(
      "ul.maps-list",
      sources.map((d) => h(SourceItem, { source: d, key: d.source_id }))
    ),
  ]);
}

function SourceItem({ source }) {
  const { source_id, slug, name } = source;
  const href = `/maps/${source_id}`;
  const href1 = `/map/dev/sources/${slug}`;

  return h("li", [
    h("span.source-id", {}, source_id),
    " ",
    h("a", { href }, [name]),
    " ",
    h("span.scale", {}, source.scale),
    h.if(source.raster_url != null)([" ", h("span.raster", "Raster")]),
    h("span", ["   ", h("a", { href: href1 }, h("code", {}, slug))]),
  ]);
}
