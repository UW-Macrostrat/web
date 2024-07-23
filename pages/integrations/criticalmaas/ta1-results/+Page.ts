import h from "@macrostrat/hyper";
// Page for a list of maps
import { AnchorButton, ButtonGroup } from "@blueprintjs/core";
import { ContentPage } from "~/layouts";
import { PageHeader } from "~/components";
import { useData } from "vike-react/useData";
import { useEffect, useState } from "react";
import { getMapSources } from "./util";

export function Page() {
  const data = useData();
  const [sources, setSources] = useState(data.sources);
  const [page, setPage] = useState(0);

  useEffect(() => {
    (async () => {
      setSources(await getMapSources(page, 10));
    })();
  }, [page]);

  return h(ContentPage, [
    h(PageHeader, { title: "CriticalMAAS CDR Maps", showSiteName: false }),
    h(
      "ul.maps-list",
      sources.map((d) => h(SourceItem, { source: d, key: d.source_id }))
    ),
    // Add two buttons to change the page of the list
    h(ButtonGroup, [
      h(AnchorButton, {
        icon: "chevron-left",
        onClick: () => setPage((p) => Math.max(p - 1, 0)),
      }),
      h(
        AnchorButton,
        {
          disabled: true,
        },
        `Page ${page + 1}`
      ),
      h(AnchorButton, {
        icon: "chevron-right",
        onClick: () => setPage((p) => p + 1),
      }),
    ]),
  ]);
}

function SourceItem({ source }) {
  const { cog_id, system, system_version } = source;
  const currentURL = window.location.pathname;
  const href = `${currentURL}/${cog_id}/${system}/${system_version}`;

  return h("li", [
    h("span.source-id", {}, cog_id),
    " ",
    h("a", { href }, [system, system_version]),
  ]);
}
