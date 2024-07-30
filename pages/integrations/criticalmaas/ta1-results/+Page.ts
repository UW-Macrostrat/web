import h from "@macrostrat/hyper";
// Page for a list of maps
import { AnchorButton, ButtonGroup, Spinner } from "@blueprintjs/core";
import { ContentPage } from "~/layouts";
import { PageHeader } from "~/components";
import { useEffect, useRef, useState } from "react";
import { getMapSources } from "./util";

export function Page() {
  const [sources, setSources] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMapSources(window.location.origin, page).then((d) => {
      setSources(d);
      setLoading(false);
    });
  }, [page]);

  return h(ContentPage, [
    h(PageHeader, { title: "CriticalMAAS CDR Maps", showSiteName: false }),
    h.if(!loading)(
      "ul.maps-list",
      sources.map((d) => h(SourceItem, { source: d, key: d.source_id }))
    ),
    h.if(loading)(Spinner),
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
  const { cog_id, system, system_version, web_geom } = source;
  const currentURL = window.location.pathname;
  const href = `${currentURL}/${cog_id}/${system}/${system_version}`;

  console.log("source", source);

  if (web_geom == null) {
    return h("li", [
      h("span.source-id", {}, cog_id),
      " ",
      h("span", [system + " " + system_version]),
    ]);
  }

  return h("li", [
    h("span.source-id", {}, cog_id),
    " ",
    h("a", { href }, [system + " " + system_version]),
  ]);
}
