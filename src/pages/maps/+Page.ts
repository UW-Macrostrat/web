import hyper from "@macrostrat/hyper";
// Page for a list of maps
import styles from "./main.module.scss";
import { tempImageIndex, s3Address } from "./raster-images";
import { AnchorButton } from "@blueprintjs/core";
import { ContentPage } from "~/layouts";
import { PageHeader } from "~/components/page-header";

const h = hyper.styled(styles);

export function Page({ sources }) {
  const sources1 = sources.map((source) => {
    const { source_id } = source;
    const image = tempImageIndex[source_id];
    if (image == null) return source;
    source.rasterURL = `${s3Address}/${image}`;
    return source;
  });

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
      sources1.map((d) => h(SourceItem, { source: d, key: d.source_id }))
    ),
  ]);
}

function SourceItem({ source }) {
  const { source_id, name } = source;
  const href = `/maps/${source_id}`;
  const edit_href = `/maps/${source_id}/edit`;
  return h("li", [
    h("span.source-id", {}, source_id),
    " ",
    h("a", { href }, [name]),
    " ",
    h("span.scale", {}, source.scale),
    h.if(source.rasterURL != null)([" ", h("span.raster", "Raster")]),
  ]);
}
