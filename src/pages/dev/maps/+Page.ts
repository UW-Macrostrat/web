import { default as h } from "@macrostrat/hyper";
// Page for a list of maps
import { AnchorButton, ButtonGroup } from "@blueprintjs/core";
import { ContentPage } from "~/layouts";
import { PageHeader, DevLinkButton } from "~/components";
import { useData } from "vike-react/useData";

export function Page() {
  const data = useData();
  const { sources } = data;

  console.log(sources);

  return h(ContentPage, [
    h(PageHeader, { title: "CDR Maps", showSiteName: false }),
    h(
      "ul.maps-list",
      sources.map((d) => h(SourceItem, { source: d, key: d.source_id }))
    ),
  ]);
}

function SourceItem({ source }) {
  const { cog_id, system, system_version } = source;
  const href = `./maps/${cog_id}/${system}/${system_version}`;

  return h("li", [
    h("span.source-id", {}, cog_id),
    " ",
    h("a", { href }, [system, system_version]),
  ]);
}
