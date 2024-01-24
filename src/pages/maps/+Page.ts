import hyper from "@macrostrat/hyper";
// Page for a list of maps
import styles from "./main.module.sass";
import { tempImageIndex, s3Address } from "./raster-images";
import { AnchorButton, Icon, IconSize } from "@blueprintjs/core";
import { ContentPage } from "~/layouts";

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
    h("h1", "Maps"),
    h(
      "ul",
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
    " ",
    h("a", { href: edit_href }, [
      h(Icon, { icon: "edit", size: IconSize.SMALL }),
    ]),
  ]);
}
