import h from "./main.module.scss";
import { AnchorButton } from "@blueprintjs/core";
import { ContentPage } from "~/layouts";
import { PageHeader, DevLinkButton, AssistantLinks } from "~/components";
import { useData } from "vike-react/useData";

export function Page() {
  const { sources } = useData();

  return h(ContentPage, [
    h(AssistantLinks, [
      h(
        AnchorButton,
        { icon: "flows", href: "/maps/ingestion" },
        "Ingestion system"
      ),
      h(AnchorButton, { icon: "map", href: "/map/sources" }, "Show on map"),
      h(DevLinkButton, { href: "/maps/legend" }, "Legend table"),
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
