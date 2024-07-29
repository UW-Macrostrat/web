import h from "@macrostrat/hyper";
// Page for a list of maps
import { AnchorButton, ButtonGroup } from "@blueprintjs/core";
import { ContentPage } from "~/layouts";
import { PageHeader } from "~/components";
import { useData } from "vike-react/useData";
import { useEffect, useRef, useState } from "react";
import { getMapSources } from "./util";

export function Page() {
  const data = useData();
  const [sources, setSources] = useState(data.sources);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  const firstUpdate = useRef(true);
  useEffect(() => {
    if (firstUpdate.current) {
      firstUpdate.current = false;
      return;
    } else {
      updateResultList(page, 10, setSources, setLoading);
    }
  }, [page]);

  return h(ContentPage, [
    h(PageHeader, { title: "CriticalMAAS CDR Maps", showSiteName: false }),
    h(
      "ul.maps-list",
      sources.map((d) => h(SourceItem, { source: d, key: d.source_id }))
    ),
    // Add two buttons to change the page of the list
    h(
      ButtonGroup,
      {
        style: { display: "flex", justifyContent: "center" },
      },
      [
        h(AnchorButton, {
          icon: "chevron-left",
          disabled: loading,
          onClick: () => setPage((p) => Math.max(p - 1, 0)),
        }),
        h.if(!loading)(
          AnchorButton,
          {
            disabled: true,
          },
          `Page ${page + 1}`
        ),
        h.if(loading)(
          AnchorButton,
          {
            disabled: true,
          },
          `Loading...`
        ),
        h(AnchorButton, {
          disabled: loading,
          icon: "chevron-right",
          onClick: () => setPage((p) => p + 1),
        }),
      ]
    ),
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

async function updateResultList(page, pageSize, setSources, setLoading) {
  setLoading(true);
  setSources(await getMapSources(page, pageSize));
  setLoading(false);
}
