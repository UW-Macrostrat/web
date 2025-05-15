import h from "./main.module.scss";
import { AnchorButton, Icon } from "@blueprintjs/core";
import { ContentPage } from "~/layouts";
import { PageHeader, DevLinkButton, AssistantLinks } from "~/components";
import { useData } from "vike-react/useData";
import { useState } from "react";

export function Page() {
  const { sources } = useData();

  const pageLength = 15;
  const length = sources.length;
  const numPages = Math.ceil(length / pageLength);
  const [page, setPage] = useState(0);

  const items = sources.slice(page * pageLength, (page + 1) * pageLength);
  console.log(numPages);

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
      items.map((d) => h(SourceItem, { source: d, key: d.source_id })),
    ),
    pageCarousel({ page, setPage, numPages }),
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

function pageCarousel({page, setPage, numPages}) {
    return h('div.pages', 
        h('div.page-container', [
          h('div', { className: "page-btn" }, [
            h('div', { className: page != 0 ? 'btn-content' : 'hide',             
                onClick: () => {
                    setPage(page - 1);
                }}, [
              h(Icon, { icon: 'arrow-left' }),
              h('p', "Previous"),
            ])
          ]),
          h('p', 'Page ' + (page + 1)),
          h('div', { className: "page-btn" }, [
            h('div', { className: page < numPages - 1 ? 'btn-content' : 'hide',
                onClick: () => {
                    setPage(page + 1);
                }
            }, [
              h('p', "Next"),
              h(Icon, { icon: 'arrow-right' }),
            ])
          ]),
        ])
      );
}