import { default as h } from "@macrostrat/hyper";
// Page for a list of maps
import { AnchorButton, ButtonGroup } from "@blueprintjs/core";
import { ContentPage } from "~/layouts";
import { PageHeader, DevLinkButton } from "~/components";

export function Page({ sources }) {

  console.log(sources)

  return h(ContentPage, [
    h("div.float-right.padding.stick-to-top", [
      h(ButtonGroup, { vertical: true, large: true }, [
        h(
          AnchorButton,
          { icon: "flows", href: "/maps/ingestion" },
          "Ingestion system"
        ),
        h(AnchorButton, { icon: "map", href: "/map/sources" }, "Show on map"),
        h(DevLinkButton, { href: "/maps/legend" }, "Legend table"),
      ]),
    ]),
    h(PageHeader, { title: "TA1 Maps" }),
    h(
      "ul.maps-list",
      sources.map((d) =>
        h(SourceItem, { source: d, key: d.source_id })
      )
    ),
  ]);
}

function SourceItem({ source }) {

  const { cog_id, system, system_version } = source;
  const href = `./maps/${cog_id}/${system}/${system_version}`

  return h("li", [
    h("span.source-id", {}, cog_id),
    " ",
    h("a", { href }, [system, system_version])
  ]);
}

